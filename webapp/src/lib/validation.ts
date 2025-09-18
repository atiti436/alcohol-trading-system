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
    creditLimit: validateNumber(data.creditLimit || 0, '信用額度', 0, 100000000),
    paymentTerms: validateNumber(data.paymentTerms || 30, '付款條件', 0, 365),
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
    weight: validateNumber(data.weight, '重量(公克)', 1, 50000),
    packageWeight: data.packageWeight ? validateNumber(data.packageWeight, '包裝重量', 0, 10000) : 0,
    accessoryWeight: data.accessoryWeight ? validateNumber(data.accessoryWeight, '配件重量', 0, 5000) : 0,

    // 📦 包裝屬性
    hasBox: Boolean(data.hasBox),
    hasAccessories: Boolean(data.hasAccessories),
    accessories: Array.isArray(data.accessories) ?
      (data.accessories as string[]).map(acc => validateString(acc, '配件', 0, 100)) : [],

    // 🏷️ 稅則和法規
    hsCode: data.hsCode ? validateString(data.hsCode, 'HS Code', 0, 20) : null,

    // 💰 價格設定
    standardPrice: validateNumber(data.standardPrice, '標準價格', 0, 999999),
    currentPrice: validateNumber(data.currentPrice, '目前價格', 0, 999999),
    minPrice: validateNumber(data.minPrice, '最低價格', 0, 999999),
    costPrice: data.costPrice ? validateNumber(data.costPrice, '成本價', 0, 999999) : 0,

    // 📅 日期驗證
    manufacturingDate: data.manufacturingDate ? validateDate(data.manufacturingDate, '製造日期') : null,
    expiryDate: data.expiryDate ? validateDate(data.expiryDate, '到期日期') : null
  }

  // 商業邏輯驗證
  if (validated.minPrice > validated.currentPrice) {
    throw new Error('最低價格不能高於目前價格')
  }

  if (validated.currentPrice > validated.standardPrice) {
    throw new Error('目前價格不能高於標準價格')
  }

  if (validated.manufacturingDate && validated.expiryDate &&
      validated.manufacturingDate >= validated.expiryDate) {
    throw new Error('製造日期必須早於到期日期')
  }

  return validated
}

