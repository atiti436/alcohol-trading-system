'use client'

import React, { useState } from 'react'
import { Layout } from 'antd'
import Navigation from './Navigation'
import { useSession } from 'next-auth/react'

const { Content } = Layout

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa'
      }}>
        <div>載入中...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null // 將由頁面重定向處理
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navigation collapsed={collapsed} onCollapse={setCollapsed} />

      {/* 桌面版內容區域 */}
      <Layout className="hidden md:block" style={{
        marginLeft: collapsed ? 80 : 240,
        transition: 'margin-left 0.2s'
      }}>
        <Content style={{
          margin: 0,
          padding: 24,
          background: '#fafafa',
          minHeight: '100vh',
        }}>
          {children}
        </Content>
      </Layout>

      {/* 手機版內容區域 */}
      <Layout className="block md:hidden">
        <Content style={{
          marginTop: 64, // 為固定頂部導航留空間
          padding: 16,
          background: '#fafafa',
          minHeight: 'calc(100vh - 64px)',
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}