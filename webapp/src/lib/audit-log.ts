import { prisma } from '@/lib/prisma'
import { Role } from '@/types/auth'
import { AuditAction, AuditResourceType } from '@prisma/client'

// 統一的資源類型映射，確保與 Prisma schema 一致
const RESOURCE_TYPE_MAP: Record<string, AuditResourceType> = {
  'USERS': AuditResourceType.USERS,
  'CUSTOMERS': AuditResourceType.CUSTOMERS,
  'PRODUCTS': AuditResourceType.PRODUCTS,
  'SALES': AuditResourceType.SALES,
  'PURCHASES': AuditResourceType.PURCHASES,
  'INVENTORY': AuditResourceType.INVENTORY,
  'SETTINGS': AuditResourceType.SETTINGS,
  'REPORTS': AuditResourceType.REPORTS,
  'LINEBOT': AuditResourceType.LINEBOT
}

export interface AuditLogEntry {
  id?: string
  user_id: string
  user_email: string
  user_role: Role
  action: AuditAction
  resource_type: AuditResourceType
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
      // 寫入審計日誌表
      const auditLog = await prisma.auditLog.create({
        data: {
          user_id: entry.user_id,
          user_email: entry.user_email,
          user_role: entry.user_role,
          action: entry.action,
          resource_type: entry.resource_type,
          resource_id: entry.resource_id,
          details: entry.details || {},
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          additional_info: {}
        }
      })

      // 開發環境同時記錄到控制台
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [AUDIT LOG]', JSON.stringify(auditLog, null, 2))
      }

      return auditLog
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
    resourceType: 'USERS' | 'CUSTOMERS' | 'PRODUCTS' | 'SALES' | 'PURCHASES' | 'INVENTORY' | 'SETTINGS' | 'REPORTS' | 'LINEBOT'
    resourceId?: string
    sensitiveFields?: string[]
    ipAddress?: string
    userAgent?: string
  }) {
    const auditAction = params.action === 'READ' ? AuditAction.SENSITIVE_ACCESS :
                      params.action === 'WRITE' ? AuditAction.WRITE :
                      AuditAction.DELETE

    return AuditLogger.log({
      user_id: params.userId,
      user_email: params.userEmail,
      user_role: params.userRole,
      action: auditAction,
      resource_type: RESOURCE_TYPE_MAP[params.resourceType],
      resource_id: params.resourceId,
      details: {
        sensitive_fields: params.sensitiveFields,
        operation: `SENSITIVE_${params.action}`,
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
    return AuditLogger.log({
      user_id: params.operatorId,
      user_email: params.operatorEmail,
      user_role: params.operatorRole,
      action: AuditAction.PERMISSION_CHANGE,
      resource_type: AuditResourceType.USERS,
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
    return AuditLogger.log({
      user_id: params.userId,
      user_email: params.userEmail,
      user_role: params.userRole,
      action: AuditAction.DATA_FILTERING,
      resource_type: RESOURCE_TYPE_MAP[params.resourceType] || AuditResourceType.REPORTS,
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
