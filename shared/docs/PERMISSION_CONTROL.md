# 權限控制實作指南 (Permission Control Guide)

本文件提供具體的程式碼範例，確保投資方永遠看不到真實價格和商業機密。

## 🎯 核心安全原則

1. **雙重防護**: 資料庫層 + API層 都要做權限控制
2. **預設拒絕**: 除非明確允許，否則一律拒絕存取
3. **完全隔離**: 投資方完全看不到敏感資料，不是隱藏而是根本不傳送
4. **審計記錄**: 所有敏感資料存取都要記錄

---

## 🏛️ 資料庫層安全 (PostgreSQL RLS)

### 1. 啟用行級安全性 (Row Level Security)
```sql
-- 對所有敏感資料表啟用RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_special_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 預設拒絕所有存取
ALTER TABLE sales FORCE ROW LEVEL SECURITY;
```

### 2. 建立安全視圖 (投資方專用)
```sql
-- 銷售資料投資方安全視圖 (完全隱藏真實價格)
CREATE OR REPLACE VIEW v_sales_investor_safe AS
SELECT 
  id,
  sales_order_number,
  customer_id,
  customer_code,
  quantity,
  unit_display_price,                    -- 只顯示假價格
  display_amount,                        -- 只顯示假金額
  total_display_amount,                  -- 只顯示假總額
  -- 完全不包含以下敏感欄位:
  -- unit_actual_price (真實價格)
  -- actual_amount (真實金額)  
  -- total_actual_amount (真實總額)
  -- total_commission (老闆抽成)
  cost_amount,                           -- 成本可以顯示
  order_date,
  status,
  funding_source,
  investor_id,
  created_at
FROM sales
WHERE funding_source = 'COMPANY'         -- 投資方只能看投資項目
  AND investor_id = current_setting('app.investor_id', true)::uuid;

-- 採購資料投資方安全視圖
CREATE OR REPLACE VIEW v_purchases_investor_safe AS  
SELECT
  id,
  purchase_order_number,
  supplier,
  currency,
  exchange_rate,
  total_amount_foreign,
  total_amount_twd,
  order_date,
  status,
  funding_source,
  investor_id,
  created_at
FROM purchases  
WHERE funding_source = 'COMPANY'
  AND investor_id = current_setting('app.investor_id', true)::uuid;

-- 完全隱藏個人調貨相關資料
-- 投資方連看都看不到有個人調貨這個概念
```

### 3. 設定存取政策
```sql
-- 超級管理員可以看所有資料
CREATE POLICY policy_sales_super_admin ON sales
  FOR ALL USING (current_setting('app.role', true) = 'SUPER_ADMIN');

-- 投資方只能透過安全視圖存取，且僅限自己投資的項目
CREATE POLICY policy_sales_investor ON sales  
  FOR SELECT USING (
    current_setting('app.role', true) = 'INVESTOR' AND
    funding_source = 'COMPANY' AND
    investor_id = current_setting('app.investor_id', true)::uuid
  );

-- 員工有基本查詢權限 (視需求調整)
CREATE POLICY policy_sales_employee ON sales
  FOR SELECT USING (
    current_setting('app.role', true) = 'EMPLOYEE' AND
    funding_source = 'COMPANY'
  );
```

---

## 🔌 API層權限控制

### 1. 權限檢查中間件
```typescript
// /src/middleware/auth.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    role: 'SUPER_ADMIN' | 'INVESTOR' | 'EMPLOYEE';
    investorId?: string;
    email: string;
  };
}

// 權限檢查中間件
export function requireAuth(allowedRoles: string[] = []) {
  return async (req: AuthenticatedRequest, res: NextApiResponse, next: Function) => {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: '請先登入' }
      });
    }
    
    // 設定資料庫session變數 (供RLS使用)
    await setDatabaseSession(session.user.role, session.user.investorId);
    
    // 檢查角色權限
    if (allowedRoles.length > 0 && !allowedRoles.includes(session.user.role)) {
      // 記錄權限違規嘗試
      await logSecurityEvent({
        userId: session.user.id,
        action: 'PERMISSION_DENIED',
        resource: req.url,
        ip: req.connection.remoteAddress
      });
      
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: '權限不足' }
      });
    }
    
    req.user = session.user;
    next();
  };
}

// 設定資料庫session (供RLS使用)
async function setDatabaseSession(role: string, investorId?: string) {
  await db.$executeRaw`SET app.role = ${role}`;
  if (investorId) {
    await db.$executeRaw`SET app.investor_id = ${investorId}`;
  }
}
```

