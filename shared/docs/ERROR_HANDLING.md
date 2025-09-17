# ⚠️ 錯誤處理規範

## 🎯 錯誤處理原則
建立友善且安全的錯誤處理機制，確保**不洩漏敏感資訊**，同時提供良好的用戶體驗。

---

## 🔒 安全優先的錯誤處理

### **❌ 危險的錯誤訊息 (絕對禁止)**
```javascript
// ❌ 洩漏資料庫結構
"Error: Column 'actualPrice' not found in sales table"

// ❌ 洩漏商業邏輯
"Error: Commission calculation failed for investor inv_001"

// ❌ 洩漏系統內部
"Error: Database connection failed: postgres://user:pass@db.com"

// ❌ 洩漏API金鑰狀態
"Error: Gemini API key expired: AIzaSyC..."
```

### **✅ 安全的錯誤訊息**
```javascript
// ✅ 一般性錯誤
"系統暫時無法處理您的請求，請稍後再試"

// ✅ 權限錯誤
"您沒有權限執行此操作"

// ✅ 資料驗證錯誤
"請檢查輸入資料是否正確"

// ✅ 系統維護
"系統正在維護中，預計 10 分鐘後恢復"
```

---

## 🎨 前端錯誤處理

### **React錯誤邊界**
```tsx
class SecurityErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorId: null }
  }

  static getDerivedStateFromError(error) {
    // 生成錯誤ID，但不暴露錯誤詳情
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 記錄到安全日誌 (不包含敏感資訊)
    console.error(`[${errorId}] Frontend error boundary triggered`)

    return { hasError: true, errorId }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="系統發生錯誤"
          subTitle={`請記錄錯誤代碼並聯絡技術支援：${this.state.errorId}`}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              重新載入頁面
            </Button>
          }
        />
      )
    }

    return this.props.children
  }
}
```

### **API錯誤處理**
```tsx
// 統一的API錯誤處理
const apiClient = {
  async request(url: string, options: RequestInit = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })

      if (!response.ok) {
        throw new APIError(response.status, await response.json())
      }

      return await response.json()
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }

      // 網路錯誤或其他未預期錯誤
      throw new APIError(500, {
        error: {
          code: 'NETWORK_ERROR',
          message: '網路連線發生問題，請檢查網路狀態'
        }
      })
    }
  }
}

class APIError extends Error {
  constructor(public status: number, public data: any) {
    super(data.error?.message || '系統錯誤')
    this.name = 'APIError'
  }
}
```

### **表單驗證錯誤**
```tsx
interface FormErrorDisplayProps {
  errors: Record<string, string>
  touched: Record<string, boolean>
}

const FormErrorDisplay: React.FC<FormErrorDisplayProps> = ({ errors, touched }) => {
  return (
    <>
      {Object.entries(errors).map(([field, message]) =>
        touched[field] && (
          <Alert
            key={field}
            type="error"
            message={sanitizeErrorMessage(message)}
            style={{ marginBottom: 8 }}
          />
        )
      )}
    </>
  )
}

// 清理錯誤訊息，移除敏感資訊
function sanitizeErrorMessage(message: string): string {
  // 移除可能的SQL錯誤訊息
  if (message.includes('SQL') || message.includes('database')) {
    return '資料驗證失敗，請檢查輸入格式'
  }

  // 移除API金鑰相關錯誤
  if (message.includes('API') || message.includes('key')) {
    return '系統設定問題，請聯絡管理員'
  }

  return message
}
```

---

## 🚀 後端錯誤處理

### **API錯誤回應標準**
```typescript
// 統一錯誤回應格式
interface ErrorResponse {
  success: false
  error: {
    code: string          // 錯誤代碼
    message: string       // 用戶友善訊息
    timestamp: string     // 錯誤時間
  }
  requestId?: string      // 請求追蹤ID
}

// 錯誤代碼定義
enum ErrorCode {
  // 認證相關
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // 資料相關
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // 權限相關
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVESTOR_DATA_ACCESS_DENIED = 'INVESTOR_DATA_ACCESS_DENIED',

  // 系統相關
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  API_KEY_ERROR = 'API_KEY_ERROR'
}
```

