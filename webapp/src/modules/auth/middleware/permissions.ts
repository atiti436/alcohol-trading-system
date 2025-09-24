import { NextRequest, NextResponse } from 'next/server'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { Role, PermissionContext } from '@/types/auth'

export type NextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void> | void

export type AppRouteHandler = (
  req: NextRequest,
  res: NextResponse,
  context: PermissionContext
) => Promise<NextResponse> | NextResponse

/**
 * 權限檢查中間件
 * @param handler 原始API處理函數
 * @param requiredRoles 必要的角色權限
 * @returns 包裝後的API處理函數
 */
export function withAuth(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    context: PermissionContext
  ) => Promise<void> | void,
  requiredRoles?: Role[]
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // 1. 驗證Session
      const session = await getServerSession(req, res, authOptions)

      if (!session || !session.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '請先登入'
          }
        })
      }

      // 2. 檢查使用者角色權限
      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(session.user.role)) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: '權限不足'
            }
          })
        }
      }

      // 3. 建立權限上下文
      const context: PermissionContext = {
        userId: session.user.id,
        role: session.user.role,
        investor_id: session.user.investor_id
      }

      // 4. 執行原始handler並注入權限上下文
      return await handler(req, res, context)

    } catch (error) {
      console.error('權限檢查中間件錯誤:', error)
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '內部伺服器錯誤'
        }
      })
    }
  }
}

/**
 * 僅超級管理員權限
 */
export function withSuperAdmin(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    context: PermissionContext
  ) => Promise<void> | void
) {
  return withAuth(handler, [Role.SUPER_ADMIN])
}

/**
 * 管理員或投資方權限
 */
export function withAdminOrInvestor(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    context: PermissionContext
  ) => Promise<void> | void
) {
  return withAuth(handler, [Role.SUPER_ADMIN, Role.INVESTOR])
}

/**
 * 所有已認證使用者
 */
export function withAuthenticated(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    context: PermissionContext
  ) => Promise<void> | void
) {
  return withAuth(handler)
}

/**
 * App Router 版本的權限檢查中間件
 * @param handler App Router處理函數
 * @param requiredRoles 必要的角色權限
 * @returns 包裝後的處理函數
 */
export function withAppAuth(
  handler: AppRouteHandler,
  requiredRoles?: Role[]
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    try {
      // 1. 驗證Session
      const session = await getServerSession(authOptions)

      if (!session || !session.user) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '請先登入'
          }
        }, { status: 401 })
      }

      // 2. 檢查使用者角色權限
      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(session.user.role)) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: '權限不足'
            }
          }, { status: 403 })
        }
      }

      // 3. 建立權限上下文
      const context: PermissionContext = {
        userId: session.user.id,
        role: session.user.role,
        investor_id: session.user.investor_id
      }

      // 4. 執行原始handler並注入權限上下文
      return await handler(req, new NextResponse(), context)

    } catch (error) {
      console.error('權限檢查中間件錯誤:', error)
      return NextResponse.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '內部伺服器錯誤'
        }
      }, { status: 500 })
    }
  }
}

/**
 * App Router版本 - 僅允許非 PENDING 的已認證使用者
 * 多數受保護 API 應使用此包裝，避免待審核帳號呼叫內部API。
 */
export function withAppActiveUser(
  handler: AppRouteHandler,
  requiredRoles?: Role[]
): (req: NextRequest) => Promise<NextResponse> {
  return withAppAuth(async (req, res, context) => {
    if (context.role === Role.PENDING) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '帳戶待審核，暫無權限'
        }
      }, { status: 403 })
    }
    return handler(req, res, context)
  }, requiredRoles)
}

/**
 * App Router版本 - 僅超級管理員權限
 */
export function withAppSuperAdmin(handler: AppRouteHandler) {
  return withAppAuth(handler, [Role.SUPER_ADMIN])
}

/**
 * App Router版本 - 管理員或投資方權限
 */
export function withAppAdminOrInvestor(handler: AppRouteHandler) {
  return withAppAuth(handler, [Role.SUPER_ADMIN, Role.INVESTOR])
}

/**
 * App Router版本 - 所有已認證使用者
 */
export function withAppAuthenticated(handler: AppRouteHandler) {
  return withAppAuth(handler)
}
