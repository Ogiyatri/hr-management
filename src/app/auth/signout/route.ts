import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Menghapus sesi lalu kembali ke /login (dipakai saat akun nonaktif). */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const inactive = request.nextUrl.searchParams.get("error") === "inactive";
  // Location relatif agar host sama dengan yang dibuka user
  return new NextResponse(null, { status: 303, headers: { Location: inactive ? "/login?error=inactive" : "/login" } });
}
