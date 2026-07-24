import "server-only";

/**
 * Rate limiting sencillo en memoria (ventana deslizante por clave).
 * Suficiente para el demo y para servidores de una sola instancia. En
 * producción multi-instancia se reemplaza por un store compartido
 * (p. ej. Upstash Redis) sin cambiar la firma de checkRateLimit().
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * @param key       Identificador (p. ej. `login:<ip>` o `notas:<userId>`).
 * @param limit     Máximo de intentos por ventana.
 * @param windowMs  Tamaño de la ventana en milisegundos.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    remaining: limit - bucket.count,
    retryAfterSec: 0,
  };
}

/** Limpieza oportunista de buckets vencidos (evita crecimiento ilimitado). */
export function sweepRateLimits(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
