import { prisma } from '@/lib/prisma'
import { Role } from '@/types/auth'

export interface AuditLogEntry {
  id?: string
  user_id: string
  user_email: string
  user_role: Role
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at?: Date
}

export class AuditLogger {
  /**
   * 記錄敏感操作的審計日誌
   */
  static async log(entry: Omit<AuditLogEntry, 'id' | 'created_at'>) {
    try {
      // 在實際環境中，這裡會寫入專門的審計日誌表
      // 目前先使用控制台記錄，後續可擴展為資料庫存儲
      const logEntry = {
        ...entry,
        created_at: new Date(),
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2)}`
      }

      // 記錄到控制台（開發環境）
      console.log('🔍 [AUDIT LOG]', JSON.stringify(logEntry, null, 2))

      // TODO: 在生產環境中應該寫入專門的審計日誌表
      // await prisma.auditLog.create({ data: logEntry })

      return logEntry
    } catch (error) {
      console.error('審計日誌記錄失敗:', error)
      // 審計日誌失敗不應該影響主要功能
      return null
    }
  }

  /**
   * 記錄敏感資料存取
   */
  static async logSensitiveAccess(params: {
    userId: string
    userEmail: string
    userRole: Role
    action: 'READ' | 'WRITE' | 'DELETE'
    resourceType: 'SALES' | 'CUSTOMERS' | 'INVENTORY' | 'USERS' | 'SETTINGS'
    resourceId?: string
    sensitiveFields?: string[]
    ipAddress?: string
    userAgent?: string
  }) {
    return this.log({
      user_id: params.userId,
      user_email: params.userEmail,
      user_role: params.userRole,
      action: `SENSITIVE_${params.action}`,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      details: {
        sensitive_fields: params.sensitiveFields,
        timestamp: new Date().toISOString()
      },
      ip_address: params.ipAddress,
      user_agent: params.userAgent
    })
  }

  /**
   * 記錄權限變更
   */
  static async logPermissionChange(params: {
    operatorId: string
    operatorEmail: string
    operatorRole: Role
    targetUserId: string
    targetUserEmail: string
    oldRole: Role
    newRole: Role
    ipAddress?: string
    userAgent?: string
  }) {
    return this.log({
      user_id: params.operatorId,
      user_email: params.operatorEmail,
      user_role: params.operatorRole,
      action: 'PERMISSION_CHANGE',
      resource_type: 'USER_ROLE',
      resource_id: params.targetUserId,
      details: {
        target_user_email: params.targetUserEmail,
        old_role: params.oldRole,
        new_role: params.newRole,
        timestamp: new Date().toISOString()
      },
      ip_address: params.ipAddress,
      user_agent: params.userAgent
    })
  }

  /**
   * 記錄資料過濾事件
   */
  static async logDataFiltering(params: {
    userId: string
    userEmail: string
    userRole: Role
    resourceType: string
    originalCount: number
    filteredCount: number
    filterCriteria: string[]
    ipAddress?: string
    userAgent?: string
  }) {
    return this.log({
      user_id: params.userId,
      user_email: params.userEmail,
      user_role: params.userRole,
      action: 'DATA_FILTERING',
      resource_type: params.resourceType,
      details: {
        original_count: params.originalCount,
        filtered_count: params.filteredCount,
        filter_criteria: params.filterCriteria,
        data_protection_active: true,
        timestamp: new Date().toISOString()
      },
      ip_address: params.ipAddress,
      user_agent: params.userAgent
    })
  }
}

// 便利的導出函數
export const auditLog = AuditLogger.log
export const logSensitiveAccess = AuditLogger.logSensitiveAccess
export const logPermissionChange = AuditLogger.logPermissionChange
export const logDataFiltering = AuditLogger.logDataFiltering