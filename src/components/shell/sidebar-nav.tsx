"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Banknote, BarChart3, Briefcase, CalendarDays, CheckCheck, Clock, Fingerprint, LayoutDashboard,
  Menu, Settings, Timer, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { NavGroup, NavIcon } from "@/lib/nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard, clock: Clock, calendar: CalendarDays, timer: Timer, wallet: Wallet,
  check: CheckCheck, users: Users, fingerprint: Fingerprint, banknote: Banknote, briefcase: Briefcase,
  chart: BarChart3, settings: Settings,
};

function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-5">
      {groups.map((g) => (
        <div key={g.label} className="grid gap-1">
          <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{g.label}</p>
          {g.items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function DesktopNav({ groups }: { groups: NavGroup[] }) {
  return <NavLinks groups={groups} />;
}

export function MobileNav({ groups }: { groups: NavGroup[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-4">
        <SheetHeader className="px-0">
          <SheetTitle>HR Management</SheetTitle>
        </SheetHeader>
        <NavLinks groups={groups} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
