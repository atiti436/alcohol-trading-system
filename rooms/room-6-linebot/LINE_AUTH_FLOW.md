# LINE 帳號綁定與驗證流程 (LINE Authentication Flow)

## 🎯 目標
建立安全的LINE帳號綁定機制，確保只有授權使用者能透過LINE Bot查詢訂單等敏感資訊。

---

## 🔐 安全驗證原則

### **1. 身份驗證 (Authentication)**
- 使用者必須先透過網頁系統登入驗證身份
- 取得唯一的綁定代碼 (Binding Code)
- 在LINE Bot中輸入綁定代碼完成綁定

### **2. 授權管理 (Authorization)**
- 每個LINE使用者只能綁定一個系統帳號
- 系統帳號可以解除綁定重新設定
- 不同角色有不同的查詢權限

### **3. 資料隔離 (Data Isolation)**
- 客戶只能查詢自己的訂單
- 投資方只能查詢自己投資範圍的資料
- 員工可以查詢相關權限範圍資料

---

## 📱 綁定流程設計

### **Step 1: 網頁端產生綁定代碼**
```
使用者登入系統 → 前往「LINE綁定」頁面 → 點擊「產生綁定代碼」 → 顯示8位數字代碼
```

### **Step 2: LINE Bot綁定**
```
加入LINE Bot → 輸入「綁定 12345678」 → 系統驗證代碼 → 綁定成功
```

### **Step 3: 功能使用**
```
已綁定使用者 → 輸入查詢指令 → 權限驗證 → 返回對應資料
```

---

## 🗄️ 資料模型設計

### **LINE綁定記錄表 (line_bindings)**
```sql
CREATE TABLE line_bindings (
  id SERIAL PRIMARY KEY,
  line_user_id VARCHAR(100) UNIQUE NOT NULL,      -- LINE使用者ID
  user_id VARCHAR(50) NOT NULL,                   -- 系統使用者ID
  customer_code VARCHAR(10),                      -- 客戶代碼 (如果是客戶角色)
  investor_id VARCHAR(50),                        -- 投資方ID (如果是投資方角色)
  binding_code VARCHAR(8),                        -- 綁定代碼
  binding_code_expires_at TIMESTAMP,              -- 綁定代碼過期時間
  status ENUM('PENDING', 'ACTIVE', 'DISABLED') DEFAULT 'PENDING',
  bound_at TIMESTAMP NULL,                        -- 綁定完成時間
  last_activity_at TIMESTAMP,                     -- 最後活動時間
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (customer_code) REFERENCES customers(customer_code),
  INDEX idx_line_user (line_user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_binding_code (binding_code)
);
```

### **LINE操作日誌表 (line_activity_logs)**
```sql
CREATE TABLE line_activity_logs (
  id SERIAL PRIMARY KEY,
  line_user_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(50),
  command TEXT NOT NULL,                          -- 使用者輸入的指令
  response_type ENUM('SUCCESS', 'ERROR', 'UNAUTHORIZED', 'INFO') NOT NULL,
  response_message TEXT,                          -- Bot回應內容
  query_params JSON,                              -- 查詢參數
  execution_time_ms INT,                          -- 執行時間(毫秒)
  ip_address VARCHAR(45),                         -- IP位址(如果可取得)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_line_user_activity (line_user_id, created_at),
  INDEX idx_user_activity (user_id, created_at)
);
```

---

## 🔧 API端點設計

### **綁定代碼管理**
```typescript
// POST /api/line/generate-binding-code
// 產生綁定代碼
interface GenerateBindingCodeRequest {
  user_id: string;
}

interface GenerateBindingCodeResponse {
  success: boolean;
  data: {
    binding_code: string;      // 8位數字代碼
    expires_at: string;        // 過期時間 (15分鐘後)
    instructions: string;      // 使用說明
  };
}

// POST /api/line/bind-account
// 完成帳號綁定 (由LINE Bot調用)
interface BindAccountRequest {
  line_user_id: string;
  binding_code: string;
}

interface BindAccountResponse {
  success: boolean;
  data: {
    user_info: {
      name: string;
      role: string;
      permissions: string[];
    };
    available_commands: string[];
  };
}

// DELETE /api/line/unbind-account
// 解除綁定
interface UnbindAccountRequest {
  user_id: string;
}
```

### **LINE Bot查詢API**
```typescript
// POST /api/line/query/orders
// 查詢訂單 (透過LINE Bot)
interface LineOrderQueryRequest {
  line_user_id: string;
  query_type: 'recent' | 'by_date' | 'by_status';
  parameters?: {
    start_date?: string;
    end_date?: string;
    status?: string;
    limit?: number;
  };
}

interface LineOrderQueryResponse {
  success: boolean;
  data: {
    orders: Array<{
      order_code: string;
      order_date: string;
      status: string;
      total_amount: number;
      items_count: number;
    }>;
    summary: {
      total_orders: number;
      total_amount: number;
    };
  };
  message: string;  // 格式化的回應訊息
}

// POST /api/line/query/inventory
// 查詢庫存
interface LineInventoryQueryRequest {
  line_user_id: string;
  product_keyword?: string;
  category?: string;
}
```

