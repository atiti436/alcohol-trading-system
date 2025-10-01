'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Select, Space, Typography, Alert, Divider } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

interface VariantCreateModalProps {
  visible: boolean
  product: {
    id: string
    product_code: string
    name: string
  } | null
  nextVariantNumber: string // 例如：001, 002, 003
  onCancel: () => void
  onSuccess: () => void
}

/**
 * 變體新增對話框
 * - 自動產生流水號（P0001-001, P0001-002...）
 * - 三層價格輸入（cost_price, investor_price, actual_price）
 * - 倉庫選擇（COMPANY/PRIVATE）
 */
export default function VariantCreateModal({
  visible,
  product,
  nextVariantNumber,
  onCancel,
  onSuccess
}: VariantCreateModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [variantCode, setVariantCode] = useState('')

  useEffect(() => {
    if (visible && product) {
      const code = `${product.product_code}-${nextVariantNumber}`
      setVariantCode(code)
      form.setFieldsValue({
        variant_type: '',
        description: '',
        cost_price: 0,
        investor_price: 0,
        actual_price: 0,
        warehouse: 'COMPANY'
      })
    }
  }, [visible, product, nextVariantNumber, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const response = await fetch(`/api/products/${product?.id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_type: values.variant_type,
          description: values.description,
          cost_price: values.cost_price,
          investor_price: values.investor_price,
          actual_price: values.actual_price,
          warehouse: values.warehouse
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '新增變體失敗')
      }

      Modal.success({
        title: '新增成功',
        content: `變體 ${variantCode} 已建立`
      })

      form.resetFields()
      onSuccess()
    } catch (error: any) {
      Modal.error({
        title: '新增失敗',
        content: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  if (!product) return null

  return (
    <Modal
      title="新增商品變體"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={700}
      okText="確認新增"
      cancelText="取消"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 商品資訊 */}
        <div>
          <Text strong>商品：</Text>
          <Text>{product.name}</Text>
        </div>

        {/* 自動生成的變體編號 */}
        <Alert
          message={
            <Space>
              <InfoCircleOutlined />
              <Text>自動生成變體編號：<Text strong code>{variantCode}</Text></Text>
            </Space>
          }
          type="info"
        />

        <Divider style={{ margin: '12px 0' }} />

        {/* 表單 */}
        <Form form={form} layout="vertical">
          <Form.Item
            label="變體類型"
            name="variant_type"
            rules={[{ required: true, message: '請輸入變體類型' }]}
            tooltip="例如：亮面新版(日版)、木盒禮盒版、損傷版(盒損)"
          >
            <Input
              placeholder="請輸入變體類型（自由文字）"
              maxLength={100}
            />
          </Form.Item>

          <Form.Item
            label="詳細描述"
            name="description"
            rules={[{ required: true, message: '請輸入描述' }]}
          >
            <TextArea
              rows={3}
              placeholder="請輸入變體的詳細描述"
              maxLength={500}
            />
          </Form.Item>

          <Divider orientation="left">價格設定（三層價格）</Divider>

          <Space size="large" style={{ width: '100%' }} direction="vertical">
            <Form.Item
              label="成本價"
              name="cost_price"
              rules={[
                { required: true, message: '請輸入成本價' },
                { type: 'number', min: 0, message: '成本價不能為負數' }
              ]}
              tooltip="進貨的實際成本"
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix="$"
                precision={2}
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item
              label="投資方期望售價"
              name="investor_price"
              rules={[
                { required: true, message: '請輸入投資方期望售價' },
                { type: 'number', min: 0, message: '價格不能為負數' }
              ]}
              tooltip="投資方設定的期望售價（投資方可後續調整）"
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix="$"
                precision={2}
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item
              label="實際售價"
              name="actual_price"
              rules={[
                { required: true, message: '請輸入實際售價' },
                { type: 'number', min: 0, message: '價格不能為負數' }
              ]}
              tooltip="您的實際售價（僅 SUPER_ADMIN 可見）"
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix="$"
                precision={2}
                placeholder="0.00"
              />
            </Form.Item>
          </Space>

          <Divider orientation="left">倉庫設定</Divider>

          <Form.Item
            label="預設倉庫"
            name="warehouse"
            rules={[{ required: true, message: '請選擇倉庫' }]}
            tooltip="變體的預設倉庫位置（可後續調撥）"
          >
            <Select placeholder="請選擇倉庫">
              <Option value="COMPANY">公司倉（投資方出資）</Option>
              <Option value="PRIVATE">個人倉（個人資金）</Option>
            </Select>
          </Form.Item>
        </Form>

        {/* 說明 */}
        <Alert
          message="價格說明"
          description={
            <Space direction="vertical" size={4}>
              <Text>• 成本價：進貨成本（所有人可見）</Text>
              <Text>• 投資方價：投資方的期望售價（投資方可調整）</Text>
              <Text>• 實際售價：您的實際售價（僅 SUPER_ADMIN 可見）</Text>
              <Text strong>• 您的利潤 = 實際售價 - 投資方價</Text>
              <Text strong>• 投資方利潤 = 投資方價 - 成本價</Text>
            </Space>
          }
          type="info"
        />
      </Space>
    </Modal>
  )
}