### 2. 資料轉換層 (DTO)
```typescript
// /src/dto/sales.dto.ts
export interface SaleEntity {
  id: string;
  sales_order_number: string;
  customer_id: string;
  quantity: number;
  unit_display_price: number;    // 投資方看到的價格
  unit_actual_price: number;     // 真實價格 (敏感)
  total_display_amount: number;  // 投資方看到的總額
  total_actual_amount: number;   // 真實總額 (敏感)
  total_commission: number;      // 老闆抽成 (敏感)
  cost_amount: number;
  funding_source: string;
  investor_id?: string;
}

// 投資方安全DTO (完全不包含敏感欄位)
export interface InvestorSaleDTO {
  id: string;
  sales_order_number: string;
  customer_id: string;
  quantity: number;
  unit_price: number;           // = unit_display_price
  total_amount: number;         // = total_display_amount
  cost_amount: number;
  profit: number;               // = total_display_amount - cost_amount
  order_date: string;
  status: string;
}

// 超級管理員完整DTO (包含所有欄位)
export interface AdminSaleDTO extends InvestorSaleDTO {
  unit_actual_price: number;
  total_actual_amount: number;
  total_commission: number;
  actual_profit: number;        // = total_actual_amount - cost_amount
  commission_rate: number;      // = total_commission / total_actual_amount
}

// 資料轉換函數
export class SaleTransformer {
  // 轉換為投資方安全格式
  static toInvestorDTO(sale: SaleEntity): InvestorSaleDTO {
    return {
      id: sale.id,
      sales_order_number: sale.sales_order_number,
      customer_id: sale.customer_id,
      quantity: sale.quantity,
      unit_price: sale.unit_display_price,     // 只給假價格
      total_amount: sale.total_display_amount, // 只給假總額
      cost_amount: sale.cost_amount,
      profit: Math.max(0, sale.total_display_amount - sale.cost_amount),
      order_date: sale.created_at.toISOString(),
      status: sale.status
      // 注意: 完全不包含 actual_price, total_actual_amount, total_commission
    };
  }
  
  // 轉換為管理員完整格式
  static toAdminDTO(sale: SaleEntity): AdminSaleDTO {
    return {
      ...this.toInvestorDTO(sale),
      unit_actual_price: sale.unit_actual_price,
      total_actual_amount: sale.total_actual_amount,
      total_commission: sale.total_commission,
      actual_profit: sale.total_actual_amount - sale.cost_amount,
      commission_rate: sale.total_actual_amount > 0 
        ? sale.total_commission / sale.total_actual_amount 
        : 0
    };
  }
}
```

### 3. API端點實作範例
```typescript
// /pages/api/sales/index.ts
import { requireAuth } from '@/middleware/auth';
import { SaleTransformer } from '@/dto/sales.dto';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // 只允許登入使用者存取
  await requireAuth()(req, res, async () => {
    if (req.method === 'GET') {
      try {
        let sales;
        
        if (req.user.role === 'SUPER_ADMIN') {
          // 超級管理員看所有資料
          sales = await db.sales.findMany({
            orderBy: { created_at: 'desc' }
          });
          
          const result = sales.map(sale => SaleTransformer.toAdminDTO(sale));
          
          // 記錄敏感資料存取
          await logSecurityEvent({
            userId: req.user.id,
            action: 'SENSITIVE_DATA_ACCESS',
            resource: 'sales_with_actual_prices',
            count: sales.length
          });
          
          return res.json({ success: true, data: result });
          
        } else if (req.user.role === 'INVESTOR') {
          // 投資方只能透過安全視圖存取
          sales = await db.$queryRaw`
            SELECT * FROM v_sales_investor_safe 
            ORDER BY created_at DESC
          `;
          
          const result = sales.map(sale => SaleTransformer.toInvestorDTO(sale));
          
          return res.json({ success: true, data: result });
          
        } else {
          // 員工或其他角色
          return res.status(403).json({ 
            success: false, 
            error: { code: 'FORBIDDEN', message: '權限不足' }
          });
        }
        
      } catch (error) {
        console.error('Sales API error:', error);
        return res.status(500).json({ 
          success: false, 
          error: { code: 'SERVER_ERROR', message: '系統錯誤' }
        });
      }
    }
  });
}
```

