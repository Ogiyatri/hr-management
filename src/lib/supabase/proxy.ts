import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { NextResponse, type NextRequest } from "next/server";

/** Halaman yang boleh diakses tanpa login. */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth", "/karir"];
/** Halaman khusus tamu: user yang sudah login diarahkan ke dashboard. */
const GUEST_ONLY_PATHS = ["/login", "/forgot-password"];

const matches = (pathname: string, paths: string[]) =>
  paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Me-refresh sesi Supabase di setiap request dan melindungi halaman privat.
 * Dipanggil dari src/proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Jangan taruh kode lain di antara createServerClient dan getClaims():
  // getClaims() memverifikasi JWT dan me-refresh token bila perlu.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  const redirectTo = (path: string, next?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (next) url.searchParams.set("next", next);
    const redirect = NextResponse.redirect(url);
    // Bawa cookie sesi yang mungkin baru di-refresh
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!isLoggedIn && !matches(pathname, PUBLIC_PATHS)) {
    return redirectTo("/login", pathname === "/" ? undefined : pathname + search);
  }

  if (isLoggedIn && matches(pathname, GUEST_ONLY_PATHS)) {
    return redirectTo("/dashboard");
  }

  return response;
}
