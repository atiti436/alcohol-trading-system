'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled || acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    if (file.type !== 'application/pdf') {
      setError('請上傳PDF格式的報單文件')
      return
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
  }, [disabled, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: disabled || uploading
  })

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

  function determineProductType(name: string): string {
    const upperName = name.toUpperCase()
    if (upperName.includes('WHISKY') || upperName.includes('WHISKEY')) return 'whisky'
    if (upperName.includes('SAKE')) return 'sake'
    if (upperName.includes('WINE')) return 'wine'
    if (upperName.includes('BEER')) return 'beer'
    return 'spirits'
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          報單上傳與處理
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            ) : (
              <Upload className="h-12 w-12 text-gray-400" />
            )}

            <div>
              <p className="text-lg font-medium">
                {uploading ? '處理中...' : isDragActive ? '放開文件以上傳' : '拖拽PDF報單到此處'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                或點擊選擇文件 (僅支援PDF格式)
              </p>
            </div>
          </div>
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>處理進度</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• 支援的報單格式：海關進口報單PDF</p>
          <p>• 系統將自動識別商品信息並計算相應稅金</p>
          <p>• 處理完成後可進行手動調整確認</p>
        </div>
      </CardContent>
    </Card>
  )
}