---

## 🖥️ 前端權限控制

### 1. 角色守衛組件
```typescript
// /src/components/auth/RoleGuard.tsx
import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const RoleGuard = ({ allowedRoles, children, fallback = null }: RoleGuardProps) => {
  const { data: session } = useSession();
  
  if (!session) {
    return <div>請先登入</div>;
  }
  
  if (!allowedRoles.includes(session.user.role)) {
    return fallback || <div>權限不足</div>;
  }
  
  return <>{children}</>;
};

// 使用範例
const SalesPage = () => {
  return (
    <div>
      <h1>銷售管理</h1>
      
      {/* 只有超級管理員能看到真實價格 */}
      <RoleGuard allowedRoles={['SUPER_ADMIN']}>
        <ActualPriceColumn />
      </RoleGuard>
      
      {/* 投資方和管理員都能看到的基本資料 */}
      <RoleGuard allowedRoles={['SUPER_ADMIN', 'INVESTOR']}>
        <SalesTable />
      </RoleGuard>
    </div>
  );
};
```

### 2. 條件式資料顯示
```typescript
// /src/components/sales/SalesTable.tsx
import { useSession } from 'next-auth/react';
import { Table, Tag } from 'antd';

const SalesTable = ({ sales }) => {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user.role === 'SUPER_ADMIN';
  const isInvestor = session?.user.role === 'INVESTOR';
  
  const columns = [
    {
      title: '訂單號',
      dataIndex: 'sales_order_number',
      key: 'sales_order_number'
    },
    {
      title: '客戶',
      dataIndex: 'customer_name',
      key: 'customer_name'
    },
    {
      title: '數量',
      dataIndex: 'quantity',
      key: 'quantity'
    },
    {
      title: isInvestor ? '售價' : '顯示價格',
      dataIndex: 'unit_price',
      key: 'display_price',
      render: (price) => `$${price.toLocaleString()}`
    },
    // 只有超級管理員能看到真實價格欄位
    ...(isSuperAdmin ? [{
      title: '實際價格',
      dataIndex: 'unit_actual_price',
      key: 'actual_price',
      render: (price) => (
        <Tag color="red">
          ${price?.toLocaleString() || '0'}
        </Tag>
      )
    }] : []),
    // 只有超級管理員能看到抽成欄位
    ...(isSuperAdmin ? [{
      title: '抽成',
      dataIndex: 'total_commission',
      key: 'commission',
      render: (commission) => (
        <Tag color="gold">
          ${commission?.toLocaleString() || '0'}
        </Tag>
      )
    }] : []),
    {
      title: '利潤',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit) => (
        <Tag color={profit > 0 ? 'green' : 'red'}>
          ${profit.toLocaleString()}
        </Tag>
      )
    }
  ];
  
  return (
    <Table 
      columns={columns} 
      dataSource={sales} 
      rowKey="id"
    />
  );
};
```

### 3. 報價功能權限控制
```typescript
// 報價功能只有超級管理員能使用
const QuotationSection = () => {
  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN']}>
      <Card title="客戶報價管理">
        <Button type="primary" onClick={handleCreateQuote}>
          建立報價單
        </Button>
        <QuotationList />
      </Card>
    </RoleGuard>
  );
};

// 投資方完全看不到報價相關功能
const InvestorDashboard = () => {
  return (
    <div>
      <SalesOverview />
      <InventoryStatus />
      {/* 不包含任何報價相關組件 */}
    </div>
  );
};
```

