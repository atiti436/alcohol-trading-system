/**
 * 🔒 API 輸入驗證工具模組
 * 解決 Gemini CLI 健檢發現的後端驗證漏洞
 */

// 簡化版驗證函數 - 不依賴外部庫
export function validateRequired(value: unknown, fieldName: string): string {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldName} 為必填欄位`)
  }
  return String(value).trim()
}

export function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error('電子郵件格式不正確')
  }
  return email.trim()
}

export function validatePhone(phone: string): string {
  const phoneRegex = /^[\d\-\+\(\)\s]+$/
  if (!phoneRegex.test(phone)) {
    throw new Error('電話號碼格式不正確')
  }
  return phone.trim()
}

export function validateNumber(value: unknown, fieldName: string, min?: number, max?: number): number {
  const num = Number(value)
  if (isNaN(num)) {
    throw new Error(`${fieldName} 必須為數字`)
  }
  if (min !== undefined && num < min) {
    throw new Error(`${fieldName} 不能小於 ${min}`)
  }
  if (max !== undefined && num > max) {
    throw new Error(`${fieldName} 不能大於 ${max}`)
  }
  return num
}

export function validateEnum(value: string, allowedValues: string[], fieldName: string): string {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} 必須為以下值之一: ${allowedValues.join(', ')}`)
  }
  return value
}

export function validateString(value: unknown, fieldName: string, minLength?: number, maxLength?: number): string {
  const str = String(value || '').trim()
  if (minLength !== undefined && str.length < minLength) {
    throw new Error(`${fieldName} 長度不能小於 ${minLength} 字元`)
  }
  if (maxLength !== undefined && str.length > maxLength) {
    throw new Error(`${fieldName} 長度不能大於 ${maxLength} 字元`)
  }
  return str
}

// 客戶驗證 Schema
export function validateCustomerData(data: Record<string, unknown>) {
  return {
    name: validateRequired(data.name, '客戶名稱'),
    contact_person: validateString(data.contact_person, '聯絡人', 0, 100),
    phone: data.phone ? validatePhone(data.phone) : '',
    email: data.email ? validateEmail(data.email) : '',
    company: validateString(data.company, '公司名稱', 0, 200),
    tax_id: validateString(data.tax_id, '統一編號', 0, 20),
    address: validateString(data.address, '地址', 0, 500),
    tier: validateEnum(data.tier || 'REGULAR', ['VIP', 'PREMIUM', 'REGULAR', 'NEW'], '客戶等級'),
    creditLimit: validateNumber(data.creditLimit || 0, '信用額度', 0),
    paymentTerms: validateNumber(data.paymentTerms || 30, '付款條件', 0, 365),
    notes: validateString(data.notes || '', '備註', 0, 1000)
  }
}

// 商品驗證 Schema
export function validateProductData(data: Record<string, unknown>) {
  return {
    name: validateRequired(data.name, '商品名稱'),
    product_code: validateRequired(data.product_code, '商品代碼'),
    category: validateRequired(data.category, '商品分類'),
    brand: validateString(data.brand, '品牌', 0, 100),
    supplier: validateString(data.supplier, '供應商', 0, 200),
    costPrice: validateNumber(data.costPrice || 0, '成本價', 0),
    sellingPrice: validateNumber(data.sellingPrice || 0, '售價', 0),
    investorPrice: validateNumber(data.investorPrice || 0, '投資方價格', 0),
    stock_quantity: validateNumber(data.stock_quantity || data.totalStock || 0, '總庫存', 0),
    available_stock: validateNumber(data.available_stock || data.availableStock || 0, '可售庫存', 0),
    safetyStock: validateNumber(data.safetyStock || 0, '安全庫存', 0),
    description: validateString(data.description || '', '商品描述', 0, 2000),
    specifications: validateString(data.specifications || '', '規格說明', 0, 1000)
  }
}

// 採購驗證 Schema
export function validatePurchaseData(data: Record<string, unknown>) {
  return {
    supplierId: validateRequired(data.supplierId, '供應商ID'),
    totalAmount: validateNumber(data.totalAmount, '總金額', 0),
    status: validateEnum(data.status || 'PENDING', ['PENDING', 'CONFIRMED', 'RECEIVED', 'CANCELLED'], '狀態'),
    notes: validateString(data.notes || '', '備註', 0, 1000),
    expectedDate: data.expectedDate ? new Date(data.expectedDate) : null
  }
}

// 銷售驗證 Schema
export function validateSaleData(data: Record<string, unknown>) {
  return {
    customerId: validateRequired(data.customerId, '客戶ID'),
    totalAmount: validateNumber(data.totalAmount, '總金額', 0),
    actualTotalAmount: validateNumber(data.actualTotalAmount, '實際金額', 0),
    status: validateEnum(data.status || 'PENDING', ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'], '狀態'),
    paymentStatus: validateEnum(data.paymentStatus || 'PENDING', ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'], '付款狀態'),
    notes: validateString(data.notes || '', '備註', 0, 1000)
  }
}

// 通用驗證中間件
export function withValidation<T>(
  validationFn: (data: any) => T,
  handler: (validatedData: T, ...args: any[]) => Promise<Response>
) {
  return async (request: Request, ...args: any[]) => {
    try {
      const body = await request.json()
      const validatedData = validationFn(body)
      return await handler(validatedData, ...args)
    } catch (error) {
      console.error('Validation error:', error)
      return new Response(
        JSON.stringify({
          error: '輸入資料驗證失敗',
          details: error instanceof Error ? error.message : '未知錯誤'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}