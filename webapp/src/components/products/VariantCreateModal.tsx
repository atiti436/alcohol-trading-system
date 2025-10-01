'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Select, Space, Typography, Alert, Divider, Switch, DatePicker } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

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
        // 酒類規格
        volume_ml: 700,
        alc_percentage: 43.0,
        // 重量與包裝
        weight_kg: 0,
        has_box: false,
        package_weight_kg: 0,
        has_accessories: false,
        accessory_weight_kg: 0,
        accessories: '',
        // 價格
        cost_price: 0,
        investor_price: 0,
        actual_price: 0,
        // 其他
        hs_code: '',
        supplier: '',
        warehouse: 'COMPANY'
      })
    }
  }, [visible, product, nextVariantNumber, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      // 計算總重量
      const weight_kg = values.weight_kg || 0
      const package_weight_kg = values.has_box ? (values.package_weight_kg || 0) : 0
      const accessory_weight_kg = values.has_accessories ? (values.accessory_weight_kg || 0) : 0
      const total_weight_kg = weight_kg + package_weight_kg + accessory_weight_kg

      // 處理附件清單（字串轉陣列）
      const accessories = values.accessories
        ? values.accessories.split(',').map((item: string) => item.trim()).filter(Boolean)
        : []

      const response = await fetch(`/api/products/${product?.id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 基本資訊
          variant_type: values.variant_type,
          description: values.description,
          // 酒類規格
          volume_ml: values.volume_ml,
          alc_percentage: values.alc_percentage,
          // 重量與包裝
          weight_kg,
          package_weight_kg: values.has_box ? package_weight_kg : null,
          has_box: values.has_box,
          has_accessories: values.has_accessories,
          accessory_weight_kg: values.has_accessories ? accessory_weight_kg : null,
          accessories,
          total_weight_kg,
          // 價格
          cost_price: values.cost_price,
          investor_price: values.investor_price,
          actual_price: values.actual_price,
          current_price: values.actual_price, // 當前價格預設等於實際售價
          // 其他資訊
          hs_code: values.hs_code || null,
          supplier: values.supplier || null,
          manufacturing_date: values.manufacturing_date ? values.manufacturing_date.toISOString() : null,
          expiry_date: values.expiry_date ? values.expiry_date.toISOString() : null,
          // 倉庫
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
      width={900}
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
        <Form form={form} layout="vertical" onValuesChange={(changedValues) => {
          // 自動計算總重量
          if (
            'weight_kg' in changedValues ||
            'package_weight_kg' in changedValues ||
            'accessory_weight_kg' in changedValues ||
            'has_box' in changedValues ||
            'has_accessories' in changedValues
          ) {
            const weight_kg = form.getFieldValue('weight_kg') || 0
            const has_box = form.getFieldValue('has_box')
            const has_accessories = form.getFieldValue('has_accessories')
            const package_weight_kg = has_box ? (form.getFieldValue('package_weight_kg') || 0) : 0
            const accessory_weight_kg = has_accessories ? (form.getFieldValue('accessory_weight_kg') || 0) : 0
            const total = weight_kg + package_weight_kg + accessory_weight_kg
            form.setFieldValue('total_weight_kg', parseFloat(total.toFixed(3)))
          }
        }}>
          {/* 1. 基本資訊 */}
          <Divider orientation="left">基本資訊</Divider>

          <Form.Item
            label="變體類型"
            name="variant_type"
            rules={[{ required: true, message: '請輸入變體類型' }]}
            tooltip="例如：標準款、禮盒版、日版、盒損版"
          >
            <Input placeholder="請輸入變體類型" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="詳細描述"
            name="description"
            rules={[{ required: true, message: '請輸入描述' }]}
          >
            <TextArea
              rows={2}
              placeholder="請輸入變體的詳細描述"
              maxLength={500}
            />
          </Form.Item>

          {/* 2. 酒類規格 */}
          <Divider orientation="left">酒類規格</Divider>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              label="容量 (ml)"
              name="volume_ml"
              rules={[{ required: true, message: '請輸入容量' }]}
              style={{ flex: 1 }}
            >
              <InputNumber placeholder="700" min={0} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="酒精度 (%)"
              name="alc_percentage"
              rules={[{ required: true, message: '請輸入酒精度' }]}
              style={{ flex: 1 }}
            >
              <InputNumber placeholder="43.0" min={0} max={100} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          {/* 3. 重量與包裝 */}
          <Divider orientation="left">重量與包裝（空瓶費申報）</Divider>

          <Form.Item
            label="空瓶重量 (kg)"
            name="weight_kg"
            rules={[{ required: true, message: '請輸入空瓶重量' }]}
            tooltip="空酒瓶本身重量（不含酒液、包裝、附件）"
          >
            <InputNumber placeholder="1.2" min={0} step={0.1} precision={3} style={{ width: '100%' }} />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Form.Item name="has_box" label="有外盒" valuePropName="checked" style={{ flex: 0 }}>
              <Switch />
            </Form.Item>

            <Form.Item shouldUpdate style={{ flex: 1, marginBottom: 0 }}>
              {({ getFieldValue }) =>
                getFieldValue('has_box') ? (
                  <Form.Item name="package_weight_kg" label="外盒重量 (kg)" style={{ marginBottom: 0 }}>
                    <InputNumber placeholder="0.5" min={0} step={0.1} precision={3} style={{ width: '100%' }} />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Form.Item name="has_accessories" label="有附件" valuePropName="checked" style={{ flex: 0 }}>
              <Switch />
            </Form.Item>

            <Form.Item shouldUpdate style={{ flex: 1, marginBottom: 0 }}>
              {({ getFieldValue }) =>
                getFieldValue('has_accessories') ? (
                  <Form.Item name="accessory_weight_kg" label="附件重量 (kg)" style={{ marginBottom: 0 }}>
                    <InputNumber placeholder="0.2" min={0} step={0.1} precision={3} style={{ width: '100%' }} />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </div>

          <Form.Item shouldUpdate>
            {({ getFieldValue }) => {
              const weight_kg = getFieldValue('weight_kg') || 0
              const has_box = getFieldValue('has_box')
              const has_accessories = getFieldValue('has_accessories')
              const package_weight_kg = has_box ? (getFieldValue('package_weight_kg') || 0) : 0
              const accessory_weight_kg = has_accessories ? (getFieldValue('accessory_weight_kg') || 0) : 0
              const total = weight_kg + package_weight_kg + accessory_weight_kg

              return total > 0 ? (
                <div style={{
                  padding: '8px 12px',
                  background: '#f0f8ff',
                  border: '1px solid #d1ecf1',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  color: '#31708f'
                }}>
                  申報總重：{total.toFixed(3)} kg
                  <div style={{ fontSize: '11px', fontWeight: 'normal', marginTop: '2px' }}>
                    {weight_kg > 0 && `空瓶: ${weight_kg.toFixed(3)}kg`}
                    {package_weight_kg > 0 && ` + 外盒: ${package_weight_kg.toFixed(3)}kg`}
                    {accessory_weight_kg > 0 && ` + 附件: ${accessory_weight_kg.toFixed(3)}kg`}
                  </div>
                  <Form.Item name="total_weight_kg" noStyle>
                    <input type="hidden" />
                  </Form.Item>
                </div>
              ) : null
            }}
          </Form.Item>

          <Form.Item label="附件清單" name="accessories">
            <Input placeholder="請輸入附件，用逗號分隔，例如：證書, 特製木盒, 說明書" />
          </Form.Item>

          {/* 4. 價格設定 */}
          <Divider orientation="left">價格設定（三層價格）</Divider>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              label="成本價"
              name="cost_price"
              rules={[
                { required: true, message: '請輸入成本價' },
                { type: 'number', min: 0, message: '成本價不能為負數' }
              ]}
              tooltip="進貨的實際成本"
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix="$"
                precision={2}
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item
              label="期望售價"
              name="investor_price"
              rules={[
                { required: true, message: '請輸入期望售價' },
                { type: 'number', min: 0, message: '價格不能為負數' }
              ]}
              tooltip="投資方設定的期望售價"
              style={{ flex: 1 }}
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
              style={{ flex: 1 }}
            >
              <InputNumber
                style={{ width: '100%' }}
                prefix="$"
                precision={2}
                placeholder="0.00"
              />
            </Form.Item>
          </div>

          {/* 5. 其他資訊 */}
          <Divider orientation="left">其他資訊</Divider>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item label="稅則號碼 (HS Code)" name="hs_code" style={{ flex: 1 }}>
              <Input placeholder="請輸入稅則號碼" />
            </Form.Item>

            <Form.Item label="供應商" name="supplier" style={{ flex: 1 }}>
              <Input placeholder="請輸入供應商" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item label="生產日期" name="manufacturing_date" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} placeholder="選擇生產日期" />
            </Form.Item>

            <Form.Item label="有效期限" name="expiry_date" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} placeholder="選擇有效期限" />
            </Form.Item>
          </div>

          {/* 6. 倉庫設定 */}
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
              <Text>• 期望售價：投資方的期望售價（投資方可調整）</Text>
              <Text>• 實際售價：您的實際售價（僅 SUPER_ADMIN 可見）</Text>
              <Text strong>• 您的利潤 = 實際售價 - 期望售價</Text>
              <Text strong>• 投資方利潤 = 期望售價 - 成本價</Text>
            </Space>
          }
          type="info"
        />
      </Space>
    </Modal>
  )
}
