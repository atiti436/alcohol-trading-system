/**
 * 🔒 敏感資料遮罩工具
 * 用於保護個人隱私資訊
 */

/**
 * 遮罩電話號碼
 * @example "0912345678" -> "09XX-XXX-678"
 * @example "02-12345678" -> "02-XXX-XX678"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ''

  // 移除所有非數字字符
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.length === 10) {
    // 手機：0912345678 -> 09XX-XXX-678
    return `${cleaned.slice(0, 2)}XX-XXX-${cleaned.slice(-3)}`
  } else if (cleaned.length === 9) {
    // 市話：02-12345678 -> 02-XXX-XX678
    return `${cleaned.slice(0, 2)}-XXX-XX${cleaned.slice(-3)}`
  } else if (cleaned.length === 8) {
    // 短號：12345678 -> XXX-XX678
    return `XXX-XX${cleaned.slice(-3)}`
  }

  // 其他格式：只顯示前2後3
  if (cleaned.length > 5) {
    return `${cleaned.slice(0, 2)}${'X'.repeat(cleaned.length - 5)}${cleaned.slice(-3)}`
  }

  return phone
}

/**
 * 遮罩 Email
 * @example "user@example.com" -> "u***@example.com"
 * @example "long.email@example.com" -> "l***@example.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''

  const [local, domain] = email.split('@')
  if (!local || !domain) return email

  // 只顯示第一個字符
  const maskedLocal = local.length > 1
    ? `${local[0]}${'*'.repeat(Math.min(local.length - 1, 3))}`
    : local

  return `${maskedLocal}@${domain}`
}

/**
 * 遮罩地址
 * @example "台北市大安區信義路四段1號" -> "台北市大安區***"
 * @example "新北市板橋區中山路一段123號4樓" -> "新北市板橋區***"
 */
export function maskAddress(address: string | null | undefined): string {
  if (!address) return ''

  // 保留縣市區，其他遮罩
  const cityMatch = address.match(/^(.{2,3}[市縣])(.{2,3}[區鄉鎮市])/)
  if (cityMatch) {
    return `${cityMatch[1]}${cityMatch[2]}***`
  }

  // 如果沒有匹配到縣市區格式，只顯示前6個字
  if (address.length > 10) {
    return `${address.slice(0, 6)}***`
  }

  return address
}

/**
 * 遮罩統編/稅號
 * @example "12345678" -> "123***78"
 */
export function maskTaxId(taxId: string | null | undefined): string {
  if (!taxId) return ''

  const cleaned = taxId.replace(/\D/g, '')

  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 3)}***${cleaned.slice(-2)}`
  }

  return taxId
}

/**
 * 遮罩身分證字號
 * @example "A123456789" -> "A12****789"
 */
export function maskIdNumber(idNumber: string | null | undefined): string {
  if (!idNumber) return ''

  if (idNumber.length === 10) {
    return `${idNumber.slice(0, 3)}****${idNumber.slice(-3)}`
  }

  return idNumber
}

/**
 * 判斷是否需要遮罩（根據角色）
 * SUPER_ADMIN 和 EMPLOYEE 可以看到完整資料
 */
export function shouldMaskData(userRole: string): boolean {
  return userRole !== 'SUPER_ADMIN' && userRole !== 'EMPLOYEE'
}

/**
 * 遮罩客戶資料（根據角色）
 */
export function maskCustomerData<T extends Record<string, any>>(
  customer: T,
  userRole: string
): T {
  if (!shouldMaskData(userRole)) {
    return customer
  }

  return {
    ...customer,
    phone: customer.phone ? maskPhone(customer.phone) : customer.phone,
    email: customer.email ? maskEmail(customer.email) : customer.email,
    address: customer.address ? maskAddress(customer.address) : customer.address,
    tax_id: customer.tax_id ? maskTaxId(customer.tax_id) : customer.tax_id,
  }
}
