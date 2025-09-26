/**
 * 公司設定 Hook - ERP 系統的 BASE 配置管理
 * 所有需要公司資訊的組件都通過這個 Hook 獲取統一數據
 */

import { useState, useEffect } from 'react'
import { message } from 'antd'

export interface CompanySettings {
  id: string
  name: string
  englishName?: string
  address: string
  phone: string
  email?: string
  website?: string
  taxId: string
  bankName?: string
  bankAccount?: string
  bankCode?: string
  // 現代聯絡方式
  lineId?: string
  customField1?: string  // 自訂欄位1
  customField2?: string  // 自訂欄位2
  created_at: string
  updated_at: string
}

// 全局公司設定緩存
let globalCompanySettings: CompanySettings | null = null
let isLoading = false
const subscribers: Array<(settings: CompanySettings | null) => void> = []

// 訂閱者管理
const subscribe = (callback: (settings: CompanySettings | null) => void) => {
  subscribers.push(callback)
  return () => {
    const index = subscribers.indexOf(callback)
    if (index > -1) {
      subscribers.splice(index, 1)
    }
  }
}

// 通知所有訂閱者
const notifySubscribers = (settings: CompanySettings | null) => {
  globalCompanySettings = settings
  subscribers.forEach(callback => callback(settings))
}

// 載入公司設定
const loadCompanySettings = async (forceRefresh = false): Promise<CompanySettings | null> => {
  // 如果已有緩存且不強制刷新，直接返回
  if (globalCompanySettings && !forceRefresh) {
    return globalCompanySettings
  }

  // 避免重複請求
  if (isLoading) {
    return new Promise((resolve) => {
      const unsubscribe = subscribe((settings) => {
        unsubscribe()
        resolve(settings)
      })
    })
  }

  isLoading = true

  try {
    const response = await fetch('/api/settings/company')
    const result = await response.json()

    if (response.ok && result.success) {
      notifySubscribers(result.data)
      return result.data
    } else {
      console.warn('無法載入公司設定，使用預設值')
      // 使用預設公司設定
      const defaultSettings: CompanySettings = {
        id: 'default',
        name: '滿帆洋行有限公司',
        englishName: 'Full Sail Trading Co., Ltd.',
        address: '台北市中山區南京東路二段123號8樓',
        phone: '(02) 2545-1234',
        email: 'info@fullsail-trading.com.tw',
        website: 'www.fullsail-trading.com.tw',
        taxId: '12345678',
        bankName: '台灣銀行',
        bankAccount: '123-456-789012',
        bankCode: '004',
        lineId: '@fullsail',
        customField1: '',
        customField2: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      notifySubscribers(defaultSettings)
      return defaultSettings
    }
  } catch (error) {
    console.error('載入公司設定失敗:', error)
    message.error('載入公司設定失敗，請檢查網路連線')
    notifySubscribers(null)
    return null
  } finally {
    isLoading = false
  }
}

// 更新公司設定
const updateCompanySettings = async (data: Partial<CompanySettings>): Promise<boolean> => {
  try {
    const response = await fetch('/api/settings/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (response.ok && result.success) {
      // 更新緩存並通知所有訂閱者
      notifySubscribers(result.data)
      message.success('公司設定更新成功')
      return true
    } else {
      message.error(result.error || '更新失敗')
      return false
    }
  } catch (error) {
    console.error('更新公司設定失敗:', error)
    message.error('更新失敗，請檢查網路連線')
    return false
  }
}

// React Hook
export const useCompanySettings = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(globalCompanySettings)
  const [loading, setLoading] = useState(!globalCompanySettings)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 訂閱全局設定變化
    const unsubscribe = subscribe(setSettings)

    // 如果沒有緩存，載入設定
    if (!globalCompanySettings && !isLoading) {
      loadCompanySettings()
        .then((result) => {
          if (result) {
            setError(null)
          } else {
            setError('載入公司設定失敗')
          }
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }

    return unsubscribe
  }, [])

  const refresh = async () => {
    setLoading(true)
    setError(null)
    const result = await loadCompanySettings(true)
    if (!result) {
      setError('重新載入公司設定失敗')
    }
    setLoading(false)
  }

  const update = async (data: Partial<CompanySettings>) => {
    return await updateCompanySettings(data)
  }

  return {
    settings,
    loading,
    error,
    refresh,
    update,
    // 便捷方法
    companyName: settings?.name || '滿帆洋行有限公司',
    companyAddress: settings?.address || '',
    companyPhone: settings?.phone || '',
    companyTaxId: settings?.taxId || '',
    bankInfo: settings ? {
      name: settings.bankName || '',
      account: settings.bankAccount || '',
      code: settings.bankCode || ''
    } : null
  }
}

// 導出工具函數供非 React 組件使用
export { loadCompanySettings, updateCompanySettings }