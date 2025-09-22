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
import { SecurePriceDisplay, InvestorHiddenPrice } from '@/components/common/SecurePriceDisplay'
import { SaleOrderModal } from '@/components/sales/SaleOrderModal'
import { Sale, SaleItem } from '@/types/room-2'

const { Search } = Input


interface SaleFilters {
  page: number
  limit: number
  search: string
  status?: string
  fundingSource?: string
  customer_id?: string
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
    orderBy: 'created_at',
    order: 'desc'
  })
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})
  const [error, setError] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  // Modal狀態
  const [modalVisible, setModalVisible] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
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
  // 狀態標籤顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'default'
      case 'CONFIRMED': return 'blue'
      case 'SHIPPED': return 'orange'
      case 'DELIVERED': return 'green'
      case 'CANCELLED': return 'red'
      default: return 'default'
    }
  }

  // 狀態顯示名稱
  const getStatusName = (status: string) => {
    const statusNames = {
      DRAFT: '草稿',
      CONFIRMED: '已確認',
      SHIPPED: '已出貨',
      DELIVERED: '已送達',
      CANCELLED: '已取消'
    }
    return statusNames[status as keyof typeof statusNames] || status
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
      dataIndex: 'sale_number',
      key: 'saleNumber',
      width: 150,
      render: (text: string, record: Sale) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.sale_number}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {dayjs(record.created_at).format('YYYY/MM/DD')}
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
          <div style={{ fontWeight: 'bold' }}>{record.customer?.name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.customer?.customer_code}
          </div>
          {record.customer?.company && (
            <div style={{ fontSize: '12px', color: '#999' }}>
              {record.customer.company}
            </div>
          )}
        </div>
      )
    },
    {
      title: '資金來源',
      dataIndex: 'funding_source',
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
              amount={record.total_amount}
              currency="NT$"
              allowedRoles={['SUPER_ADMIN', 'EMPLOYEE', 'INVESTOR']}
              showFallbackIcon={false}
            />
          </div>

          {/* 實際金額（只有超級管理員和員工能看到） */}
          <HideFromInvestor>
            {record.actual_amount && record.actual_amount !== record.total_amount && (
              <div style={{ fontSize: '12px', color: '#52c41a' }}>
                實收: <SecurePriceDisplay
                  amount={record.actual_amount}
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
          {record.items?.length || 0} 項
        </div>
      )
    },
    {
      title: '狀態',
      key: 'status',
      width: 120,
      render: (record: Sale) => (
        <div>
          <Tag color={getStatusColor(record.status)}>
            {getStatusName(record.status)}
          </Tag>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            {record.is_paid ? '已付款' : '未付款'}
          </div>
        </div>
      )
    },
    {
      title: '到期日',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 100,
      render: (due_date: Date) => (
        <div>
          {due_date ? (
            <div style={{
              color: dayjs(due_date).isBefore(dayjs()) ? '#ff4d4f' : '#666'
            }}>
              {dayjs(due_date).format('YYYY/MM/DD')}
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

          {/* 編輯按鈕 - 只有草稿狀態可編輯，投資方隱藏 */}
          {record.status === 'DRAFT' && (
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

          {/* 確認按鈕 - 草稿狀態可確認，投資方隱藏 */}
          {record.status === 'DRAFT' && (
            <HideFromInvestor>
              <Tooltip title="確認銷售訂單">
                <Button
                  icon={<DollarOutlined />}
                  size="small"
                  type="primary"
                  loading={actionLoading[`confirm-${record.id}`]}
                  onClick={() => handleConfirm(record)}
                >
                  確認
                </Button>
              </Tooltip>
            </HideFromInvestor>
          )}

          {/* 付款按鈕 - 已確認且未付款時顯示 */}
          {record.status === 'CONFIRMED' && !record.is_paid && (
            <HideFromInvestor>
              <Tooltip title="標記為已付款">
                <Button
                  icon={<DollarOutlined />}
                  size="small"
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: 'white' }}
                  loading={actionLoading[`pay-${record.id}`]}
                  onClick={() => handleMarkPaid(record)}
                >
                  付款
                </Button>
              </Tooltip>
            </HideFromInvestor>
          )}

          {/* 出貨按鈕 - 已付款且尚未出貨時顯示 */}
          {record.is_paid && record.status === 'CONFIRMED' && (
            <HideFromInvestor>
              <Tooltip title="進行出貨作業">
                <Button
                  icon={<ShoppingCartOutlined />}
                  size="small"
                  type="default"
                  style={{ backgroundColor: '#ff7875', borderColor: '#ff7875', color: 'white' }}
                  loading={actionLoading[`ship-${record.id}`]}
                  onClick={() => handleShip(record)}
                >
                  出貨
                </Button>
              </Tooltip>
            </HideFromInvestor>
          )}

          {/* 刪除按鈕 - 只有超級管理員可刪除草稿訂單 */}
          {record.status === 'DRAFT' && (
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

          {/* 管理員取消/刪除 - Demo 快速處理誤觸 */}
          <SuperAdminOnly>
            <Tooltip title="管理員取消 (還原預留庫存)">
              <Button
                size="small"
                onClick={async () => {
                  const actionKey = `admin-cancel-${record.id}`
                  setActionLoading(prev => ({ ...prev, [actionKey]: true }))
                  try {
                    const res = await fetch(`/api/sales/${record.id}/admin-cancel`, { method: 'POST' })
                    const result = await res.json()
                    if (res.ok && result.success) {
                      message.success('已取消訂單並還原預留庫存')
                      await loadSales(false)
                    } else {
                      message.error(result.error || '取消失敗')
                    }
                  } catch (e) {
                    message.error('取消失敗，請稍後再試')
                  } finally {
                    setActionLoading(prev => ({ ...prev, [actionKey]: false }))
                  }
                }}
              >取消</Button>
            </Tooltip>
            <Tooltip title="管理員取消並刪除">
              <Button
                size="small"
                danger
                onClick={async () => {
                  const actionKey = `admin-delete-${record.id}`
                  setActionLoading(prev => ({ ...prev, [actionKey]: true }))
                  try {
                    const res = await fetch(`/api/sales/${record.id}/admin-cancel?delete=true`, { method: 'POST' })
                    const result = await res.json()
                    if (res.ok && result.success) {
                      message.success('已取消並刪除訂單')
                      await loadSales(false)
                    } else {
                      message.error(result.error || '刪除失敗')
                    }
                  } catch (e) {
                    message.error('刪除失敗，請稍後再試')
                  } finally {
                    setActionLoading(prev => ({ ...prev, [actionKey]: false }))
                  }
                }}
                style={{ marginLeft: 4 }}
              >刪</Button>
            </Tooltip>
          </SuperAdminOnly>
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
    setModalVisible(true)
  }


  // 處理確認銷售訂單
  const handleConfirm = async (sale: Sale) => {
    const actionKey = `confirm-${sale.id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const response = await fetch(`/api/sales/${sale.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success('銷售訂單確認成功，庫存已預留')
        await loadSales(false) // 重新載入但不顯示loading
      } else {
        message.error(result.error || '確認失敗')
      }
    } catch (error) {
      console.error('確認銷售訂單失敗:', error)
      message.error('確認失敗，請檢查網路連線')
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  // 處理表單提交 - 使用SaleOrderModal的資料格式
  const handleSubmit = async (data: any) => {
    setSubmitting(true)
    try {
      const url = editingSale ? `/api/sales/${editingSale.id}` : '/api/sales'
      const method = editingSale ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        message.success(editingSale ? '銷售訂單更新成功' : '銷售訂單創建成功')
        setModalVisible(false)
        setEditingSale(null)
        loadSales()
      } else {
        message.error(result.error || '操作失敗')
      }
    } catch (error) {
      console.error('提交錯誤:', error)
      message.error('操作失敗')
    } finally {
      setSubmitting(false)
    }
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
          is_paid: true,
          paid_at: new Date().toISOString()
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

  // 處理出貨作業
  const handleShip = async (sale: Sale) => {
    const actionKey = `ship-${sale.id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      // 簡化出貨：假設所有項目都全數出貨
      // 注意：這裡需要查詢銷售項目和對應的變體
      const saleDetailsResponse = await fetch(`/api/sales/${sale.id}`)
      const saleDetails = await saleDetailsResponse.json()

      if (!saleDetailsResponse.ok || !saleDetails.success) {
        throw new Error('無法獲取銷售訂單詳情')
      }

      // 構建出貨數據
      const shipmentData = {
        shipping_address: '客戶自取', // 預設出貨地址，後續可從客戶詳情API獲取
        shipping_method: 'DELIVERY',
        notes: '自動出貨',
        items: saleDetails.data.items?.map((item: any) => ({
          sale_item_id: item.id,
          ship_quantity: item.quantity,
          variant_id: item.variant_id || item.variantId
        })) || []
      }

      console.log('出貨數據:', shipmentData) // 調試輸出

      const response = await fetch(`/api/sales/${sale.id}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shipmentData)
      })

      const result = await response.json()
      console.log('出貨API回應:', result) // 調試輸出

      if (response.ok && result.success) {
        message.success('出貨成功，庫存已扣減')
        await loadSales(false) // 重新載入列表
      } else {
        console.error('出貨失敗:', result.error)
        message.error(result.error || '出貨失敗')
      }
    } catch (error) {
      console.error('出貨操作失敗:', error)
      message.error('出貨失敗，請檢查網路連線')
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
              <Button
                icon={<SearchOutlined />}
                onClick={() => {
                  loadSales()
                  message.success('已刷新銷售列表')
                }}
                style={{ flexShrink: 0 }}
                title="重新載入銷售列表"
              >
                刷新
              </Button>
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

      {/* 新增/編輯銷售訂單 Modal */}
      <SaleOrderModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingSale(null)
        }}
        onSubmit={handleSubmit}
        editingSale={editingSale || undefined}
        loading={submitting}
      />

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
        {editingSale && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h3>基本資訊</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><strong>銷售單號：</strong>{editingSale.sale_number}</div>
                <div><strong>狀態：</strong>
                  <Tag color={editingSale.status === 'CONFIRMED' ? 'blue' : editingSale.status === 'SHIPPED' ? 'green' : 'default'}>
                    {editingSale.status === 'DRAFT' ? '草稿' :
                     editingSale.status === 'CONFIRMED' ? '已確認' :
                     editingSale.status === 'SHIPPED' ? '已出貨' :
                     editingSale.status === 'DELIVERED' ? '已交付' : '已取消'}
                  </Tag>
                </div>
                <div><strong>客戶：</strong>{editingSale.customer?.name}</div>
                <div><strong>資金來源：</strong>
                  <Tag color={editingSale.funding_source === 'COMPANY' ? 'blue' : 'orange'}>
                    {editingSale.funding_source === 'COMPANY' ? '公司資金' : '個人調貨'}
                  </Tag>
                </div>
                <div><strong>付款狀況：</strong>
                  <Tag color={editingSale.is_paid ? 'green' : 'orange'}>
                    {editingSale.is_paid ? '已付款' : '未付款'}
                  </Tag>
                </div>
                <div><strong>建立時間：</strong>{dayjs(editingSale.created_at).format('YYYY/MM/DD HH:mm')}</div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3>金額資訊</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><strong>顯示總額：</strong>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                    ${editingSale.total_amount.toLocaleString()}
                  </span>
                </div>
                <HideFromInvestor>
                  {editingSale.actual_amount && editingSale.actual_amount !== editingSale.total_amount && (
                    <div><strong>實際收取：</strong>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                        ${editingSale.actual_amount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {editingSale.commission && editingSale.commission > 0 && (
                    <div><strong>抽成金額：</strong>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fa8c16' }}>
                        ${editingSale.commission.toLocaleString()}
                      </span>
                    </div>
                  )}
                </HideFromInvestor>
              </div>
            </div>

            {editingSale.notes && (
              <div style={{ marginBottom: '24px' }}>
                <h3>備註</h3>
                <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                  {editingSale.notes}
                </div>
              </div>
            )}

            <div>
              <h3>銷售明細 ({editingSale.items?.length || 0} 項)</h3>
              {editingSale.items && editingSale.items.length > 0 ? (
                <Table
                  size="small"
                  dataSource={editingSale.items}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: '商品',
                      key: 'product',
                      width: 200,
                      render: (record: SaleItem) => (
                        <div>
                          <div style={{ fontWeight: 'bold' }}>
                            {record.product?.name_zh || '未知商品'}
                          </div>
                          {record.product?.product_code && (
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              {record.product.product_code}
                            </div>
                          )}
                          {record.variant?.variant_code && (
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              變體: {record.variant.variant_code}
                            </div>
                          )}
                        </div>
                      )
                    },
                    {
                      title: '數量',
                      dataIndex: 'quantity',
                      key: 'quantity',
                      width: 80,
                      align: 'center' as const
                    },
                    {
                      title: '單價',
                      key: 'unit_price',
                      width: 120,
                      align: 'right' as const,
                      render: (record: SaleItem) => (
                        <div>
                          <div style={{ fontWeight: 'bold' }}>
                            ${record.unit_price.toLocaleString()}
                          </div>
                          <HideFromInvestor>
                            {record.actual_unit_price && record.actual_unit_price !== record.unit_price && (
                              <div style={{ fontSize: '12px', color: '#52c41a' }}>
                                實收: ${record.actual_unit_price.toLocaleString()}
                              </div>
                            )}
                          </HideFromInvestor>
                        </div>
                      )
                    },
                    {
                      title: '小計',
                      key: 'total_price',
                      width: 120,
                      align: 'right' as const,
                      render: (record: SaleItem) => (
                        <div>
                          <div style={{ fontWeight: 'bold' }}>
                            ${record.total_price.toLocaleString()}
                          </div>
                          <HideFromInvestor>
                            {record.actual_total_price && record.actual_total_price !== record.total_price && (
                              <div style={{ fontSize: '12px', color: '#52c41a' }}>
                                實收: ${record.actual_total_price.toLocaleString()}
                              </div>
                            )}
                          </HideFromInvestor>
                        </div>
                      )
                    }
                  ]}
                  scroll={{ x: 'max-content' }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  暫無銷售明細
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
