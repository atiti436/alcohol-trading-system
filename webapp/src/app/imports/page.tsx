'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Card,
  Tag,
  Modal,
  Form,
  message,
  Tooltip,
  DatePicker,
  InputNumber,
  Divider,
  Spin,
  Empty,
  Result,
  Alert,
  Tabs,
  Steps,
  Upload
} from 'antd'
import {
  SearchOutlined,
  EyeOutlined,
  FileTextOutlined,
  ImportOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import { HideFromInvestor } from '@/components/auth/RoleGuard'
import { SecurePriceDisplay } from '@/components/common/SecurePriceDisplay'
import CustomsDeclarationUpload from '@/components/customs/CustomsDeclarationUpload'
import CustomsDeclarationReview from '@/components/customs/CustomsDeclarationReview'
import ImportEditModal from '@/components/imports/ImportEditModal'

const { Search } = Input
const { Option } = Select
const { TextArea } = Input
const { TabPane } = Tabs
const { Step } = Steps

interface ImportRecord {
  id: string
  importNumber: string
  purchaseId: string
  purchaseNumber: string
  supplier: string
  declarationNumber?: string
  declarationDate?: string
  status: 'PENDING' | 'PROCESSING' | 'CUSTOMS_CLEARED' | 'RECEIVED' | 'COMPLETED'
  totalValue: number
  currency: string
  exchangeRate: number
  alcoholTax: number
  businessTax: number
  tradePromotionFee: number
  totalTaxes: number
  created_at: string
  items: ImportItem[]
  _count: { items: number }
}

interface ImportItem {
  id: string
  product_name: string
  quantity: number
  alcoholPercentage: number
  volume: number
  dutiableValue: number
  alcoholTax: number
  businessTax: number
  tariffCode?: string
}

interface ImportFilters {
  page: number
  limit: number
  search: string
  status?: string
  orderBy: string
  order: string
}

export default function ImportsPage() {
  const { data: session } = useSession()
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<ImportFilters>({
    page: 1,
    limit: 20,
    search: '',
    orderBy: 'created_at',
    order: 'desc'
  })
  const [error, setError] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  // Modal狀態
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [selectedImport, setSelectedImport] = useState<ImportRecord | null>(null)
  const [declarationModalVisible, setDeclarationModalVisible] = useState(false)
  const [reviewModalVisible, setReviewModalVisible] = useState(false)
  const [pendingPurchases, setPendingPurchases] = useState<any[]>([])
  const [ocrResult, setOcrResult] = useState<any>(null)

  // 載入進貨記錄
  const loadImports = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value))
        }
      })

      const response = await fetch(`/api/imports?${queryParams}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        const mapped = (result.data.imports || []).map((rec: any) => ({
          id: rec.id,
          importNumber: rec.import_number,
          purchaseId: rec.purchase_id,
          purchaseNumber: rec.purchase_number,
          supplier: rec.supplier,
          declarationNumber: rec.declaration_number,
          declarationDate: rec.declaration_date,
          status: rec.status,
          totalValue: rec.total_value,
          currency: rec.currency,
          exchangeRate: rec.exchange_rate,
          alcoholTax: rec.alcohol_tax,
          businessTax: rec.business_tax,
          tradePromotionFee: rec.trade_promotion_fee,
          totalTaxes: rec.total_taxes,
          created_at: rec.created_at,
          items: (rec.items || []).map((item: any) => ({
            id: item.id,
            product_name: item.product_name,
            quantity: item.quantity,
            alcoholPercentage: item.alcohol_percentage,
            volume: item.volume,
            dutiableValue: item.dutiable_value,
            alcoholTax: item.alcohol_tax,
            businessTax: item.business_tax,
            tariffCode: item.tariff_code
          })),
          _count: rec._count,
        }))
        setImports(mapped)
        setTotal(result.data.total)
        setError(null)
      } else {
        throw new Error(result.error || '載入失敗')
      }
    } catch (error) {
      console.error('載入進貨記錄失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '載入進貨記錄失敗'
      setError(errorMessage)

      if (initialLoading) {
        message.error(errorMessage)
      }
    } finally {
      setLoading(false)
      if (initialLoading) setInitialLoading(false)
    }
  }, [filters, initialLoading])

  // 載入待進貨的採購單
  const loadPendingPurchases = async () => {
    try {
      const response = await fetch('/api/purchases?status=CONFIRMED&limit=100')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const purchases = result.data.purchases || []

          // 查詢所有進貨記錄，過濾掉已有進貨記錄的採購單
          const importsResponse = await fetch('/api/imports?limit=1000')
          const importsResult = await importsResponse.json()
          const importedPurchaseIds = new Set(
            (importsResult.data?.imports || []).map((imp: any) => imp.purchase_id)
          )

          // 只保留沒有對應進貨記錄的採購單
          const filtered = purchases.filter((p: any) => !importedPurchaseIds.has(p.id))

          const mapped = filtered.map((p: any) => ({
            ...p,
            purchaseNumber: p.purchase_number,
            fundingSource: p.funding_source,
            exchangeRate: p.exchange_rate,
            declarationNumber: p.declaration_number,
            declarationDate: p.declaration_date,
          }))
          setPendingPurchases(mapped)
        }
      }
    } catch (error) {
      console.error('載入待進貨採購單失敗:', error)
    }
  }

  useEffect(() => {
    loadImports()
    loadPendingPurchases()
  }, [filters, loadImports])

  // 狀態標籤顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'orange'
      case 'PROCESSING': return 'blue'
      case 'CUSTOMS_CLEARED': return 'cyan'
      case 'RECEIVED': return 'green'
      case 'COMPLETED': return 'purple'
      default: return 'default'
    }
  }

  // 狀態顯示名稱
  const getStatusName = (status: string) => {
    const statusNames = {
      PENDING: '待處理',
      PROCESSING: '處理中',
      CUSTOMS_CLEARED: '通關完成',
      RECEIVED: '已收貨',
      COMPLETED: '已完成'
    }
    return statusNames[status as keyof typeof statusNames] || status
  }

  // 狀態對應的步驟
  const getStatusStep = (status: string) => {
    switch (status) {
      case 'PENDING': return 0
      case 'PROCESSING': return 1
      case 'CUSTOMS_CLEARED': return 2
      case 'RECEIVED': return 3
      case 'COMPLETED': return 4
      default: return 0
    }
  }

  // 表格欄位定義
  const columns = [
    {
      title: '進貨單號',
      dataIndex: 'importNumber',
      key: 'importNumber',
      width: 150,
      render: (text: string, record: ImportRecord) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            來源：
            <a href={`/purchases?search=${encodeURIComponent(record.purchaseNumber)}`} style={{ textDecoration: 'underline' }}>
              {record.purchaseNumber}
            </a>
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {dayjs(record.created_at).format('YYYY/MM/DD')}
          </div>
        </div>
      )
    },
    {
      title: '供應商',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 150,
      ellipsis: true
    },
    {
      title: '報單資訊',
      key: 'declaration',
      width: 150,
      render: (record: ImportRecord) => (
        <div>
          {record.declarationNumber ? (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                {record.declarationNumber}
              </div>
              {record.declarationDate && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {dayjs(record.declarationDate).format('YYYY/MM/DD')}
                </div>
              )}
            </div>
          ) : (
            <span style={{ color: '#ccc' }}>待上傳</span>
          )}
        </div>
      )
    },
    {
      title: '總價值',
      key: 'totalValue',
      width: 120,
      render: (record: ImportRecord) => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold' }}>
            <SecurePriceDisplay
              amount={record.totalValue}
              currency={record.currency}
              allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
              displayMultiplier={0.8}
              showFallbackIcon={true}
            />
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            匯率 {record.exchangeRate}
          </div>
        </div>
      )
    },
    {
      title: '稅費總計',
      key: 'totalTaxes',
      width: 100,
      render: (record: ImportRecord) => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', color: '#fa541c' }}>
            NT$ {record.totalTaxes?.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            菸酒稅: {record.alcoholTax?.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: '10px', color: '#666' }}>
            營業稅: {record.businessTax?.toLocaleString() || '0'}
          </div>
        </div>
      )
    },
    {
      title: '商品數',
      key: 'itemCount',
      width: 80,
      render: (record: ImportRecord) => (
        <div style={{ textAlign: 'center' }}>
          {record._count?.items || 0} 項
        </div>
      )
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <div>
          <Tag color={getStatusColor(status)}>
            {getStatusName(status)}
          </Tag>
          <div style={{ marginTop: '4px', fontSize: '10px' }}>
            <Steps
              size="small"
              current={getStatusStep(status)}
              direction="horizontal"
              style={{ width: '100px' }}
            >
              <Step icon={<ClockCircleOutlined />} />
              <Step icon={<ExclamationCircleOutlined />} />
              <Step icon={<CheckCircleOutlined />} />
              <Step icon={<ImportOutlined />} />
            </Steps>
          </div>
        </div>
      ),
      filters: [
        { text: '待處理', value: 'PENDING' },
        { text: '處理中', value: 'PROCESSING' },
        { text: '通關完成', value: 'CUSTOMS_CLEARED' },
        { text: '已收貨', value: 'RECEIVED' },
        { text: '已完成', value: 'COMPLETED' }
      ]
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (record: ImportRecord) => {
        const isAdmin = session?.user?.role === 'SUPER_ADMIN'
        const canEdit = isAdmin && record.status !== 'COMPLETED'

        return (
          <Space>
            <Tooltip title="查看詳情">
              <Button
                icon={<EyeOutlined />}
                size="small"
                onClick={() => handleView(record)}
              />
            </Tooltip>

            {canEdit && (
              <Tooltip title="編輯">
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEdit(record)}
                />
              </Tooltip>
            )}

            {record.status === 'PENDING' && (
              <Tooltip title="上傳報單">
                <Button
                  icon={<UploadOutlined />}
                  size="small"
                  type="primary"
                  onClick={() => handleUploadDeclaration(record)}
                />
              </Tooltip>
            )}

            {(record.status === 'PROCESSING' || record.status === 'CUSTOMS_CLEARED' || record.status === 'RECEIVED') && (
              <Tooltip title="收貨入庫">
                <Button
                  icon={<CheckCircleOutlined />}
                  size="small"
                  type="primary"
                  onClick={() => handleReceiveImport(record)}
                >
                  收貨
                </Button>
              </Tooltip>
            )}
          </Space>
        )
      }
    }
  ]

  // 處理查看詳情
  const handleView = (importRecord: ImportRecord) => {
    setSelectedImport(importRecord)
    setViewModalVisible(true)
  }

  // 處理編輯
  const handleEdit = (importRecord: ImportRecord) => {
    setSelectedImport(importRecord)
    setEditModalVisible(true)
  }

  // 處理報單上傳
  const handleUploadDeclaration = (importRecord: ImportRecord) => {
    setSelectedImport(importRecord)
    setDeclarationModalVisible(true)
  }

  // 從進貨記錄執行收貨入庫（串接既有採購收貨API）
  const handleReceiveImport = async (importRecord: ImportRecord) => {
    try {
      const actualQty = (importRecord.items || []).reduce((sum, it: any) => sum + (it.quantity || 0), 0)
      const receiveData = {
        actual_quantity: actualQty,
        exchange_rate: importRecord.exchangeRate || 1.0,
        loss_type: 'NONE',
        loss_quantity: 0,
        inspection_fee: 0,
        allocation_method: 'BY_AMOUNT',
        additional_costs: []
      }

      const resp = await fetch(`/api/purchases/${importRecord.purchaseId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiveData)
      })
      const result = await resp.json()
      if (resp.ok && result.success) {
        await fetch(`/api/imports/${importRecord.id}/receive`, { method: 'POST' })
        message.success('收貨完成，庫存已更新')
        await loadImports(false)
      } else {
        message.error(result.error?.message || result.error || '收貨失敗')
      }
    } catch (error) {
      console.error('進貨收貨失敗:', error)
      message.error('收貨失敗，請稍後再試')
    }
  }

  // 處理報單上傳完成 - 顯示審核界面
  const handleDeclarationUploadComplete = (result: any) => {
    setOcrResult(result)
    setDeclarationModalVisible(false)
    setReviewModalVisible(true)
  }

  // 處理審核確認
  const handleReviewConfirm = async (reviewedData: any) => {
    if (!selectedImport) return

    try {
      // 提交審核後的數據
      const response = await fetch(`/api/imports/${selectedImport.id}/declaration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          declarationNumber: reviewedData.declarationNumber,
          declarationDate: new Date().toISOString(),
          totalValue: reviewedData.totalValue,
          exchangeRate: reviewedData.exchangeRate,
          items: reviewedData.items.map((item: any) => ({
            product_name: item.name,
            quantity: item.quantity,
            alcoholPercentage: item.alcoholPercentage,
            volume: item.volume,
            dutiableValue: item.dutiableValue,
            alcoholTax: item.alcoholTax,
            businessTax: item.businessTax
          })),
          extractedData: reviewedData.extractedData
        })
      })

      if (response.ok) {
        message.success('報單處理完成，稅金已計算並保存')
        setReviewModalVisible(false)
        setSelectedImport(null)
        setOcrResult(null)
        await loadImports(false)
      } else {
        const error = await response.json()
        message.error(error.message || '處理報單失敗')
      }
    } catch (error) {
      console.error('處理報單失敗:', error)
      message.error('處理報單失敗')
    }
  }

  // 處理審核取消
  const handleReviewCancel = () => {
    setReviewModalVisible(false)
    setOcrResult(null)
    // 重新打開上傳界面
    setDeclarationModalVisible(true)
  }

  // 從採購單創建進貨記錄
  const handleCreateFromPurchase = async (purchaseId: string) => {
    try {
      const response = await fetch('/api/imports/from-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId })
      })

      if (response.ok) {
        message.success('進貨記錄已創建')
        await loadImports(false)
        await loadPendingPurchases()
      } else {
        const error = await response.json()
        message.error(error.message || '創建進貨記錄失敗')
      }
    } catch (error) {
      console.error('創建進貨記錄失敗:', error)
      message.error('創建進貨記錄失敗')
    }
  }

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <Spin spinning={initialLoading} tip="正在載入進貨資料...">
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImportOutlined />
              <span style={{ fontSize: 'clamp(16px, 4vw, 20px)' }}>進貨管理</span>
            </div>
          }
          extra={
            <Space>
              <Search
                placeholder="搜尋進貨單號、供應商..."
                allowClear
                style={{ width: 250 }}
                loading={loading}
                onSearch={(value) => setFilters(prev => ({ ...prev, search: value, page: 1 }))}
                enterButton
              />
            </Space>
          }
        >
          <Tabs defaultActiveKey="1">
            <TabPane tab="進貨記錄" key="1">
              {error ? (
                <Result
                  status="error"
                  title="載入失敗"
                  subTitle={error}
                  extra={[
                    <Button type="primary" key="retry" onClick={() => loadImports()}>
                      重新載入
                    </Button>
                  ]}
                />
              ) : (
                <Table
                  columns={columns}
                  dataSource={imports}
                  rowKey="id"
                  loading={loading}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暫無進貨記錄"
                      />
                    )
                  }}
                  pagination={{
                    current: filters.page,
                    pageSize: filters.limit,
                    total: total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    responsive: true,
                    showTotal: (total, range) =>
                      `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
                    onChange: (page, limit) =>
                      setFilters(prev => ({ ...prev, page, limit })),
                    disabled: loading
                  }}
                  scroll={{ x: 'max-content' }}
                  size="small"
                />
              )}
            </TabPane>

            <TabPane tab={`待進貨採購單 (${pendingPurchases.length})`} key="2">
              <Alert
                message="轉進貨說明"
                description="從已確認的採購單創建進貨記錄，可上傳報單進行稅金計算"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Table
                dataSource={pendingPurchases}
                rowKey="id"
                size="small"
                columns={[
                  {
                    title: '採購單號',
                    dataIndex: 'purchaseNumber',
                    key: 'purchaseNumber'
                  },
                  {
                    title: '供應商',
                    dataIndex: 'supplier',
                    key: 'supplier'
                  },
                  {
                    title: '總金額',
                    key: 'amount',
                    render: (record: any) => (
                      <SecurePriceDisplay
                        amount={record.total_amount}
                        currency={record.currency}
                        allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
                        displayMultiplier={0.8}
                        showFallbackIcon={true}
                      />
                    )
                  },
                  {
                    title: '商品數',
                    key: 'itemCount',
                    render: (record: any) => `${record._count.items} 項`
                  },
                  {
                    title: '操作',
                    key: 'actions',
                    render: (record: any) => (
                      <HideFromInvestor>
                        <Button
                          type="primary"
                          size="small"
                          onClick={() => handleCreateFromPurchase(record.id)}
                        >
                          轉進貨
                        </Button>
                      </HideFromInvestor>
                    )
                  }
                ]}
                pagination={false}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Spin>

      {/* 查看進貨詳情Modal */}
      <Modal
        title="進貨詳情"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false)
          setSelectedImport(null)
        }}
        footer={null}
        width="90%"
        style={{ maxWidth: '1000px' }}
      >
        {selectedImport && (
          <div>
            {/* 進度步驟 */}
            <div style={{ marginBottom: '24px' }}>
              <Steps current={getStatusStep(selectedImport.status)}>
                <Step title="建立" description="創建進貨記錄" />
                <Step title="處理" description="上傳報單文件" />
                <Step title="通關" description="完成報關手續" />
                <Step title="收貨" description="商品入庫" />
                <Step title="完成" description="進貨完成" />
              </Steps>
            </div>

            {/* 基本資訊 */}
            <div style={{ marginBottom: '24px' }}>
              <h3>基本資訊</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div><strong>進貨單號：</strong>{selectedImport.importNumber}</div>
                <div><strong>來源採購單：</strong>{selectedImport.purchaseNumber}</div>
                <div><strong>供應商：</strong>{selectedImport.supplier}</div>
                <div><strong>總價值：</strong>
                  <SecurePriceDisplay
                    amount={selectedImport.totalValue}
                    currency={selectedImport.currency}
                    allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
                    displayMultiplier={0.8}
                    showFallbackIcon={true}
                  />
                </div>
                <div><strong>匯率：</strong>{selectedImport.exchangeRate}</div>
                <div><strong>狀態：</strong>
                  <Tag color={getStatusColor(selectedImport.status)} style={{ marginLeft: '8px' }}>
                    {getStatusName(selectedImport.status)}
                  </Tag>
                </div>
              </div>
            </div>

            {/* 稅費資訊 */}
            {selectedImport.totalTaxes > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3>稅費計算</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                  <div><strong>菸酒稅：</strong>NT$ {selectedImport.alcoholTax?.toLocaleString() || '0'}</div>
                  <div><strong>營業稅：</strong>NT$ {selectedImport.businessTax?.toLocaleString() || '0'}</div>
                  <div><strong>推廣費：</strong>NT$ {selectedImport.tradePromotionFee?.toLocaleString() || '0'}</div>
                  <div><strong>稅費總計：</strong>
                    <span style={{ color: '#fa541c', fontWeight: 'bold' }}>
                      NT$ {selectedImport.totalTaxes?.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 報單資訊 */}
            {(selectedImport.declarationNumber || selectedImport.declarationDate) && (
              <div style={{ marginBottom: '24px' }}>
                <h3>報單資訊</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><strong>報單號碼：</strong>{selectedImport.declarationNumber || '未填寫'}</div>
                  <div><strong>報關日期：</strong>
                    {selectedImport.declarationDate
                      ? dayjs(selectedImport.declarationDate).format('YYYY年MM月DD日')
                      : '未填寫'
                    }
                  </div>
                </div>
              </div>
            )}

            {/* 商品明細 */}
            <div>
              <h3>商品明細 ({selectedImport._count?.items || 0} 項)</h3>
              {selectedImport.items && selectedImport.items.length > 0 ? (
                <Table
                  size="small"
                  dataSource={selectedImport.items}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: '商品名稱',
                      dataIndex: 'product_name',
                      key: 'product_name',
                      width: 200
                    },
                    {
                      title: '數量',
                      dataIndex: 'quantity',
                      key: 'quantity',
                      width: 80,
                      align: 'center' as const
                    },
                    {
                      title: '酒精度',
                      dataIndex: 'alcoholPercentage',
                      key: 'alcoholPercentage',
                      width: 80,
                      align: 'center' as const,
                      render: (percentage: number) => `${percentage}%`
                    },
                    {
                      title: '容量(ml)',
                      dataIndex: 'volume',
                      key: 'volume',
                      width: 80,
                      align: 'center' as const
                    },
                    {
                      title: '完稅價格',
                      dataIndex: 'dutiableValue',
                      key: 'dutiableValue',
                      width: 100,
                      align: 'right' as const,
                      render: (value: number) => value ? `NT$ ${value.toLocaleString()}` : '-'
                    },
                    {
                      title: '菸酒稅',
                      dataIndex: 'alcoholTax',
                      key: 'alcoholTax',
                      width: 100,
                      align: 'right' as const,
                      render: (tax: number) => tax ? `NT$ ${tax.toLocaleString()}` : '-'
                    },
                    {
                      title: '營業稅',
                      dataIndex: 'businessTax',
                      key: 'businessTax',
                      width: 100,
                      align: 'right' as const,
                      render: (tax: number) => tax ? `NT$ ${tax.toLocaleString()}` : '-'
                    }
                  ]}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  暫無商品明細
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 報單上傳Modal */}
      <Modal
        title="上傳報單文件"
        open={declarationModalVisible}
        onCancel={() => {
          setDeclarationModalVisible(false)
          setSelectedImport(null)
        }}
        footer={null}
        width="80%"
        style={{ maxWidth: '800px' }}
      >
        {selectedImport && (
          <div>
            <Alert
              message="自動稅金計算"
              description={`上傳 ${selectedImport.importNumber} 的PDF報單，系統將自動識別商品資訊並計算相關稅費`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <CustomsDeclarationUpload
              onUploadComplete={handleDeclarationUploadComplete}
              disabled={false}
            />
          </div>
        )}
      </Modal>

      {/* 報單審核Modal */}
      <Modal
        title="報單內容審核"
        open={reviewModalVisible}
        onCancel={() => {
          setReviewModalVisible(false)
          setOcrResult(null)
          setSelectedImport(null)
        }}
        footer={null}
        width="95%"
        style={{ maxWidth: '1200px' }}
      >
        {ocrResult && (
          <CustomsDeclarationReview
            data={ocrResult}
            onConfirm={handleReviewConfirm}
            onCancel={handleReviewCancel}
            loading={false}
          />
        )}
      </Modal>

      {/* 編輯進貨單Modal */}
      <ImportEditModal
        visible={editModalVisible}
        importRecord={selectedImport}
        onCancel={() => {
          setEditModalVisible(false)
          setSelectedImport(null)
        }}
        onSuccess={() => {
          setEditModalVisible(false)
          setSelectedImport(null)
          loadImports()
        }}
      />
    </div>
  )
}
