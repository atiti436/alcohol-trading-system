import { NextRequest, NextResponse } from 'next/server'

/**
 * 🔒 全域安全 Middleware
 *
 * 功能：
 * 1. CORS 保護 - 阻止跨域惡意請求
 * 2. Rate Limiting - 防止 DDoS 和暴力破解
 * 3. 安全標頭 - 加強瀏覽器安全防護
 */

// Rate Limiting 儲存（記憶體快取）
const rateLimitBuckets: Map<string, { count: number; resetAt: number }> =
  (globalThis as any).__globalRateBuckets || new Map()
;(globalThis as any).__globalRateBuckets = rateLimitBuckets

export function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url)
  const method = request.method.toUpperCase()

  // 🔒 0. HTTPS 強制跳轉（僅生產環境）
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto')
    if (proto && proto !== 'https') {
      const httpsUrl = request.url.replace(/^http:/, 'https:')
      return NextResponse.redirect(httpsUrl, 301)
    }
  }

  // 🔒 1. CORS 保護（只檢查寫入操作）
  if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
    const corsError = checkCORS(request)
    if (corsError) return corsError
  }

  // 🔒 2. Rate Limiting（分級保護）
  const rateLimitError = checkRateLimit(request, pathname, method)
  if (rateLimitError) return rateLimitError

  // 🔒 3. 安全標頭
  const response = NextResponse.next()
  addSecurityHeaders(response)

  return response
}

/**
 * CORS 檢查 - 確保請求來自允許的來源
 */
function checkCORS(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')

  // 本地開發或未設定環境變數時跳過
  if (!origin || !allowedOrigin) return null

  // 只檢查 Origin header（瀏覽器自動帶入）
  if (origin !== allowedOrigin) {
    console.warn(`🚨 CORS blocked: ${origin} (expected: ${allowedOrigin})`)
    return NextResponse.json(
      { error: 'Cross-origin request blocked' },
      { status: 403 }
    )
  }

  return null
}

/**
 * Rate Limiting - 分級頻率限制
 */
function checkRateLimit(request: NextRequest, pathname: string, method: string): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
             request.headers.get('x-real-ip') ||
             'unknown'

  // 🎯 分級策略
  let limit = 60 // 預設：60次/分鐘
  let windowMs = 60_000 // 1分鐘
  let key = `general:${pathname}`

  // P0: 認證相關（最嚴格）- 10次/分鐘
  if (pathname.startsWith('/api/auth/')) {
    limit = 10
    key = `auth:${ip}`
  }
  // P1: 寫入操作（嚴格）- 20次/分鐘
  else if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    limit = 20
    key = `write:${ip}:${pathname}`
  }
  // P2: 查詢操作（寬鬆）- 60次/分鐘
  else if (method === 'GET') {
    limit = 60
    key = `read:${ip}:${pathname}`
  }

  // 執行 Rate Limiting
  const now = Date.now()
  const bucket = rateLimitBuckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    // 建立新 bucket
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  if (bucket.count >= limit) {
    console.warn(`🚨 Rate limit exceeded: ${ip} -> ${pathname} (${bucket.count}/${limit})`)
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `請求過於頻繁，請稍後再試（${Math.ceil((bucket.resetAt - now) / 1000)}秒後重試）`
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((bucket.resetAt - now) / 1000))
        }
      }
    )
  }

  bucket.count++
  return null
}

/**
 * 安全標頭 - 加強瀏覽器防護
 */
function addSecurityHeaders(response: NextResponse) {
  // 防止點擊劫持
  response.headers.set('X-Frame-Options', 'DENY')

  // 防止 MIME 類型嗅探
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // XSS 保護（舊版瀏覽器）
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer 策略
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // 權限策略（限制瀏覽器功能）
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )
}

/**
 * Middleware 配置 - 指定要保護的路徑
 */
export const config = {
  matcher: [
    // 保護所有 API 路由
    '/api/:path*',

    // 排除靜態資源和 Next.js 內部路由
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
