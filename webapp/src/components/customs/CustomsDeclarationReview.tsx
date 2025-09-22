'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Button
} from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Input
} from '@/components/ui/input'
import {
  Label
} from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle,
  AlertCircle,
  Edit3,
  Calculator,
  FileText,
  Save
} from 'lucide-react'

interface CustomsItem {
  name: string
  quantity: number
  alcoholPercentage: number
  volume: number
  dutiableValue: number
  alcoholTax: number
  businessTax: number
  productType?: string // 新增：酒類分類
}

interface CustomsDeclarationReviewProps {
  data: {
    declarationNumber: string
    totalValue: number
    currency: string
    exchangeRate: number
    items: CustomsItem[]
    extractedData: any
  }
  onConfirm: (updatedData: any) => void
  onCancel: () => void
  loading?: boolean
}

export default function CustomsDeclarationReview({
  data,
  onConfirm,
  onCancel,
  loading = false
}: CustomsDeclarationReviewProps) {
  const [declarationNumber, setDeclarationNumber] = useState(data.declarationNumber)
  const [totalValue, setTotalValue] = useState(data.totalValue)
  const [currency, setCurrency] = useState(data.currency)
  const [exchangeRate, setExchangeRate] = useState(data.exchangeRate)
  const [items, setItems] = useState<CustomsItem[]>(data.items)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [recalculating, setRecalculating] = useState(false)

  // 酒類類型選項（含稅率資訊）
  const alcoholTypes = [
    { value: 'whisky', label: '威士忌', rate: '2.5元/度/L', category: '蒸餾酒類' },
    { value: 'sake', label: '清酒', rate: '7元/度/L', category: '釀造酒類' },
    { value: 'wine', label: '葡萄酒', rate: '7元/度/L', category: '釀造酒類' },
    { value: 'beer', label: '啤酒', rate: '26元/L', category: '釀造酒類' },
    { value: 'vodka', label: '伏特加', rate: '2.5元/度/L', category: '蒸餾酒類' },
    { value: 'rum', label: '蘭姆酒', rate: '2.5元/度/L', category: '蒸餾酒類' },
    { value: 'gin', label: '琴酒', rate: '2.5元/度/L', category: '蒸餾酒類' },
    { value: 'brandy', label: '白蘭地', rate: '2.5元/度/L', category: '蒸餾酒類' },
    { value: 'liqueur', label: '利口酒', rate: '條件式', category: '再製酒類' },
    { value: 'spirits', label: '烈酒', rate: '2.5元/度/L', category: '蒸餾酒類' }
  ]

  // 利口酒特殊說明
  const liqueurNote = "利口酒稅率：酒精度>20% 每公升185元；酒精度≤20% 每度每公升7元"

  // 計算總稅金
  const calculateTotalTaxes = () => {
    return items.reduce((total, item) => {
      return total + item.alcoholTax + item.businessTax
    }, 0)
  }

  // 重新計算單項稅金
  const recalculateItemTax = async (index: number, item: CustomsItem) => {
    setRecalculating(true)
    try {
      const { calculateTaxes } = await import('@/lib/tax-calculator')

      // 使用手動選擇的分類或自動判斷
      const productType = item.productType || determineProductType(item.name)
      const taxResult = calculateTaxes({
        baseAmount: item.dutiableValue,
        productType,
        alcoholPercentage: item.alcoholPercentage,
        volumeML: item.volume,
        quantity: item.quantity,
        includeShipping: false,
        includeTax: true
      })

      const updatedItems = [...items]
      updatedItems[index] = {
        ...item,
        productType,
        alcoholTax: taxResult.costs.alcoholTax,
        businessTax: taxResult.costs.businessTax
      }
      setItems(updatedItems)
    } catch (error) {
      console.error('重新計算稅金失敗:', error)
    } finally {
      setRecalculating(false)
    }
  }

  // 判斷酒類類型
  const determineProductType = (name: string): string => {
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
    return 'spirits'
  }

  // 更新商品項目
  const updateItem = (index: number, field: keyof CustomsItem, value: any) => {
    const updatedItems = [...items]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    }
    setItems(updatedItems)

    // 如果更新了影響稅金計算的欄位，重新計算
    if (['dutiableValue', 'alcoholPercentage', 'volume', 'quantity', 'productType'].includes(field)) {
      recalculateItemTax(index, updatedItems[index])
    }
  }

  // 取得稅率資訊文字
  const getTaxRateInfo = (productType: string) => {
    const type = alcoholTypes.find(t => t.value === productType)
    return type ? `${type.rate} (${type.category})` : '未知稅率'
  }

  // 確認並提交
  const handleConfirm = () => {
    const finalData = {
      declarationNumber,
      totalValue,
      currency,
      exchangeRate,
      items,
      totalTaxes: calculateTotalTaxes(),
      extractedData: data.extractedData
    }
    onConfirm(finalData)
  }

  return (
    <div className="space-y-6">
      {/* 報單基本資訊 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            報單基本資訊
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="declarationNumber">報單號碼</Label>
              <Input
                id="declarationNumber"
                value={declarationNumber}
                onChange={(e) => setDeclarationNumber(e.target.value)}
                placeholder="請輸入報單號碼"
              />
            </div>
            <div>
              <Label htmlFor="totalValue">總價值</Label>
              <div className="flex space-x-2">
                <Input
                  id="totalValue"
                  type="number"
                  value={totalValue}
                  onChange={(e) => setTotalValue(parseFloat(e.target.value) || 0)}
                />
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TWD">TWD</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="exchangeRate">匯率</Label>
              <Input
                id="exchangeRate"
                type="number"
                step="0.0001"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
              />
            </div>
            <div className="flex items-end">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  台幣金額：NT$ {(totalValue * exchangeRate).toLocaleString()}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 商品明細 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            商品明細與稅金計算
            {recalculating && <Badge variant="secondary">計算中...</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名稱</TableHead>
                <TableHead className="w-32">稅率分類</TableHead>
                <TableHead className="w-20">數量</TableHead>
                <TableHead className="w-24">酒精度(%)</TableHead>
                <TableHead className="w-24">容量(ml)</TableHead>
                <TableHead className="w-32">完稅價格</TableHead>
                <TableHead className="w-32">菸酒稅</TableHead>
                <TableHead className="w-32">營業稅</TableHead>
                <TableHead className="w-20">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        className="min-w-[200px]"
                      />
                    ) : (
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <Badge variant="outline" className="mt-1">
                          {item.productType || determineProductType(item.name)}
                        </Badge>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <div>
                        <Select
                          value={item.productType || determineProductType(item.name)}
                          onValueChange={(value) => updateItem(index, 'productType', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {alcoholTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                <div>
                                  <div className="font-medium">{type.label}</div>
                                  <div className="text-xs text-gray-500">{type.rate}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(item.productType === 'liqueur' || (!item.productType && determineProductType(item.name) === 'liqueur')) && (
                          <div className="text-xs text-amber-600 mt-1">
                            {liqueurNote}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium">
                          {alcoholTypes.find(t => t.value === (item.productType || determineProductType(item.name)))?.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getTaxRateInfo(item.productType || determineProductType(item.name))}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    ) : (
                      item.quantity
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={item.alcoholPercentage}
                        onChange={(e) => updateItem(index, 'alcoholPercentage', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    ) : (
                      `${item.alcoholPercentage}%`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        value={item.volume}
                        onChange={(e) => updateItem(index, 'volume', parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                    ) : (
                      `${item.volume}ml`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        value={item.dutiableValue}
                        onChange={(e) => updateItem(index, 'dutiableValue', parseFloat(e.target.value) || 0)}
                        className="w-32"
                      />
                    ) : (
                      `NT$ ${item.dutiableValue.toLocaleString()}`
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-orange-600 font-medium">
                      NT$ {item.alcoholTax.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-blue-600 font-medium">
                      NT$ {item.businessTax.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    {editingIndex === index ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingIndex(null)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingIndex(index)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 稅金總計 */}
      <Card>
        <CardHeader>
          <CardTitle>稅金總計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="text-sm text-gray-500">菸酒稅總計</div>
              <div className="text-xl font-bold text-orange-600">
                NT$ {items.reduce((sum, item) => sum + item.alcoholTax, 0).toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-500">營業稅總計</div>
              <div className="text-xl font-bold text-blue-600">
                NT$ {items.reduce((sum, item) => sum + item.businessTax, 0).toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-500">稅金總計</div>
              <div className="text-2xl font-bold text-red-600">
                NT$ {calculateTotalTaxes().toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作按鈕 */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          取消
        </Button>
        <Button onClick={handleConfirm} disabled={loading || recalculating}>
          <CheckCircle className="h-4 w-4 mr-2" />
          {loading ? '處理中...' : '確認並保存'}
        </Button>
      </div>

      {/* 提示信息 */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          請仔細檢查OCR識別結果，確認商品資訊和稅金計算正確後再提交。修改完稅價格、酒精度、容量或數量後將自動重新計算稅金。
        </AlertDescription>
      </Alert>
    </div>
  )
}