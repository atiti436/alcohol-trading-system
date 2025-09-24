'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Table,
  Input,
  Select,
  Alert,
  Tag,
  Divider,
  Row,
  Col,
  Typography,
  Space,
  InputNumber,
  Tooltip,
  Spin
} from 'antd'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  CalculatorOutlined,
  FileTextOutlined,
  SaveOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

type AlcoholType = 'beer' | 'whisky' | 'vodka' | 'rum' | 'gin' | 'brandy' | 'wine' | 'sake' | 'liqueur' | 'spirits' | 'default'

interface CustomsItem {
  name: string
  quantity: number
  alcoholPercentage: number
  volume: number
  dutiableValue: number
  alcoholTax: number
  businessTax: number
  productType?: AlcoholType
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
  const [editingKey, setEditingKey] = useState<string>('')
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
  const determineProductType = (name: string): AlcoholType => {
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

  // 是否正在編輯
  const isEditing = (record: any) => record.key === editingKey

  // 編輯
  const edit = (record: any) => {
    setEditingKey(record.key)
  }

  // 保存
  const save = async (key: string) => {
    setEditingKey('')
  }

  // 取消編輯
  const cancel = () => {
    setEditingKey('')
  }

  // 表格欄位定義
  const columns = [
    {
      title: '商品名稱',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: any, index: number) => {
        const editable = isEditing(record)
        return editable ? (
          <Input
            value={record.name}
            onChange={(e) => updateItem(index, 'name', e.target.value)}
          />
        ) : (
          <div>
            <div style={{ fontWeight: 'bold' }}>{text}</div>
            <Tag color="blue" style={{ marginTop: 4 }}>
              {record.productType || determineProductType(record.name)}
            </Tag>
          </div>
        )
      }
    },
    {
      title: '稅率分類',
      dataIndex: 'productType',
      key: 'productType',
      width: 150,
      render: (text: string, record: any, index: number) => {
        const editable = isEditing(record)
        const currentType = record.productType || determineProductType(record.name)

        return editable ? (
          <div>
            <Select
              value={currentType}
              style={{ width: '100%' }}
              onChange={(value) => updateItem(index, 'productType', value)}
            >
              {alcoholTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{type.label}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{type.rate}</div>
                  </div>
                </Option>
              ))}
            </Select>
            {currentType === 'liqueur' && (
              <div style={{ fontSize: '10px', color: '#fa8c16', marginTop: 4 }}>
                {liqueurNote}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {alcoholTypes.find(t => t.value === currentType)?.label}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {getTaxRateInfo(currentType)}
            </div>
          </div>
        )
      }
    },
    {
      title: '數量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'center' as const,
      render: (text: number, record: any, index: number) => {
        const editable = isEditing(record)
        return editable ? (
          <InputNumber
            value={record.quantity}
            min={1}
            onChange={(value) => updateItem(index, 'quantity', value || 1)}
          />
        ) : text
      }
    },
    {
      title: '酒精度(%)',
      dataIndex: 'alcoholPercentage',
      key: 'alcoholPercentage',
      width: 100,
      align: 'center' as const,
      render: (text: number, record: any, index: number) => {
        const editable = isEditing(record)
        return editable ? (
          <InputNumber
            value={record.alcoholPercentage}
            min={0}
            max={100}
            step={0.1}
            onChange={(value) => updateItem(index, 'alcoholPercentage', value || 0)}
          />
        ) : `${text}%`
      }
    },
    {
      title: '容量(ml)',
      dataIndex: 'volume',
      key: 'volume',
      width: 100,
      align: 'center' as const,
      render: (text: number, record: any, index: number) => {
        const editable = isEditing(record)
        return editable ? (
          <InputNumber
            value={record.volume}
            min={1}
            onChange={(value) => updateItem(index, 'volume', value || 1)}
          />
        ) : `${text}ml`
      }
    },
    {
      title: '完稅價格',
      dataIndex: 'dutiableValue',
      key: 'dutiableValue',
      width: 120,
      align: 'right' as const,
      render: (text: number, record: any, index: number) => {
        const editable = isEditing(record)
        return editable ? (
          <InputNumber
            value={record.dutiableValue}
            min={0}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => {
              const cleaned = (value || '').replace(/\$\s?|,/g, '')
              const num = parseFloat(cleaned)
              return isNaN(num) ? 0 : num
            }}
            onChange={(value) => updateItem(index, 'dutiableValue', value || 0)}
          />
        ) : `NT$ ${text.toLocaleString()}`
      }
    },
    {
      title: '菸酒稅',
      dataIndex: 'alcoholTax',
      key: 'alcoholTax',
      width: 120,
      align: 'right' as const,
      render: (text: number) => (
        <span style={{ color: '#fa541c', fontWeight: 'bold' }}>
          NT$ {text.toLocaleString()}
        </span>
      )
    },
    {
      title: '營業稅',
      dataIndex: 'businessTax',
      key: 'businessTax',
      width: 120,
      align: 'right' as const,
      render: (text: number) => (
        <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
          NT$ {text.toLocaleString()}
        </span>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (text: any, record: any) => {
        const editable = isEditing(record)
        return editable ? (
          <Space>
            <Button
              size="small"
              icon={<SaveOutlined />}
              onClick={() => save(record.key)}
            />
            <Button
              size="small"
              onClick={cancel}
            >
              取消
            </Button>
          </Space>
        ) : (
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => edit(record)}
          >
            編輯
          </Button>
        )
      }
    }
  ]

  // 準備表格數據
  const tableData = items.map((item, index) => ({
    ...item,
    key: index.toString()
  }))

  return (
    <Spin spinning={recalculating} tip="重新計算稅金中...">
      <div style={{ padding: '0 0 24px 0' }}>
        {/* 報單基本資訊 */}
        <Card
          title={
            <Space>
              <FileTextOutlined />
              報單基本資訊
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>報單號碼：</Text>
                <Input
                  value={declarationNumber}
                  onChange={(e) => setDeclarationNumber(e.target.value)}
                  placeholder="請輸入報單號碼"
                  style={{ marginTop: 4 }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>總價值：</Text>
                <Space style={{ marginTop: 4, width: '100%' }}>
                  <InputNumber
                    value={totalValue}
                    onChange={(value) => setTotalValue(value || 0)}
                    style={{ flex: 1 }}
                  />
                  <Select value={currency} onChange={setCurrency} style={{ width: 80 }}>
                    <Option value="TWD">TWD</Option>
                    <Option value="JPY">JPY</Option>
                    <Option value="USD">USD</Option>
                    <Option value="EUR">EUR</Option>
                  </Select>
                </Space>
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>匯率：</Text>
                <InputNumber
                  value={exchangeRate}
                  step={0.0001}
                  onChange={(value) => setExchangeRate(value || 1)}
                  style={{ marginTop: 4, width: '100%' }}
                />
              </div>
            </Col>
            <Col span={12}>
              <Alert
                message={`台幣金額：NT$ ${(totalValue * exchangeRate).toLocaleString()}`}
                type="info"
                showIcon
                style={{ marginTop: 20 }}
              />
            </Col>
          </Row>
        </Card>

        {/* 商品明細 */}
        <Card
          title={
            <Space>
              <CalculatorOutlined />
              商品明細與稅金計算
              {recalculating && <Tag color="processing">計算中</Tag>}
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </Card>

        {/* 稅金總計 */}
        <Card title="稅金總計" style={{ marginBottom: 24 }}>
          <Row gutter={16} style={{ textAlign: 'center' }}>
            <Col span={8}>
              <div style={{ padding: '16px 0' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>菸酒稅總計</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa541c' }}>
                  NT$ {items.reduce((sum, item) => sum + item.alcoholTax, 0).toLocaleString()}
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ padding: '16px 0' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>營業稅總計</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  NT$ {items.reduce((sum, item) => sum + item.businessTax, 0).toLocaleString()}
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ padding: '16px 0' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>稅金總計</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f5222d' }}>
                  NT$ {calculateTotalTaxes().toLocaleString()}
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 操作按鈕 */}
        <div style={{ textAlign: 'right', marginBottom: 24 }}>
          <Space>
            <Button onClick={onCancel} disabled={loading}>
              取消
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleConfirm}
              disabled={loading || recalculating}
            >
              {loading ? '處理中...' : '確認並保存'}
            </Button>
          </Space>
        </div>

        {/* 提示信息 */}
        <Alert
          message="請仔細檢查OCR識別結果"
          description="確認商品資訊和稅金計算正確後再提交。修改完稅價格、酒精度、容量或數量後將自動重新計算稅金。"
          type="info"
          showIcon
        />
      </div>
    </Spin>
  )
}