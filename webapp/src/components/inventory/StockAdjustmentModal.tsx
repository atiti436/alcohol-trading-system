'use client'

import React, { useState } from 'react'
import { Modal, Form, Select, InputNumber, Input, message, Space, Tag, Alert } from 'antd'
import { ShopOutlined, HomeOutlined } from '@ant-design/icons'

const { Option } = Select
const { TextArea } = Input

interface StockAdjustmentModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  variant: {
    id: string
    variant_code: string
    variant_type: string
    inventory?: Array<{
      id: string
      warehouse: 'COMPANY' | 'PRIVATE'
      quantity: number
      reserved: number
      available: number
    }>
  } | null
}

/**
 * 庫存調整 Modal
 * 支援選擇倉庫進行庫存調整
 */
export default function StockAdjustmentModal({
  visible,
  onCancel,
  onSuccess,
  variant
}: StockAdjustmentModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [selectedWarehouse, setSelectedWarehouse] = useState<'COMPANY' | 'PRIVATE' | null>(null)

  // 獲取當前倉庫庫存資訊
  const currentInventory = variant?.inventory?.find(inv => inv.warehouse === selectedWarehouse)

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: variant?.id,
          warehouse: values.warehouse,
          adjustment_type: values.adjustment_type,
          quantity: values.quantity,
          reason: values.reason,
          notes: values.notes
        })
      })

      const result = await response.json()

      if (result.success) {
        message.success('庫存調整成功')
        form.resetFields()
        setSelectedWarehouse(null)
        onSuccess()
      } else {
        message.error(result.error || '調整失敗')
      }
    } catch (error) {
      console.error('庫存調整失敗:', error)
      message.error('調整失敗，請稍後重試')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setSelectedWarehouse(null)
    onCancel()
  }

  return (
    <Modal
      title="庫存調整"
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
    >
      {variant && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            message={
              <Space direction="vertical" size={0}>
                <div><strong>變體編號:</strong> {variant.variant_code}</div>
                <div><strong>變體類型:</strong> {variant.variant_type}</div>
              </Space>
            }
            type="info"
          />
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          adjustment_type: 'ADD'
        }}
      >
        <Form.Item
          name="warehouse"
          label="選擇倉庫"
          rules={[{ required: true, message: '請選擇倉庫' }]}
        >
          <Select
            placeholder="請選擇要調整的倉庫"
            onChange={(value) => setSelectedWarehouse(value)}
          >
            <Option value="COMPANY">
              <Space>
                <ShopOutlined style={{ color: '#1890ff' }} />
                <span>公司倉（投資方資金）</span>
                {variant?.inventory?.find(inv => inv.warehouse === 'COMPANY') && (
                  <Tag color="blue">
                    庫存: {variant.inventory.find(inv => inv.warehouse === 'COMPANY')?.available || 0}
                  </Tag>
                )}
              </Space>
            </Option>
            <Option value="PRIVATE">
              <Space>
                <HomeOutlined style={{ color: '#fa8c16' }} />
                <span>個人倉（個人資金）</span>
                {variant?.inventory?.find(inv => inv.warehouse === 'PRIVATE') && (
                  <Tag color="orange">
                    庫存: {variant.inventory.find(inv => inv.warehouse === 'PRIVATE')?.available || 0}
                  </Tag>
                )}
              </Space>
            </Option>
          </Select>
        </Form.Item>

        {currentInventory && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <Space direction="vertical" size={4}>
              <div><strong>當前庫存:</strong> {currentInventory.quantity}</div>
              <div><strong>已預留:</strong> {currentInventory.reserved}</div>
              <div><strong>可售:</strong> {currentInventory.available}</div>
            </Space>
          </div>
        )}

        <Form.Item
          name="adjustment_type"
          label="調整類型"
          rules={[{ required: true, message: '請選擇調整類型' }]}
        >
          <Select>
            <Option value="ADD">增加庫存 (+)</Option>
            <Option value="SUBTRACT">減少庫存 (-)</Option>
            <Option value="SET">設定庫存 (=)</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="quantity"
          label="數量"
          rules={[
            { required: true, message: '請輸入數量' },
            { type: 'number', min: 0, message: '數量不能為負數' }
          ]}
        >
          <InputNumber
            min={0}
            style={{ width: '100%' }}
            placeholder="請輸入調整數量"
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="調整原因"
          rules={[{ required: true, message: '請輸入調整原因' }]}
        >
          <Select placeholder="請選擇或輸入原因">
            <Option value="進貨入庫">進貨入庫</Option>
            <Option value="銷售出庫">銷售出庫</Option>
            <Option value="盤點調整">盤點調整</Option>
            <Option value="損壞報廢">損壞報廢</Option>
            <Option value="倉庫轉移">倉庫轉移</Option>
            <Option value="其他">其他</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="notes"
          label="備註"
        >
          <TextArea
            rows={3}
            placeholder="選填，詳細說明調整原因..."
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
