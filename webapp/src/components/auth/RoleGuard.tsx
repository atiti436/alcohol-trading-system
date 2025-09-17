'use client'

import React from 'react'
import { useSession } from 'next-auth/react'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
  blockedRoles?: string[]
  fallback?: React.ReactNode
  requireAuth?: boolean
}

/**
 * 🔒 角色權限保護組件
 * 根據用戶角色控制組件的顯示和隱藏
 * 確保敏感功能只對有權限的角色開放
 */
export function RoleGuard({
  children,
  allowedRoles = [],
  blockedRoles = [],
  fallback = null,
  requireAuth = true
}: RoleGuardProps) {
  const { data: session, status } = useSession()

  // 載入中狀態
  if (status === 'loading') {
    return fallback
  }

  // 需要驗證但未登入
  if (requireAuth && !session?.user) {
    return fallback
  }

  const userRole = session?.user?.role

  // 檢查是否在禁止角色列表中
  if (blockedRoles.length > 0 && userRole && blockedRoles.includes(userRole)) {
    return fallback
  }

  // 檢查是否在允許角色列表中
  if (allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      return fallback
    }
  }

  // 通過權限檢查，顯示內容
  return <>{children}</>
}

/**
 * 🔒 投資方隱藏組件
 * 快捷方式：隱藏投資方不應該看到的內容
 */
export function HideFromInvestor({
  children,
  fallback = null
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <RoleGuard
      blockedRoles={['INVESTOR']}
      fallback={fallback}
      requireAuth={true}
    >
      {children}
    </RoleGuard>
  )
}

/**
 * 🔒 僅超級管理員可見組件
 * 快捷方式：只有SUPER_ADMIN能看到的敏感功能
 */
export function SuperAdminOnly({
  children,
  fallback = null
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <RoleGuard
      allowedRoles={['SUPER_ADMIN']}
      fallback={fallback}
      requireAuth={true}
    >
      {children}
    </RoleGuard>
  )
}

/**
 * 🔒 員工及以上權限組件
 * 快捷方式：SUPER_ADMIN和EMPLOYEE可見
 */
export function EmployeeAndAbove({
  children,
  fallback = null
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <RoleGuard
      allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
      fallback={fallback}
      requireAuth={true}
    >
      {children}
    </RoleGuard>
  )
}