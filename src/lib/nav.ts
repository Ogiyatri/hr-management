import type { AppRole } from "@/lib/auth";

export type NavIcon =
  | "dashboard" | "clock" | "calendar" | "timer" | "wallet" | "check" | "users"
  | "fingerprint" | "banknote" | "briefcase" | "chart" | "settings";

export type NavItem = { href: string; label: string; icon: NavIcon; roles?: AppRole[] };
export type NavGroup = { label: string; items: NavItem[] };

const HR: AppRole[] = ["admin", "hr"];
const APPROVER: AppRole[] = ["admin", "hr", "manager"];

export const NAV: NavGroup[] = [
  {
    label: "Menu",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/absen", label: "Absen", icon: "clock" },
      { href: "/cuti", label: "Cuti", icon: "calendar" },
      { href: "/lembur", label: "Lembur", icon: "timer" },
      { href: "/slip-gaji", label: "Slip Gaji", icon: "wallet" },
      { href: "/persetujuan", label: "Persetujuan", icon: "check", roles: APPROVER },
    ],
  },
  {
    label: "Kelola (HR)",
    items: [
      { href: "/karyawan", label: "Karyawan", icon: "users", roles: HR },
      { href: "/absensi", label: "Data Absensi", icon: "fingerprint", roles: HR },
      { href: "/payroll", label: "Penggajian", icon: "banknote", roles: HR },
      { href: "/rekrutmen", label: "Rekrutmen", icon: "briefcase", roles: HR },
      { href: "/laporan", label: "Laporan", icon: "chart", roles: HR },
      { href: "/pengaturan", label: "Pengaturan", icon: "settings", roles: HR },
    ],
  },
];

export function navFor(role: AppRole): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(role)) })).filter(
    (g) => g.items.length > 0,
  );
}

export const isHR = (role: AppRole) => role === "admin" || role === "hr";
export const isApprover = (role: AppRole) => APPROVER.includes(role);
