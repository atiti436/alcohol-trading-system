'use client'

import React, { useState } from 'react'
import {
  Card,
  Tabs,
  Button,
  Space,
  Alert,
  Typography
} from 'antd'
import {
  BookOutlined,
  DollarOutlined,
  FileTextOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import { HideFromInvestor } from '@/components/auth/RoleGuard'
import AgeingAnalysisReport from '@/components/accounting/AgeingAnalysisReport'

const { Title } = Typography
const { TabPane } = Tabs

/**
 * 🧮 Room-4: 會計管理主頁面
 * 整合銷售會計、應收帳款管理和帳齡分析功能
 * 🔒 投資方只能查看有限的統計資訊
 */
export default function AccountingPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('ageing')

  // 投資方權限檢查
  if (session?.user?.role === 'INVESTOR') {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Alert
            message="權限說明"
            description="投資方角色可以查看帳齡分析統計，但無法存取詳細會計功能。"
            type="info"
            showIcon
          />
          <div style={{ marginTop: '24px' }}>
            <AgeingAnalysisReport />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOutlined />
            <Title level={3} style={{ margin: 0 }}>
              會計管理
            </Title>
          </div>
        }
        extra={
          <HideFromInvestor>
            <Space>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={() => {
                  // 導航到會計分錄頁面
                  window.open('/accounting/entries', '_blank')
                }}
              >
                會計分錄
              </Button>
              <Button
                icon={<DollarOutlined />}
                onClick={() => {
                  // 導航到應收帳款頁面
                  window.open('/accounting/receivables', '_blank')
                }}
              >
                應收管理
              </Button>
            </Space>
          </HideFromInvestor>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
        >
          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                帳齡分析
              </span>
            }
            key="ageing"
          >
            <AgeingAnalysisReport />
          </TabPane>

          <HideFromInvestor>
            <TabPane
              tab={
                <span>
                  <FileTextOutlined />
                  會計總覽
                </span>
              }
              key="overview"
            >
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Alert
                  message="會計總覽"
                  description="會計總覽功能開發中，將包含損益表、資產負債表等財務報表。"
                  type="info"
                />
              </div>
            </TabPane>
          </HideFromInvestor>

          <HideFromInvestor>
            <TabPane
              tab={
                <span>
                  <DollarOutlined />
                  收款管理
                </span>
              }
              key="payments"
            >
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Alert
                  message="收款管理"
                  description="收款管理功能已在應收帳款模組中實作，可透過上方按鈕存取。"
                  type="info"
                />
              </div>
            </TabPane>
          </HideFromInvestor>
        </Tabs>
      </Card>
    </div>
  )
}