### **全域錯誤處理中間件**
```typescript
// Next.js API錯誤處理
export function withErrorHandler(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res)
    } catch (error) {
      console.error(`[API Error] ${req.method} ${req.url}:`, {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        requestId: req.headers['x-request-id']
      })

      // 根據錯誤類型返回適當回應
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: '輸入資料格式錯誤',
            timestamp: new Date().toISOString()
          }
        })
      }

      if (error instanceof UnauthorizedError) {
        return res.status(401).json({
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: '請重新登入',
            timestamp: new Date().toISOString()
          }
        })
      }

      if (error instanceof ForbiddenError) {
        return res.status(403).json({
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: '您沒有權限執行此操作',
            timestamp: new Date().toISOString()
          }
        })
      }

      // 預設錯誤 (不洩漏內部資訊)
      return res.status(500).json({
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: '系統暫時無法處理您的請求',
          timestamp: new Date().toISOString()
        }
      })
    }
  }
}
```

### **投資方權限錯誤**
```typescript
// 特殊處理投資方數據存取錯誤
class InvestorDataAccessError extends Error {
  constructor(attemptedAction: string) {
    super(`Investor attempted to access restricted data: ${attemptedAction}`)
    this.name = 'InvestorDataAccessError'
  }
}

// 在權限檢查中使用
export function checkInvestorDataAccess(user: User, requestedData: any) {
  if (user.role === 'INVESTOR') {
    // 檢查是否嘗試存取敏感欄位
    const sensitiveFields = ['actualPrice', 'commission', 'personalPurchases']
    const requestedFields = Object.keys(requestedData)

    for (const field of sensitiveFields) {
      if (requestedFields.includes(field)) {
        // 記錄安全事件
        console.warn(`[SECURITY] Investor ${user.id} attempted to access ${field}`)

        throw new InvestorDataAccessError(field)
      }
    }
  }
}
```

---

## 📱 用戶界面錯誤處理

### **載入狀態錯誤**
```tsx
const DataTable: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState([])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await apiClient.request('/api/sales')
      setData(result.data)
    } catch (error) {
      if (error instanceof APIError) {
        setError(error.message)
      } else {
        setError('載入資料時發生錯誤')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Skeleton active />
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="載入失敗"
        description={error}
        action={
          <Button size="small" onClick={loadData}>
            重試
          </Button>
        }
      />
    )
  }

  return <Table dataSource={data} />
}
```

### **表單提交錯誤**
```tsx
const ProductForm: React.FC = () => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true)

      await apiClient.request('/api/products', {
        method: 'POST',
        body: JSON.stringify(values)
      })

      message.success('商品新增成功')
      form.resetFields()
    } catch (error) {
      if (error instanceof APIError) {
        if (error.status === 400) {
          // 顯示驗證錯誤
          notification.error({
            message: '資料驗證失敗',
            description: error.message
          })
        } else if (error.status === 403) {
          // 權限錯誤
          Modal.error({
            title: '權限不足',
            content: '您沒有權限新增商品，請聯絡管理員'
          })
        } else {
          // 其他錯誤
          notification.error({
            message: '新增失敗',
            description: '系統暫時無法處理您的請求'
          })
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form form={form} onFinish={handleSubmit}>
      {/* 表單欄位 */}
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={submitting}
        >
          新增商品
        </Button>
      </Form.Item>
    </Form>
  )
}
```

---

## 🤖 外部API錯誤處理

### **Gemini API錯誤**
```typescript
export async function callGeminiAPI(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    if (!response.ok) {
      const error = await response.json()

      // 不同錯誤類型的處理
      if (response.status === 401) {
        console.error('[Gemini] API key invalid or expired')
        throw new Error('AI服務設定問題，請聯絡管理員')
      }

      if (response.status === 429) {
        console.error('[Gemini] Rate limit exceeded')
        throw new Error('AI服務使用量已達上限，請稍後再試')
      }

      if (response.status >= 500) {
        console.error('[Gemini] Server error:', error)
        throw new Error('AI服務暫時無法使用')
      }

      throw new Error('AI分析失敗，請重試')
    }

    const result = await response.json()
    return result.candidates[0].content.parts[0].text
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('網路連線問題，請檢查網路狀態')
    }

    throw error
  }
}
```

