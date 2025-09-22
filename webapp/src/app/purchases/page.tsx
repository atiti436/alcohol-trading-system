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
  FileTextOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import { HideFromInvestor, EmployeeAndAbove, SuperAdminOnly } from '@/components/auth/RoleGuard'
import { SecurePriceDisplay, InvestorHiddenPrice } from '@/components/common/SecurePriceDisplay'
import { CreatePurchaseRequest } from '@/types/room-2'
import { PurchaseOrderModal } from '@/components/purchases/PurchaseOrderModal'

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
  product_name: string
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

          {/* 收貨按鈕 - 已確認狀態可收貨，投資方隱藏 */}
          {record.status === 'CONFIRMED' && (
            <HideFromInvestor>
              <Tooltip title="進行收貨作業">
                <Button
                  icon={<ShoppingCartOutlined />}
                  size="small"
                  type="default"
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', color: 'white' }}
                  loading={actionLoading[`receive-${record.id}`]}
                  onClick={() => handleReceive(record)}
                />
              </Tooltip>
            </HideFromInvestor>
          )}

          {/* 撤銷收貨按鈕 - 已收貨狀態可撤銷收貨 */}
          {record.status === 'RECEIVED' && (
            <SuperAdminOnly>
              <Popconfirm
                title="確定要撤銷此採購單的收貨嗎？"
                description="將還原庫存並將狀態改回已確認"
                onConfirm={() => handleUndoReceive(record)}
                okText="確定"
                cancelText="取消"
                okButtonProps={{ loading: actionLoading[`undo-receive-${record.id}`] }}
              >
                <Tooltip title="撤銷收貨">
                  <Button
                    icon={<DeleteOutlined />}
                    size="small"
                    style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16', color: 'white' }}
                    loading={actionLoading[`undo-receive-${record.id}`]}
                  />
                </Tooltip>
              </Popconfirm>
            </SuperAdminOnly>
          )}

          {/* 刪除按鈕 - 只有超級管理員可刪除草稿或已確認 */}
          {['DRAFT', 'CONFIRMED'].includes(record.status) && (
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

  // 處理收貨作業
  const handleReceive = async (purchase: Purchase) => {
    const actionKey = `receive-${purchase.id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      // 簡化收貨：假設全部數量都正常收到，沒有損耗
      const receiveData = {
        actual_quantity: purchase.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        exchange_rate: purchase.exchangeRate || 1.0,
        loss_type: 'NONE',
        loss_quantity: 0,
        inspection_fee: 0,
        allocation_method: 'BY_AMOUNT',
        additional_costs: []
      }

      console.log('收貨數據:', receiveData) // 調試輸出

      const response = await fetch(`/api/purchases/${purchase.id}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(receiveData)
      })

      const result = await response.json()
      console.log('收貨API回應:', result) // 調試輸出

      if (response.ok && result.success) {
        message.success('收貨成功，庫存已更新')
        await loadPurchases(false) // 重新載入列表
      } else {
        console.error('收貨失敗:', result.error)
        message.error(result.error?.message || result.error || '收貨失敗')
      }
    } catch (error) {
      console.error('收貨操作失敗:', error)
      message.error('收貨失敗，請檢查網路連線')
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  // 處理撤銷收貨
  const handleUndoReceive = async (purchase: Purchase) => {
    const actionKey = `undo-receive-${purchase.id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const response = await fetch(`/api/purchases/${purchase.id}/undo-receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success('已撤銷收貨，庫存已還原')
        await loadPurchases(false) // 重新載入列表
      } else {
        message.error(result.error || '撤銷收貨失敗')
      }
    } catch (error) {
      console.error('撤銷收貨失敗:', error)
      message.error('撤銷收貨失敗，請檢查網路連線')
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


  // 處理儲存
  const handleSave = async (values: CreatePurchaseRequest) => {
    setSubmitting(true)
    try {
      const url = editingPurchase
        ? `/api/purchases/${editingPurchase.id}`
        : '/api/purchases'

      const method = editingPurchase ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success(editingPurchase ? '採購單更新成功' : '採購單創建成功')
        setModalVisible(false)
        setEditingPurchase(null)
        await loadPurchases()
      } else {
        message.error(result.error || '操作失敗，請重試')
      }
    } catch (error) {
      console.error('儲存採購單失敗:', error)
      message.error('操作失敗，請重試')
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
      <PurchaseOrderModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingPurchase(null)
        }}
        onSubmit={handleSave}
        editingPurchase={editingPurchase}
        loading={submitting}
      />

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
                      dataIndex: 'product_name',
                      key: 'product_name',
                      width: 200,
                      render: (text: string, record: PurchaseItem) => (
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{text}</div>
                          {record.tariffCode && (
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              稅則：{record.tariffCode}
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
                      title: '外幣單價',
                      dataIndex: 'unit_price',
                      key: 'unit_price',
                      width: 100,
                      align: 'right' as const,
                      render: (price: number) => price.toLocaleString()
                    },
                    {
                      title: '外幣小計',
                      dataIndex: 'total_price',
                      key: 'total_price',
                      width: 100,
                      align: 'right' as const,
                      render: (price: number) => price.toLocaleString()
                    },
                    {
                      title: '完稅價格',
                      dataIndex: 'dutiableValue',
                      key: 'dutiableValue',
                      width: 100,
                      align: 'right' as const,
                      render: (value: number) => value ? `$${value.toLocaleString()}` : '-'
                    },
                    {
                      title: '進口稅率',
                      dataIndex: 'importDutyRate',
                      key: 'importDutyRate',
                      width: 80,
                      align: 'center' as const,
                      render: (rate: number) => rate ? `${rate}%` : '-'
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