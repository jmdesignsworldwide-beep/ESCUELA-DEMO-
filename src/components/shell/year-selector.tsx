"use client";

import * as React from "react";
import { Calendar, Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Selector de año escolar. En TANDA 1 opera con años de ejemplo (estado
 * local); en TANDA 2 se conecta a la tabla `anios_escolares`.
 */
const YEARS = ["2025–2026", "2024–2025", "2023–2024"] as const;

export function YearSelector() {
  const [year, setYear] = React.useState<string>(YEARS[0]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 font-medium"
          aria-label="Seleccionar año escolar"
        >
          <Calendar className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">{year}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Año escolar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {YEARS.map((y) => (
          <DropdownMenuItem
            key={y}
            onSelect={() => setYear(y)}
            className="justify-between"
          >
            {y}
            <Check
              className={cn(
                "h-4 w-4 text-primary",
                y === year ? "opacity-100" : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
