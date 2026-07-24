"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { NAV_GROUPS } from "@/lib/constants";
import type { Role } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
} as const;

interface QuickLink {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
}

export function DashboardContent({ role }: { role: Role }) {
  const links: QuickLink[] = NAV_GROUPS.flatMap((g) =>
    g.items
      .filter((i) => i.roles.includes(role) && i.href !== "/dashboard")
      .map((i) => ({
        label: i.label,
        href: i.href,
        icon: i.icon,
        group: g.title,
      })),
  );

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {links.map((link) => (
        <motion.div key={link.href} variants={item}>
          <Link href={link.href} className="group block h-full">
            <Card
              className={cn(
                "h-full p-5 transition-all duration-300",
                "hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-card-hover",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <link.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
              <div className="mt-4">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {link.group}
                </p>
                <h3 className="mt-0.5 font-serif text-lg font-semibold text-foreground">
                  {link.label}
                </h3>
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
