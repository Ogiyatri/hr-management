import Link from "next/link";
import { Suspense } from "react";
import { Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DesktopNav, MobileNav } from "@/components/shell/sidebar-nav";
import { ROLE_LABEL, requireUser } from "@/lib/auth";
import { navFor } from "@/lib/nav";
import { logout } from "../(auth)/actions";

/**
 * Layout area privat. Proxy sudah menolak request tanpa sesi; requireUser()
 * juga memastikan akun masih aktif. Bagian yang membaca sesi ada di dalam
 * Suspense agar kerangka halaman tampil instan (Cache Components).
 */
/**
 * Semua halaman di area login memuat data per user & per request (absensi,
 * gaji, persetujuan) yang tidak boleh di-cache, jadi navigasi memang menunggu
 * server. Ini mematikan peringatan "instant navigation" di mode dev untuk area
 * ini; halaman tetap streaming dengan skeleton (loading.tsx / Suspense).
 */
export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh bg-muted/40 print:bg-white">
      <aside className="sticky top-0 hidden print:hidden! h-svh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-background p-4 lg:flex">
        <Brand />
        <Suspense fallback={<NavSkeleton />}>
          <Nav variant="desktop" />
        </Suspense>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b print:hidden bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <div className="flex items-center gap-2">
              <Suspense fallback={null}>
                <Nav variant="mobile" />
              </Suspense>
              <div className="lg:hidden">
                <Brand compact />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Suspense fallback={<UserBadgeSkeleton />}>
                <UserBadge />
              </Suspense>
              <form action={logout}>
                <Button type="submit" variant="outline" size="icon" aria-label="Keluar" title="Keluar">
                  <LogOut />
                </Button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Building2 className="size-4" />
      </span>
      <span className={compact ? "hidden sm:inline" : ""}>HR Management</span>
    </Link>
  );
}

async function Nav({ variant }: { variant: "desktop" | "mobile" }) {
  const user = await requireUser();
  const groups = navFor(user.role);
  return variant === "desktop" ? <DesktopNav groups={groups} /> : <MobileNav groups={groups} />;
}

async function UserBadge() {
  const user = await requireUser();
  return (
    <div className="text-right leading-tight">
      <p className="max-w-40 truncate text-sm font-medium">{user.employee?.fullName ?? user.email}</p>
      <p className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
    </div>
  );
}

function NavSkeleton() {
  return (
    <div className="grid gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

function UserBadgeSkeleton() {
  return (
    <div className="grid justify-items-end gap-1">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-3 w-14" />
    </div>
  );
}
