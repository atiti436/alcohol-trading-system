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
  DollarOutlined,
  FileTextOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import { HideFromInvestor, EmployeeAndAbove, SuperAdminOnly } from '@/components/auth/RoleGuard'
import { SecurePriceDisplay, InvestorHiddenPrice } from '@/components/ui/SecurePriceDisplay'

const { Search } = Input
const { Option } = Select
const { TextArea } = Input

interface Sale {
  id: string
  saleNumber: string
  customerId: string
  customer: {
    id: string
    customer_code: string
    name: string
    company?: string
    tier: string
    paymentTerms: string
  }
  totalAmount: number
  actualAmount?: number
  commission?: number
  fundingSource: string
  paymentTerms: string
  isPaid: boolean
  paidAt?: string
  dueDate?: string
  notes?: string
  createdBy: string
  createdAt: string
  creator?: {
    id: string
    name: string
    email: string
  }
  items: SaleItem[]
  _count: { items: number }
}

interface SaleItem {
  id: string
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  actualUnitPrice?: number
  totalPrice: number
  actualTotalPrice?: number
  isPersonalPurchase?: boolean
  product: {
    id: string
    product_code: string
    name: string
    category: string
  }
  variant?: {
    id: string
    variant_code: string
    variantType: string
    description: string
  }
}

interface SaleFilters {
  page: number
  limit: number
  search: string
  status?: string
  fundingSource?: string
  customerId?: string
  orderBy: string
  order: string
}

/**
 * 💰 Room-4: 銷售管理頁面
 * 核心功能：銷售訂單管理 + 雙重價格顯示
 */
