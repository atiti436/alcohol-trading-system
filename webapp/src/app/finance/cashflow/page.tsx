import { Suspense } from 'react'
import { Metadata } from 'next'
import { Card, Spin } from 'antd'
import CashFlowManager from '@/components/finance/CashFlowManager'

export const metadata: Metadata = {
  title: '收支記錄 - 酒類交易系統',
  description: '簡單收支記錄管理，區分投資方與個人墊付'
}

export default function CashFlowPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f0f2f5',
      padding: '24px',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: '1200px' }}>
        <Suspense fallback={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh'
          }}>
            <Card style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>載入收支記錄中...</div>
            </Card>
          </div>
        }>
          <CashFlowManager />
        </Suspense>
      </div>
    </div>
  )
}