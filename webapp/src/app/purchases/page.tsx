'use client'

import React, { useState, useEffect } from 'react'
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
  Popconfirm,
  Tooltip,
  DatePicker,
  InputNumber,
  Divider,
  Spin,
  Empty,
  Skeleton,
  Result
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import { HideFromInvestor, EmployeeAndAbove, SuperAdminOnly } from '@/components/auth/RoleGuard'
import { SecurePriceDisplay, InvestorHiddenPrice } from '@/components/common/SecurePriceDisplay'
import { CreatePurchaseRequest } from '@/types/room-2'

const { Search } = Input
const { Option } = Select
const { TextArea } = Input

interface Purchase {
  id: string
  purchaseNumber: string
  fundingSource: string
  supplier: string
  currency: string
  exchangeRate: number
  total_amount: number
  status: string
  declarationNumber?: string
  declarationDate?: string
  notes?: string
  created_at: string
  items: PurchaseItem[]
  _count: { items: number }
}

interface PurchaseItem {
  id: string
  productName: string
  quantity: number
  unit_price: number
  total_price: number
  dutiableValue?: number
  tariffCode?: string
  importDutyRate?: number
}

interface PurchaseFilters {
  page: number
  limit: number
  search: string
  status?: string
  fundingSource?: string
  orderBy: string
  order: string
}

/**
 * 🏭 Room-3: 採購管理頁面
 * 提供採購單列表、新增、編輯、確認功能
 */
