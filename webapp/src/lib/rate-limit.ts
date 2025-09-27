type Key = string

interface Counter {
  count: number
  resetAt: number
}

const store = new Map<Key, Counter>()

export function rateLimit(options: { key: Key; limit: number; windowMs: number }): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const existing = store.get(options.key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs
    store.set(options.key, { count: 1, resetAt })
    return { allowed: true, remaining: options.limit - 1, resetAt }
  }
  if (existing.count < options.limit) {
    existing.count += 1
    return { allowed: true, remaining: options.limit - existing.count, resetAt: existing.resetAt }
  }
  return { allowed: false, remaining: 0, resetAt: existing.resetAt }
}

export function getClientIp(req: Request | { headers?: any }): string {
  try {
    // NextRequest has headers.get
    // Fallback to Node-like headers
    const hdrs: any = (req as any).headers
    const getter = typeof hdrs?.get === 'function' ? (k: string) => hdrs.get(k) : (k: string) => hdrs?.[k]
    const xff = getter?.('x-forwarded-for') || getter?.('X-Forwarded-For')
    if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim()
    const realIp = getter?.('x-real-ip') || getter?.('X-Real-IP')
    if (typeof realIp === 'string') return realIp
  } catch {}
  return 'unknown'
}

