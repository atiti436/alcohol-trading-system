'use client'

import React, { useState } from 'react'
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Space, Badge, MenuProps } from 'antd'
import { UserOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined, ShopOutlined } from '@ant-design/icons'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { Role } from '@/types/auth'
import { buildMenuItems } from './menuItems'

const { Sider, Content, Header } = Layout
const { Text } = Typography

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  // 依角色取用統一的選單鍵集合（避免索引位移）
  const getMenuKeysByRole = (userRole: Role): string[] => {
    if (userRole === Role.SUPER_ADMIN) {
      return ['/dashboard','/customers','/products','/quotations','/purchases','/imports','/inventory','/sales','/reports','/settings']
    }
    if (userRole === Role.INVESTOR) {
      return ['/dashboard','/customers','/products','/quotations','/sales','/reports']
    }
    return ['/dashboard','/customers','/products','/quotations','/purchases','/imports','/inventory']
  }

  // 使用者選單
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '個人設定',
      onClick: () => router.push('/profile')
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      onClick: () => signOut({ callbackUrl: '/auth/signin' })
    }
  ]

  // 角色顯示名稱
  const getRoleDisplayName = (role: Role) => {
    switch (role) {
      case Role.SUPER_ADMIN:
        return '超級管理員'
      case Role.INVESTOR:
        return '投資方'
      case Role.EMPLOYEE:
        return '員工'
      default:
        return '使用者'
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 側邊選單 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000
        }}
        theme="dark"
      >
        <div style={{
          height: 64,
          margin: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start'
        }}>
          <ShopOutlined style={{ color: '#1890ff', fontSize: 24 }} />
          {!collapsed && (
            <Text strong style={{ color: 'white', marginLeft: 8 }}>
              酒類貿易系統
            </Text>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={session?.user?.role ? buildMenuItems(getMenuKeysByRole(session.user.role), session.user.role as any, { onClickPath: (p) => router.push(p) }) : []}
        />
      </Sider>

      {/* 主要內容區域 */}
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        {/* 頂部導航 */}
        <Header
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            left: collapsed ? 80 : 200,
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            transition: 'left 0.2s'
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />

          <Space>
            {/* 通知鈴鐺 */}
            <Badge count={3} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ fontSize: '16px' }}
              />
            </Badge>

            {/* 使用者資訊 */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer', padding: '0 8px' }}>
                <Avatar
                  src={session?.user?.image}
                  icon={<UserOutlined />}
                  size={32}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Text strong style={{ fontSize: 14 }}>
                    {session?.user?.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {session?.user?.role ? getRoleDisplayName(session.user.role) : '載入中...'}
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* 主要內容 */}
        <Content
          style={{
            marginTop: 64,
            padding: 24,
            background: '#f5f5f5',
            minHeight: 'calc(100vh - 64px)'
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
