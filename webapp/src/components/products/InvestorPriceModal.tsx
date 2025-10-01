'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Form, InputNumber, Input, Alert, Space, Typography, Divider } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

const { Text } = Typography
const { TextArea } = Input

interface InvestorPriceModalProps {
  visible: boolean
  variant: {
    id: string
    variant_code: string
    variant_type: string
    cost_price: number
    investor_price: number
    actual_price?: number
  } | null
  productId: string
  onCancel: () => void
  onSuccess: () => void
}

/**
 * 投資方調價對話框
 * - 顯示原價、新價輸入、調價原因
 * - 低於成本警告（cost_price > new investor_price 時顯示紅色）
 * - 呼叫 PATCH /api/products/[id]/variants/[variantId]/investor-price
 */
export default function InvestorPriceModal({
  visible,
  variant,
  productId,
  onCancel,
  onSuccess
}: InvestorPriceModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [newPrice, setNewPrice] = useState<number | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [profitLoss, setProfitLoss] = useState<number>(0)

  useEffect(() => {
    if (visible && variant) {
      form.setFieldsValue({
        investor_price: variant.investor_price,
        reason: ''
      })
      setNewPrice(variant.investor_price)
      checkPrice(variant.investor_price, variant.cost_price)
    }
  }, [visible, variant, form])

  const checkPrice = (price: number, cost: number) => {
    setNewPrice(price)
    const isBelow = price < cost
    setShowWarning(isBelow)
    setProfitLoss(price - cost)
  }

  const handlePriceChange = (value: number | null) => {
    if (value !== null && variant) {
      checkPrice(value, variant.cost_price)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const response = await fetch(
        `/api/products/${productId}/variants/${variant?.id}/investor-price`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            investor_price: values.investor_price,
            reason: values.reason
          })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '調價失敗')
      }

      Modal.success({
        title: '調價成功',
        content: `已更新 ${variant?.variant_type} 的投資方期望售價`
      })

      form.resetFields()
      onSuccess()
    } catch (error: any) {
      Modal.error({
        title: '調價失敗',
        content: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setNewPrice(null)
    setShowWarning(false)
    onCancel()
  }

  if (!variant) return null

  return (
    <Modal
      title="調整投資方期望售價"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
      okText="確認調價"
      cancelText="取消"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 變體資訊 */}
        <div>
          <Text strong>變體：</Text>
          <Text>{variant.variant_code} - {variant.variant_type}</Text>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* 價格資訊 */}
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>成本價：</Text>
            <Text strong>${variant.cost_price.toFixed(2)}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>原投資方價：</Text>
            <Text>${variant.investor_price.toFixed(2)}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>原利潤：</Text>
            <Text type={variant.investor_price - variant.cost_price >= 0 ? 'success' : 'danger'}>
              ${(variant.investor_price - variant.cost_price).toFixed(2)}
            </Text>
          </div>
        </Space>

        <Divider style={{ margin: '12px 0' }} />

        {/* 表單 */}
        <Form form={form} layout="vertical">
          <Form.Item
            label="新投資方價"
            name="investor_price"
            rules={[
              { required: true, message: '請輸入新價格' },
              { type: 'number', min: 0, message: '價格不能為負數' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="$"
              precision={2}
              onChange={handlePriceChange}
              placeholder="請輸入新的投資方期望售價"
            />
          </Form.Item>

          {/* 價格警告 */}
          {newPrice !== null && (
            <div style={{ marginBottom: 16 }}>
              {showWarning ? (
                <Alert
                  message="⚠️ 低於成本警告"
                  description={
                    <Space direction="vertical" size={4}>
                      <Text>成本價：${variant.cost_price.toFixed(2)}</Text>
                      <Text>新價格：${newPrice.toFixed(2)}</Text>
                      <Text type="danger" strong>
                        虧損：-${Math.abs(profitLoss).toFixed(2)}/瓶
                      </Text>
                    </Space>
                  }
                  type="error"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                />
              ) : (
                <Alert
                  message="✓ 價格合理"
                  description={
                    <Text type="success">
                      新利潤：${profitLoss.toFixed(2)}/瓶
                    </Text>
                  }
                  type="success"
                  showIcon
                />
              )}
            </div>
          )}

          <Form.Item
            label="調價原因（選填）"
            name="reason"
          >
            <TextArea
              rows={3}
              placeholder="例如：拋售，庫存積壓"
              maxLength={200}
            />
          </Form.Item>
        </Form>

        {/* 說明 */}
        <Alert
          message="說明"
          description={
            <Space direction="vertical" size={4}>
              <Text>• 投資方期望售價：您設定的期望售價</Text>
              <Text>• 您的利潤 = 實際售價 - 投資方期望售價</Text>
              <Text>• 調價後立即生效，無需審核</Text>
            </Space>
          }
          type="info"
        />
      </Space>
    </Modal>
  )
}
