import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "hr" | "manager" | "employee";

export type CurrentUser = {
  id: string;
  email: string;
  role: AppRole;
  branchId: string | null; // cabang yang dibatasi untuk HR; null = semua
  employee: {
    id: string;
    employeeNo: string;
    fullName: string;
    status: "active" | "resigned" | "terminated";
    branchId: string;
  } | null;
};

/**
 * User yang sedang login + role + data karyawannya.
 * Di-cache per request, jadi aman dipanggil berkali-kali di layout/page.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims) return null;
  return loadProfile(supabase, claims.sub, (claims.email as string | undefined) ?? "");
});

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Ambil role + data karyawan untuk user tertentu (mengikuti RLS). */
export async function loadProfile(
  supabase: ServerClient,
  userId: string,
  email: string,
): Promise<CurrentUser> {
  const [{ data: roleRow }, { data: emp }] = await Promise.all([
    supabase.from("user_roles").select("role, branch_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("employees")
      .select("id, employee_no, full_name, status, branch_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return {
    id: userId,
    email,
    role: (roleRow?.role as AppRole | undefined) ?? "employee",
    branchId: roleRow?.branch_id ?? null,
    employee: emp
      ? {
          id: emp.id,
          employeeNo: emp.employee_no,
          fullName: emp.full_name,
          status: emp.status,
          branchId: emp.branch_id,
        }
      : null,
  };
}

/** Boleh login jika: admin, atau terhubung ke data karyawan yang masih aktif. */
export function canAccessApp(user: CurrentUser) {
  return user.role === "admin" || user.employee?.status === "active";
}

/** Wajib login (dan akun aktif) — untuk layout/page privat. */
export async function requireUser(allowed?: AppRole[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Sesi masih ada tapi akun nonaktif: hapus sesi dulu, kalau tidak proxy
  // akan memantulkan /login kembali ke /dashboard (redirect loop).
  if (!canAccessApp(user)) redirect("/auth/signout?error=inactive");
  if (allowed && !allowed.includes(user.role)) redirect("/dashboard");
  return user;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  hr: "HR",
  manager: "Manager",
  employee: "Karyawan",
};

/** Cegah open redirect: hanya path internal yang diizinkan. */
export function safeNextPath(next: unknown, fallback = "/dashboard") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
