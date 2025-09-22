'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Button
} from '@/components/ui/button'
import {
  Input
} from '@/components/ui/input'
import {
  Label
} from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Save,
  TestTube
} from 'lucide-react'

interface ApiKeySettingsProps {
  onApiKeyChange?: (newKey: string) => void
}

export default function ApiKeySettings({ onApiKeyChange }: ApiKeySettingsProps) {
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [hasKey, setHasKey] = useState(false)

  useEffect(() => {
    loadApiKey()
  }, [])

  // 載入已儲存的API Key
  const loadApiKey = async () => {
    try {
      const response = await fetch('/api/settings/api-keys')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.geminiApiKey) {
          setGeminiApiKey(data.data.geminiApiKey)
          setHasKey(true)
        }
      }
    } catch (error) {
      console.error('載入API Key失敗:', error)
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
        body: JSON.stringify({ geminiApiKey })
      })

      const result = await response.json()

      if (result.success) {
        setHasKey(true)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Key 設定
        </CardTitle>
        <CardDescription>
          設定 Google Gemini Vision API Key 以啟用PDF報單OCR識別功能
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 狀態顯示 */}
        <div className="flex items-center gap-2">
          <Label>目前狀態：</Label>
          {hasKey ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              已設定
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              未設定
            </Badge>
          )}
        </div>

        <Separator />

        {/* Gemini API Key 設定 */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="geminiApiKey" className="flex items-center gap-2">
              Google Gemini API Key
              <Badge variant="outline">必需</Badge>
            </Label>
            <div className="flex space-x-2 mt-2">
              <div className="relative flex-1">
                <Input
                  id="geminiApiKey"
                  type={showKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="輸入您的 Gemini API Key"
                  disabled={saving || testing}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                onClick={testApiKey}
                disabled={!geminiApiKey.trim() || testing || saving}
                variant="outline"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testing ? '測試中...' : '測試'}
              </Button>
            </div>
          </div>

          {/* 測試結果 */}
          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          {/* 儲存按鈕 */}
          <Button
            onClick={saveApiKey}
            disabled={!geminiApiKey.trim() || saving || testing}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? '儲存中...' : '儲存設定'}
          </Button>
        </div>

        <Separator />

        {/* 說明文字 */}
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">如何取得 API Key：</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>前往 <a href="https://makersuite.google.com/app/apikey" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
              <li>登入您的 Google 帳號</li>
              <li>點擊「Create API Key」</li>
              <li>選擇或創建一個 Google Cloud 專案</li>
              <li>複製生成的 API Key 並貼上到此處</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">安全說明：</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>API Key 會加密儲存在伺服器端</li>
              <li>僅用於PDF報單OCR識別功能</li>
              <li>不會與第三方分享</li>
              <li>可隨時更新或刪除</li>
            </ul>
          </div>

          {hasKey && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">目前設定：</h4>
              <div className="bg-gray-50 p-3 rounded-md">
                <code className="text-sm">{showKey ? geminiApiKey : maskApiKey(geminiApiKey)}</code>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}