---

## 🤖 LINE Bot訊息處理

### **指令解析器**
```typescript
// services/lineCommandParser.ts
export class LineCommandParser {
  static parseCommand(text: string): ParsedCommand {
    const command = text.trim().toLowerCase();

    // 綁定指令: "綁定 12345678"
    if (command.startsWith('綁定')) {
      const parts = command.split(' ');
      return {
        type: 'BIND',
        params: { binding_code: parts[1] }
      };
    }

    // 查詢指令: "訂單", "最近訂單", "本月訂單"
    if (command.includes('訂單')) {
      return {
        type: 'QUERY_ORDERS',
        params: this.parseOrderQuery(command)
      };
    }

    // 庫存查詢: "庫存 山崎", "清酒庫存"
    if (command.includes('庫存')) {
      return {
        type: 'QUERY_INVENTORY',
        params: this.parseInventoryQuery(command)
      };
    }

    // 成本計算: "白鶴清酒 720ml 15度 日幣800 匯率0.21"
    if (this.isCostCalculation(command)) {
      return {
        type: 'CALCULATE_COST',
        params: this.parseCostCalculation(command)
      };
    }

    // 幫助指令
    if (command === '幫助' || command === 'help') {
      return { type: 'HELP', params: {} };
    }

    return { type: 'UNKNOWN', params: {} };
  }

  private static parseOrderQuery(command: string): any {
    if (command.includes('最近')) {
      return { query_type: 'recent', limit: 5 };
    }
    if (command.includes('本月')) {
      const now = new Date();
      return {
        query_type: 'by_date',
        start_date: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`,
        end_date: now.toISOString().split('T')[0]
      };
    }
    return { query_type: 'recent', limit: 3 };
  }
}
```

### **訊息回應器**
```typescript
// services/lineResponseGenerator.ts
export class LineResponseGenerator {
  static generateOrderResponse(orders: any[]): string {
    if (orders.length === 0) {
      return '📋 查無訂單資料';
    }

    let response = `📋 查詢到 ${orders.length} 筆訂單:\n\n`;

    orders.forEach((order, index) => {
      response += `${index + 1}. ${order.order_code}\n`;
      response += `   日期: ${order.order_date}\n`;
      response += `   狀態: ${this.getStatusEmoji(order.status)} ${order.status}\n`;
      response += `   金額: $${order.total_amount.toLocaleString()}\n`;
      response += `   品項: ${order.items_count} 項\n\n`;
    });

    response += `💰 總金額: $${orders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}`;

    return response;
  }

  static generateBindingSuccessResponse(userInfo: any): string {
    return `🎉 帳號綁定成功！\n\n` +
           `👤 使用者: ${userInfo.name}\n` +
           `🏷️ 角色: ${userInfo.role}\n\n` +
           `🤖 可用指令:\n` +
           `• 訂單 - 查詢最近訂單\n` +
           `• 本月訂單 - 查詢本月訂單\n` +
           `• 庫存 [商品名稱] - 查詢庫存\n` +
           `• 成本計算 - 計算進口成本\n` +
           `• 幫助 - 顯示說明\n\n` +
           `✨ 現在可以開始使用各項功能了！`;
  }

  static generateErrorResponse(error: string): string {
    return `❌ ${error}\n\n如需協助，請輸入「幫助」查看可用指令。`;
  }

  private static getStatusEmoji(status: string): string {
    const statusMap = {
      'DRAFT': '📝',
      'CONFIRMED': '✅',
      'DELIVERED': '🚚',
      'CANCELLED': '❌'
    };
    return statusMap[status] || '📋';
  }
}
```

---

## 🔒 權限控制實作

### **權限驗證中間件**
```typescript
// middleware/lineAuthMiddleware.ts
export const verifyLineUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { line_user_id } = req.body;

    if (!line_user_id) {
      return res.status(400).json({
        success: false,
        error: 'LINE使用者ID未提供'
      });
    }

    // 查詢綁定記錄
    const binding = await db.line_bindings.findOne({
      where: {
        line_user_id,
        status: 'ACTIVE'
      },
      include: ['user', 'customer']
    });

    if (!binding) {
      return res.status(401).json({
        success: false,
        error: '帳號未綁定或已失效，請先完成綁定',
        require_binding: true
      });
    }

    // 更新最後活動時間
    await binding.update({ last_activity_at: new Date() });

    // 將使用者資訊加入請求
    req.line_user = {
      line_user_id: binding.line_user_id,
      user_id: binding.user_id,
      customer_code: binding.customer_code,
      investor_id: binding.investor_id,
      role: binding.user.role
    };

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '驗證失敗'
    });
  }
};

