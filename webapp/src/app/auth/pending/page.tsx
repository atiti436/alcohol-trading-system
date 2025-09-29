'use client'

import { Typography, Button } from 'antd'
import { useRouter } from 'next/navigation'

const { Title, Text } = Typography

export default function PendingPage() {
  const router = useRouter()
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg,#FAFAFB 0%, #F4F6F8 50%, #F9FAFB 100%)', padding: 24
    }}>
      <div style={{
        width: '100%', maxWidth: 520, textAlign: 'center',
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.5)', borderRadius: 16, padding: '32px 28px'
      }}>
        <Title level={3} style={{ marginBottom: 8 }}>等待核准</Title>
        <Text type="secondary">
          您的帳號已提交申請，管理員會盡快審核。核准後系統將通知您，方可進入系統。
        </Text>
        <div style={{ marginTop: 24 }}>
          <Button type="primary" onClick={() => router.push('/auth/signin')}>返回登入</Button>
        </div>
      </div>
    </div>
  )
}

