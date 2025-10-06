'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Select, Space, Typography, Alert, Divider, Switch, DatePicker, Button, Popover, Table } from 'antd'
import { InfoCircleOutlined, CalculatorOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { calculateLiquidWeight, estimateBottleWeight, getBottleWeightReferenceList } from '@/utils/weightCalculator'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

interface VariantEditModalProps {
  visible: boolean
  variant: any | null // 要編輯的變體
  productId: string
  onCancel: () => void
  onSuccess: () => void
}

/**
 * 變體編輯對話框
 * - 載入現有變體資料
 * - 支援編輯所有欄位（除了變體編號）
 * - 更新變體資訊
 */
export default function VariantEditModal({
  visible,
  variant,
  productId,
  onCancel,
  onSuccess
}: VariantEditModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible && variant) {
      // 處理附件陣列轉字串
      const accessoriesStr = Array.isArray(variant.accessories)
        ? variant.accessories.join(', ')
        : (variant.accessories || '')

      form.setFieldsValue({
        variant_type: variant.variant_type || '',
        description: variant.description || '',
        // 酒類規格
        volume_ml: variant.volume_ml || 700,
        alc_percentage: variant.alc_percentage || 43.0,
        // 重量與包裝
        weight_kg: variant.weight_kg || 0,
        has_box: variant.has_box || false,
        package_weight_kg: variant.package_weight_kg || 0,
        has_accessories: variant.has_accessories || false,
        accessory_weight_kg: variant.accessory_weight_kg || 0,
        accessories: accessoriesStr,
        total_weight_kg: variant.total_weight_kg || 0,
        // 價格
        cost_price: variant.cost_price || 0,
        investor_price: variant.investor_price || 0,
        actual_price: variant.actual_price || 0,
        // 其他
        hs_code: variant.hs_code || '',
        supplier: variant.supplier || '',
        manufacturing_date: variant.manufacturing_date ? dayjs(variant.manufacturing_date) : null,
        expiry_date: variant.expiry_date ? dayjs(variant.expiry_date) : null,
        warehouse: variant.warehouse || 'COMPANY'
      })
    }
  }, [visible, variant, form])

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

      const response = await fetch(`/api/products/${productId}/variants/${variant.id}`, {
        method: 'PUT',
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
        throw new Error(error.error || '更新變體失敗')
      }

      Modal.success({
        title: '更新成功',
        content: `變體 ${variant.variant_code} 已更新`
      })

      form.resetFields()
      onSuccess()
    } catch (error: any) {
      Modal.error({
        title: '更新失敗',
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

  if (!variant) return null

  return (
    <Modal
      title="編輯商品變體"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={900}
      okText="確認更新"
      cancelText="取消"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 商品資訊 */}
        <div>
          <Text strong>變體編號：</Text>
          <Text code>{variant.variant_code}</Text>
        </div>

        {/* 提示 */}
        <Alert
          message="編輯模式"
          description="您正在編輯現有變體，變體編號無法修改"
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
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

          {/* 酒液重量顯示 */}
          <Form.Item shouldUpdate noStyle>
            {({ getFieldValue }) => {
              const volumeMl = getFieldValue('volume_ml')
              const alcPercentage = getFieldValue('alc_percentage')

              if (volumeMl && alcPercentage) {
                const liquidWeight = calculateLiquidWeight(volumeMl, alcPercentage)
                return (
                  <Alert
                    message={`預估酒液重量：${liquidWeight}g (${(liquidWeight / 1000).toFixed(3)}kg)`}
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    style={{ marginBottom: 16 }}
                  />
                )
              }
              return null
            }}
          </Form.Item>

          <Form.Item
            label="空瓶重量 (kg)"
            name="weight_kg"
            rules={[{ required: true, message: '請輸入空瓶重量' }]}
            tooltip="空酒瓶本身重量（不含酒液、包裝、附件）"
          >
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber placeholder="0.5" min={0} step={0.1} precision={3} style={{ width: 'calc(100% - 120px)' }} />
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue, setFieldsValue }) => {
                  const volumeMl = getFieldValue('volume_ml')

                  // 參考表內容
                  const referenceList = getBottleWeightReferenceList()
                  const columns = [
                    { title: '容量', dataIndex: 'volume', key: 'volume', render: (v: number) => `${v}ml` },
                    { title: '參考重量', dataIndex: 'weight', key: 'weight', render: (w: any) => `${w.min}-${w.max}g` },
                    { title: '平均', dataIndex: 'weight', key: 'average', render: (w: any) => `${w.average}g` },
                    { title: '類型', dataIndex: 'type', key: 'type' }
                  ]

                  const content = (
                    <div style={{ width: 400 }}>
                      <Table
                        size="small"
                        dataSource={referenceList}
                        columns={columns}
                        pagination={false}
                        rowKey="volume"
                        onRow={(record) => ({
                          onClick: () => {
                            // 點擊行時套用平均值 (轉換為 kg)
                            setFieldsValue({ weight_kg: record.weight.average / 1000 })
                            message.success(`已套用 ${record.volume}ml 的參考值：${record.weight.average}g`)
                          },
                          style: { cursor: 'pointer' }
                        })}
                      />
                      {volumeMl && (
                        <div style={{ marginTop: 12, padding: 8, background: '#f0f2f5', borderRadius: 4 }}>
                          <Text strong>根據您的容量 ({volumeMl}ml)：</Text>
                          <br />
                          {(() => {
                            const estimate = estimateBottleWeight(volumeMl)
                            return (
                              <>
                                <Text>推估空瓶重量：{estimate.average}g ({estimate.min}-{estimate.max}g)</Text>
                                <br />
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => {
                                    setFieldsValue({ weight_kg: estimate.average / 1000 })
                                    message.success(`已套用推估值：${estimate.average}g`)
                                  }}
                                  style={{ padding: 0 }}
                                >
                                  套用推估值
                                </Button>
                              </>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  )

                  return (
                    <Popover content={content} title="空瓶重量參考表" trigger="click" placement="right">
                      <Button icon={<CalculatorOutlined />}>參考值</Button>
                    </Popover>
                  )
                }}
              </Form.Item>
            </Space.Compact>
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
