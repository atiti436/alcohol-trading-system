'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Typography,
  Space,
  Divider,
  Row,
  Col,
  Switch
} from 'antd'
import {
  SaveOutlined,
  ReloadOutlined,
  BankOutlined
} from '@ant-design/icons'
import { SuperAdminOnly } from '@/components/auth/RoleGuard'

const { Title, Text } = Typography
const { TextArea } = Input

interface CompanySettings {
  name: string
  englishName: string
  address: string
  phone: string
  email: string
  website: string
  taxId: string
  bankName: string
  bankAccount: string
  bankCode: string
  lineId: string
  customField1: string
  customField2: string
  showBankInfo: boolean
}

export default function CompanySettingsPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 載入公司設定
  const loadCompanySettings = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings/company')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          form.setFieldsValue(result.data)
        }
      }
    } catch (error) {
      console.error('載入公司設定失敗:', error)
      message.error('載入公司設定失敗')
    } finally {
      setLoading(false)
    }
  }, [form])

  // 儲存公司設定
  const saveCompanySettings = async (values: CompanySettings) => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      })

      const result = await response.json()
      if (response.ok && result.success) {
        message.success('公司設定儲存成功')
      } else {
        message.error(result.error || '儲存失敗')
      }
    } catch (error) {
      console.error('儲存公司設定失敗:', error)
      message.error('儲存失敗，請檢查網路連線')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadCompanySettings()
  }, [loadCompanySettings])

  return (
    <SuperAdminOnly>
      <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2}>
            <BankOutlined style={{ marginRight: 8 }} />
            公司資訊設定
          </Title>
          <Text type="secondary">
            管理系統中使用的公司基本資訊，這些資訊會顯示在所有列印單據上
          </Text>
        </div>

        <Card loading={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={saveCompanySettings}
            initialValues={{
              name: '滿帆洋行有限公司',
              englishName: 'Full Sail Trading Co., Ltd.',
              address: '台北市中山區南京東路二段123號8樓',
              phone: '(02) 2545-1234',
              email: 'info@fullsail-trading.com.tw',
              website: 'www.fullsail-trading.com.tw',
              taxId: '12345678',
              bankName: '台灣銀行',
              bankAccount: '123-456-789012',
              bankCode: '004',
              lineId: '@fullsail',
              customField1: '',
              customField2: ''
            }}
          >
            <Row gutter={[24, 0]}>
              <Col span={24}>
                <Title level={4}>基本資訊</Title>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  label="公司名稱"
                  name="name"
                  rules={[{ required: true, message: '請輸入公司名稱' }]}
                >
                  <Input placeholder="請輸入公司名稱" />
                </Form.Item>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  label="英文名稱"
                  name="englishName"
                >
                  <Input placeholder="請輸入英文公司名稱" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  label="公司地址"
                  name="address"
                  rules={[{ required: true, message: '請輸入公司地址' }]}
                >
                  <TextArea rows={2} placeholder="請輸入公司地址" />
                </Form.Item>
              </Col>

              <Col xs={24} lg={8}>
                <Form.Item
                  label="聯絡電話"
                  name="phone"
                  rules={[{ required: true, message: '請輸入聯絡電話' }]}
                >
                  <Input placeholder="(02) 1234-5678" />
                </Form.Item>
              </Col>

              <Col xs={24} lg={8}>
                <Form.Item
                  label="LINE 官方帳號"
                  name="lineId"
                >
                  <Input placeholder="@yourcompany" />
                </Form.Item>
              </Col>

              <Col xs={24} lg={8}>
                <Form.Item
                  label="統一編號"
                  name="taxId"
                  rules={[
                    { required: true, message: '請輸入統一編號' },
                    { len: 8, message: '統一編號必須為8碼' }
                  ]}
                >
                  <Input placeholder="12345678" />
                </Form.Item>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  label="電子信箱"
                  name="email"
                  rules={[
                    { type: 'email', message: '請輸入有效的電子信箱' }
                  ]}
                >
                  <Input placeholder="info@company.com.tw" />
                </Form.Item>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  label="官方網站"
                  name="website"
                >
                  <Input placeholder="www.company.com.tw" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Divider />
                <Title level={4}>其他聯絡方式</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  可自訂填入 WeChat、Telegram 等現代聯絡方式
                </Text>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  label="自訂欄位 1"
                  name="customField1"
                  extra="例如：WeChat ID、Instagram、Facebook 等"
                >
                  <Input placeholder="輸入聯絡方式" />
                </Form.Item>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  label="自訂欄位 2"
                  name="customField2"
                  extra="例如：Telegram、Discord、其他聯絡方式"
                >
                  <Input placeholder="輸入聯絡方式" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Divider />
                <Title level={4}>銀行資訊</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  用於對帳單和發票上的付款資訊
                </Text>
              </Col>

              <Col xs={24} lg={8}>
                <Form.Item
                  label="銀行名稱"
                  name="bankName"
                >
                  <Input placeholder="台灣銀行" />
                </Form.Item>
              </Col>

              <Col xs={24} lg={8}>
                <Form.Item
                  label="銀行代碼"
                  name="bankCode"
                >
                  <Input placeholder="004" />
                </Form.Item>
              </Col>

              <Col xs={24} lg={8}>
                <Form.Item
                  label="帳戶號碼"
                  name="bankAccount"
                >
                  <Input placeholder="123-456-789012" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="showBankInfo"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                    <Switch />
                    <div>
                      <Text strong>列印時顯示銀行帳號資訊</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        啟用後，報價單、對帳單、出貨單等單據列印時會在頁尾顯示銀行匯款資訊
                      </Text>
                    </div>
                  </div>
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
              <Space size="middle">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    form.resetFields()
                    loadCompanySettings()
                  }}
                >
                  重新載入
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  htmlType="submit"
                  loading={saving}
                  size="large"
                >
                  儲存設定
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </SuperAdminOnly>
  )
}