---

## 📊 審計日誌系統

### 1. 敏感資料存取記錄
```typescript
// /src/services/audit.service.ts
interface SecurityEvent {
  userId: string;
  userRole: string;
  action: string;
  resource: string;
  details?: any;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

export class AuditService {
  // 記錄敏感資料存取
  static async logSensitiveAccess(event: SecurityEvent) {
    await db.audit_logs.create({
      data: {
        user_id: event.userId,
        user_role: event.userRole,
        action: event.action,
        resource: event.resource,
        details: event.details,
        ip_address: event.ip,
        user_agent: event.userAgent,
        created_at: new Date()
      }
    });
    
    // 如果是投資方試圖存取敏感資料，立即告警
    if (event.userRole === 'INVESTOR' && event.action.includes('SENSITIVE')) {
      await this.sendSecurityAlert(event);
    }
  }
  
  // 安全告警
  static async sendSecurityAlert(event: SecurityEvent) {
    // 發送告警給系統管理員
    console.error('🚨 SECURITY ALERT:', {
      message: '投資方嘗試存取敏感資料',
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      timestamp: event.timestamp
    });
    
    // 可以整合郵件、Slack等告警系統
  }
}

// API中使用審計
export default async function salesAPI(req: AuthenticatedRequest, res: NextApiResponse) {
  await requireAuth(['SUPER_ADMIN', 'INVESTOR'])(req, res, async () => {
    // 記錄資料存取
    await AuditService.logSensitiveAccess({
      userId: req.user.id,
      userRole: req.user.role,
      action: req.user.role === 'SUPER_ADMIN' ? 'SENSITIVE_DATA_ACCESS' : 'NORMAL_DATA_ACCESS',
      resource: 'sales_data',
      ip: req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    // 處理請求...
  });
}
```

### 2. 審計日誌查詢
```sql
-- 查詢敏感資料存取記錄
SELECT 
  al.created_at,
  u.email,
  al.user_role,
  al.action,
  al.resource,
  al.ip_address
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.action LIKE '%SENSITIVE%'
ORDER BY al.created_at DESC;

-- 查詢異常存取嘗試
SELECT 
  al.created_at,
  u.email,
  al.action,
  al.resource,
  COUNT(*) as attempt_count
FROM audit_logs al
JOIN users u ON al.user_id = u.id  
WHERE al.action = 'PERMISSION_DENIED'
  AND al.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY u.email, al.action, al.resource
HAVING COUNT(*) > 5
ORDER BY attempt_count DESC;
```

---

## ✅ 安全檢查清單

### 給螞蟻A (監督) 的安全稽核清單:
- [ ] 投資方API完全無法取得 actual_price, total_commission 欄位？
- [ ] 資料庫RLS政策是否正確設定？
- [ ] 所有敏感資料存取都有審計記錄？
- [ ] 前端UI不會顯示投資方不該看到的欄位？
- [ ] 個人調貨資料對投資方完全隱藏？

### 給螞蟻B (實作) 的開發要點:
- [ ] 使用DTO模式嚴格控制回傳資料
- [ ] 實作權限中間件和角色守衛
- [ ] 建立審計日誌記錄機制
- [ ] 前端組件按角色條件式渲染
- [ ] 錯誤訊息不能洩漏敏感資訊

### 給老闆的安全提醒:
- 🔴 **定期檢查審計日誌**: 確認沒有異常存取
- 🔴 **測試投資方帳號**: 確認看不到真實價格
- 🔴 **權限變更要慎重**: 任何權限調整都要謹慎評估
- 🔴 **密碼安全**: 使用強密碼並定期更換

---

**最後更新**: 2025/9/16  
**安全等級**: 最高機密  
**適用房間**: 所有房間都必須實作對應的權限控制