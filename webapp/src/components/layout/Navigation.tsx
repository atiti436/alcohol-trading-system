'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Badge,
  Button,
  Drawer
} from 'antd'
import {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuOutlined,
  TruckOutlined,
  FileSearchOutlined,
  RobotOutlined
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { buildMenuItems } from './menuItems'

const { Sider } = Layout

interface NavigationProps {
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

export default function Navigation({ collapsed = false, onCollapse }: NavigationProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // 根據用戶角色顯示不同菜單
  const getMenuItems = (): MenuProps['items'] => {
    const role = (session?.user?.role || 'EMPLOYEE') as any
    const keys = ['/dashboard','/products','/customers','/imports','/sales','/shipping','/statements','/finance/cashflow','/reports','/linebot']
    if (role === 'SUPER_ADMIN') keys.push('/admin')
    return buildMenuItems(keys, role, { useLinkLabel: true })
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '個人資料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系統設定',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      onClick: () => signOut({ callbackUrl: '/' }),
    },
  ]

  const handleMenuClick = () => {
    setMobileMenuOpen(false)
  }

  // 桌面版側邊導航
  const DesktopSider = () => (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={240}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        background: '#fafafa',
        borderRight: '1px solid #f0f0f0',
      }}
    >
      {/* Logo區域 */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 20px',
        borderBottom: '1px solid #f0f0f0',
        background: '#ffffff',
      }}>
        <ShoppingOutlined style={{
          fontSize: 24,
          color: '#007AFF',
          marginRight: collapsed ? 0 : 12
        }} />
        {!collapsed && (
          <span style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#2C2C2C'
          }}>
            酒類管理系統
          </span>
        )}
      </div>

      {/* 主導航菜單 */}
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        items={getMenuItems()}
        style={{
          border: 'none',
          background: '#fafafa',
          marginTop: 8,
        }}
        theme="light"
        onClick={handleMenuClick}
      />

      {/* 用戶信息區 (底部) */}
      {!collapsed && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px',
          borderTop: '1px solid #f0f0f0',
          background: '#ffffff',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <Avatar
              size="small"
              src={session?.user?.image}
              icon={<UserOutlined />}
              style={{ marginRight: 8 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#2C2C2C',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {session?.user?.name}
              </div>
              <div style={{
                fontSize: 12,
                color: '#8E8E93'
              }}>
                {session?.user?.role === 'SUPER_ADMIN' ? '老闆' :
                 session?.user?.role === 'INVESTOR' ? '投資方' : '員工'}
              </div>
            </div>
          </div>
          <Dropdown
            menu={{ items: userMenuItems }}
            trigger={['click']}
            placement="topLeft"
          >
            <Button
              type="text"
              size="small"
              style={{
                width: '100%',
                textAlign: 'left',
                color: '#8E8E93'
              }}
            >
              <SettingOutlined /> 設定
            </Button>
          </Dropdown>
        </div>
      )}
    </Sider>
  )

  // 手機版頂部導航
  const MobileHeader = () => (
    <div style={{
      height: 64,
      background: '#ffffff',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setMobileMenuOpen(true)}
          style={{ marginRight: 12 }}
        />
        <ShoppingOutlined style={{ fontSize: 20, color: '#007AFF', marginRight: 8 }} />
        <span style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2C' }}>
          酒類管理
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge count={3} size="small">
          <Button
            type="text"
            icon={<BellOutlined />}
            style={{ color: '#8E8E93' }}
          />
        </Badge>
        <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
          <Avatar
            size="small"
            src={session?.user?.image}
            icon={<UserOutlined />}
            style={{ cursor: 'pointer' }}
          />
        </Dropdown>
      </div>
    </div>
  )

  // 手機版抽屜菜單
  const MobileDrawer = () => (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ShoppingOutlined style={{ fontSize: 20, color: '#007AFF', marginRight: 8 }} />
          <span>酒類管理系統</span>
        </div>
      }
      placement="left"
      onClose={() => setMobileMenuOpen(false)}
      open={mobileMenuOpen}
      width={280}
      styles={{
        body: { padding: 0 },
        header: { borderBottom: '1px solid #f0f0f0' }
      }}
    >
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        items={getMenuItems()}
        style={{ border: 'none' }}
        onClick={handleMenuClick}
      />

      {/* 用戶信息 */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        borderTop: '1px solid #f0f0f0',
        background: '#fafafa',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <Avatar
            src={session?.user?.image}
            icon={<UserOutlined />}
            style={{ marginRight: 12 }}
          />
          <div>
            <div style={{ fontWeight: 500, color: '#2C2C2C' }}>
              {session?.user?.name}
            </div>
            <div style={{ fontSize: 12, color: '#8E8E93' }}>
              {session?.user?.role === 'SUPER_ADMIN' ? '老闆' :
               session?.user?.role === 'INVESTOR' ? '投資方' : '員工'}
            </div>
          </div>
        </div>
        <Button
          type="primary"
          block
          onClick={() => signOut({ callbackUrl: '/' })}
          icon={<LogoutOutlined />}
        >
          登出
        </Button>
      </div>
    </Drawer>
  )

  return (
    <>
      {/* 桌面版顯示 */}
      <div className="hidden md:block">
        <DesktopSider />
      </div>

      {/* 手機版顯示 */}
      <div className="block md:hidden">
        <MobileHeader />
        <MobileDrawer />
      </div>
    </>
  )
}
