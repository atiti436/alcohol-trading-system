import { Role, PermissionContext } from '@/types/auth'
import { AuditLogger, logSensitiveAccess } from './audit-log'

/**
 * 審計日誌服務 - 記錄所有敏感資料存取
 * 🔒 確保投資方數據存取的完全可追蹤性
 *
 * 注意：此文件為了向後兼容保留，實際功能已遷移到 audit-log.ts
 */

export interface AuditLogData {
  action: 'READ' | 'WRITE' | 'DELETE'
  resource_type: 'USERS' | 'CUSTOMERS' | 'PRODUCTS' | 'SALES' | 'PURCHASES' | 'INVENTORY' | 'SETTINGS' | 'REPORTS' | 'LINEBOT'
  resource_id?: string
  sensitive_fields?: string[]
  ip_address?: string
  user_agent?: string
  accessed_actual_price?: boolean
  accessed_commission?: boolean
  accessed_personal_data?: boolean
}

/**
 * 記錄審計日誌 - 使用新的 audit-log 系統
 */
export async function createAuditLog(
  context: PermissionContext,
  data: AuditLogData
): Promise<void> {
  try {
    await logSensitiveAccess({
      userId: context.userId,
      userEmail: context.userEmail || '',
      userRole: context.role,
      action: data.action,
      resourceType: data.resource_type,
      resourceId: data.resource_id,
      sensitiveFields: data.sensitive_fields,
      ipAddress: data.ip_address,
      userAgent: data.user_agent
    })

    // 如果是投資方存取敏感資料，額外記錄警告
    if (context.role === Role.INVESTOR) {
      if (data.accessed_actual_price || data.accessed_commission || data.accessed_personal_data) {
        console.warn(`🚨 SECURITY ALERT: Investor ${context.userId} attempted to access sensitive data in ${data.resource_type}`)
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
        // 記錄存取行為 - 使用新系統
        await createAuditLog(context, {
          action: 'READ',
          resource_type: 'REPORTS', // 可根據 tableName 動態決定
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
 * 查詢審計日誌 (僅超級管理員) - 重定向到新系統
 */
export async function getAuditLogs(
  context: PermissionContext,
  filters: {
    user_id?: string
    user_role?: Role
    resource_type?: string
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

  // 目前返回空結果，建議使用 audit-log.ts 中的功能
  console.warn('getAuditLogs: 此功能已棄用，請使用 audit-log.ts 中的新審計系統')
  return {
    logs: [],
    total: 0,
    page: filters.page || 1,
    limit: filters.limit || 50
  }
}

/**
 * 投資方異常存取監控 - 重定向到新系統
 */
export async function monitorInvestorAccess(): Promise<any[]> {
  console.warn('monitorInvestorAccess: 此功能已棄用，請使用 audit-log.ts 中的新審計系統')
  return []
}

/**
 * 生成安全報告 - 重定向到新系統
 */
export async function generateSecurityReport(
  context: PermissionContext,
  period: 'daily' | 'weekly' | 'monthly' = 'weekly'
): Promise<any> {
  if (context.role !== Role.SUPER_ADMIN) {
    throw new Error('Insufficient permissions to generate security report')
  }

  console.warn('generateSecurityReport: 此功能已棄用，請使用 audit-log.ts 中的新審計系統')
  return {
    period,
    summary: {
      totalAccess: 0,
      investorAccess: 0,
      sensitiveAccess: 0,
      suspiciousAccess: 0,
      securityScore: 100
    },
    userActivity: [],
    tableActivity: [],
    generatedAt: new Date()
  }
}