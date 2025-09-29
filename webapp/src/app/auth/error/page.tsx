'use client'

import { Suspense } from 'react'
import { Typography, Button } from 'antd'
import { useRouter, useSearchParams } from 'next/navigation'

const { Title, Text } = Typography

function ErrorContent() {
  const router = useRouter()
  const params = useSearchParams()
  const reason = params.get('reason')

  const message = reason === 'deactivated'
    ? '您的帳號已被停用，若需使用請聯絡管理員'
    : '登入發生錯誤，請稍後再試'

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
        <Title level={3} style={{ marginBottom: 8 }}>登入錯誤</Title>
        <Text type="secondary">{message}</Text>
        <div style={{ marginTop: 24 }}>
          <Button type="primary" onClick={() => router.push('/auth/signin')}>返回登入</Button>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>載入中...</div>}>
      <ErrorContent />
    </Suspense>
  )
}

