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
    // 補齊 UI 會用到的欄位（可選）
    description?: string
    variant_type?: string
    // 🔒 新增：各倉庫的庫存明細
    inventory?: Array<{
      id: string
      warehouse: 'COMPANY' | 'PRIVATE'
      quantity: number
      reserved: number
      available: number
      cost_price: number
    }>
  }>
}

interface AdjustmentItem {
  key: string
  variant_id: string
  variant_code: string
  warehouse: 'COMPANY' | 'PRIVATE'  // 🔒 新增：倉庫欄位
  current_stock: number
  available_stock: number  // 🔒 新增：可用庫存
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
      // 🔒 初始化調整項目：按 (variant, warehouse) 組合展開
      const initialAdjustments: AdjustmentItem[] = []

      inventoryItem.variants.forEach(variant => {
        if (variant.inventory && variant.inventory.length > 0) {
          // 有倉庫明細：為每個倉庫創建一筆調整項目
          variant.inventory.forEach(inv => {
            initialAdjustments.push({
              key: `adj-${variant.id}-${inv.warehouse}`,
              variant_id: variant.id,
              variant_code: variant.variant_code,
              warehouse: inv.warehouse,
              current_stock: inv.quantity,
              available_stock: inv.available,
              adjustment_quantity: 0,
              new_stock: inv.quantity,
              reason: ''
            })
          })
        } else {
          // 無倉庫明細（舊資料）：顯示總庫存，預設 COMPANY 倉
          initialAdjustments.push({
            key: `adj-${variant.id}-COMPANY`,
            variant_id: variant.id,
            variant_code: variant.variant_code,
            warehouse: 'COMPANY',
            current_stock: variant.stock_quantity,
            available_stock: variant.available_stock,
            adjustment_quantity: 0,
            new_stock: variant.stock_quantity,
            reason: ''
          })
        }
      })

      setAdjustments(initialAdjustments)
    } else {
      setAdjustments([])
      form.resetFields()
    }
  }, [inventoryItem, visible, form])

  const addAdjustment = () => {
    if (!inventoryItem) return

    const newAdjustment: AdjustmentItem = {
      key: `adj-${Date.now()}`,
      variant_id: '',
      variant_code: '',
      warehouse: 'COMPANY',  // 🔒 預設公司倉
      current_stock: 0,
      available_stock: 0,
      adjustment_quantity: 0,
      new_stock: 0,
      reason: ''
    }
    setAdjustments([...adjustments, newAdjustment])
  }

  const removeAdjustment = (key: string) => {
    setAdjustments(adjustments.filter(item => item.key !== key))
  }

  // 🔒 新增：處理倉庫變更
  const handleWarehouseChange = (key: string, warehouse: 'COMPANY' | 'PRIVATE') => {
    setAdjustments(prev => prev.map(item => {
      if (item.key === key) {
        const variant = inventoryItem?.variants.find(v => v.id === item.variant_id)
        if (!variant) return item

        const inv = variant.inventory?.find(i => i.warehouse === warehouse)
        const stock = inv?.quantity || 0
        const available = inv?.available || 0

        return {
          ...item,
          warehouse,
          current_stock: stock,
          available_stock: available,
          new_stock: stock + item.adjustment_quantity
        }
      }
      return item
    }))
  }

  const handleVariantChange = (key: string, variantId: string) => {
    const variant = inventoryItem?.variants.find(v => v.id === variantId)
    if (!variant) return

    setAdjustments(prev => prev.map(item => {
      if (item.key === key) {
        // 🔒 預設選第一個倉庫
        const warehouse = item.warehouse || 'COMPANY'
        const inv = variant.inventory?.find(i => i.warehouse === warehouse) || variant.inventory?.[0]
        const stock = inv?.quantity || variant.stock_quantity
        const available = inv?.available || variant.available_stock

        return {
          ...item,
          variant_id: variantId,
          variant_code: variant.variant_code,
          warehouse: inv?.warehouse || warehouse,
          current_stock: stock,
          available_stock: available,
          new_stock: stock + item.adjustment_quantity
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
          warehouse: item.warehouse,  // 🔒 新增：倉庫參數
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
      width: 180,
      render: (_: any, record: AdjustmentItem) => {
        // 🔒 顯示變體資訊（如果已選擇）
        if (record.variant_id) {
          const variant = inventoryItem?.variants.find(v => v.id === record.variant_id)
          const warehouseName = record.warehouse === 'COMPANY' ? '公司倉' : '個人倉'
          return (
            <div>
              <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
                {variant?.description || variant?.variant_type || record.variant_code}
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                {record.variant_code} | {warehouseName}
              </div>
            </div>
          )
        }

        // 未選擇：顯示下拉選單
        return (
          <Select
            placeholder="⚠️ 請選擇版本"
            value={record.variant_id || undefined}
            onChange={(value) => handleVariantChange(record.key, value)}
            style={{ width: '100%' }}
            notFoundContent="無可用版本"
          >
            {inventoryItem?.variants.map(variant => (
              <Option key={variant.id} value={variant.id}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>
                    {variant.description || variant.variant_type}
                  </span>
                  <div style={{ color: '#999', fontSize: '12px' }}>
                    {variant.variant_code}
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        )
      }
    },
    {
      title: '倉庫',
      key: 'warehouse',
      width: 100,
      render: (_: any, record: AdjustmentItem) => (
        <Select
          value={record.warehouse}
          onChange={(value) => handleWarehouseChange(record.key, value)}
          style={{ width: '100%' }}
          disabled={!record.variant_id}  // 未選變體時禁用
        >
          <Option value="COMPANY">公司倉</Option>
          <Option value="PRIVATE">個人倉</Option>
        </Select>
      )
    },
    {
      title: '當前庫存',
      key: 'current_stock',
      width: 100,
      render: (_: any, record: AdjustmentItem) => (
        <div>
          <div>{record.current_stock} 瓶</div>
          <div style={{ fontSize: '12px', color: '#52c41a' }}>
            可用: {record.available_stock}
          </div>
        </div>
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
