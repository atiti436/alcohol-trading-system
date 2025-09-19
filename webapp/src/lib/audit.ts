import { prisma } from '@/lib/prisma'
import { Role, PermissionContext } from '@/types/auth'

/**
 * 審計日誌服務 - 記錄所有敏感資料存取
 * 🔒 確保投資方數據存取的完全可追蹤性
 */

export interface AuditLogData {
  action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id?: string
  sensitive_fields?: Record<string, any>
  ip_address?: string
  user_agent?: string
  accessed_actual_price?: boolean
  accessed_commission?: boolean
  accessed_personal_data?: boolean
}

/**
 * 記錄審計日誌
 */
export async function createAuditLog(
  context: PermissionContext,
  data: AuditLogData
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: context.userId,
        user_email: '', // 需要從context或session獲取
        user_role: context.role,
        action: data.action,
        table_name: data.table_name,
        record_id: data.record_id,
        sensitive_fields: data.sensitive_fields,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        accessed_actual_price: data.accessed_actual_price || false,
        accessed_commission: data.accessed_commission || false,
        accessed_personal_data: data.accessed_personal_data || false
      }
    })

    // 如果是投資方存取敏感資料，額外記錄警告
    if (context.role === Role.INVESTOR) {
      if (data.accessed_actual_price || data.accessed_commission || data.accessed_personal_data) {
        console.warn(`🚨 SECURITY ALERT: Investor ${context.userId} attempted to access sensitive data in ${data.table_name}`)
      }
    }

  } catch (error) {
    console.error('審計日誌記錄失敗:', error)
    // 審計日誌失敗不應該影響主要業務邏輯，但要記錄錯誤
  }
}

/**
 * 敏感資料存取審計裝飾器
 */
export function auditSensitiveAccess(
  tableName: string,
  options: {
    checkActualPrice?: boolean
    checkCommission?: boolean
    checkPersonalData?: boolean
  } = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const context = args.find((arg: any) => arg.userId && arg.role) as PermissionContext

      if (context) {
        // 記錄存取行為
        await createAuditLog(context, {
          action: 'READ',
          table_name: tableName,
          accessed_actual_price: options.checkActualPrice,
          accessed_commission: options.checkCommission,
          accessed_personal_data: options.checkPersonalData
        })
      }

      return method.apply(this, args)
    }
  }
}

/**
 * 查詢審計日誌 (僅超級管理員)
 */
export async function getAuditLogs(
  context: PermissionContext,
  filters: {
    user_id?: string
    user_role?: Role
    table_name?: string
    date_from?: Date
    date_to?: Date
    sensitiveOnly?: boolean
    page?: number
    limit?: number
  } = {}
) {
  // 只有超級管理員可以查看審計日誌
  if (context.role !== Role.SUPER_ADMIN) {
    throw new Error('Insufficient permissions to view audit logs')
  }

  const {
    user_id,
    user_role,
    table_name,
    date_from,
    date_to,
    sensitiveOnly = false,
    page = 1,
    limit = 50
  } = filters

  const where: any = {}

  if (user_id) where.user_id = user_id
  if (user_role) where.user_role = user_role
  if (table_name) where.table_name = table_name
  if (date_from || date_to) {
    where.timestamp = {}
    if (date_from) where.timestamp.gte = date_from
    if (date_to) where.timestamp.lte = date_to
  }

  // 只顯示敏感資料存取
  if (sensitiveOnly) {
    where.OR = [
      { accessed_actual_price: true },
      { accessed_commission: true },
      { accessed_personal_data: true }
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ])

  return {
    logs,
    total,
    page,
    limit
  }
}

/**
 * 投資方異常存取監控
 */
export async function monitorInvestorAccess(): Promise<any[]> {
  // 查找投資方嘗試存取敏感資料的記錄
  const suspiciousActivities = await prisma.auditLog.findMany({
    where: {
      user_role: Role.INVESTOR,
      OR: [
        { accessed_actual_price: true },
        { accessed_commission: true },
        { accessed_personal_data: true }
      ],
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小時
      }
    },
    orderBy: { timestamp: 'desc' }
  })

  // 如果發現異常存取，可以觸發警報
  if (suspiciousActivities.length > 0) {
    console.warn(`🚨 Found ${suspiciousActivities.length} suspicious investor access attempts in the last 24 hours`)
  }

  return suspiciousActivities
}

/**
 * 生成安全報告
 */
export async function generateSecurityReport(
  context: PermissionContext,
  period: 'daily' | 'weekly' | 'monthly' = 'weekly'
): Promise<any> {
  if (context.role !== Role.SUPER_ADMIN) {
    throw new Error('Insufficient permissions to generate security report')
  }

  const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // 統計各類存取
  const [
    totalAccess,
    investorAccess,
    sensitiveAccess,
    suspiciousAccess
  ] = await Promise.all([
    prisma.auditLog.count({
      where: { timestamp: { gte: startDate } }
    }),
    prisma.auditLog.count({
      where: {
        user_role: Role.INVESTOR,
        timestamp: { gte: startDate }
      }
    }),
    prisma.auditLog.count({
      where: {
        timestamp: { gte: startDate },
        OR: [
          { accessed_actual_price: true },
          { accessed_commission: true },
          { accessed_personal_data: true }
        ]
      }
    }),
    prisma.auditLog.count({
      where: {
        user_role: Role.INVESTOR,
        timestamp: { gte: startDate },
        OR: [
          { accessed_actual_price: true },
          { accessed_commission: true },
          { accessed_personal_data: true }
        ]
      }
    })
  ])

  // 按用戶統計
  const userActivity = await prisma.auditLog.groupBy({
    by: ['user_id', 'user_role'],
    where: { timestamp: { gte: startDate } },
    _count: { id: true }
  })

  // 按表格統計
  const tableActivity = await prisma.auditLog.groupBy({
    by: ['table_name'],
    where: { timestamp: { gte: startDate } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  })

  return {
    period,
    summary: {
      totalAccess,
      investorAccess,
      sensitiveAccess,
      suspiciousAccess,
      securityScore: suspiciousAccess === 0 ? 100 : Math.max(0, 100 - (suspiciousAccess / investorAccess * 100))
    },
    userActivity,
    tableActivity,
    generatedAt: new Date()
  }
}