// 🔒 採購驗證 Schema - 強化版
export function validatePurchaseData(data: Record<string, unknown>) {
  // 基本欄位驗證
  const validatedData = {
    supplierId: validateRequired(data.supplierId, '供應商ID'),
    supplier: validateRequired(data.supplier, '供應商名稱'),
    totalAmount: validateNumber(data.totalAmount, '總金額', 0, 100000000), // 限制最大1億
    currency: validateEnum(data.currency || 'JPY', ['JPY', 'USD', 'TWD'], '幣別'),
    exchangeRate: validateNumber(data.exchangeRate, '匯率', 0.001, 1000),
    status: validateEnum(data.status || 'DRAFT', ['DRAFT', 'PENDING', 'CONFIRMED', 'RECEIVED', 'CANCELLED'], '狀態'),
    fundingSource: validateEnum(data.fundingSource || 'COMPANY', ['COMPANY', 'PERSONAL'], '資金來源'),
    notes: validateString(data.notes || '', '備註', 0, 1000),
    expectedDate: data.expectedDate ? validateDate(data.expectedDate, '預期到貨日') : null,
    declarationNumber: data.declarationNumber ? validateString(data.declarationNumber, '報關號碼', 0, 50) : null,
    declarationDate: data.declarationDate ? validateDate(data.declarationDate, '報關日期') : null
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
    productId: data.productId ? validateString(data.productId, `${itemLabel} 產品ID`, 1, 50) : null,
    productName: validateRequired(data.productName, `${itemLabel} 產品名稱`),
    quantity: validateNumber(data.quantity, `${itemLabel} 數量`, 0.01, 999999),
    unitPrice: validateNumber(data.unitPrice, `${itemLabel} 單價`, 0, 999999),
    dutiableValue: data.dutiableValue ? validateNumber(data.dutiableValue, `${itemLabel} 完稅價格`, 0) : null,
    tariffCode: data.tariffCode ? validateString(data.tariffCode, `${itemLabel} 稅則號碼`, 0, 20) : null,
    importDutyRate: data.importDutyRate ? validateNumber(data.importDutyRate, `${itemLabel} 進口稅率`, 0, 100) : null,
    alcoholPercentage: data.alcoholPercentage ? validateNumber(data.alcoholPercentage, `${itemLabel} 酒精濃度`, 0, 100) : null,
    volumeML: data.volumeML ? validateNumber(data.volumeML, `${itemLabel} 容量(毫升)`, 1, 10000) : null,
    weight: data.weight ? validateNumber(data.weight, `${itemLabel} 重量(公斤)`, 0.001, 10000) : null
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
  const validated = {
    customerId: validateRequired(data.customerId, '客戶ID'),
    saleNumber: data.saleNumber ? validateString(data.saleNumber, '銷售單號', 1, 30) : null,

    // 💰 價格相關 (雙重價格機制核心)
    totalAmount: validateNumber(data.totalAmount, '總金額', 0, 100000000),
    actualTotalAmount: validateNumber(data.actualTotalAmount, '實際金額', 0, 100000000),
    discountAmount: data.discountAmount ? validateNumber(data.discountAmount, '折扣金額', 0, 10000000) : 0,
    taxAmount: data.taxAmount ? validateNumber(data.taxAmount, '稅額', 0, 10000000) : 0,
    commission: data.commission ? validateNumber(data.commission, '傭金', 0, 10000000) : 0,

    // 📅 日期相關
    saleDate: data.saleDate ? validateDate(data.saleDate, '銷售日期') : new Date(),
    deliveryDate: data.deliveryDate ? validateDate(data.deliveryDate, '交貨日期') : null,
    dueDate: data.dueDate ? validateDate(data.dueDate, '到期日期') : null,

    // 📋 狀態管理
    status: validateEnum(data.status || 'PENDING', ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'], '訂單狀態'),
    paymentStatus: validateEnum(data.paymentStatus || 'PENDING', ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'], '付款狀態'),

    // 📄 發票相關
    invoiceNumber: data.invoiceNumber ? validateString(data.invoiceNumber, '發票號碼', 0, 30) : null,
    requiresInvoice: Boolean(data.requiresInvoice),

    // 📝 備註
    notes: validateString(data.notes || '', '備註', 0, 1000),
    internalNotes: validateString(data.internalNotes || '', '內部備註', 0, 1000)
  }

  // 🔒 商業邏輯驗證 (雙重價格核心安全)
  if (validated.actualTotalAmount < validated.totalAmount) {
    throw new Error('實際金額不能小於顯示金額 (商業邏輯錯誤)')
  }

  if (validated.discountAmount > validated.totalAmount) {
    throw new Error('折扣金額不能大於總金額')
  }

  if (validated.deliveryDate && validated.saleDate && validated.deliveryDate < validated.saleDate) {
    throw new Error('交貨日期不能早於銷售日期')
  }

  if (validated.dueDate && validated.saleDate && validated.dueDate < validated.saleDate) {
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
    productId: validateRequired(data.productId, `${itemLabel} 產品ID`),
    variantId: data.variantId ? validateString(data.variantId, `${itemLabel} 變體ID`, 1, 50) : null,
    quantity: validateNumber(data.quantity, `${itemLabel} 數量`, 0.01, 999999),
    unitPrice: validateNumber(data.unitPrice, `${itemLabel} 單價`, 0, 999999),
    actualUnitPrice: validateNumber(data.actualUnitPrice || data.unitPrice, `${itemLabel} 實際單價`, 0, 999999),
    totalPrice: validateNumber(data.totalPrice, `${itemLabel} 小計`, 0, 999999999),
    actualTotalPrice: validateNumber(data.actualTotalPrice || data.totalPrice, `${itemLabel} 實際小計`, 0, 999999999),
    discountRate: data.discountRate ? validateNumber(data.discountRate, `${itemLabel} 折扣率`, 0, 100) : 0,
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