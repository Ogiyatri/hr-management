import { Building2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="size-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight">HR Management</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
