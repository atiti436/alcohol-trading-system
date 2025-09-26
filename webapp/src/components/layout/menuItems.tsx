'use client'

import React from 'react'
import Link from 'next/link'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  TruckOutlined,
  FileSearchOutlined,
  RobotOutlined,
  TeamOutlined,
  CreditCardOutlined
} from '@ant-design/icons'
import { Role } from '@/types/auth'

export interface MenuItemConfig {
  key: string
  path: string
  label: string
  icon: React.ReactNode
  roles?: Role[] // 若省略則所有角色可見
}

export const MENU_ITEMS: Record<string, MenuItemConfig> = {
  '/dashboard': {
    key: '/dashboard',
    path: '/dashboard',
    label: '首頁總覽',
    icon: <DashboardOutlined />,
  },
  '/customers': {
    key: '/customers',
    path: '/customers',
    label: '客戶管理',
    icon: <UserOutlined />,
  },
  '/products': {
    key: '/products',
    path: '/products',
    label: '商品管理',
    icon: <ShoppingOutlined />,
  },
  '/quotations': {
    key: '/quotations',
    path: '/quotations',
    label: '報價管理',
    icon: <FileTextOutlined />,
  },
  '/purchases': {
    key: '/purchases',
    path: '/purchases',
    label: '採購管理',
    icon: <ShoppingOutlined />,
    roles: [Role.SUPER_ADMIN, Role.EMPLOYEE]
  },
  '/imports': {
    key: '/imports',
    path: '/imports',
    label: '進貨管理',
    icon: <FileTextOutlined />,
    roles: [Role.SUPER_ADMIN, Role.EMPLOYEE]
  },
  '/inventory': {
    key: '/inventory',
    path: '/inventory',
    label: '庫存管理',
    icon: <ShoppingOutlined />,
    roles: [Role.SUPER_ADMIN, Role.EMPLOYEE]
  },
  '/sales': {
    key: '/sales',
    path: '/sales',
    label: '銷售管理',
    icon: <ShoppingCartOutlined />,
  },
  '/reports': {
    key: '/reports',
    path: '/reports',
    label: '報表分析',
    icon: <BarChartOutlined />,
  },
  '/settings': {
    key: '/settings',
    path: '/settings',
    label: '系統設定',
    icon: <SettingOutlined />,
    roles: [Role.SUPER_ADMIN]
  },
  '/shipping': {
    key: '/shipping',
    path: '/shipping',
    label: '出貨管理',
    icon: <TruckOutlined />,
  },
  '/statements': {
    key: '/statements',
    path: '/statements',
    label: '對帳管理',
    icon: <FileSearchOutlined />,
  },
  '/finance': {
    key: '/finance',
    path: '/finance',
    label: '財務管理',
    icon: <BarChartOutlined />,
  },
  '/finance/cashflow': {
    key: '/finance/cashflow',
    path: '/finance/cashflow',
    label: '收支記錄',
    icon: <FileTextOutlined />,
  },
  '/finance/payables': {
    key: '/finance/payables',
    path: '/finance/payables',
    label: '應付帳款',
    icon: <CreditCardOutlined />,
    roles: [Role.SUPER_ADMIN]
  },
}

export function buildMenuItems(keys: string[], role: Role, opts?: {
  useLinkLabel?: boolean
  onClickPath?: (path: string) => void
}): MenuProps['items'] {
  const { useLinkLabel = false, onClickPath } = opts || {}

  const items = keys
    .map(key => MENU_ITEMS[key])
    .filter(Boolean)
    .filter(item => !item.roles || item.roles.includes(role))

  // 處理財務模組的子選單結構
  const processedItems: any[] = []
  const financeSubItems: any[] = []

  items.forEach(item => {
    if (item.key === '/finance') {
      // 財務總覽作為主選項
      processedItems.push({
        key: item.key,
        icon: item.icon,
        label: item.label, // 不用Link，純文字
        children: [] // 先建立空的子選單，稍後填入
      })
    } else if (item.key.startsWith('/finance/') || item.key === '/statements') {
      // 財務子功能：收支記錄、應付帳款、對帳管理
      financeSubItems.push({
        key: item.key,
        icon: item.icon,
        label: item.label, // 不用Link，純文字
        onClick: onClickPath ? () => onClickPath(item.path) : undefined
      })
    } else {
      // 其他選單項目
      processedItems.push({
        key: item.key,
        icon: item.icon,
        label: item.label, // 不用Link，純文字
        onClick: onClickPath ? () => onClickPath(item.path) : undefined
      })
    }
  })

  // 如果有財務子選單，將它們加入到財務主選單下
  if (financeSubItems.length > 0) {
    const financeMainIndex = processedItems.findIndex(item => item.key === '/finance')
    if (financeMainIndex !== -1) {
      processedItems[financeMainIndex] = {
        ...processedItems[financeMainIndex],
        children: financeSubItems,
        onClick: onClickPath ? () => onClickPath('/finance') : undefined // 主選單也能點擊
      }
    }
  }

  return processedItems
}
