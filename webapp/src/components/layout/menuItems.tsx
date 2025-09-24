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
  TeamOutlined
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
  '/linebot': {
    key: '/linebot',
    path: '/linebot',
    label: 'LINE BOT助手',
    icon: <RobotOutlined />,
  },
  '/users': {
    key: '/users',
    path: '/users',
    label: '用戶管理',
    icon: <TeamOutlined />,
    roles: [Role.SUPER_ADMIN]
  },
  '/admin': {
    key: '/admin',
    path: '/admin',
    label: '系統管理',
    icon: <SettingOutlined />,
    roles: [Role.SUPER_ADMIN]
  }
}

export function buildMenuItems(keys: string[], role: Role, opts?: {
  useLinkLabel?: boolean
  onClickPath?: (path: string) => void
}): MenuProps['items'] {
  const { useLinkLabel = false, onClickPath } = opts || {}

  return keys
    .map(key => MENU_ITEMS[key])
    .filter(Boolean)
    .filter(item => !item.roles || item.roles.includes(role))
    .map(item => ({
      key: item.key,
      icon: item.icon,
      label: useLinkLabel
        ? (<Link href={item.path}>{item.label}</Link>)
        : item.label,
      onClick: useLinkLabel || !onClickPath ? undefined : () => onClickPath(item.path)
    }))
}
