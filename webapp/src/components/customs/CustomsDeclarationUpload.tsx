'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import type { AlcoholType } from '@/lib/tax-calculator'
import {
  Card,
  Button,
  Progress,
  Alert,
  Upload,
  Typography,
  Space,
  Spin
} from 'antd'
import {
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Dragger } = Upload

interface CustomsDeclarationUploadProps {
  onUploadComplete: (result: CustomsDeclarationResult) => void
  disabled?: boolean
}

interface CustomsDeclarationResult {
  id: string
  fileName: string
  declarationNumber: string
  totalValue: number
  currency: string
  exchangeRate: number
  items: CustomsItem[]
  extractedData: any
}

interface CustomsItem {
  name: string
  quantity: number
  alcoholPercentage: number
  volume: number
  dutiableValue: number
  alcoholTax: number
  businessTax: number
}

export default function CustomsDeclarationUpload({ onUploadComplete, disabled }: CustomsDeclarationUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleUpload = async (file: File) => {
    if (disabled || file.type !== 'application/pdf') {
      setError('請上傳PDF格式的報單文件')
      return false
    }

    setUploading(true)
    setError(null)
    setSuccess(null)
    setProgress(0)

    try {
      // 模擬上傳進度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // 準備FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'customs_declaration')

      // 調用OCR API
      const response = await fetch('/api/linebot/ocr', {
        method: 'POST',
        body: formData
      })

      if (response.status === 503) {
        throw new Error('API Key未設定，請先到設定頁面配置Gemini API Key')
      }

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        throw new Error(`OCR處理失敗: ${response.statusText}`)
      }

      const ocrResult = await response.json()

      // 處理OCR結果並計算稅金
      const processedResult = await processCustomsDeclaration(ocrResult, file.name)

      setSuccess(`成功處理報單：${processedResult.declarationNumber}`)
      onUploadComplete(processedResult)

    } catch (err) {
      console.error('報單處理錯誤:', err)
      setError(err instanceof Error ? err.message : '處理報單時發生錯誤')
    } finally {
      setUploading(false)
      setTimeout(() => {
        setProgress(0)
        setError(null)
        setSuccess(null)
      }, 3000)
    }

    return false // 阻止預設上傳行為
  }

  // 處理報單數據並計算稅金
  async function processCustomsDeclaration(ocrResult: any, fileName: string): Promise<CustomsDeclarationResult> {
    const { calculateTaxes } = await import('@/lib/tax-calculator')

    // 從OCR結果提取基本信息
    const declarationNumber = extractDeclarationNumber(ocrResult.text)
    const totalValue = extractTotalValue(ocrResult.text)
    const currency = extractCurrency(ocrResult.text) || 'TWD'
    const exchangeRate = extractExchangeRate(ocrResult.text) || 1.0

    // 提取商品清單
    const extractedItems = extractItemsFromOCR(ocrResult.text)

    // 為每個商品計算稅金
    const itemsWithTax = extractedItems.map((item: any) => {
      // 使用真實的稅金計算邏輯
      const taxResult = calculateTaxes({
        baseAmount: item.dutiableValue,
        productType: determineProductType(item.name),
        alcoholPercentage: item.alcoholPercentage,
        volumeML: item.volume,
        quantity: item.quantity,
        includeShipping: false,
        includeTax: true
      })

      return {
        name: item.name,
        quantity: item.quantity,
        alcoholPercentage: item.alcoholPercentage,
        volume: item.volume,
        dutiableValue: item.dutiableValue,
        alcoholTax: taxResult.costs.alcoholTax,
        businessTax: taxResult.costs.businessTax
      }
    })

    return {
      id: `customs_${Date.now()}`,
      fileName,
      declarationNumber,
      totalValue,
      currency,
      exchangeRate,
      items: itemsWithTax,
      extractedData: ocrResult
    }
  }

  // OCR文本提取函數
  function extractDeclarationNumber(text: string): string {
    const patterns = [
      /(?:報單號碼|Declaration No\.?)\s*[:：]?\s*([A-Z0-9\/\-]+)/i,
      /EDI\d+/i,
      /CX\/\d+\/\d+\/[A-Z0-9]+/i
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[1] || match[0]
    }

    return '未識別'
  }

  function extractTotalValue(text: string): number {
    const patterns = [
      /完稅價格\s*[:：]?\s*(?:NT\$|TWD)?\s*([\d,]+)/i,
      /總價值\s*[:：]?\s*(?:NT\$|TWD)?\s*([\d,]+)/i,
      /Total\s*Value\s*[:：]?\s*(?:NT\$|TWD)?\s*([\d,]+)/i
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        return parseInt(match[1].replace(/,/g, ''))
      }
    }

    return 0
  }

  function extractCurrency(text: string): string {
    if (text.includes('JPY') || text.includes('¥')) return 'JPY'
    if (text.includes('USD') || text.includes('$')) return 'USD'
    if (text.includes('EUR') || text.includes('€')) return 'EUR'
    return 'TWD'
  }

  function extractExchangeRate(text: string): number {
    const pattern = /匯率\s*[:：]?\s*([\d.]+)/i
    const match = text.match(pattern)
    return match ? parseFloat(match[1]) : 1.0
  }

  function extractItemsFromOCR(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    const items = []

    // 改進的商品識別邏輯，基於真實報單格式
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // 識別威士忌相關商品
      if (line.match(/(WHISKY|WHISKEY|LAPHROAIG|CLYNELISH|MACALLAN|YAMAZAKI|HAKUSYU|HIBIKI)/i)) {
        const item = parseProductLine(line, lines, i)
        if (item) items.push(item)
      }

      // 識別清酒
      if (line.match(/(SAKE|清酒|獺祭|DASSAI)/i)) {
        const item = parseProductLine(line, lines, i)
        if (item) items.push(item)
      }

      // 識別其他酒類
      if (line.match(/(WINE|BEER|VODKA|RUM|GIN|BRANDY)/i)) {
        const item = parseProductLine(line, lines, i)
        if (item) items.push(item)
      }
    }

    // 如果沒有識別到商品，返回預設項目
    return items.length > 0 ? items : [{
      name: '待識別商品',
      quantity: 1,
      alcoholPercentage: 40,
      volume: 700,
      dutiableValue: 1000
    }]
  }

  // 解析商品行資訊
  function parseProductLine(line: string, allLines: string[], index: number): any | null {
    try {
      // 提取商品名稱
      const name = line.trim()

      // 嘗試從同一行或後續行提取數量、酒精度、容量
      let quantity = 1
      let alcoholPercentage = 40
      let volume = 700
      let dutiableValue = 1000

      // 解析數量（尋找數字 + 瓶/個/支等單位）
      const qtyMatch = line.match(/(\d+)\s*(?:瓶|個|支|PCS|BOTTLES?)/i)
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1])
      }

      // 解析酒精度（尋找百分比）
      const alcMatch = line.match(/(\d+(?:\.\d+)?)\s*%/i)
      if (alcMatch) {
        alcoholPercentage = parseFloat(alcMatch[1])
      }

      // 解析容量（尋找ml數字）
      const volMatch = line.match(/(\d+)\s*ml/i)
      if (volMatch) {
        volume = parseInt(volMatch[1])
      }

      // 解析完稅價格（尋找TWD或NT$金額）
      const valueMatch = line.match(/(?:TWD|NT\$|完稅價格)\s*[\s:：]?\s*([\d,]+)/i)
      if (valueMatch) {
        dutiableValue = parseInt(valueMatch[1].replace(/,/g, ''))
      }

      // 檢查後續行是否有相關資訊
      for (let j = index + 1; j < Math.min(index + 3, allLines.length); j++) {
        const nextLine = allLines[j]

        if (!alcMatch && nextLine.match(/(\d+(?:\.\d+)?)\s*%/i)) {
          const match = nextLine.match(/(\d+(?:\.\d+)?)\s*%/i)
          if (match) alcoholPercentage = parseFloat(match[1])
        }

        if (!volMatch && nextLine.match(/(\d+)\s*ml/i)) {
          const match = nextLine.match(/(\d+)\s*ml/i)
          if (match) volume = parseInt(match[1])
        }

        if (!valueMatch && nextLine.match(/(?:TWD|NT\$)\s*([\d,]+)/i)) {
          const match = nextLine.match(/(?:TWD|NT\$)\s*([\d,]+)/i)
          if (match) dutiableValue = parseInt(match[1].replace(/,/g, ''))
        }
      }

      return {
        name,
        quantity,
        alcoholPercentage,
        volume,
        dutiableValue
      }
    } catch (error) {
      console.error('解析商品行失敗:', error)
      return null
    }
  }

  function determineProductType(name: string): AlcoholType {
    const upperName = name.toUpperCase()
    if (upperName.includes('WHISKY') || upperName.includes('WHISKEY')) return 'whisky'
    if (upperName.includes('SAKE') || upperName.includes('清酒')) return 'sake'
    if (upperName.includes('WINE') || upperName.includes('葡萄酒')) return 'wine'
    if (upperName.includes('BEER') || upperName.includes('啤酒')) return 'beer'
    if (upperName.includes('VODKA')) return 'vodka'
    if (upperName.includes('RUM')) return 'rum'
    if (upperName.includes('GIN')) return 'gin'
    if (upperName.includes('BRANDY')) return 'brandy'
    if (upperName.includes('LIQUEUR') || upperName.includes('利口酒')) return 'liqueur'
    if (upperName.includes('SPIRITS') || upperName.includes('烈酒')) return 'spirits'
    return 'default'
  }

  return (
    <Card style={{ width: '100%' }}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Title level={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <FileTextOutlined />
          報單上傳與處理
        </Title>

        <Dragger
          name="file"
          multiple={false}
          accept=".pdf"
          beforeUpload={handleUpload}
          disabled={disabled || uploading}
          showUploadList={false}
          style={{ marginBottom: 24 }}
        >
          <div style={{ padding: '40px 20px' }}>
            {uploading ? (
              <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            ) : (
              <UploadOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            )}

            <div style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                {uploading ? '處理中...' : '拖拽PDF報單到此處或點擊上傳'}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 14 }}>
                僅支援PDF格式的海關進口報單
              </Text>
            </div>
          </div>
        </Dragger>

        {uploading && (
          <div style={{ marginBottom: 24 }}>
            <Text style={{ display: 'block', marginBottom: 8 }}>
              處理進度：{progress}%
            </Text>
            <Progress percent={progress} status="active" />
          </div>
        )}

        {error && (
          <Alert
            message="處理失敗"
            description={error}
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            style={{ marginBottom: 24, textAlign: 'left' }}
          />
        )}

        {success && (
          <Alert
            message="處理成功"
            description={success}
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 24, textAlign: 'left' }}
          />
        )}

        <div style={{ fontSize: 12, color: '#8c8c8c', textAlign: 'left' }}>
          <div style={{ marginBottom: 4 }}>• 支援的報單格式：海關進口報單PDF</div>
          <div style={{ marginBottom: 4 }}>• 系統將自動識別商品信息並計算相應稅金</div>
          <div>• 處理完成後可進行手動調整確認</div>
        </div>
      </div>
    </Card>
  )
}