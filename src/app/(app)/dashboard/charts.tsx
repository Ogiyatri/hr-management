"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const monthLabel = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
const compactRp = (n: number) =>
  `Rp${new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;

// Warna dari palet tervalidasi (lihat --chart-* di globals.css)
const attendanceConfig = {
  onTime: { label: "Tepat waktu", color: "var(--chart-1)" },
  late: { label: "Terlambat", color: "var(--chart-2)" },
  leave: { label: "Cuti / sakit", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function AttendanceTrend({ data }: { data: { day: string; present: number; late: number; leave: number }[] }) {
  // Hari tanpa data sama sekali (akhir pekan) dilewati agar sumbu tidak penuh celah
  const rows = data
    .filter((d) => d.present + d.leave > 0)
    .map((d) => ({ day: d.day, onTime: d.present - d.late, late: d.late, leave: d.leave }));
  return (
    <ChartContainer config={attendanceConfig} className="aspect-auto h-64 w-full">
      <BarChart data={rows} margin={{ left: -16, right: 8 }} barCategoryGap="20%">
        <CartesianGrid vertical={false} strokeOpacity={0.5} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={dayLabel} tickMargin={8} minTickGap={12} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={40} />
        <ChartTooltip cursor={{ fillOpacity: 0.08 }} content={<ChartTooltipContent labelFormatter={(v) => dayLabel(String(v))} />} />
        <ChartLegend content={<ChartLegendContent />} />
        {/* stroke = warna permukaan → celah 2px antar segmen */}
        <Bar dataKey="onTime" stackId="a" fill="var(--color-onTime)" stroke="var(--card)" strokeWidth={2} />
        <Bar dataKey="late" stackId="a" fill="var(--color-late)" stroke="var(--card)" strokeWidth={2} />
        <Bar dataKey="leave" stackId="a" fill="var(--color-leave)" stroke="var(--card)" strokeWidth={2} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

const deptConfig = { count: { label: "Karyawan", color: "var(--chart-1)" } } satisfies ChartConfig;

export function DepartmentBars({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ChartContainer config={deptConfig} className="aspect-auto w-full" style={{ height: Math.max(160, data.length * 40) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={120} />
        <ChartTooltip cursor={{ fillOpacity: 0.08 }} content={<ChartTooltipContent hideIndicator />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={18}
          label={{ position: "right", className: "fill-foreground text-xs tabular-nums" }} />
      </BarChart>
    </ChartContainer>
  );
}

const payrollConfig = { net: { label: "Gaji bersih", color: "var(--chart-1)" } } satisfies ChartConfig;

export function PayrollBars({ data }: { data: { month: string; net: number }[] }) {
  return (
    <ChartContainer config={payrollConfig} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.5} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickFormatter={monthLabel} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={compactRp} width={64} />
        <ChartTooltip
          cursor={{ fillOpacity: 0.08 }}
          content={
            <ChartTooltipContent
              labelFormatter={(v) => monthLabel(String(v))}
              formatter={(value) => (
                <span className="font-medium tabular-nums">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value))}
                </span>
              )}
            />
          }
        />
        <Bar dataKey="net" fill="var(--color-net)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  );
}
