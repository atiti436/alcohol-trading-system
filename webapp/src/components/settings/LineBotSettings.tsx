'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Input,
  Alert,
  Tag,
  Divider,
  Row,
  Col,
  Typography,
  Space,
  Spin,
  Descriptions,
  Form
} from 'antd'
import {
  MessageOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  ExperimentOutlined,
  ApiOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

interface LineBotSettingsProps {
  onSettingsChange?: (settings: LineBotConfig) => void
}

interface LineBotConfig {
  channelAccessToken: string
  channelSecret: string
  webhookUrl: string
}

export default function LineBotSettings({ onSettingsChange }: LineBotSettingsProps) {
  const [form] = Form.useForm()
  const [showToken, setShowToken] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [hasSettings, setHasSettings] = useState(false)

  useEffect(() => {
    loadLineBotSettings()
  }, [])

  // 載入已儲存的 LINE Bot 設定
  const loadLineBotSettings = async () => {
    try {
      const response = await fetch('/api/settings/linebot')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          form.setFieldsValue(data.data)
          setHasSettings(data.data.channelAccessToken && data.data.channelSecret)
        }
      }
    } catch (error) {
      console.error('載入 LINE Bot 設定失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 測試 LINE Bot 設定
  const testLineBotSettings = async () => {
    try {
      await form.validateFields()
      const values = form.getFieldsValue()

      if (!values.channelAccessToken?.trim() || !values.channelSecret?.trim()) {
        setTestResult({
          success: false,
          message: '請填入完整的 Channel Access Token 和 Channel Secret'
        })
        return
      }

      setTesting(true)
      setTestResult(null)

      const response = await fetch('/api/settings/test-linebot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      const result = await response.json()
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'LINE Bot 設定測試成功' : '測試失敗')
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: '測試請求失敗，請檢查網路連線'
      })
    } finally {
      setTesting(false)
    }
  }

  // 儲存 LINE Bot 設定
  const saveLineBotSettings = async () => {
    try {
      await form.validateFields()
      const values = form.getFieldsValue()

      if (!values.channelAccessToken?.trim() || !values.channelSecret?.trim()) {
        setTestResult({
          success: false,
          message: '請填入完整的 Channel Access Token 和 Channel Secret'
        })
        return
      }

      setSaving(true)

      const response = await fetch('/api/settings/linebot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      const result = await response.json()

      if (result.success) {
        setHasSettings(true)
        setTestResult({
          success: true,
          message: 'LINE Bot 設定已成功儲存'
        })

        // 通知父組件
        if (onSettingsChange) {
          onSettingsChange(values)
        }
      } else {
        setTestResult({
          success: false,
          message: result.error || '儲存失敗'
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: '儲存失敗，請重試'
      })
    } finally {
      setSaving(false)
    }
  }

  const maskToken = (token: string) => {
    if (token.length <= 8) return token
    return token.substring(0, 4) + '*'.repeat(token.length - 8) + token.substring(token.length - 4)
  }

  if (loading) {
    return (
      <Card style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>載入 LINE Bot 設定中...</Text>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <MessageOutlined />
          LINE Bot 設定
        </Title>
        <Text type="secondary">
          設定 LINE Messaging API 以啟用 LINE Bot 詢價功能
        </Text>
      </div>

      {/* 狀態顯示 */}
      <div style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Descriptions title="目前狀態" size="small">
              <Descriptions.Item label="LINE Bot 設定">
                {hasSettings ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    已設定
                  </Tag>
                ) : (
                  <Tag color="error" icon={<ExclamationCircleOutlined />}>
                    未設定
                  </Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </div>

      <Divider />

      <Form form={form} layout="vertical">
        {/* Channel Access Token */}
        <Form.Item
          name="channelAccessToken"
          label={
            <Space>
              <Text strong>Channel Access Token</Text>
              <Tag color="red">必需</Tag>
            </Space>
          }
          rules={[
            { required: true, message: '請輸入 Channel Access Token' },
            { min: 50, message: 'Channel Access Token 長度不足' }
          ]}
        >
          <Row gutter={8}>
            <Col flex="auto">
              <Input.Password
                placeholder="輸入您的 LINE Channel Access Token"
                disabled={saving || testing}
                visibilityToggle={{
                  visible: showToken,
                  onVisibleChange: setShowToken
                }}
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Col>
          </Row>
        </Form.Item>

        {/* Channel Secret */}
        <Form.Item
          name="channelSecret"
          label={
            <Space>
              <Text strong>Channel Secret</Text>
              <Tag color="red">必需</Tag>
            </Space>
          }
          rules={[
            { required: true, message: '請輸入 Channel Secret' },
            { len: 32, message: 'Channel Secret 必須為 32 字符' }
          ]}
        >
          <Row gutter={8}>
            <Col flex="auto">
              <Input.Password
                placeholder="輸入您的 LINE Channel Secret"
                disabled={saving || testing}
                visibilityToggle={{
                  visible: showSecret,
                  onVisibleChange: setShowSecret
                }}
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Col>
          </Row>
        </Form.Item>

        {/* Webhook URL */}
        <Form.Item
          name="webhookUrl"
          label={
            <Space>
              <Text strong>Webhook URL</Text>
              <Tag color="blue">自動生成</Tag>
            </Space>
          }
          initialValue={typeof window !== 'undefined' ? `${window.location.origin}/api/linebot/webhook` : ''}
        >
          <Input
            prefix={<ApiOutlined />}
            disabled
            style={{ backgroundColor: '#f5f5f5' }}
          />
        </Form.Item>
      </Form>

      {/* 操作按鈕 */}
      <div style={{ marginBottom: 24 }}>
        <Row gutter={8}>
          <Col span={12}>
            <Button
              icon={<ExperimentOutlined />}
              onClick={testLineBotSettings}
              disabled={testing || saving}
              loading={testing}
              block
            >
              {testing ? '測試中' : '測試連線'}
            </Button>
          </Col>
          <Col span={12}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={saveLineBotSettings}
              disabled={saving || testing}
              loading={saving}
              block
            >
              {saving ? '儲存中...' : '儲存設定'}
            </Button>
          </Col>
        </Row>
      </div>

      {/* 測試結果 */}
      {testResult && (
        <div style={{ marginBottom: 24 }}>
          <Alert
            message={testResult.success ? '測試成功' : '測試失敗'}
            description={testResult.message}
            type={testResult.success ? 'success' : 'error'}
            showIcon
            icon={testResult.success ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
          />
        </div>
      )}

      <Divider />

      {/* 說明文字 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>如何取得 LINE Bot 設定：</Title>
        <ol style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={{ marginBottom: 8 }}>
            前往{' '}
            <a
              href="https://developers.line.biz/console/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LINE Developers Console
            </a>
          </li>
          <li style={{ marginBottom: 8 }}>登入您的 LINE 帳號或建立開發者帳號</li>
          <li style={{ marginBottom: 8 }}>建立新的 Provider 或選擇現有的</li>
          <li style={{ marginBottom: 8 }}>建立 Messaging API Channel</li>
          <li style={{ marginBottom: 8 }}>在 Basic Settings 頁面取得 Channel Secret</li>
          <li style={{ marginBottom: 8 }}>在 Messaging API 頁面取得 Channel Access Token</li>
          <li style={{ marginBottom: 8 }}>設定 Webhook URL 為下方顯示的網址</li>
        </ol>

        <Title level={5}>重要提醒：</Title>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={{ marginBottom: 8 }}>Channel Access Token 和 Channel Secret 會加密儲存</li>
          <li style={{ marginBottom: 8 }}>請確保在 LINE Developers Console 中啟用 Webhook</li>
          <li style={{ marginBottom: 8 }}>Webhook URL 必須為 HTTPS</li>
          <li style={{ marginBottom: 8 }}>建議設定 IP 白名單以提高安全性</li>
        </ul>

        <Title level={5}>支援功能：</Title>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={{ marginBottom: 8 }}>✅ 客戶詢價功能</li>
          <li style={{ marginBottom: 8 }}>✅ 產品資訊查詢</li>
          <li style={{ marginBottom: 8 }}>✅ 報價單生成</li>
          <li style={{ marginBottom: 8 }}>✅ 訂單狀態查詢</li>
        </ul>

        {hasSettings && (
          <div>
            <Title level={5}>目前設定預覽：</Title>
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: 12,
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 14
            }}>
              <div>Channel Access Token: {showToken ? form.getFieldValue('channelAccessToken') : maskToken(form.getFieldValue('channelAccessToken') || '')}</div>
              <div>Channel Secret: {showSecret ? form.getFieldValue('channelSecret') : '*'.repeat(32)}</div>
              <div>Webhook URL: {form.getFieldValue('webhookUrl')}</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}