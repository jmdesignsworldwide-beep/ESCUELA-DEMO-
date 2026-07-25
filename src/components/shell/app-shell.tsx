"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, PanelLeftClose, PanelLeftOpen, X, ShieldHalf } from "lucide-react";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { YearSelector } from "@/components/shell/year-selector";
import { UserMenu } from "@/components/shell/user-menu";
import { Logo, LogoMark } from "@/components/brand/logo";
import { AuroraBackground } from "@/components/brand/aurora-background";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export function AppShell({
  profile,
  superAdmin = false,
  children,
}: {
  profile: Profile;
  superAdmin?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="relative min-h-dvh">
      <AuroraBackground />

      {/* ── Sidebar de escritorio ─────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-card/70 backdrop-blur-xl transition-[width] duration-300 lg:flex lg:flex-col print:hidden",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-border px-4",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <LogoMark /> : <Logo />}
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav role={profile.role} collapsed={collapsed} />
        </div>
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center gap-2 text-muted-foreground"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Colapsar</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* ── Drawer móvil ──────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm animate-in fade-in-0"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border bg-card"
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav
                role={profile.role}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </motion.aside>
        </div>
      )}

      {/* ── Contenido ─────────────────────────────────────────── */}
      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-300",
          collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64",
        )}
      >
        <header className="glass sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6 print:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden min-w-0 flex-1 md:block">
            <Breadcrumbs />
          </div>
          <div className="flex-1 md:hidden" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            {superAdmin && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-1.5 border-primary/40 text-primary"
              >
                <Link href="/nexus">
                  <ShieldHalf className="h-4 w-4" />
                  <span className="hidden sm:inline">JM Nexus</span>
                </Link>
              </Button>
            )}
            <YearSelector />
            <ThemeToggle />
            <UserMenu profile={profile} />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
