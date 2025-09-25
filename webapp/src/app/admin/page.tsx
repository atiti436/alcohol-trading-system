'use client'

import React from 'react'
import { Card, Typography, Result, Button, Space, List } from 'antd'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

const { Title, Text } = Typography

export default function AdminPage() {
  const { data: session } = useSession()
  const role = session?.user?.role

  if (role !== 'SUPER_ADMIN') {
    return (
      <Result
        status="403"
        title="無權限"
        subTitle="此區僅限 SUPER_ADMIN 存取"
        extra={
          <Link href="/dashboard">
            <Button type="primary">返回總覽</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div style={{ padding: 0 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Title level={2}>系統管理</Title>
        <Card>
          <Text type="secondary">此頁面為系統管理的占位頁，提供 SUPER_ADMIN 進入後續管理模組的入口。可依需求逐步擴充以下功能：</Text>
          <List
            style={{ marginTop: 12 }}
            size="small"
            dataSource={[
              '權限與角色管理（與 /users 專頁協同）',
              '系統設定（與 /settings 區塊整合）',
              '稽核日誌與安全檢查',
              '營運監控與健康檢查',
            ]}
            renderItem={(item) => <List.Item>• {item}</List.Item>}
          />
        </Card>
      </Space>
    </div>
  )
}

