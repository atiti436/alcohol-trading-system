import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { Role, PermissionContext } from '@/types/auth'

export type NextApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void> | void

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
        investorId: session.user.investorId
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