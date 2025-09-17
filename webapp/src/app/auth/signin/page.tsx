'use client'

import { signIn, getSession } from 'next-auth/react'
import { Button, Card, Typography, Space, Divider } from 'antd'
import { GoogleOutlined, ShopOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography

export default function SignIn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 檢查是否已登入
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [router])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('google', {
        callbackUrl: '/dashboard',
        redirect: true
      })
    } catch (error) {
      console.error('登入失敗:', error)
      setLoading(false)
    }
  }

  if (!mounted) {
    return null // 避免 SSR hydration 問題
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}
        bodyStyle={{ padding: '40px 32px' }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          {/* Logo區域 */}
          <div>
            <ShopOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <Title level={2} style={{ margin: 0, color: '#262626' }}>
              酒類進口貿易系統
            </Title>
            <Text type="secondary">
              Alcohol Trading Management System
            </Text>
          </div>

          <Divider />

          {/* 登入區域 */}
          <div style={{ width: '100%' }}>
            <Title level={4} style={{ marginBottom: 24 }}>
              歡迎登入
            </Title>

            <Button
              type="primary"
              size="large"
              icon={<GoogleOutlined />}
              loading={loading}
              onClick={handleGoogleSignIn}
              style={{
                width: '100%',
                height: 48,
                fontSize: 16,
                borderRadius: 8
              }}
            >
              使用 Google 帳號登入
            </Button>

            <div style={{ marginTop: 24 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                登入即表示您同意我們的服務條款和隱私政策
              </Text>
            </div>
          </div>

          {/* 功能預覽 */}
          <div style={{ textAlign: 'left', width: '100%', marginTop: 20 }}>
            <Text strong style={{ color: '#595959' }}>系統功能：</Text>
            <ul style={{ margin: '8px 0', color: '#8c8c8c', fontSize: 12 }}>
              <li>AI 報單辨識與成本計算</li>
              <li>智慧庫存管理</li>
              <li>客戶分級報價系統</li>
              <li>LINE BOT 整合</li>
              <li>多角色權限控制</li>
            </ul>
          </div>
        </Space>
      </Card>
    </div>
  )
}