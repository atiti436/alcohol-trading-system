'use client'

import React, { useState } from 'react'
import { Modal, Form, Input, Radio, Space, Alert, Checkbox, DatePicker } from 'antd'
import { TruckOutlined, FileTextOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { TextArea } = Input

interface ShipModalProps {
  visible: boolean
  onCancel: () => void
  onSubmit: (data: ShipFormData) => Promise<void>
  loading?: boolean
  saleNumber?: string
}

export interface ShipFormData {
  shipping_method: 'HAND_DELIVERY' | 'COURIER' | 'PICKUP'
  shipping_address?: string
  tracking_number?: string
  notes?: string
  // 🆕 發票資訊
  invoice_number?: string
  invoice_date?: string
}

/**
 * 出貨對話框
 * 支援親送、貨運、自取三種方式
 */
export function ShipModal({
  visible,
  onCancel,
  onSubmit,
  loading = false,
  saleNumber
}: ShipModalProps) {
  const [form] = Form.useForm()
  const [shippingMethod, setShippingMethod] = useState<string>('HAND_DELIVERY')
  const [needInvoice, setNeedInvoice] = useState(false)  // 🆕 是否需要開發票

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      await onSubmit(values)
      form.resetFields()
    } catch (error) {
      console.error('表單驗證失敗:', error)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setShippingMethod('HAND_DELIVERY')
    setNeedInvoice(false)  // 🆕 重置發票狀態
    onCancel()
  }

  return (
    <Modal
      title={
        <Space>
          <TruckOutlined />
          {saleNumber ? `出貨 - ${saleNumber}` : '出貨'}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="確認出貨"
      cancelText="取消"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          shipping_method: 'HAND_DELIVERY'
        }}
      >
        <Form.Item
          name="shipping_method"
          label="出貨方式"
          rules={[{ required: true, message: '請選擇出貨方式' }]}
        >
          <Radio.Group onChange={(e) => setShippingMethod(e.target.value)}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="HAND_DELIVERY" style={{ whiteSpace: 'normal', display: 'flex', alignItems: 'flex-start' }}>
                親送
              </Radio>
              <Radio value="COURIER" style={{ whiteSpace: 'normal', display: 'flex', alignItems: 'flex-start' }}>
                貨運
              </Radio>
              <Radio value="PICKUP" style={{ whiteSpace: 'normal', display: 'flex', alignItems: 'flex-start' }}>
                自取
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {/* 親送和貨運需要填寫地址 */}
        {(shippingMethod === 'HAND_DELIVERY' || shippingMethod === 'COURIER') && (
          <Form.Item
            name="shipping_address"
            label="出貨地址"
            rules={[
              {
                required: shippingMethod === 'COURIER',
                message: '貨運方式需要填寫出貨地址'
              }
            ]}
          >
            <Input.TextArea
              rows={2}
              placeholder="請輸入出貨地址（親送可選填）"
            />
          </Form.Item>
        )}

        {/* 貨運需要填寫貨運單號 */}
        {shippingMethod === 'COURIER' && (
          <Form.Item
            name="tracking_number"
            label="貨運單號"
          >
            <Input placeholder="請輸入貨運單號（可選）" />
          </Form.Item>
        )}

        <Form.Item
          name="notes"
          label="出貨備註"
        >
          <TextArea rows={3} placeholder="選填：特殊注意事項" />
        </Form.Item>

        {/* 🆕 發票資訊區塊 */}
        <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              <span style={{ fontWeight: 'bold' }}>發票資訊（選填）</span>
            </div>

            <Checkbox
              checked={needInvoice}
              onChange={(e) => {
                setNeedInvoice(e.target.checked)
                if (!e.target.checked) {
                  form.setFieldsValue({ invoice_number: undefined, invoice_date: undefined })
                } else {
                  form.setFieldsValue({ invoice_date: dayjs() })
                }
              }}
            >
              需要開立發票
            </Checkbox>

            {needInvoice && (
              <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                <Form.Item
                  name="invoice_number"
                  label="發票號碼"
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="如：AB12345678" />
                </Form.Item>

                <Form.Item
                  name="invoice_date"
                  label="發票日期"
                  style={{ marginBottom: 0 }}
                  initialValue={dayjs()}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format="YYYY/MM/DD"
                    placeholder="選擇發票日期"
                  />
                </Form.Item>
              </Space>
            )}
          </Space>
        </div>

        {shippingMethod === 'PICKUP' && (
          <Alert
            message="自取提醒"
            description="客戶將自行到店取貨，請確認商品已準備完成。"
            type="info"
            showIcon
          />
        )}

        {shippingMethod === 'HAND_DELIVERY' && (
          <Alert
            message="親送提醒"
            description="將由公司人員親自送達，請確認送貨地址和聯絡方式。"
            type="info"
            showIcon
          />
        )}

        {shippingMethod === 'COURIER' && (
          <Alert
            message="貨運提醒"
            description="將透過物流公司配送，請填寫完整地址並在發貨後補填貨運單號。"
            type="warning"
            showIcon
          />
        )}
      </Form>
    </Modal>
  )
}
