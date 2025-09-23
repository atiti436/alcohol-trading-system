'use client'

import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Button,
  Space,
  Table,
  message,
  Typography,
  Divider
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'

const { Option } = Select
const { TextArea } = Input
const { Title } = Typography

interface InventoryItem {
  id: string
  name: string
  product_code: string
  variants: Array<{
    id: string
    variant_code: string
    stock_quantity: number
    available_stock: number
  }>
}

interface AdjustmentItem {
  key: string
  variant_id: string
  variant_code: string
  current_stock: number
  adjustment_quantity: number
  new_stock: number
  reason: string
}

interface InventoryAdjustmentModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (data: any) => void
  inventoryItem?: InventoryItem
  loading?: boolean
}

export function InventoryAdjustmentModal({
  visible,
  onCancel,
  onSubmit,
  inventoryItem,
  loading = false
}: InventoryAdjustmentModalProps) {
  const [form] = Form.useForm()
  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([])

  useEffect(() => {
    if (inventoryItem && visible) {
      // 初始化調整項目
      const initialAdjustments = inventoryItem.variants.map((variant, index) => ({
        key: `adj-${index}`,
        variant_id: variant.id,
        variant_code: variant.variant_code,
        current_stock: variant.stock_quantity,
        adjustment_quantity: 0,
        new_stock: variant.stock_quantity,
        reason: ''
      }))
      setAdjustments(initialAdjustments)
    } else {
      setAdjustments([])
      form.resetFields()
    }
  }, [inventoryItem, visible])

  const addAdjustment = () => {
    if (!inventoryItem) return

    const newAdjustment: AdjustmentItem = {
      key: `adj-${Date.now()}`,
      variant_id: '',
      variant_code: '',
      current_stock: 0,
      adjustment_quantity: 0,
      new_stock: 0,
      reason: ''
    }
    setAdjustments([...adjustments, newAdjustment])
  }

  const removeAdjustment = (key: string) => {
    setAdjustments(adjustments.filter(item => item.key !== key))
  }

  const handleVariantChange = (key: string, variantId: string) => {
    const variant = inventoryItem?.variants.find(v => v.id === variantId)
    if (!variant) return

    setAdjustments(prev => prev.map(item => {
      if (item.key === key) {
        return {
          ...item,
          variant_id: variantId,
          variant_code: variant.variant_code,
          current_stock: variant.stock_quantity,
          new_stock: variant.stock_quantity + item.adjustment_quantity
        }
      }
      return item
    }))
  }

  const handleQuantityChange = (key: string, quantity: number) => {
    setAdjustments(prev => prev.map(item => {
      if (item.key === key) {
        return {
          ...item,
          adjustment_quantity: quantity,
          new_stock: item.current_stock + quantity
        }
      }
      return item
    }))
  }

  const handleReasonChange = (key: string, reason: string) => {
    setAdjustments(prev => prev.map(item => {
      if (item.key === key) {
        return {
          ...item,
          reason
        }
      }
      return item
    }))
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // 過濾出有調整的項目
      const validAdjustments = adjustments.filter(item =>
        item.variant_id && item.adjustment_quantity !== 0 && item.reason.trim()
      )

      if (validAdjustments.length === 0) {
        message.error('請至少添加一項庫存調整')
        return
      }

      const submitData = {
        product_id: inventoryItem?.id,
        adjustment_type: values.adjustment_type,
        notes: values.notes,
        adjustments: validAdjustments.map(item => ({
          variant_id: item.variant_id,
          adjustment_quantity: item.adjustment_quantity,
          reason: item.reason
        }))
      }

      onSubmit(submitData)
    } catch (error) {
      console.error('表單驗證失敗:', error)
    }
  }

  const columns = [
    {
      title: '變體',
      key: 'variant',
      width: 150,
      render: (_: any, record: AdjustmentItem) => (
        <Select
          placeholder="⚠️ 請選擇版本"
          value={record.variant_id || undefined}
          onChange={(value) => handleVariantChange(record.key, value)}
          style={{ width: '100%' }}
          notFoundContent="無可用版本"
        >
          {inventoryItem?.variants.map(variant => (
            <Option key={variant.id} value={variant.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>
                  {variant.description || variant.variant_type}
                </span>
                <span style={{ color: '#999', fontSize: '12px' }}>
                  {variant.variant_code} | 庫存: {variant.available_stock || variant.stock_quantity || 0}瓶
                </span>
              </div>
            </Option>
          ))}
        </Select>
      )
    },
    {
      title: '當前庫存',
      key: 'current_stock',
      width: 100,
      render: (_: any, record: AdjustmentItem) => (
        <span>{record.current_stock}</span>
      )
    },
    {
      title: '調整數量',
      key: 'adjustment_quantity',
      width: 120,
      render: (_: any, record: AdjustmentItem) => (
        <InputNumber
          value={record.adjustment_quantity}
          onChange={(value) => handleQuantityChange(record.key, value || 0)}
          style={{ width: '100%' }}
          placeholder="±數量"
        />
      )
    },
    {
      title: '調整後',
      key: 'new_stock',
      width: 100,
      render: (_: any, record: AdjustmentItem) => (
        <span style={{
          color: record.new_stock < 0 ? 'red' :
                record.new_stock > record.current_stock ? 'green' : 'inherit'
        }}>
          {record.new_stock}
        </span>
      )
    },
    {
      title: '調整原因',
      key: 'reason',
      width: 200,
      render: (_: any, record: AdjustmentItem) => (
        <Input
          value={record.reason}
          onChange={(e) => handleReasonChange(record.key, e.target.value)}
          placeholder="請說明調整原因"
          maxLength={100}
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: AdjustmentItem) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeAdjustment(record.key)}
        />
      )
    }
  ]

  return (
    <Modal
      title={`庫存調整 - ${inventoryItem?.name}`}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width="90%"
      style={{ maxWidth: '1000px' }}
      okText="確定調整"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          adjustment_type: 'MANUAL'
        }}
      >
        <Form.Item
          name="adjustment_type"
          label="調整類型"
          rules={[{ required: true, message: '請選擇調整類型' }]}
        >
          <Select>
            <Option value="MANUAL">手動調整</Option>
            <Option value="STOCKTAKE">盤點調整</Option>
            <Option value="DAMAGE">損耗調整</Option>
            <Option value="CORRECTION">錯誤修正</Option>
          </Select>
        </Form.Item>

        <Form.Item name="notes" label="備註">
          <TextArea rows={2} placeholder="請輸入調整說明" maxLength={500} />
        </Form.Item>

        <Divider>調整明細</Divider>

        <div style={{ marginBottom: 16 }}>
          <Button
            type="dashed"
            onClick={addAdjustment}
            icon={<PlusOutlined />}
            style={{ width: '100%' }}
          >
            添加調整項目
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={adjustments}
          pagination={false}
          size="small"
          scroll={{ x: 700 }}
          locale={{ emptyText: '請點擊上方按鈕添加調整項目' }}
        />

        {adjustments.length > 0 && (
          <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            <Title level={5}>調整摘要</Title>
            <div>
              調整項目數：{adjustments.filter(item => item.adjustment_quantity !== 0).length}
            </div>
            <div>
              總調整量：{adjustments.reduce((sum, item) => sum + item.adjustment_quantity, 0)}
            </div>
          </div>
        )}
      </Form>
    </Modal>
  )
}