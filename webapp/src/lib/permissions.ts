/**
 * 權限檢查輔助函數
 * Phase 4: API 層級權限控制
 */

import { Role } from '@/types/auth'
import { Warehouse } from '@prisma/client'

/**
 * 檢查用戶是否可以訪問指定倉庫
 * @param userRole 用戶角色
 * @param warehouse 倉庫類型
 * @returns 是否有權限
 */
export function canAccessWarehouse(userRole: string, warehouse: Warehouse): boolean {
  // INVESTOR 只能訪問公司倉
  if (userRole === Role.INVESTOR) {
    return warehouse === 'COMPANY'
  }

  // SUPER_ADMIN 和 EMPLOYEE 可以訪問所有倉庫
  if (userRole === Role.SUPER_ADMIN || userRole === Role.EMPLOYEE) {
    return true
  }

  // 其他角色無權限
  return false
}

/**
 * 檢查用戶是否可以看到實際售價
 * @param userRole 用戶角色
 * @returns 是否可以看到實際售價
 */
export function canViewActualPrice(userRole: string): boolean {
  // 只有 SUPER_ADMIN 和 EMPLOYEE 可以看到實際售價
  return userRole === Role.SUPER_ADMIN || userRole === Role.EMPLOYEE
}

/**
 * 檢查用戶是否可以修改價格
 * @param userRole 用戶角色
 * @param priceType 價格類型
 * @returns 是否可以修改
 */
export function canEditPrice(userRole: string, priceType: 'cost' | 'investor' | 'actual'): boolean {
  switch (priceType) {
    case 'cost':
      // 成本價：SUPER_ADMIN 和 EMPLOYEE 可以修改
      return userRole === Role.SUPER_ADMIN || userRole === Role.EMPLOYEE

    case 'investor':
      // 投資方價：INVESTOR、SUPER_ADMIN、EMPLOYEE 都可以修改
      return userRole === Role.INVESTOR || userRole === Role.SUPER_ADMIN || userRole === Role.EMPLOYEE

    case 'actual':
      // 實際售價：只有 SUPER_ADMIN 和 EMPLOYEE 可以修改
      return userRole === Role.SUPER_ADMIN || userRole === Role.EMPLOYEE

    default:
      return false
  }
}

/**
 * 過濾數據中的敏感欄位（根據角色）
 * @param data 原始數據
 * @param userRole 用戶角色
 * @returns 過濾後的數據
 */
export function filterSensitiveFields<T extends Record<string, any>>(
  data: T,
  userRole: string
): Partial<T> {
  const filtered = { ...data }

  // INVESTOR 看不到實際售價
  if (userRole === Role.INVESTOR) {
    delete filtered.actual_price
    delete filtered.actual_amount
    delete filtered.actual_total_price
    delete filtered.commission
  }

  return filtered
}

/**
 * 構建倉庫過濾條件（根據角色）
 * @param userRole 用戶角色
 * @returns Prisma where 條件
 */
export function getWarehouseFilter(userRole: string): { warehouse?: Warehouse } | {} {
  // INVESTOR 只能看公司倉
  if (userRole === Role.INVESTOR) {
    return { warehouse: 'COMPANY' }
  }

  // 其他角色可以看所有倉庫
  return {}
}
