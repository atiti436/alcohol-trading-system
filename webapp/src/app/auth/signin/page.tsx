'use client'

import { signIn, getSession } from 'next-auth/react'
import { Button, Typography, Space } from 'antd'
import { GoogleOutlined, ShopOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const { Title, Text } = Typography

// 細緻「金粉」粒子層（效能友善）
function GoldenParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let width = canvas.clientWidth
    let height = canvas.clientHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const PARTICLES = 80
    const particles = Array.from({ length: PARTICLES }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.6 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      a: Math.random() * Math.PI * 2,
      tw: 0.6 + Math.random() * 0.8,
    }))

    const golds = ['#E6C200', '#F5D76E', '#D4AF37']

    const step = () => {
      ctx.clearRect(0, 0, width, height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.a += 0.02
        if (p.x < -5) p.x = width + 5
        if (p.x > width + 5) p.x = -5
        if (p.y < -5) p.y = height + 5
        if (p.y > height + 5) p.y = -5

        const alpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(p.a * p.tw))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = hexToRgba(golds[(p as any)._ci ?? ((p as any)._ci = (Math.random() * golds.length) | 0)], alpha)
        ctx.fill()
      }
      animRef.current = requestAnimationFrame(step)
    }
    step()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
}

function hexToRgba(hex: string, a: number) {
  const h = hex.replace('#', '')
  const bigint = parseInt(h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export default function SignIn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 已登入則導向
    getSession().then((session) => {
      if (session) router.push('/dashboard')
    })
  }, [router])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('google', { callbackUrl: '/dashboard', redirect: true })
    } catch (error) {
      console.error('登入失敗:', error)
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      {/* 背景漸層 + 高光 */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background:
            'linear-gradient(180deg,#FAFAFB 0%, #F4F6F8 50%, #F9FAFB 100%), radial-gradient(1200px 600px at 10% -10%, rgba(255,255,255,0.8), rgba(255,255,255,0) 60%)',
        }}
      />

      {/* 金粉粒子層 */}
      <GoldenParticles />

      {/* 兩欄容器 */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: 32,
          alignItems: 'center',
          padding: '48px 32px',
        }}
      >
        {/* 左側品牌/標語（桌機顯示）*/}
        <div style={{ display: 'none', gap: 16, flexDirection: 'column' as const, maxWidth: 560 }} className="signin-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShopOutlined className="text-4xl text-blue-500" />
            <Title level={2} style={{ margin: 0 }}>酒類進口貿易系統</Title>
          </div>
          <Text className="text-gray-600 text-lg">
            精準、順暢、具備擴充性的貿易營運中樞。
          </Text>
          <Space direction="vertical" size={8}>
            <Text type="secondary">• AI 單據辨識與匯入</Text>
            <Text type="secondary">• 智慧庫存與採購流程</Text>
            <Text type="secondary">• 客戶、報價、對帳一體化</Text>
          </Space>
        </div>

        {/* 右側玻璃擬態登入卡 */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '100%', maxWidth: 420,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(255,255,255,0.35)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              padding: '36px 28px'
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <ShopOutlined className="text-[44px] text-blue-500 mb-2" />
                <Title level={3} style={{ margin: 0 }}>歡迎登入</Title>
                <Text type="secondary">Alcohol Trading Management System</Text>
              </div>

              <Button
                type="primary"
                size="large"
                icon={<GoogleOutlined />}
                loading={loading}
                onClick={handleGoogleSignIn}
                style={{ width: '100%', height: 48, fontSize: 16, borderRadius: 10 }}
              >
                使用 Google 帳戶登入
              </Button>

              <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                登入即表示您同意本系統之條款與隱私政策
              </Text>
            </Space>
          </div>
        </div>
      </div>

      {/* 手機版顯示左側內容：用簡單 CSS 控制 */}
      <style jsx global>{`
        @media (min-width: 992px) {
          .signin-left { display: flex !important; }
        }
        @media (max-width: 991px) {
          .signin-left { display: none !important; }
          div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; padding: 32px 16px !important; }
        }
      `}</style>
    </div>
  )
}