export const checkLinePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { role, customer_code, investor_id } = req.line_user;

    // 根據角色檢查權限
    switch (requiredPermission) {
      case 'VIEW_ORDERS':
        if (role === 'CUSTOMER' && !customer_code) {
          return res.status(403).json({
            success: false,
            error: '客戶帳號異常，請聯絡客服'
          });
        }
        break;

      case 'VIEW_INVENTORY':
        if (role === 'CUSTOMER') {
          return res.status(403).json({
            success: false,
            error: '客戶無權限查詢庫存資訊'
          });
        }
        break;

      case 'CALCULATE_COST':
        // 所有已綁定使用者都可以使用成本計算
        break;

      default:
        return res.status(403).json({
          success: false,
          error: '權限不足'
        });
    }

    next();
  };
};
```

---

## 🖥️ 前端綁定介面

### **LINE綁定頁面**
```typescript
// pages/profile/line-binding.tsx
import { Card, Button, Alert, Input, QRCode } from 'antd';

const LineBindingPage = () => {
  const [bindingCode, setBindingCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateBindingCode = async () => {
    setIsGenerating(true);
    try {
      const response = await api.post('/api/line/generate-binding-code', {
        user_id: currentUser.user_id
      });

      setBindingCode(response.data.binding_code);
      setQrCodeUrl(`https://line.me/R/ti/p/@your-bot-id?text=綁定 ${response.data.binding_code}`);
    } catch (error) {
      message.error('產生綁定代碼失敗');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">LINE Bot 帳號綁定</h1>

      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-4">📱 如何綁定LINE帳號？</h3>
        <ol className="list-decimal list-inside space-y-2">
          <li>點擊下方「產生綁定代碼」按鈕</li>
          <li>使用手機LINE掃描QR Code或手動加入Bot好友</li>
          <li>在LINE中輸入「綁定 代碼」(例如: 綁定 12345678)</li>
          <li>收到成功訊息即完成綁定</li>
        </ol>
      </Card>

      {!bindingCode && (
        <Card>
          <div className="text-center">
            <Button
              type="primary"
              size="large"
              loading={isGenerating}
              onClick={generateBindingCode}
            >
              產生綁定代碼
            </Button>
          </div>
        </Card>
      )}

      {bindingCode && (
        <Card>
          <div className="text-center space-y-4">
            <Alert
              message="綁定代碼已產生"
              description="請在15分鐘內完成綁定，逾時需重新產生"
              type="success"
              showIcon
            />

            <div className="text-2xl font-mono bg-gray-100 p-4 rounded">
              {bindingCode}
            </div>

            <div className="flex justify-center">
              <QRCode value={qrCodeUrl} size={200} />
            </div>

            <p className="text-gray-600">
              掃描QR Code或在LINE中輸入「綁定 {bindingCode}」
            </p>

            <Button onClick={() => {
              setBindingCode('');
              setQrCodeUrl('');
            }}>
              重新產生代碼
            </Button>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <h3 className="text-lg font-semibold mb-4">🔒 安全提醒</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>綁定代碼僅15分鐘有效，請及時使用</li>
          <li>每個LINE帳號只能綁定一個系統帳號</li>
          <li>如需更換綁定帳號，請先解除目前綁定</li>
          <li>請勿將綁定代碼分享給他人</li>
        </ul>
      </Card>
    </div>
  );
};
```

---

## 📋 安全檢查清單

### **資料安全**
- [ ] 綁定代碼加密儲存
- [ ] 設定代碼過期時間 (15分鐘)
- [ ] LINE使用者ID不可偽造
- [ ] 敏感查詢結果過濾
- [ ] 操作日誌完整記錄

### **權限控制**
- [ ] 角色權限嚴格區分
- [ ] 客戶資料隔離驗證
- [ ] 投資方資料隔離驗證
- [ ] 未綁定使用者阻擋
- [ ] 過期綁定自動清理

### **使用體驗**
- [ ] 錯誤訊息友善提示
- [ ] 綁定流程清楚易懂
- [ ] 指令解析準確率高
- [ ] 回應速度快 (<2秒)
- [ ] 離線狀態處理

---

## 📊 監控與統計

### **使用統計**
- 每日活躍綁定用戶數
- 指令使用頻率分析
- 查詢成功率統計
- 回應時間監控

### **安全監控**
- 異常綁定嘗試次數
- 權限拒絕事件記錄
- 敏感資料查詢警報
- 帳號異常活動偵測

---

**重要**: LINE Bot是對外服務接口，安全性要求極高，所有功能都必須經過嚴格的權限驗證和資料過濾。