export default function PurchasesPage() {
  const { data: session } = useSession()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<PurchaseFilters>({
    page: 1,
    limit: 20,
    search: '',
    orderBy: 'created_at',
    order: 'desc'
  })
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})
  const [error, setError] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  // Modal狀態
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // 載入採購單列表
  const loadPurchases = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value))
        }
      })

      const response = await fetch(`/api/purchases?${queryParams}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        setPurchases(result.data.purchases)
        setTotal(result.data.total)
        setError(null)
      } else {
        throw new Error(result.error || '載入失敗')
      }
    } catch (error) {
      console.error('載入採購單列表失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '載入採購單列表失敗'
      setError(errorMessage)

      // 只在首次載入時顯示錯誤訊息，避免干擾用戶操作
      if (initialLoading) {
        message.error(errorMessage)
      }
    } finally {
      setLoading(false)
      if (initialLoading) {
        setInitialLoading(false)
      }
    }
  }

  useEffect(() => {
    loadPurchases()
  }, [filters])

  // 狀態標籤顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'default'
      case 'PENDING': return 'orange'
      case 'CONFIRMED': return 'blue'
      case 'RECEIVED': return 'green'
      case 'COMPLETED': return 'purple'
      case 'CANCELLED': return 'red'
      default: return 'default'
    }
  }

  // 狀態顯示名稱
  const getStatusName = (status: string) => {
    const statusNames = {
      DRAFT: '草稿',
      PENDING: '待審',
      CONFIRMED: '已確認',
      RECEIVED: '已收貨',
      COMPLETED: '已完成',
      CANCELLED: '已取消'
    }
    return statusNames[status as keyof typeof statusNames] || status
  }

  // 資金來源顯示
  const getFundingSourceName = (fundingSource: string) => {
    return fundingSource === 'COMPANY' ? '公司資金' : '個人調貨'
  }

  // 表格欄位定義
  const columns = [
    {
      title: '採購單號',
      dataIndex: 'purchaseNumber',
      key: 'purchaseNumber',
      width: 150,
      render: (text: string, record: Purchase) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
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
      title: '資金來源',
      dataIndex: 'fundingSource',
      key: 'fundingSource',
      width: 100,
      render: (fundingSource: string) => (
        <Tag color={fundingSource === 'COMPANY' ? 'blue' : 'orange'}>
          {getFundingSourceName(fundingSource)}
        </Tag>
      ),
      filters: [
        { text: '公司資金', value: 'COMPANY' },
        { text: '個人調貨', value: 'PERSONAL' }
      ]
    },
    {
      title: '總金額',
      key: 'amount',
      width: 120,
      render: (record: Purchase) => (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold' }}>
            <SecurePriceDisplay
              amount={record.total_amount}
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
      title: '商品數',
      key: 'itemCount',
      width: 80,
      render: (record: Purchase) => (
        <div style={{ textAlign: 'center' }}>
          {record._count.items} 項
        </div>
      )
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusName(status)}
        </Tag>
      ),
      filters: [
        { text: '草稿', value: 'DRAFT' },
        { text: '待審', value: 'PENDING' },
        { text: '已確認', value: 'CONFIRMED' },
        { text: '已收貨', value: 'RECEIVED' },
        { text: '已完成', value: 'COMPLETED' }
      ]
    },
    {
      title: '報單資訊',
      key: 'declaration',
      width: 120,
      render: (record: Purchase) => (
        <div>
          {record.declarationNumber ? (
            <div>
              <div style={{ fontSize: '12px' }}>
                {record.declarationNumber}
              </div>
              {record.declarationDate && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {dayjs(record.declarationDate).format('YYYY/MM/DD')}
                </div>
              )}
            </div>
          ) : (
            <span style={{ color: '#ccc' }}>未填寫</span>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (record: Purchase) => (
        <Space>
          <Tooltip title="查看詳情">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>

          {/* 編輯按鈕 - 只有草稿和待審狀態可編輯，投資方隱藏 */}
          {['DRAFT', 'PENDING'].includes(record.status) && (
            <HideFromInvestor>
              <Tooltip title="編輯">
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => handleEdit(record)}
                />
              </Tooltip>
            </HideFromInvestor>
          )}

          {/* 確認按鈕 - 草稿和待審狀態可確認，投資方隱藏 */}
          {['DRAFT', 'PENDING'].includes(record.status) && (
            <HideFromInvestor>
              <Tooltip title="確認採購單">
                <Button
                  icon={<CheckOutlined />}
                  size="small"
                  type="primary"
                  loading={actionLoading[`confirm-${record.id}`]}
                  onClick={() => handleConfirm(record)}
                />
              </Tooltip>
            </HideFromInvestor>
          )}

          {/* 刪除按鈕 - 只有超級管理員可刪除草稿 */}
          {record.status === 'DRAFT' && (
            <SuperAdminOnly>
              <Popconfirm
                title="確定要刪除此採購單嗎？"
                description="刪除後將無法復原"
                onConfirm={() => handleDelete(record.id)}
                okText="確定"
                cancelText="取消"
                okButtonProps={{ loading: actionLoading[`delete-${record.id}`] }}
              >
                <Tooltip title="刪除">
                  <Button
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                    loading={actionLoading[`delete-${record.id}`]}
                  />
                </Tooltip>
              </Popconfirm>
            </SuperAdminOnly>
          )}
        </Space>
      )
    }
  ]

  // 處理查看詳情
  const handleView = (purchase: Purchase) => {
    setEditingPurchase(purchase)
    setViewModalVisible(true)
  }

  // 處理新增/編輯
  const handleEdit = (purchase?: Purchase) => {
    setEditingPurchase(purchase || null)
    if (purchase) {
      form.setFieldsValue({
        ...purchase,
        declarationDate: purchase.declarationDate ? dayjs(purchase.declarationDate) : null
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        currency: 'JPY',
        exchangeRate: 0.2,
        fundingSource: 'COMPANY'
      })
    }
    setModalVisible(true)
  }

  // 處理確認採購單
  const handleConfirm = async (purchase: Purchase) => {
    const actionKey = `confirm-${purchase.id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const response = await fetch(`/api/purchases/${purchase.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'confirm' })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success('採購單確認成功')
        await loadPurchases(false) // 重新載入但不顯示loading
      } else {
        message.error(result.error || '確認失敗')
      }
    } catch (error) {
      console.error('確認採購單失敗:', error)
      message.error('確認失敗，請檢查網路連線')
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  // 處理刪除
  const handleDelete = async (id: string) => {
    const actionKey = `delete-${id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const response = await fetch(`/api/purchases/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success('採購單已刪除')
        await loadPurchases(false) // 重新載入但不顯示loading
      } else {
        message.error(result.error || '刪除失敗')
      }
    } catch (error) {
      console.error('刪除採購單失敗:', error)
      message.error('刪除失敗，請檢查網路連線')
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  // 自定義驗證規則
  const validationRules = {
    supplier: [
      { required: true, message: '請輸入供應商名稱' },
      { min: 2, message: '供應商名稱至少需要2個字符' },
      { max: 100, message: '供應商名稱不能超過100個字符' },
      { pattern: /^[^<>"'&]*$/, message: '供應商名稱包含不允許的字符' }
    ],
    currency: [
      { required: true, message: '請選擇幣別' }
    ],
    exchangeRate: [
      { required: true, message: '請輸入匯率' },
      { type: 'number' as const, min: 0.001, message: '匯率必須大於0' },
      { type: 'number' as const, max: 1000, message: '匯率不能超過1000' }
    ],
    fundingSource: [
      { required: true, message: '請選擇資金來源' }
    ],
    declarationNumber: [
      { max: 50, message: '報單號碼不能超過50個字符' },
      { pattern: /^[A-Za-z0-9\-_]*$/, message: '報單號碼只能包含字母、數字、連字符和下劃線' }
    ],
    notes: [
      { max: 500, message: '備註不能超過500個字符' }
    ]
  }

  // 處理儲存
  const handleSave = async (values: CreatePurchaseRequest) => {
    setSubmitting(true)
    try {
      // 額外驗證
      const validationErrors = []

      // 檢查供應商名稱是否重複（如果是新增）
      if (!editingPurchase) {
        const duplicateSupplier = purchases.find(p =>
          p.supplier.toLowerCase() === values.supplier.toLowerCase() &&
          p.status === 'DRAFT'
        )
        if (duplicateSupplier) {
          validationErrors.push('該供應商已有未完成的草稿採購單，請先處理現有採購單')
        }
      }

      // 檢查報單號碼是否重複
      if (values.declaration_number) {
        const duplicateDeclaration = purchases.find(p =>
          p.declarationNumber === values.declaration_number &&
          p.id !== editingPurchase?.id
        )
        if (duplicateDeclaration) {
          validationErrors.push('報單號碼已存在，請使用不同的報單號碼')
        }
      }

      // 檢查報關日期不能早於今天太久
      if (values.declaration_date) {
        const daysDiff = dayjs().diff(dayjs(values.declaration_date), 'days')
        if (daysDiff > 365) {
          validationErrors.push('報關日期不能早於一年前')
        }
        if (daysDiff < -30) {
          validationErrors.push('報關日期不能超過未來30天')
        }
      }

      if (validationErrors.length > 0) {
        message.error(validationErrors[0])
        return
      }

      const url = editingPurchase
        ? `/api/purchases/${editingPurchase.id}`
        : '/api/purchases'

      const method = editingPurchase ? 'PUT' : 'POST'

      const requestData = {
        ...values,
        declaration_date: values.declaration_date,
        total_amount: 0, // 初始金額，後續添加商品時計算
        items: [] // 基礎版本暫時不處理採購明細
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success(editingPurchase ? '採購單更新成功' : '採購單創建成功')
        setModalVisible(false)
        setEditingPurchase(null)
        form.resetFields()
        await loadPurchases() // 等待重新載入完成
      } else {
        // 處理不同類型的錯誤
        if (response.status === 400) {
          message.error(`資料驗證失敗：${result.error || '請檢查輸入資料'}`)
        } else if (response.status === 401) {
          message.error('您沒有權限執行此操作')
        } else if (response.status === 403) {
          message.error('操作被拒絕，請檢查您的權限')
        } else if (response.status === 500) {
          message.error('伺服器錯誤，請稍後再試')
        } else {
          message.error(result.error || '操作失敗，請重試')
        }

        // 如果是特定欄位錯誤，嘗試設置欄位錯誤
        if (result.field) {
          form.setFields([{
            name: result.field,
            errors: [result.error]
          }])
        }
      }
    } catch (error) {
      console.error('儲存採購單失敗:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        message.error('網路連線錯誤，請檢查網路連線')
      } else {
        message.error('操作失敗，請重試')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <Spin spinning={initialLoading} tip="正在載入採購單資料...">
      <Card
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FileTextOutlined />
            <span style={{ fontSize: 'clamp(16px, 4vw, 20px)' }}>採購管理</span>
          </div>
        }
        extra={
          <Space>
            <Search
              placeholder="搜尋採購單號、供應商..."
              allowClear
              style={{ width: 250 }}
              loading={loading}
              onSearch={(value) => setFilters(prev => ({ ...prev, search: value, page: 1 }))}
              enterButton
            />
            <HideFromInvestor>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleEdit()}
              >
                新增採購單
              </Button>
            </HideFromInvestor>
          </Space>
        }
      >
        {error ? (
          <Result
            status="error"
            title="載入失敗"
            subTitle={error}
            extra={[
              <Button type="primary" key="retry" onClick={() => loadPurchases()}>
                重新載入
              </Button>
            ]}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={purchases}
            rowKey="id"
            loading={loading}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暫無採購單資料"
                >
                  <HideFromInvestor>
                    <Button type="primary" onClick={() => handleEdit()}>
                      新增第一筆採購單
                    </Button>
                  </HideFromInvestor>
                </Empty>
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
            scroll={{
              x: 'max-content'
            }}
            size="small"
          />
        )}
      </Card>
      </Spin>

      {/* 新增/編輯採購單Modal */}
      <Modal
        title={editingPurchase ? '編輯採購單' : '新增採購單'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingPurchase(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okButtonProps={{ loading: submitting }}
        cancelButtonProps={{ disabled: submitting }}
        width="90%"
        style={{
          maxWidth: '600px',
          width: '90vw'
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          validateTrigger={['onBlur', 'onChange']}
          scrollToFirstError
        >
          <Form.Item
            name="supplier"
            label="供應商"
            rules={validationRules.supplier}
            hasFeedback
          >
            <Input
              placeholder="請輸入供應商名稱"
              maxLength={100}
              showCount
              disabled={submitting}
            />
          </Form.Item>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <Form.Item
              name="currency"
              label="幣別"
              style={{ flex: 1 }}
              rules={validationRules.currency}
              hasFeedback
            >
              <Select
                placeholder="請選擇幣別"
                disabled={submitting}
                showSearch
                optionFilterProp="children"
              >
                <Option value="JPY">日圓 (JPY)</Option>
                <Option value="USD">美元 (USD)</Option>
                <Option value="EUR">歐元 (EUR)</Option>
                <Option value="GBP">英鎊 (GBP)</Option>
                <Option value="TWD">新台幣 (TWD)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="exchangeRate"
              label="匯率"
              style={{ flex: 1 }}
              rules={validationRules.exchangeRate}
              hasFeedback
              extra="請輸入相對於新台幣的匯率"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="請輸入匯率"
                step={0.001}
                min={0.001}
                max={1000}
                precision={3}
                disabled={submitting}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="fundingSource"
            label="資金來源"
            rules={validationRules.fundingSource}
            hasFeedback
            extra="個人調貨將影響庫存分配和成本計算"
          >
            <Select
              placeholder="請選擇資金來源"
              disabled={submitting}
            >
              <Option value="COMPANY">公司資金</Option>
              <Option value="PERSONAL">個人調貨</Option>
            </Select>
          </Form.Item>

          <Divider>報關資訊（選填）</Divider>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <Form.Item
              name="declarationNumber"
              label="報單號碼"
              style={{ flex: 1 }}
              rules={validationRules.declarationNumber}
              hasFeedback
            >
              <Input
                placeholder="請輸入報單號碼"
                maxLength={50}
                disabled={submitting}
              />
            </Form.Item>

            <Form.Item
              name="declarationDate"
              label="報關日期"
              style={{ flex: 1 }}
              dependencies={['declarationNumber']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (getFieldValue('declarationNumber') && !value) {
                      return Promise.reject(new Error('填寫報單號碼時必須選擇報關日期'))
                    }
                    return Promise.resolve()
                  },
                })
              ]}
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="請選擇報關日期"
                disabled={submitting}
                disabledDate={(current) => {
                  // 不能選擇未來超過30天或過去超過365天的日期
                  const today = dayjs()
                  return current && (
                    current.isAfter(today.add(30, 'days')) ||
                    current.isBefore(today.subtract(365, 'days'))
                  )
                }}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="notes"
            label="備註"
            rules={validationRules.notes}
          >
            <TextArea
              rows={3}
              placeholder="請輸入備註資訊"
              maxLength={500}
              showCount
              disabled={submitting}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看詳情Modal */}
      <Modal
        title="採購單詳情"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false)
          setEditingPurchase(null)
        }}
        footer={null}
        width="90%"
        style={{
          maxWidth: '800px',
          width: '90vw'
        }}
      >
        {editingPurchase && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h3>基本資訊</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><strong>採購單號：</strong>{editingPurchase.purchaseNumber}</div>
                <div><strong>狀態：</strong>
                  <Tag color={getStatusColor(editingPurchase.status)} style={{ marginLeft: '8px' }}>
                    {getStatusName(editingPurchase.status)}
                  </Tag>
                </div>
                <div><strong>供應商：</strong>{editingPurchase.supplier}</div>
                <div><strong>資金來源：</strong>
                  <Tag color={editingPurchase.fundingSource === 'COMPANY' ? 'blue' : 'orange'} style={{ marginLeft: '8px' }}>
                    {getFundingSourceName(editingPurchase.fundingSource)}
                  </Tag>
                </div>
                <div><strong>總金額：</strong>
                  <SecurePriceDisplay
                    amount={editingPurchase.total_amount}
                    currency={editingPurchase.currency}
                    allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
                    displayMultiplier={0.8}
                    showFallbackIcon={true}
                  />
                </div>
                <div><strong>匯率：</strong>{editingPurchase.exchangeRate}</div>
              </div>
            </div>

            {(editingPurchase.declarationNumber || editingPurchase.declarationDate) && (
              <div style={{ marginBottom: '24px' }}>
                <h3>報單資訊</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><strong>報單號碼：</strong>{editingPurchase.declarationNumber || '未填寫'}</div>
                  <div><strong>報關日期：</strong>
                    {editingPurchase.declarationDate
                      ? dayjs(editingPurchase.declarationDate).format('YYYY年MM月DD日')
                      : '未填寫'
                    }
                  </div>
                </div>
              </div>
            )}

            {editingPurchase.notes && (
              <div style={{ marginBottom: '24px' }}>
                <h3>備註</h3>
                <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                  {editingPurchase.notes}
                </div>
              </div>
            )}

            <div>
              <h3>採購明細 ({editingPurchase._count.items} 項)</h3>
              {editingPurchase.items.length > 0 ? (
                <Table
                  size="small"
                  dataSource={editingPurchase.items}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: '商品名稱',
                      dataIndex: 'productName',
                      key: 'productName'
                    },
                    {
                      title: '數量',
                      dataIndex: 'quantity',
                      key: 'quantity',
                      width: 80,
                      align: 'center'
                    },
                    {
                      title: '單價',
                      dataIndex: 'unit_price',
                      key: 'unit_price',
                      width: 100,
                      align: 'right',
                      render: (price: number) => price.toLocaleString()
                    },
                    {
                      title: '小計',
                      dataIndex: 'total_price',
                      key: 'total_price',
                      width: 100,
                      align: 'right',
                      render: (price: number) => price.toLocaleString()
                    }
                  ]}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  暫無採購明細
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}