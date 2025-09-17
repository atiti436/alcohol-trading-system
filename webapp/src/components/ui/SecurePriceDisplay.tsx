'use client'

import React from 'react'
import { useSession } from 'next-auth/react'
import { Tooltip } from 'antd'
import { EyeInvisibleOutlined } from '@ant-design/icons'

interface SecurePriceDisplayProps {
  amount: number
  currency?: string
  allowedRoles?: string[]
  fallback?: React.ReactNode
  showFallbackIcon?: boolean
  precision?: number
  displayMultiplier?: number // 投資方看到的金額倍數 (例如 0.8 = 80%)
  className?: string
  style?: React.CSSProperties
}

/**
 * 🔒 安全金額顯示組件
 * 根據用戶角色控制金額的顯示
 * 投資方看到調整後的金額，保護真實成本
 */
export function SecurePriceDisplay({
  amount,
  currency = '',
  allowedRoles = ['SUPER_ADMIN', 'EMPLOYEE'],
  fallback = '***',
  showFallbackIcon = true,
  precision = 0,
  displayMultiplier = 0.8, // 投資方預設看到80%
  className = '',
  style = {}
}: SecurePriceDisplayProps) {
  const { data: session } = useSession()

  if (!session?.user) {
    return (
      <span className={className} style={style}>
        {fallback}
      </span>
    )
  }

  const userRole = session.user.role

  // 檢查是否有權限看到真實金額
  const canViewRealAmount = allowedRoles.includes(userRole)

  // 決定顯示的金額
  const displayAmount = canViewRealAmount ? amount : amount * displayMultiplier

  // 格式化金額
  const formattedAmount = displayAmount.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  })

  // 如果沒有權限看真實金額
  if (!canViewRealAmount) {
    return (
      <Tooltip title="顯示金額已根據您的權限調整">
        <span className={className} style={{ ...style, color: '#1890ff' }}>
          {currency} {formattedAmount}
          {showFallbackIcon && (
            <EyeInvisibleOutlined style={{ marginLeft: '4px', fontSize: '12px' }} />
          )}
        </span>
      </Tooltip>
    )
  }

  // 有權限看真實金額
  return (
    <span className={className} style={style}>
      {currency} {formattedAmount}
    </span>
  )
}

/**
 * 🔒 投資方隱藏金額組件
 * 投資方完全看不到金額，只顯示遮罩
 */
export function InvestorHiddenPrice({
  amount,
  currency = '',
  fallback = '機密',
  className = '',
  style = {}
}: {
  amount: number
  currency?: string
  fallback?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <SecurePriceDisplay
      amount={amount}
      currency={currency}
      allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
      fallback={fallback}
      showFallbackIcon={true}
      className={className}
      style={style}
    />
  )
}

/**
 * 🔒 成本價格顯示組件
 * 成本相關金額只有超級管理員能看到
 */
export function CostPriceDisplay({
  amount,
  currency = '',
  fallback = '***',
  className = '',
  style = {}
}: {
  amount: number
  currency?: string
  fallback?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <SecurePriceDisplay
      amount={amount}
      currency={currency}
      allowedRoles={['SUPER_ADMIN']}
      fallback={fallback}
      showFallbackIcon={true}
      className={className}
      style={style}
    />
  )
}

/**
 * 🔒 毛利潤顯示組件
 * 計算並顯示毛利潤，投資方看不到真實數據
 */
export function ProfitMarginDisplay({
  revenue,
  cost,
  currency = '',
  showPercentage = true,
  className = '',
  style = {}
}: {
  revenue: number
  cost: number
  currency?: string
  showPercentage?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const { data: session } = useSession()

  if (!session?.user) {
    return <span className={className} style={style}>***</span>
  }

  const userRole = session.user.role
  const canViewRealProfit = ['SUPER_ADMIN', 'EMPLOYEE'].includes(userRole)

  // 投資方看到假的毛利數據
  const displayRevenue = canViewRealProfit ? revenue : revenue * 0.8
  const displayCost = canViewRealProfit ? cost : cost * 0.8

  const profit = displayRevenue - displayCost
  const profitMargin = displayRevenue > 0 ? (profit / displayRevenue) * 100 : 0

  const formattedProfit = profit.toLocaleString()
  const formattedMargin = profitMargin.toFixed(1)

  if (!canViewRealProfit) {
    return (
      <Tooltip title="顯示數據已根據您的權限調整">
        <span className={className} style={{ ...style, color: '#1890ff' }}>
          {currency} {formattedProfit}
          {showPercentage && ` (${formattedMargin}%)`}
          <EyeInvisibleOutlined style={{ marginLeft: '4px', fontSize: '12px' }} />
        </span>
      </Tooltip>
    )
  }

  return (
    <span className={className} style={style}>
      {currency} {formattedProfit}
      {showPercentage && ` (${formattedMargin}%)`}
    </span>
  )
}