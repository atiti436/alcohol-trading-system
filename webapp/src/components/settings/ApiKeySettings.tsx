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
  Descriptions
} from 'antd'
import {
  KeyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  ExperimentOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

interface ApiKeySettingsProps {
  onApiKeyChange?: (newKey: string) => void
}

export default function ApiKeySettings({ onApiKeyChange }: ApiKeySettingsProps) {
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [secondaryGeminiApiKey, setSecondaryGeminiApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSecondaryKey, setShowSecondaryKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testingSecondary, setTestingSecondary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testSecondaryResult, setTestSecondaryResult] = useState<{ success: boolean; message: string } | null>(null)
  const [hasKey, setHasKey] = useState(false)
  const [hasSecondaryKey, setHasSecondaryKey] = useState(false)

  useEffect(() => {
    loadApiKey()
  }, [])

  // 載入已儲存的API Key
  const loadApiKey = async () => {
    try {
      const response = await fetch('/api/settings/api-keys')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // 不回傳明文金鑰，只回 configured 狀態
          setHasKey(!!data.data?.configured)
          setHasSecondaryKey(!!data.data?.secondaryConfigured)
        }
      }
    } catch (error) {
      console.error('載入API Key失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 測試API Key
  const testApiKey = async () => {
    if (!geminiApiKey.trim()) {
      setTestResult({
        success: false,
        message: '請輸入API Key'
      })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/settings/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiApiKey })
      })

      const result = await response.json()
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'API Key 測試成功' : '測試失敗')
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

  // 測試次要 API Key（與主金鑰相同流程）
  const testSecondaryApiKey = async () => {
    if (!secondaryGeminiApiKey.trim()) {
      setTestSecondaryResult({ success: false, message: '請輸入次要 API Key' })
      return
    }
    setTestingSecondary(true)
    setTestSecondaryResult(null)
    try {
      const response = await fetch('/api/settings/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: secondaryGeminiApiKey })
      })
      const result = await response.json()
      setTestSecondaryResult({
        success: result.success,
        message: result.message || (result.success ? '次要 API Key 測試成功' : '測試失敗')
      })
    } catch (error) {
      setTestSecondaryResult({ success: false, message: '測試請求失敗，請檢查網路連線' })
    } finally {
      setTestingSecondary(false)
    }
  }

  // 儲存API Key
  const saveApiKey = async () => {
    if (!geminiApiKey.trim()) {
      setTestResult({
        success: false,
        message: '請輸入API Key'
      })
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiApiKey: geminiApiKey.trim() || undefined,
          secondaryGeminiApiKey: secondaryGeminiApiKey.trim() || undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        if (geminiApiKey.trim()) setHasKey(true)
        if (secondaryGeminiApiKey.trim()) setHasSecondaryKey(true)
        setTestResult({
          success: true,
          message: 'API Key 已成功儲存'
        })

        // 通知父組件
        if (onApiKeyChange) {
          onApiKeyChange(geminiApiKey)
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

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4)
  }

  if (loading) {
    return (
      <Card style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>載入API設定中...</Text>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <KeyOutlined />
          API Key 設定
        </Title>
        <Text type="secondary">
          設定 Google Gemini Vision API Key 以啟用PDF報單OCR識別功能
        </Text>
        <Paragraph type="secondary" style={{ marginTop: 8 }}>
          安全說明：此欄位僅用於「寫入」API Key，系統不會回顯或提供金鑰查詢；金鑰將以 AES-256-GCM 加密保存於後端設定，僅供伺服器端 API 呼叫使用，所有更新行為將記錄於審計日誌。
        </Paragraph>
      </div>

      {/* 狀態顯示 */}
      <div style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Descriptions title="目前狀態" size="small">
              <Descriptions.Item label="API Key">
                {hasKey ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    已設定
                  </Tag>
                ) : (
                  <Tag color="error" icon={<ExclamationCircleOutlined />}>
                    未設定
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="次要 API Key">
                {hasSecondaryKey ? (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    已設定
                  </Tag>
                ) : (
                  <Tag color="warning" icon={<ExclamationCircleOutlined />}>
                    未設定（可選）
                  </Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </div>

      <Divider />

      {/* Gemini API Key 設定 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Text strong>Google Gemini API Key</Text>
            <Tag color="red">必需</Tag>
          </Space>
        </div>

        <Row gutter={8}>
          <Col flex="auto">
            <Input.Password
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="輸入您的 Gemini API Key"
              disabled={saving || testing}
              visibilityToggle={{
                visible: showKey,
                onVisibleChange: setShowKey
              }}
              iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            />
          </Col>
          <Col>
            <Button
              icon={<ExperimentOutlined />}
              onClick={testApiKey}
              disabled={!geminiApiKey.trim() || testing || saving}
              loading={testing}
            >
              {testing ? '測試中' : '測試'}
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

      {/* 次要金鑰設定 */}
      <Divider />
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text strong>Google Gemini 次要 API Key</Text>
          <Tag>選填</Tag>
        </Space>
      </div>
      <Row gutter={8}>
        <Col flex="auto">
          <Input.Password
            value={secondaryGeminiApiKey}
            onChange={(e) => setSecondaryGeminiApiKey(e.target.value)}
            placeholder="輸入次要 Gemini API Key（可作為備援）"
            disabled={saving || testingSecondary}
            visibilityToggle={{
              visible: showSecondaryKey,
              onVisibleChange: setShowSecondaryKey
            }}
            iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
          />
        </Col>
        <Col>
          <Button
            icon={<ExperimentOutlined />}
            onClick={testSecondaryApiKey}
            disabled={!secondaryGeminiApiKey.trim() || testingSecondary || saving}
            loading={testingSecondary}
          >
            {testingSecondary ? '測試中' : '測試'}
          </Button>
        </Col>
      </Row>

      {testSecondaryResult && (
        <div style={{ marginTop: 16, marginBottom: 24 }}>
          <Alert
            message={testSecondaryResult.success ? '次要金鑰測試成功' : '次要金鑰測試失敗'}
            description={testSecondaryResult.message}
            type={testSecondaryResult.success ? 'success' : 'error'}
            showIcon
            icon={testSecondaryResult.success ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
          />
        </div>
      )}

      {/* 儲存按鈕 */}
      <div style={{ marginBottom: 24 }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={saveApiKey}
          disabled={!geminiApiKey.trim() || saving || testing}
          loading={saving}
          size="large"
          block
        >
          {saving ? '儲存中...' : '儲存設定'}
        </Button>
      </div>

      <Divider />

      {/* 說明文字 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>如何取得 API Key：</Title>
        <ol style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={{ marginBottom: 8 }}>
            前往{' '}
            <a
              href="https://makersuite.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google AI Studio
            </a>
          </li>
          <li style={{ marginBottom: 8 }}>登入您的 Google 帳號</li>
          <li style={{ marginBottom: 8 }}>點擊「Create API Key」</li>
          <li style={{ marginBottom: 8 }}>選擇或創建一個 Google Cloud 專案</li>
          <li style={{ marginBottom: 8 }}>複製生成的 API Key 並貼上到此處</li>
        </ol>

        <Title level={5}>安全說明：</Title>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li style={{ marginBottom: 8 }}>API Key 會加密儲存在伺服器端</li>
          <li style={{ marginBottom: 8 }}>僅用於PDF報單OCR識別功能</li>
          <li style={{ marginBottom: 8 }}>不會與第三方分享</li>
          <li style={{ marginBottom: 8 }}>可隨時更新或刪除</li>
        </ul>

        {hasKey && (
          <div>
            <Title level={5}>目前設定：</Title>
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: 12,
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 14
            }}>
              {showKey ? geminiApiKey : maskApiKey(geminiApiKey)}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
