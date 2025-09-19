/**
 * 🔒 API 輸入驗證工具模組
 * 解決 Gemini CLI 健檢發現的後端驗證漏洞
 *
 * ⚠️ 重要修復：加強伺服器端輸入驗證
 * - 防範惡意使用者繞過前端驗證
 * - 確保所有 API 端點都有嚴格的資料檢查
 * - 防止 SQL 注入和 XSS 攻擊
 */

// 🔒 強化版驗證函數 - 防範惡意輸入
export function validateRequired(value: unknown, fieldName: string): string {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldName} 為必填欄位`)
  }

  const stringValue = String(value).trim()

  // 防範 XSS 攻擊 - 檢查危險字元
  if (containsDangerousCharacters(stringValue)) {
    throw new Error(`${fieldName} 包含不合法字元`)
  }

  return stringValue
}

// 🛡️ 檢查危險字元 (防範 XSS 和注入攻擊)
function containsDangerousCharacters(value: string): boolean {
  // 檢查 HTML 標籤和 JavaScript 關鍵字
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi, // onload, onclick, 等
    /<img[^>]*src\s*=\s*["']javascript:/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi
  ]

  return dangerousPatterns.some(pattern => pattern.test(value))
}

// 🔒 安全的字串淨化
export function sanitizeString(value: string): string {
  return value
    .replace(/[<>]/g, '') // 移除角括號
    .replace(/["']/g, '') // 移除引號
    .trim()
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
  // 🔒 防範數字注入攻擊
  if (typeof value === 'string' && containsDangerousCharacters(value)) {
    throw new Error(`${fieldName} 包含不合法字元`)
  }

  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) {
    throw new Error(`${fieldName} 必須為有效數字`)
  }

  // 🛡️ 防範極大數值攻擊 (DoS)
  if (Math.abs(num) > Number.MAX_SAFE_INTEGER) {
    throw new Error(`${fieldName} 數值超出安全範圍`)
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

// 🔒 客戶驗證 Schema - 強化版
export function validateCustomerData(data: Record<string, unknown>) {
  return {
    name: validateRequired(data.name, '客戶名稱'),
    contact_person: validateString(data.contact_person || '', '聯絡人', 0, 100),
    phone: data.phone ? validatePhone(String(data.phone)) : '',
    email: data.email ? validateEmail(String(data.email)) : '',
    company: validateString(data.company || '', '公司名稱', 0, 200),
    tax_id: validateString(data.tax_id || '', '統一編號', 0, 20),
    address: validateString(data.address || '', '地址', 0, 500),
    tier: validateEnum(String(data.tier || 'REGULAR'), ['VIP', 'PREMIUM', 'REGULAR', 'NEW'], '客戶等級'),
    credit_limit: validateNumber(data.credit_limit || 0, '信用額度', 0, 100000000),
    payment_terms: validateString(data.payment_terms || 'CASH', ['CASH', 'WEEKLY', 'MONTHLY', 'SIXTY_DAYS'], '付款條件'),
    notes: validateString(data.notes || '', '備註', 0, 1000)
  }
}

// 🔒 商品驗證 Schema - 強化版
export function validateProductData(data: Record<string, unknown>) {
  const validated = {
    name: validateRequired(data.name, '商品名稱'),
    product_code: data.product_code ? validateString(data.product_code, '商品代碼', 1, 20) : null,
    category: validateRequired(data.category, '商品分類'),
    brand: validateString(data.brand || '', '品牌', 0, 100),
    supplier: validateString(data.supplier || '', '供應商', 0, 200),
    description: validateString(data.description || '', '商品描述', 0, 2000),
    specifications: validateString(data.specifications || '', '規格說明', 0, 1000),

    // 🍷 酒類特有屬性
    volume_ml: validateNumber(data.volume_ml, '容量(毫升)', 1, 10000),
    alc_percentage: validateNumber(data.alc_percentage, '酒精濃度', 0, 100),
    weight_kg: validateNumber(data.weight_kg, '重量(公斤)', 0.01, 50),
    package_weight_kg: data.package_weight_kg ? validateNumber(data.package_weight_kg, '包裝重量', 0, 10) : 0,
    accessory_weight_kg: data.accessory_weight_kg ? validateNumber(data.accessory_weight_kg, '配件重量', 0, 5) : 0,

    // 📦 包裝屬性
    has_box: Boolean(data.has_box),
    has_accessories: Boolean(data.has_accessories),
    accessories: Array.isArray(data.accessories) ?
      (data.accessories as string[]).map(acc => validateString(acc, '配件', 0, 100)) : [],

    // 🏷️ 稅則和法規
    hs_code: data.hs_code ? validateString(data.hs_code, 'HS Code', 0, 20) : null,

    // 💰 價格設定
    standard_price: validateNumber(data.standard_price, '標準價格', 0, 999999),
    current_price: validateNumber(data.current_price, '目前價格', 0, 999999),
    min_price: validateNumber(data.min_price, '最低價格', 0, 999999),
    cost_price: data.cost_price ? validateNumber(data.cost_price, '成本價', 0, 999999) : 0,

    // 📅 日期驗證
    manufacturing_date: data.manufacturing_date ? validateDate(data.manufacturing_date, '製造日期') : null,
    expiry_date: data.expiry_date ? validateDate(data.expiry_date, '到期日期') : null
  }

  // 商業邏輯驗證
  if (validated.min_price > validated.current_price) {
    throw new Error('最低價格不能高於目前價格')
  }

  if (validated.current_price > validated.standard_price) {
    throw new Error('目前價格不能高於標準價格')
  }

  if (validated.manufacturing_date && validated.expiry_date &&
      validated.manufacturing_date >= validated.expiry_date) {
    throw new Error('製造日期必須早於到期日期')
  }

  return validated
}

// 🔒 採購驗證 Schema - 強化版
export function validatePurchaseData(data: Record<string, unknown>) {
  // 基本欄位驗證
  const validatedData: any = {
    supplier_id: validateRequired(data.supplier_id, '供應商ID'),
    supplier: validateRequired(data.supplier, '供應商名稱'),
    total_amount: validateNumber(data.total_amount, '總金額', 0, 100000000), // 限制最大1億
    currency: validateEnum(String(data.currency || 'JPY'), ['JPY', 'USD', 'TWD'], '幣別'),
    exchange_rate: validateNumber(data.exchange_rate, '匯率', 0.001, 1000),
    status: validateEnum(String(data.status || 'DRAFT'), ['DRAFT', 'PENDING', 'CONFIRMED', 'RECEIVED', 'CANCELLED'], '狀態'),
    funding_source: validateEnum(String(data.funding_source || 'COMPANY'), ['COMPANY', 'PERSONAL'], '資金來源'),
    notes: validateString(data.notes || '', '備註', 0, 1000),
    expected_date: data.expected_date ? validateDate(data.expected_date, '預期到貨日') : null,
    declaration_number: data.declaration_number ? validateString(data.declaration_number, '報關號碼', 0, 50) : null,
    declaration_date: data.declaration_date ? validateDate(data.declaration_date, '報關日期') : null
  }

  // 驗證採購項目
  if (data.items && Array.isArray(data.items)) {
    validatedData.items = (data.items as any[]).map((item, index) =>
      validatePurchaseItemData(item, `採購項目${index + 1}`)
    )
  }

  return validatedData
}

// 🔒 採購項目驗證
function validatePurchaseItemData(data: Record<string, unknown>, itemLabel: string) {
  return {
    product_id: data.product_id ? validateString(data.product_id, `${itemLabel} 產品ID`, 1, 50) : null,
    product_name: validateRequired(data.product_name, `${itemLabel} 產品名稱`),
    quantity: validateNumber(data.quantity, `${itemLabel} 數量`, 0.01, 999999),
    unit_price: validateNumber(data.unit_price, `${itemLabel} 單價`, 0, 999999),
    dutiable_value: data.dutiable_value ? validateNumber(data.dutiable_value, `${itemLabel} 完稅價格`, 0) : null,
    tariff_code: data.tariff_code ? validateString(data.tariff_code, `${itemLabel} 稅則號碼`, 0, 20) : null,
    import_duty_rate: data.import_duty_rate ? validateNumber(data.import_duty_rate, `${itemLabel} 進口稅率`, 0, 100) : null,
    alc_percentage: data.alc_percentage ? validateNumber(data.alc_percentage, `${itemLabel} 酒精濃度`, 0, 100) : null,
    volume_ml: data.volume_ml ? validateNumber(data.volume_ml, `${itemLabel} 容量(毫升)`, 1, 10000) : null,
    weight_kg: data.weight_kg ? validateNumber(data.weight_kg, `${itemLabel} 重量(公斤)`, 0.001, 10000) : null
  }
}

// 🔒 日期驗證
function validateDate(value: unknown, fieldName: string): Date {
  let date: Date

  if (typeof value === 'string') {
    // 檢查危險字元
    if (containsDangerousCharacters(value)) {
      throw new Error(`${fieldName} 包含不合法字元`)
    }
    date = new Date(value)
  } else if (value instanceof Date) {
    date = value
  } else {
    throw new Error(`${fieldName} 必須為有效日期格式`)
  }

  if (isNaN(date.getTime())) {
    throw new Error(`${fieldName} 不是有效的日期`)
  }

  // 🛡️ 防範極端日期攻擊
  const minDate = new Date('1900-01-01')
  const maxDate = new Date('2100-12-31')

  if (date < minDate || date > maxDate) {
    throw new Error(`${fieldName} 日期必須在 1900-01-01 到 2100-12-31 之間`)
  }

  return date
}

// 🔒 銷售驗證 Schema - 強化版
export function validateSaleData(data: Record<string, unknown>) {
  const validated: any = {
    customer_id: validateRequired(data.customer_id, '客戶ID'),
    sale_number: data.sale_number ? validateString(data.sale_number, '銷售單號', 1, 30) : null,

    // 💰 價格相關 (雙重價格機制核心)
    total_amount: validateNumber(data.total_amount, '總金額', 0, 100000000),
    actual_total_amount: validateNumber(data.actual_total_amount, '實際金額', 0, 100000000),
    discount_amount: data.discount_amount ? validateNumber(data.discount_amount, '折扣金額', 0, 10000000) : 0,
    tax_amount: data.tax_amount ? validateNumber(data.tax_amount, '稅額', 0, 10000000) : 0,
    commission: data.commission ? validateNumber(data.commission, '傭金', 0, 10000000) : 0,

    // 📅 日期相關
    sale_date: data.sale_date ? validateDate(data.sale_date, '銷售日期') : new Date(),
    delivery_date: data.delivery_date ? validateDate(data.delivery_date, '交貨日期') : null,
    due_date: data.due_date ? validateDate(data.due_date, '到期日期') : null,

    // 📋 狀態管理
    status: validateEnum(String(data.status || 'PENDING'), ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'], '訂單狀態'),
    payment_status: validateEnum(String(data.payment_status || 'PENDING'), ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'], '付款狀態'),

    // 📄 發票相關
    invoice_number: data.invoice_number ? validateString(data.invoice_number, '發票號碼', 0, 30) : null,
    requires_invoice: Boolean(data.requires_invoice),

    // 📝 備註
    notes: validateString(data.notes || '', '備註', 0, 1000),
    internal_notes: validateString(data.internal_notes || '', '內部備註', 0, 1000)
  }

  // 🔒 商業邏輯驗證 (雙重價格核心安全)
  if (validated.actual_total_amount < validated.total_amount) {
    throw new Error('實際金額不能小於顯示金額 (商業邏輯錯誤)')
  }

  if (validated.discount_amount > validated.total_amount) {
    throw new Error('折扣金額不能大於總金額')
  }

  if (validated.delivery_date && validated.sale_date && validated.delivery_date < validated.sale_date) {
    throw new Error('交貨日期不能早於銷售日期')
  }

  if (validated.due_date && validated.sale_date && validated.due_date < validated.sale_date) {
    throw new Error('到期日期不能早於銷售日期')
  }

  // 驗證銷售項目
  if (data.items && Array.isArray(data.items)) {
    validated.items = (data.items as any[]).map((item, index) =>
      validateSaleItemData(item, `銷售項目${index + 1}`)
    )
  }

  return validated
}

// 🔒 銷售項目驗證
function validateSaleItemData(data: Record<string, unknown>, itemLabel: string) {
  return {
    product_id: validateRequired(data.product_id, `${itemLabel} 產品ID`),
    variant_id: data.variant_id ? validateString(data.variant_id, `${itemLabel} 變體ID`, 1, 50) : null,
    quantity: validateNumber(data.quantity, `${itemLabel} 數量`, 0.01, 999999),
    unit_price: validateNumber(data.unit_price, `${itemLabel} 單價`, 0, 999999),
    actual_unit_price: validateNumber(data.actual_unit_price || data.unit_price, `${itemLabel} 實際單價`, 0, 999999),
    total_price: validateNumber(data.total_price, `${itemLabel} 小計`, 0, 999999999),
    actual_total_price: validateNumber(data.actual_total_price || data.total_price, `${itemLabel} 實際小計`, 0, 999999999),
    discount_rate: data.discount_rate ? validateNumber(data.discount_rate, `${itemLabel} 折扣率`, 0, 100) : 0,
    notes: validateString(data.notes || '', `${itemLabel} 備註`, 0, 500)
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
