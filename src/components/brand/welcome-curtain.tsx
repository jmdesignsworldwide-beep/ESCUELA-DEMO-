"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/brand/logo";
import { COLEGIO, APP_NAME } from "@/lib/constants";

const SESSION_KEY = "jm_welcome_seen";

/**
 * Bienvenida cinematográfica: overlay de entrada que se reproduce una sola
 * vez por sesión al llegar al panel. Respeta prefers-reduced-motion y se
 * puede omitir con clic. No bloquea la interacción una vez desvanecido.
 */
export function WelcomeCurtain({ nombre }: { nombre: string }) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);
    const t = setTimeout(() => setVisible(false), reduce ? 600 : 2600);
    return () => clearTimeout(t);
  }, [reduce]);

  const primerNombre = nombre.split(/\s+/)[0] ?? "";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="curtain"
          className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-primary text-primary-foreground"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          onClick={() => setVisible(false)}
          role="dialog"
          aria-label="Bienvenida"
        >
          {/* Resplandor de fondo */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 40%, rgb(var(--primary-light) / 0.35), transparent 70%)",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          <div className="relative flex flex-col items-center gap-5 px-6 text-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 16,
                delay: 0.1,
              }}
            >
              <LogoMark className="h-20 w-20 rounded-2xl bg-white/10 ring-white/20" />
            </motion.div>

            <div className="overflow-hidden">
              <motion.h1
                className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl"
                initial={{ y: reduce ? 0 : 32, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
              >
                {APP_NAME}
              </motion.h1>
            </div>

            <motion.div
              className="h-px w-24 bg-[rgb(var(--gold,201_162_39))]"
              style={{ background: "rgb(201 162 39)" }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.6, ease: "easeOut" }}
            />

            <motion.p
              className="max-w-sm text-sm text-primary-foreground/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              {primerNombre ? `Hola, ${primerNombre}. ` : ""}
              Bienvenido(a) al {COLEGIO.nombre}.
            </motion.p>

            <motion.span
              className="mt-2 text-xs uppercase tracking-[0.2em] text-primary-foreground/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 1.4 }}
            >
              Toca para continuar
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
