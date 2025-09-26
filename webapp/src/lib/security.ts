import { NextRequest, NextResponse } from 'next/server'

export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null
  const origin = request.headers.get('origin') || ''
  const reqUrl = new URL(request.url)
  const allowed = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
  if (!origin || !allowed) return null // 在本地或未設定時略過
  const ok = origin === allowed && reqUrl.origin === allowed
  if (!ok) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }
  return null
}

const buckets: Map<string, { count: number; resetAt: number }> = (globalThis as any).__rateBuckets || new Map()
;(globalThis as any).__rateBuckets = buckets

export function rateLimit(request: NextRequest, key: string, limit = 30, windowMs = 60_000): NextResponse | null {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const k = `${ip}:${key}`
  const now = Date.now()
  const b = buckets.get(k)
  if (!b || b.resetAt < now) {
    buckets.set(k, { count: 1, resetAt: now + windowMs })
    return null
  }
  if (b.count >= limit) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  b.count++
  return null
}

