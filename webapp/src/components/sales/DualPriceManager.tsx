'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Divider,
  Alert,
  Tooltip,
  Tag,
  Typography,
  Row,
  Col
} from 'antd'
import {
  EyeInvisibleOutlined,
  DollarOutlined,
  CalculatorOutlined,
  LockOutlined,
  UnlockOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import { SuperAdminOnly, HideFromInvestor } from '@/components/auth/RoleGuard'
import { SecurePriceDisplay } from '@/components/common/SecurePriceDisplay'

const { Title, Text } = Typography

interface DualPriceManagerProps {
  product_id: string
  variantId?: string
  quantity: number
  basePrice: number // 商品基礎價格
  onPriceChange: (prices: {
    displayPrice: number      // 投資方看到的價格
    actualPrice: number       // 實際收取價格
    commission: number        // 老闆傭金
  }) => void
  disabled?: boolean
}

/**
 * 🔒 雙重價格管理組件
 * 核心功能：投資方隱藏機制 + 傭金計算
 *
 * 商業邏輯：
 * - 投資方看到: 成本800 → 售價1000 → 獲利200
 * - 實際情況: 成本800 → 實收1200 → 投資方1000 + 老闆200
 */
export function DualPriceManager({
  product_id,
  variantId,
  quantity,
  basePrice,
  onPriceChange,
  disabled = false
}: DualPriceManagerProps) {
  const { data: session } = useSession()
  const [form] = Form.useForm()

  // 價格狀態
  const [displayPrice, setDisplayPrice] = useState(basePrice) // 投資方看到的價格
  const [actualPrice, setActualPrice] = useState(basePrice)   // 實際收取價格
  const [commission, setCommission] = useState(0)              // 老闆傭金
  const [profitMargin, setProfitMargin] = useState(0)         // 利潤率

  // 價格計算
  const lastSentRef = useRef<{displayPrice:number; actualPrice:number; commission:number}>()

  useEffect(() => {
    const newCommission = actualPrice - displayPrice
    const newProfitMargin = displayPrice > 0 ? (newCommission / displayPrice) * 100 : 0

    setCommission(newCommission)
    setProfitMargin(newProfitMargin)

    // 回調父組件
    const payload = { displayPrice, actualPrice, commission: newCommission }
    const last = lastSentRef.current
    if (!last || last.displayPrice !== payload.displayPrice || last.actualPrice !== payload.actualPrice || last.commission !== payload.commission) {
      onPriceChange(payload)
      lastSentRef.current = payload
    }
  }, [displayPrice, actualPrice, onPriceChange])

  // 預設價格策略
  const applyPricingStrategy = (strategy: string) => {
    switch (strategy) {
      case 'standard':
        // 標準策略：顯示價格 = 基礎價格，實際價格 = 基礎價格 * 1.2
        setDisplayPrice(basePrice)
        setActualPrice(Math.round(basePrice * 1.2))
        break
      case 'premium':
        // 高端策略：顯示價格 = 基礎價格 * 1.1，實際價格 = 基礎價格 * 1.3
        setDisplayPrice(Math.round(basePrice * 1.1))
        setActualPrice(Math.round(basePrice * 1.3))
        break
      case 'transparent':
        // 透明策略：實際價格 = 顯示價格（無傭金）
        setDisplayPrice(basePrice)
        setActualPrice(basePrice)
        break
      default:
        break
    }
  }

  // 根據角色顯示不同的價格管理界面
  if (session?.user.role === 'INVESTOR') {
    // 投資方只能看到顯示價格，無法看到實際收取價格
    return (
      <Card
        size="small"
        title={
          <Space>
            <DollarOutlined />
            <span>價格資訊</span>
            <Tag color="blue">投資方視角</Tag>
          </Space>
        }
      >
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: '8px' }}>
              <Text strong>單價</Text>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
              NT$ {displayPrice.toLocaleString()}
            </div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: '8px' }}>
              <Text strong>小計</Text>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
              NT$ {(displayPrice * quantity).toLocaleString()}
            </div>
          </Col>
        </Row>

        <Divider />

        <Alert
          message="價格資訊"
          description="此價格為您的投資收益計算基準，實際交易條件以合約為準。"
          type="info"
          showIcon
          icon={<LockOutlined />}
        />
      </Card>
    )
  }

  // 員工和超級管理員的價格管理界面
  return (
    <Card
      size="small"
      title={
        <Space>
          <CalculatorOutlined />
          <span>雙重價格設定</span>
          <SuperAdminOnly>
            <Tag color="red">機密功能</Tag>
          </SuperAdminOnly>
        </Space>
      }
    >
      {/* 價格設定表單 */}
      <Form form={form} layout="vertical" disabled={disabled}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label={
                <Space>
                  <EyeInvisibleOutlined />
                  <span>顯示價格 (投資方看到)</span>
                </Space>
              }
            >
              <InputNumber
                style={{ width: '100%' }}
                value={displayPrice}
                onChange={(value) => setDisplayPrice(value || 0)}
                min={0}
                precision={0}
                formatter={(value) => `NT$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </Col>

          <SuperAdminOnly>
            <Col span={12}>
              <Form.Item
                label={
                  <Space>
                    <UnlockOutlined />
                    <span>實際收取價格</span>
                    <Tooltip title="只有超級管理員能設定不同的實際價格">
                      <LockOutlined style={{ color: '#faad14' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <InputNumber
                  style={{ width: '100%' }}
                  value={actualPrice}
                  onChange={(value) => setActualPrice(value || 0)}
                  min={displayPrice} // 實際價格不能低於顯示價格
                  precision={0}
                  formatter={(value) => `NT$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  />
              </Form.Item>
            </Col>
          </SuperAdminOnly>
        </Row>

        {/* 快速價格策略按鈕 */}
        <SuperAdminOnly>
          <div style={{ marginBottom: '16px' }}>
            <Text strong style={{ marginRight: '8px' }}>快速策略:</Text>
            <Space>
              <Button size="small" onClick={() => applyPricingStrategy('standard')}>
                標準 (+20%)
              </Button>
              <Button size="small" onClick={() => applyPricingStrategy('premium')}>
                高端 (+30%)
              </Button>
              <Button size="small" onClick={() => applyPricingStrategy('transparent')}>
                透明 (無傭金)
              </Button>
            </Space>
          </div>
        </SuperAdminOnly>
      </Form>

      <Divider />

      {/* 價格摘要 */}
      <Row gutter={16}>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '4px' }}>
              <Text type="secondary">顯示總價</Text>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
              NT$ {(displayPrice * quantity).toLocaleString()}
            </div>
          </Card>
        </Col>

        <SuperAdminOnly>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '4px' }}>
                <Text type="secondary">實收總價</Text>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                NT$ {(actualPrice * quantity).toLocaleString()}
              </div>
            </Card>
          </Col>

          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '4px' }}>
                <Text type="secondary">傭金</Text>
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: commission > 0 ? '#fa8c16' : '#666'
              }}>
                NT$ {(commission * quantity).toLocaleString()}
              </div>
              {profitMargin > 0 && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  +{profitMargin.toFixed(1)}%
                </div>
              )}
            </Card>
          </Col>
        </SuperAdminOnly>
      </Row>

      {/* 商業邏輯說明 */}
      <SuperAdminOnly>
        <Alert
          style={{ marginTop: '16px' }}
          message="雙重價格機制說明"
          description={
            <div>
              <p><strong>投資方視角:</strong> 成本 → 售價 NT${displayPrice.toLocaleString()} → 獲利 NT${Math.max(0, displayPrice - 800).toLocaleString()}</p>
              <p><strong>實際情況:</strong> 成本 → 實收 NT${actualPrice.toLocaleString()} → 投資方 NT${displayPrice.toLocaleString()} + 老闆 NT${commission.toLocaleString()}</p>
              <p><strong>重要:</strong> 投資方永遠看不到實際收取價格 NT${actualPrice.toLocaleString()}</p>
            </div>
          }
          type="warning"
          showIcon
        />
      </SuperAdminOnly>
    </Card>
  )
}
