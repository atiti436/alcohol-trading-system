'use client'

import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Space,
  message,
  Divider,
  Typography,
  Alert
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import CustomsDeclarationUpload from '@/components/customs/CustomsDeclarationUpload'

const { TextArea } = Input
const { Title } = Typography

interface ImportEditModalProps {
  visible: boolean
  importRecord: any
  onCancel: () => void
  onSuccess: () => void
  onReupload?: (importId: string) => void
}

export default function ImportEditModal({
  visible,
  importRecord,
  onCancel,
  onSuccess,
  onReupload
}: ImportEditModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    if (importRecord && visible) {
      form.setFieldsValue({
        exchange_rate: importRecord.exchangeRate,
        declaration_number: importRecord.declarationNumber,
        declaration_date: importRecord.declarationDate ? dayjs(importRecord.declarationDate) : null,
        notes: importRecord.notes
      })
    }
  }, [importRecord, visible, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const response = await fetch(`/api/imports-v2/${importRecord.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exchange_rate: values.exchange_rate,
          declaration_number: values.declaration_number,
          declaration_date: values.declaration_date?.format('YYYY-MM-DD'),
          notes: values.notes
        })
      })

      const data = await response.json()

      if (data.success) {
        message.success('進貨單已更新')
        form.resetFields()
        onSuccess()
      } else {
        message.error(data.error || '更新失敗')
      }
    } catch (error) {
      console.error('更新進貨單失敗:', error)
      message.error('更新進貨單失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  const handleReuploadDeclaration = () => {
    setShowUpload(true)
  }

  const handleUploadComplete = (result: any) => {
    message.success('報單已重新上傳')
    setShowUpload(false)
    if (onReupload && importRecord?.id) {
      onReupload(importRecord.id)
    }
    onSuccess()
  }

  return (
    <>
      <Modal
        title="編輯進貨單"
        open={visible}
        onCancel={handleCancel}
        onOk={handleSubmit}
        confirmLoading={loading}
        width={700}
        okText="確定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          <Divider>基本資訊</Divider>

          <Space style={{ width: '100%', marginBottom: 16 }}>
            <div>
              <strong>進貨單號：</strong>{importRecord?.importNumber}
            </div>
            <div>
              <strong>供應商：</strong>{importRecord?.supplier}
            </div>
            <div>
              <strong>狀態：</strong>{importRecord?.status}
            </div>
          </Space>

          <Form.Item
            name="exchange_rate"
            label="匯率"
            rules={[
              { required: true, message: '請輸入匯率' },
              {
                type: 'number',
                min: 0.001,
                max: 1000,
                message: '匯率必須在 0.001 到 1000 之間'
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="請輸入匯率"
              step={0.001}
              min={0.001}
              max={1000}
              precision={3}
            />
          </Form.Item>

          <Divider>報單資訊</Divider>

          <Form.Item
            name="declaration_number"
            label="報單號碼"
          >
            <Input placeholder="請輸入報單號碼" />
          </Form.Item>

          <Form.Item
            name="declaration_date"
            label="報關日期"
          >
            <DatePicker style={{ width: '100%' }} placeholder="請選擇報關日期" />
          </Form.Item>

          {importRecord?.declarationNumber && (
            <Form.Item>
              <Alert
                message="已有報單記錄"
                description={`報單號碼：${importRecord.declarationNumber}${importRecord.declarationDate ? ` | 報關日期：${dayjs(importRecord.declarationDate).format('YYYY-MM-DD')}` : ''}`}
                type="info"
                showIcon
                action={
                  <Button
                    size="small"
                    icon={<UploadOutlined />}
                    onClick={handleReuploadDeclaration}
                  >
                    重新上傳
                  </Button>
                }
              />
            </Form.Item>
          )}

          {showUpload && (
            <Form.Item>
              <Divider>上傳新報單</Divider>
              <CustomsDeclarationUpload
                onUploadComplete={handleUploadComplete}
                disabled={false}
              />
            </Form.Item>
          )}

          <Divider>備註</Divider>

          <Form.Item name="notes" label="備註">
            <TextArea rows={3} placeholder="請輸入備註資訊" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}