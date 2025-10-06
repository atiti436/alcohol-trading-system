'use client'

import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Button,
  Table,
  message,
  Space,
  Divider
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

interface ManualDeclarationModalProps {
  visible: boolean
  importRecord: any
  onCancel: () => void
  onSuccess: () => void
}

interface DeclarationItem {
  key: string
  product_name: string
  quantity: number
  alcohol_percentage: number
  volume: number
  dutiable_value: number
  alcohol_tax: number
  business_tax: number
  tariff_code?: string
}

const ManualDeclarationModal: React.FC<ManualDeclarationModalProps> = ({
  visible,
  importRecord,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm()
  const [items, setItems] = useState<DeclarationItem[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (visible && importRecord) {
      // 初始化表單
      form.setFieldsValue({
        declaration_number: '',
        declaration_date: dayjs()
      })

      // 從進貨單載入商品列表（如果有的話）
      if (importRecord.items && importRecord.items.length > 0) {
        const initialItems = importRecord.items.map((item: any, index: number) => ({
          key: `item-${index}`,
          product_name: item.product_name || '',
          quantity: item.quantity || 0,
          alcohol_percentage: 40,
          volume: 700,
          dutiable_value: 0,
          alcohol_tax: 0,
          business_tax: 0,
          tariff_code: item.tariff_code || ''
        }))
        setItems(initialItems)
      } else {
        // 沒有商品，新增一筆空白
        setItems([{
          key: 'item-0',
          product_name: '',
          quantity: 0,
          alcohol_percentage: 40,
          volume: 700,
          dutiable_value: 0,
          alcohol_tax: 0,
          business_tax: 0
        }])
      }
    }
  }, [visible, importRecord, form])

  const addItem = () => {
    const newItem: DeclarationItem = {
      key: `item-${Date.now()}`,
      product_name: '',
      quantity: 0,
      alcohol_percentage: 40,
      volume: 700,
      dutiable_value: 0,
      alcohol_tax: 0,
      business_tax: 0
    }
    setItems([...items, newItem])
  }

  const removeItem = (key: string) => {
    setItems(items.filter(item => item.key !== key))
  }

  const updateItem = (key: string, field: string, value: any) => {
    setItems(items.map(item =>
      item.key === key ? { ...item, [field]: value } : item
    ))
  }

  const columns = [
    {
      title: '商品名稱',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 200,
      render: (text: string, record: DeclarationItem) => (
        <Input
          value={text}
          onChange={(e) => updateItem(record.key, 'product_name', e.target.value)}
          placeholder="商品名稱"
        />
      )
    },
    {
      title: '數量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (value: number, record: DeclarationItem) => (
        <InputNumber
          value={value}
          onChange={(val) => updateItem(record.key, 'quantity', val || 0)}
          min={0}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '酒精度(%)',
      dataIndex: 'alcohol_percentage',
      key: 'alcohol_percentage',
      width: 100,
      render: (value: number, record: DeclarationItem) => (
        <InputNumber
          value={value}
          onChange={(val) => updateItem(record.key, 'alcohol_percentage', val || 0)}
          min={0}
          max={100}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '容量(ml)',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      render: (value: number, record: DeclarationItem) => (
        <InputNumber
          value={value}
          onChange={(val) => updateItem(record.key, 'volume', val || 0)}
          min={0}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '完稅價格',
      dataIndex: 'dutiable_value',
      key: 'dutiable_value',
      width: 120,
      render: (value: number, record: DeclarationItem) => (
        <InputNumber
          value={value}
          onChange={(val) => updateItem(record.key, 'dutiable_value', val || 0)}
          min={0}
          style={{ width: '100%' }}
          prefix="NT$"
        />
      )
    },
    {
      title: '菸酒稅',
      dataIndex: 'alcohol_tax',
      key: 'alcohol_tax',
      width: 120,
      render: (value: number, record: DeclarationItem) => (
        <InputNumber
          value={value}
          onChange={(val) => updateItem(record.key, 'alcohol_tax', val || 0)}
          min={0}
          style={{ width: '100%' }}
          prefix="NT$"
        />
      )
    },
    {
      title: '營業稅',
      dataIndex: 'business_tax',
      key: 'business_tax',
      width: 120,
      render: (value: number, record: DeclarationItem) => (
        <InputNumber
          value={value}
          onChange={(val) => updateItem(record.key, 'business_tax', val || 0)}
          min={0}
          style={{ width: '100%' }}
          prefix="NT$"
        />
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (record: DeclarationItem) => (
        <Button
          icon={<DeleteOutlined />}
          size="small"
          danger
          onClick={() => removeItem(record.key)}
          disabled={items.length === 1}
        />
      )
    }
  ]

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // 驗證商品列表
      if (items.length === 0) {
        message.error('請至少新增一筆商品')
        return
      }

      const hasEmptyName = items.some(item => !item.product_name || item.product_name.trim() === '')
      if (hasEmptyName) {
        message.error('請填寫所有商品名稱')
        return
      }

      setSubmitting(true)

      // 計算總稅費
      const totalAlcoholTax = items.reduce((sum, item) => sum + item.alcohol_tax, 0)
      const totalBusinessTax = items.reduce((sum, item) => sum + item.business_tax, 0)
      const totalTaxes = totalAlcoholTax + totalBusinessTax

      // ✅ 改用新版 API
      const response = await fetch(`/api/imports-v2/${importRecord.id}/declaration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          declarationNumber: values.declaration_number,
          declarationDate: values.declaration_date.toISOString(),
          totalValue: importRecord.totalValue,
          exchangeRate: importRecord.exchangeRate,
          items: items.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            alcoholPercentage: item.alcohol_percentage,
            volume: item.volume,
            dutiableValue: item.dutiable_value,
            alcoholTax: item.alcohol_tax,
            businessTax: item.business_tax,
            tariffCode: item.tariff_code
          })),
          totalAlcoholTax,
          totalBusinessTax,
          totalTaxes,
          extractedData: null // 手動輸入沒有 OCR 資料
        })
      })

      if (response.ok) {
        message.success('報單資料已保存')
        form.resetFields()
        setItems([])
        onSuccess()
      } else {
        const error = await response.json()
        message.error(error.message || '保存失敗')
      }
    } catch (error) {
      console.error('保存報單失敗:', error)
      message.error('保存失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const totalStats = {
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAlcoholTax: items.reduce((sum, item) => sum + item.alcohol_tax, 0),
    totalBusinessTax: items.reduce((sum, item) => sum + item.business_tax, 0),
    totalTaxes: items.reduce((sum, item) => sum + item.alcohol_tax + item.business_tax, 0)
  }

  return (
    <Modal
      title="手動輸入報單資料"
      open={visible}
      onCancel={onCancel}
      width="90%"
      style={{ maxWidth: '1400px' }}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
        >
          保存
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <Form.Item
            label="報單號碼"
            name="declaration_number"
            rules={[{ required: true, message: '請輸入報單號碼' }]}
          >
            <Input placeholder="例如：AA/12/3456/7890" />
          </Form.Item>

          <Form.Item
            label="報關日期"
            name="declaration_date"
            rules={[{ required: true, message: '請選擇報關日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </div>
      </Form>

      <Divider>商品明細</Divider>

      <Button
        type="dashed"
        onClick={addItem}
        icon={<PlusOutlined />}
        style={{ marginBottom: 16 }}
      >
        新增商品
      </Button>

      <Table
        dataSource={items}
        columns={columns}
        rowKey="key"
        pagination={false}
        scroll={{ x: 1200 }}
        size="small"
        bordered
      />

      <Divider>統計</Divider>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
        <div>
          <div style={{ color: '#666', fontSize: '12px' }}>總數量</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{totalStats.totalQuantity}</div>
        </div>
        <div>
          <div style={{ color: '#666', fontSize: '12px' }}>菸酒稅</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa541c' }}>
            NT$ {totalStats.totalAlcoholTax.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ color: '#666', fontSize: '12px' }}>營業稅</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fa8c16' }}>
            NT$ {totalStats.totalBusinessTax.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ color: '#666', fontSize: '12px' }}>稅費總計</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f5222d' }}>
            NT$ {totalStats.totalTaxes.toLocaleString()}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ManualDeclarationModal
