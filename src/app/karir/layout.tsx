import Link from "next/link";
import { Building2 } from "lucide-react";

export default function KarirLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/karir" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </span>
            Karier
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Masuk karyawan
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
