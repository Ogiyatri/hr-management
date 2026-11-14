import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";

const rupiahFmt = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function rupiah(value: number | string | null | undefined) {
  return rupiahFmt.format(Number(value ?? 0));
}

export function number(value: number | string | null | undefined, digits = 0) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(Number(value ?? 0));
}

const toDate = (v: string | Date) => (typeof v === "string" ? parseISO(v) : v);

/** 14 Nov 2026 */
export function date(value: string | Date | null | undefined) {
  return value ? format(toDate(value), "d MMM yyyy", { locale: localeId }) : "—";
}

/** Sabtu, 14 November 2026 */
export function longDate(value: string | Date | null | undefined) {
  return value ? format(toDate(value), "EEEE, d MMMM yyyy", { locale: localeId }) : "—";
}

/** November 2026 */
export function monthYear(value: string | Date | null | undefined) {
  return value ? format(toDate(value), "MMMM yyyy", { locale: localeId }) : "—";
}

/** 08:05 dalam zona waktu tertentu (default WIB) */
export function time(value: string | Date | null | undefined, timeZone = "Asia/Jakarta") {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone }).format(toDate(value));
}

export function dateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  }).format(toDate(value));
}

/** Tanggal hari ini (YYYY-MM-DD) dalam zona waktu tertentu */
export function todayISO(timeZone = "Asia/Jakarta") {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function minutesToText(min: number | null | undefined) {
  const m = Number(min ?? 0);
  if (m <= 0) return "—";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h} j ${r} m` : `${r} m`;
}

// ---------------------------------------------------------------------------
// Label status
// ---------------------------------------------------------------------------
type Tone = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

export const ATTENDANCE_STATUS: Record<string, { label: string; tone: Tone }> = {
  present: { label: "Hadir", tone: "success" },
  late: { label: "Terlambat", tone: "warning" },
  absent: { label: "Alpa", tone: "destructive" },
  leave: { label: "Cuti", tone: "secondary" },
  sick: { label: "Sakit", tone: "secondary" },
  holiday: { label: "Libur", tone: "outline" },
};

export const REQUEST_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Menunggu atasan", tone: "warning" },
  approved_supervisor: { label: "Menunggu HR", tone: "warning" },
  approved: { label: "Disetujui", tone: "success" },
  rejected: { label: "Ditolak", tone: "destructive" },
  cancelled: { label: "Dibatalkan", tone: "outline" },
};

export const PAYROLL_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "secondary" },
  finalized: { label: "Final", tone: "warning" },
  paid: { label: "Dibayar", tone: "success" },
};

export const EMPLOYEE_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Aktif", tone: "success" },
  resigned: { label: "Resign", tone: "outline" },
  terminated: { label: "Diberhentikan", tone: "destructive" },
};

export const EMPLOYMENT_TYPE: Record<string, string> = {
  permanent: "Tetap",
  contract: "Kontrak",
  probation: "Percobaan",
  intern: "Magang",
};

export const JOB_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "secondary" },
  open: { label: "Dibuka", tone: "success" },
  closed: { label: "Ditutup", tone: "outline" },
};

export const APPLICANT_STAGE: Record<string, { label: string; tone: Tone }> = {
  applied: { label: "Melamar", tone: "secondary" },
  screening: { label: "Screening", tone: "default" },
  interview: { label: "Interview", tone: "default" },
  offering: { label: "Penawaran", tone: "warning" },
  hired: { label: "Diterima", tone: "success" },
  rejected: { label: "Ditolak", tone: "destructive" },
};

export const PTKP_OPTIONS = ["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"];