### **LINE API錯誤**
```typescript
export async function sendLineMessage(userId: string, message: string): Promise<void> {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: 'text', text: message }]
      })
    })

    if (!response.ok) {
      const error = await response.json()

      if (response.status === 401) {
        console.error('[LINE] Invalid access token')
        throw new Error('LINE服務設定問題')
      }

      if (response.status === 400) {
        console.error('[LINE] Invalid request:', error)
        throw new Error('LINE訊息格式錯誤')
      }

      throw new Error('LINE訊息發送失敗')
    }
  } catch (error) {
    console.error('[LINE] Send message error:', error)

    // LINE錯誤不應該影響主要功能
    // 只記錄錯誤，不向用戶顯示
  }
}
```

---

## 📊 錯誤監控與日誌

### **安全日誌記錄**
```typescript
interface SecurityEvent {
  type: 'UNAUTHORIZED_ACCESS' | 'DATA_BREACH_ATTEMPT' | 'PERMISSION_VIOLATION'
  userId?: string
  ip: string
  userAgent: string
  attemptedAction: string
  timestamp: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export function logSecurityEvent(event: SecurityEvent) {
  // 記錄到安全日誌 (不包含敏感資料)
  console.warn(`[SECURITY] ${event.type}:`, {
    userId: event.userId ? `user_${event.userId.substr(-4)}` : 'anonymous',
    ip: event.ip,
    action: event.attemptedAction,
    severity: event.severity,
    timestamp: event.timestamp
  })

  // 高嚴重性事件即時通知
  if (event.severity === 'CRITICAL') {
    // 發送即時警報給管理員
    notifyAdmin(event)
  }
}

// 使用範例
export function checkInvestorAccess(user: User, action: string) {
  if (user.role === 'INVESTOR' && action.includes('actualPrice')) {
    logSecurityEvent({
      type: 'DATA_BREACH_ATTEMPT',
      userId: user.id,
      ip: getClientIP(),
      userAgent: getClientUserAgent(),
      attemptedAction: action,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL'
    })

    throw new ForbiddenError('Access denied')
  }
}
```

### **錯誤率監控**
```typescript
// 錯誤統計
const errorStats = {
  total: 0,
  byType: new Map<string, number>(),
  byEndpoint: new Map<string, number>(),
  lastReset: Date.now()
}

export function trackError(endpoint: string, errorType: string) {
  errorStats.total++
  errorStats.byType.set(errorType, (errorStats.byType.get(errorType) || 0) + 1)
  errorStats.byEndpoint.set(endpoint, (errorStats.byEndpoint.get(endpoint) || 0) + 1)

  // 每小時重置統計
  if (Date.now() - errorStats.lastReset > 3600000) {
    resetErrorStats()
  }

  // 檢查錯誤率是否過高
  if (errorStats.total > 100) {
    console.warn('[MONITORING] High error rate detected:', errorStats)
  }
}
```

---

## 🔧 開發工具錯誤處理

### **開發環境錯誤顯示**
```tsx
// 僅在開發環境顯示詳細錯誤
const ErrorDetails: React.FC<{ error: Error }> = ({ error }) => {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <Details>
      <summary>錯誤詳情 (僅開發環境)</summary>
      <pre style={{ fontSize: '12px', overflow: 'auto' }}>
        {error.stack}
      </pre>
    </Details>
  )
}
```

### **測試環境錯誤模擬**
```typescript
// 錯誤注入 (僅測試環境)
export function injectError(errorType: string, probability: number = 0.1) {
  if (process.env.NODE_ENV === 'test' && Math.random() < probability) {
    switch (errorType) {
      case 'NETWORK':
        throw new Error('Simulated network error')
      case 'API_KEY':
        throw new Error('Simulated API key error')
      case 'PERMISSION':
        throw new ForbiddenError('Simulated permission error')
    }
  }
}
```

**錯誤處理是保護系統安全的重要防線！** 🛡️