export default function SalesPage() {
  const { data: session } = useSession()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<SaleFilters>({
    page: 1,
    limit: 20,
    search: '',
    orderBy: 'createdAt',
    order: 'desc'
  })
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})
  const [error, setError] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  // Modal狀態
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // 載入銷售訂單列表
  const loadSales = async (showLoading = true) => {
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

      const response = await fetch(`/api/sales?${queryParams}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        setSales(result.data.sales)
        setTotal(result.data.total)
        setError(null)
      } else {
        throw new Error(result.error || '載入失敗')
      }
    } catch (error) {
      console.error('載入銷售訂單列表失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '載入銷售訂單列表失敗'
      setError(errorMessage)

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
    loadSales()
  }, [filters])

  // 獲取狀態顏色（基於付款狀態）
  const getStatusColor = (sale: Sale) => {
    if (sale.isPaid) return 'green'
    if (sale.dueDate && dayjs(sale.dueDate).isBefore(dayjs())) return 'red'
    return 'orange'
  }

  // 獲取狀態名稱
  const getStatusName = (sale: Sale) => {
    if (sale.isPaid) return '已付款'
    if (sale.dueDate && dayjs(sale.dueDate).isBefore(dayjs())) return '逾期未付'
    return '待付款'
  }

  // 資金來源顯示
  const getFundingSourceName = (fundingSource: string) => {
    return fundingSource === 'COMPANY' ? '公司資金' : '個人調貨'
  }

  // 付款條件顯示
  const getPaymentTermsName = (terms: string) => {
    const termsMap = {
      CASH: '現金',
      WEEKLY: '週結',
      MONTHLY: '月結',
      SIXTY_DAYS: '60天'
    }
    return termsMap[terms as keyof typeof termsMap] || terms
  }

  // 表格欄位定義
  const columns = [
    {
      title: '銷售單號',
      dataIndex: 'saleNumber',
      key: 'saleNumber',
      width: 150,
      render: (text: string, record: Sale) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {dayjs(record.createdAt).format('YYYY/MM/DD')}
          </div>
        </div>
      )
    },
    {
      title: '客戶',
      key: 'customer',
      width: 180,
      render: (record: Sale) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.customer.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.customer.customer_code}
          </div>
          {record.customer.company && (
            <div style={{ fontSize: '12px', color: '#999' }}>
              {record.customer.company}
            </div>
          )}
        </div>
      )
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
      title: '金額',
      key: 'amount',
      width: 150,
      render: (record: Sale) => (
        <div style={{ textAlign: 'right' }}>
          {/* 顯示金額（投資方看到的） */}
          <div style={{ fontWeight: 'bold' }}>
            <SecurePriceDisplay
              amount={record.totalAmount}
              currency="NT$"
              allowedRoles={['SUPER_ADMIN', 'EMPLOYEE', 'INVESTOR']}
              showFallbackIcon={false}
            />
          </div>

          {/* 實際金額（只有超級管理員和員工能看到） */}
          <HideFromInvestor>
            {record.actualAmount && record.actualAmount !== record.totalAmount && (
              <div style={{ fontSize: '12px', color: '#52c41a' }}>
                實收: <SecurePriceDisplay
                  amount={record.actualAmount}
                  currency="NT$"
                  allowedRoles={['SUPER_ADMIN', 'EMPLOYEE']}
                  showFallbackIcon={false}
                />
              </div>
            )}
            {record.commission && record.commission > 0 && (
              <div style={{ fontSize: '12px', color: '#1890ff' }}>
                傭金: <SecurePriceDisplay
                  amount={record.commission}
                  currency="NT$"
                  allowedRoles={['SUPER_ADMIN']}
                  showFallbackIcon={false}
                />
              </div>
            )}
          </HideFromInvestor>
        </div>
      )
    },
    {
      title: '商品數',
      key: 'itemCount',
      width: 80,
      render: (record: Sale) => (
        <div style={{ textAlign: 'center' }}>
          {record._count.items} 項
        </div>
      )
    },
    {
      title: '狀態',
      key: 'status',
      width: 100,
      render: (record: Sale) => (
        <div>
          <Tag color={getStatusColor(record)}>
            {getStatusName(record)}
          </Tag>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            {getPaymentTermsName(record.paymentTerms)}
          </div>
        </div>
      )
    },
    {
      title: '到期日',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 100,
      render: (dueDate: string) => (
        <div>
          {dueDate ? (
            <div style={{
              color: dayjs(dueDate).isBefore(dayjs()) ? '#ff4d4f' : '#666'
            }}>
              {dayjs(dueDate).format('YYYY/MM/DD')}
            </div>
          ) : (
            <span style={{ color: '#ccc' }}>無設定</span>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (record: Sale) => (
        <Space>
          <Tooltip title="查看詳情">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>

          {/* 編輯按鈕 - 投資方隱藏 */}
          <HideFromInvestor>
            <Tooltip title="編輯">
              <Button
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
          </HideFromInvestor>

          {/* 付款按鈕 - 未付款時顯示 */}
          {!record.isPaid && (
            <HideFromInvestor>
              <Tooltip title="標記為已付款">
                <Button
                  icon={<DollarOutlined />}
                  size="small"
                  type="primary"
                  loading={actionLoading[`pay-${record.id}`]}
                  onClick={() => handleMarkPaid(record)}
                />
              </Tooltip>
            </HideFromInvestor>
          )}

          {/* 刪除按鈕 - 只有超級管理員可刪除未付款訂單 */}
          {!record.isPaid && (
            <SuperAdminOnly>
              <Popconfirm
                title="確定要刪除此銷售訂單嗎？"
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
  const handleView = (sale: Sale) => {
    setEditingSale(sale)
    setViewModalVisible(true)
  }

  // 處理新增/編輯
  const handleEdit = (sale?: Sale) => {
    setEditingSale(sale || null)
    if (sale) {
      form.setFieldsValue({
        ...sale,
        dueDate: sale.dueDate ? dayjs(sale.dueDate) : null
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        fundingSource: 'COMPANY',
        paymentTerms: 'CASH'
      })
    }
    setModalVisible(true)
  }

  // 處理標記已付款
  const handleMarkPaid = async (sale: Sale) => {
    const actionKey = `pay-${sale.id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const response = await fetch(`/api/sales/${sale.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isPaid: true,
          paidAt: new Date().toISOString()
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success('已標記為付款')
        await loadSales(false)
      } else {
        message.error(result.error || '操作失敗')
      }
    } catch (error) {
      console.error('標記付款失敗:', error)
      message.error('操作失敗，請檢查網路連線')
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  // 處理刪除
  const handleDelete = async (id: string) => {
    const actionKey = `delete-${id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const response = await fetch(`/api/sales/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success('銷售訂單已刪除')
        await loadSales(false)
      } else {
        message.error(result.error || '刪除失敗')
      }
    } catch (error) {
      console.error('刪除銷售訂單失敗:', error)
      message.error('刪除失敗，請檢查網路連線')
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  return (
    <div style={{
      padding: '24px',
      minHeight: '100vh'
    }}>
      <Spin spinning={initialLoading} tip="正在載入銷售訂單資料...">
        <Card
          title={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShoppingCartOutlined />
              <span style={{ fontSize: 'clamp(16px, 4vw, 20px)' }}>銷售管理</span>
            </div>
          }
          extra={
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Search
                placeholder="搜尋銷售單號、客戶..."
                allowClear
                style={{
                  flex: '1 1 auto',
                  minWidth: '200px',
                  maxWidth: '300px'
                }}
                loading={loading}
                onSearch={(value) => setFilters(prev => ({ ...prev, search: value, page: 1 }))}
                enterButton
              />
              <HideFromInvestor>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleEdit()}
                  style={{ flexShrink: 0 }}
                >
                  新增銷售訂單
                </Button>
              </HideFromInvestor>
            </div>
          }
        >
          {error ? (
            <Result
              status="error"
              title="載入失敗"
              subTitle={error}
              extra={[
                <Button type="primary" key="retry" onClick={() => loadSales()}>
                  重新載入
                </Button>
              ]}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={sales}
              rowKey="id"
              loading={{
                spinning: loading,
                indicator: (
                  <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Skeleton active paragraph={{ rows: 4 }} />
                    <Skeleton active paragraph={{ rows: 4 }} />
                    <Skeleton active paragraph={{ rows: 4 }} />
                  </div>
                )
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暫無銷售訂單資料"
                  >
                    <HideFromInvestor>
                      <Button type="primary" onClick={() => handleEdit()}>
                        新增第一筆銷售訂單
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

      {/* 查看詳情Modal - 將在下一步實作 */}
      <Modal
        title="銷售訂單詳情"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false)
          setEditingSale(null)
        }}
        footer={null}
        width="90%"
        style={{
          maxWidth: '800px',
          width: '90vw'
        }}
      >
        {/* 詳情內容將在下一步實作 */}
        {editingSale && (
          <div>銷售訂單: {editingSale.saleNumber}</div>
        )}
      </Modal>
    </div>
  )
}