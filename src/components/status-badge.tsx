import { cn } from "cn";
import { Badge } from "@/components/ui/badge";

type Tone = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

const EXTRA: Partial<Record<Tone, string>> = {
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function StatusBadge({
  map,
  value,
  className,
}: {
  map: Record<string, { label: string; tone: Tone }>;
  value: string | null | undefined;
  className?: string;
}) {
  const item = value ? map[value] : undefined;
  if (!item) return <Badge variant="outline">{value ?? "—"}</Badge>;
  const variant = item.tone === "success" || item.tone === "warning" ? "secondary" : item.tone;
  return (
    <Badge variant={variant} className={cn(EXTRA[item.tone], className)}>
      {item.label}
    </Badge>
  );
}
