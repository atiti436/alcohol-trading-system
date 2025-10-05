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
  Popconfirm,
  Tooltip,
  Divider,
  Spin,
  Empty,
  Skeleton,
  Result,
  Dropdown,
  Typography,
  Row,
  Col,
  Alert
} from 'antd'
import type { ColumnType } from 'antd/es/table'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DollarOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  DownOutlined,
  PrinterOutlined,
  MoreOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import { HideFromInvestor, EmployeeAndAbove, SuperAdminOnly } from '@/components/auth/RoleGuard'
import { SecurePriceDisplay, InvestorHiddenPrice } from '@/components/common/SecurePriceDisplay'
import { PrintableDocument } from '@/components/common/PrintableDocument'
import { DocumentFooter } from '@/components/common/DocumentFooter'
import { SaleOrderModal } from '@/components/sales/SaleOrderModal'
import { ShipModal, ShipFormData } from '@/components/sales/ShipModal'
import { Sale, SaleItem } from '@/types/room-2'
import { DOCUMENT_TYPES } from '@/config/company'

// 顯示於出貨明細表格的列型別（在 SaleItem 基礎上加入 shipped_quantity）
type ShippingItemRow = SaleItem & {
  shipped_quantity?: number
  unit_price: number
  quantity: number
}

const { Search } = Input
const { Option } = Select
const { Title, Text } = Typography


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
  const [isPreorderMode, setIsPreorderMode] = useState(false)
  const [convertModalVisible, setConvertModalVisible] = useState(false)
  const [converting, setConverting] = useState(false)
  const [shipModalVisible, setShipModalVisible] = useState(false)
  const [shippingSale, setShippingSale] = useState<Sale | null>(null)
  const [shipping, setShipping] = useState(false)

  // 出貨列印相關狀態
  const [shippingPrintVisible, setShippingPrintVisible] = useState(false)
  const [currentShippingData, setCurrentShippingData] = useState<any>(null)

  // 載入銷售訂單列表
  const loadSales = useCallback(async (showLoading = true) => {
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
  }, [filters, initialLoading])

  useEffect(() => {
    loadSales()
  }, [filters, loadSales])

  // 獲取狀態顏色（基於付款狀態）
  // 狀態標籤顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'default'
      case 'PREORDER': return 'purple'
      case 'CONFIRMED': return 'blue'
      case 'PARTIALLY_CONFIRMED': return 'cyan'
      case 'BACKORDER': return 'orange'
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
      PREORDER: '預購中',
      CONFIRMED: '已確認',
      PARTIALLY_CONFIRMED: '部分確認',
      BACKORDER: '缺貨補單',
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
  const columns: ColumnType<Sale>[] = [
    {
      title: '銷售單號',
      dataIndex: 'sale_number',
      key: 'saleNumber',
      width: 180,
      render: (text: string, record: Sale) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {record.sale_number}
            {record.is_preorder && (
              <Tag color="purple" style={{ marginLeft: 8 }}>預購</Tag>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {dayjs(record.created_at).format('YYYY/MM/DD')}
          </div>
          {record.is_preorder && record.expected_arrival_date && (
            <div style={{ fontSize: '11px', color: '#722ed1' }}>
              預計到貨: {dayjs(record.expected_arrival_date).format('MM/DD')}
            </div>
          )}
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
      )
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
      width: 280,
      render: (record: Sale) => {
        // 智能化操作按鈕邏輯
        const renderActions = () => {
          const actions = []

          // 查看按鈕 - 永遠顯示
          actions.push(
            <Tooltip title="查看詳情" key="view">
              <Button
                icon={<EyeOutlined />}
                size="small"
                onClick={() => handleView(record)}
              />
            </Tooltip>
          )

          // 根據狀態顯示主要操作
          if (record.status === 'DRAFT') {
            // 草稿狀態：編輯 + 確認
            actions.push(
              <HideFromInvestor key="edit">
                <Tooltip title="編輯">
                  <Button
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => handleEdit(record)}
                  />
                </Tooltip>
              </HideFromInvestor>
            )
            actions.push(
              <HideFromInvestor key="confirm">
                <Button
                  icon={<DollarOutlined />}
                  size="small"
                  type="primary"
                  loading={actionLoading[`confirm-${record.id}`]}
                  onClick={() => handleConfirm(record)}
                >
                  確認
                </Button>
              </HideFromInvestor>
            )
          } else if (record.status === 'CONFIRMED' || record.status === 'SHIPPED') {
            // 已確認狀態：付款 + 出貨操作

            // 付款按鈕 - 非週結且未付款才顯示
            if (!record.is_paid && record.customer?.payment_terms !== 'WEEKLY') {
              actions.push(
                <HideFromInvestor key="pay">
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
              )
            }

            // 出貨下拉選單 - 已確認就可以出貨(不限制付款狀態)
            const shippingMenuItems = [
              {
                key: 'ship-only',
                label: '僅出貨',
                icon: <TruckOutlined />,
                onClick: () => handleShipOnly(record)
              },
              {
                key: 'ship-print',
                label: '出貨並列印',
                icon: <PrinterOutlined />,
                onClick: () => handleShipAndPrint(record)
              }
            ]

            // 如果已經出貨過，增加重新列印選項
            if (record.status === 'SHIPPED') {
              shippingMenuItems.push({
                key: 'reprint',
                label: '重新列印出貨單',
                icon: <PrinterOutlined />,
                onClick: () => handleReprintShipping(record)
              })
            }

            actions.push(
              <HideFromInvestor key="shipping">
                <Dropdown menu={{ items: shippingMenuItems }} trigger={['click']}>
                  <Button
                    icon={<TruckOutlined />}
                    size="small"
                    type={record.status === 'SHIPPED' ? 'default' : 'primary'}
                    loading={actionLoading[`ship-${record.id}`]}
                  >
                    {record.status === 'SHIPPED' ? '已出貨' : '出貨'} <DownOutlined />
                  </Button>
                </Dropdown>
              </HideFromInvestor>
            )
          }

          // 管理員額外操作 - 放在更多選單中
          const adminMenuItems = []

          if (record.status === 'DRAFT') {
            adminMenuItems.push({
              key: 'delete',
              label: '刪除',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => handleDelete(record.id)
            })
          }

          adminMenuItems.push(
            {
              key: 'admin-cancel',
              label: '管理員取消',
              onClick: async () => {
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
              }
            },
            {
              key: 'admin-delete',
              label: '管理員刪除',
              danger: true,
              onClick: async () => {
                const actionKey = `admin-delete-${record.id}`
                setActionLoading(prev => ({ ...prev, [actionKey]: true }))
                try {
                  const res = await fetch(`/api/sales/${record.id}`, { method: 'DELETE' })
                  const result = await res.json()
                  if (res.ok && result.success) {
                    message.success('訂單已刪除')
                    await loadSales(false)
                  } else {
                    message.error(result.error || '刪除失敗')
                  }
                } catch (e) {
                  message.error('刪除失敗，請稍後再試')
                } finally {
                  setActionLoading(prev => ({ ...prev, [actionKey]: false }))
                }
              }
            }
          )

          // 管理員更多操作
          if (adminMenuItems.length > 0) {
            actions.push(
              <SuperAdminOnly key="admin-more">
                <Dropdown menu={{ items: adminMenuItems }} trigger={['click']}>
                  <Button icon={<MoreOutlined />} size="small" />
                </Dropdown>
              </SuperAdminOnly>
            )
          }

          return actions
        }

        return <Space size="small">{renderActions()}</Space>
      }
    }
  ]

  // 處理查看詳情
  const handleView = (sale: Sale) => {
    setEditingSale(sale)
    setViewModalVisible(true)
  }

  // 處理新增/編輯
  const handleEdit = (sale?: Sale, preorder = false) => {
    setEditingSale(sale || null)
    setIsPreorderMode(preorder)
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

  // 處理僅出貨
  // 打開出貨對話框
  const handleShipOnly = (sale: Sale) => {
    setShippingSale(sale)
    setShipModalVisible(true)
  }

  // 出貨提交處理
  const handleShipSubmit = async (data: ShipFormData) => {
    if (!shippingSale) return

    setShipping(true)
    try {
      const response = await fetch(`/api/sales/${shippingSale.id}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          print: false
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success('出貨完成')
        setShipModalVisible(false)
        setShippingSale(null)
        await loadSales(false)
      } else {
        message.error(result.error || '出貨失敗')
      }
    } catch (error) {
      console.error('出貨操作失敗:', error)
      message.error('出貨失敗，請檢查網路連線')
    } finally {
      setShipping(false)
    }
  }

  // 處理出貨並列印
  const handleShipAndPrint = async (sale: Sale) => {
    const actionKey = `ship-print-${sale.id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const response = await fetch(`/api/sales/${sale.id}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ print: true })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success('出貨完成，出貨單已生成')
        setCurrentShippingData(result.shippingData)
        setShippingPrintVisible(true)
        await loadSales(false)
      } else {
        message.error(result.error || '出貨失敗')
      }
    } catch (error) {
      console.error('出貨操作失敗:', error)
      message.error('出貨失敗，請檢查網路連線')
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  // 處理重新列印出貨單
  const handleReprintShipping = async (sale: Sale) => {
    const actionKey = `reprint-${sale.id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const response = await fetch(`/api/sales/${sale.id}/shipping-slip`)
      const result = await response.json()

      if (response.ok && result.success) {
        setCurrentShippingData(result.shippingData)
        setShippingPrintVisible(true)
        message.success('出貨單已重新生成')
      } else {
        message.error(result.error || '獲取出貨單失敗')
      }
    } catch (error) {
      console.error('重新列印出貨單失敗:', error)
      message.error('獲取出貨單失敗，請檢查網路連線')
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

  // 處理預購單轉換
  const handleConvertToConfirmed = async () => {
    if (!editingSale) return

    setConverting(true)
    try {
      const response = await fetch(`/api/sales/${editingSale.id}/convert-to-confirmed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success(result.message || '預購單已成功轉換為正式訂單')
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach((warning: string) => message.warning(warning))
        }
        setConvertModalVisible(false)
        setViewModalVisible(false)
        await loadSales(false)
      } else {
        message.error(result.error || '轉換失敗')
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach((detail: string) => message.error(detail, 5))
        }
      }
    } catch (error) {
      console.error('預購單轉換失敗:', error)
      message.error('轉換失敗，請檢查網路連線')
    } finally {
      setConverting(false)
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
              <Space wrap>
                <Search
                  placeholder="搜尋銷售單號、客戶..."
                  allowClear
                  style={{
                    minWidth: '200px',
                    maxWidth: '300px'
                  }}
                  loading={loading}
                  onSearch={(value) => setFilters(prev => ({ ...prev, search: value, page: 1 }))}
                  enterButton
                />
                <Select
                  placeholder="篩選狀態"
                  allowClear
                  style={{ minWidth: 120 }}
                  value={filters.status}
                  onChange={(value) => setFilters(prev => ({ ...prev, status: value, page: 1 }))}
                >
                  <Option value="DRAFT">草稿</Option>
                  <Option value="PREORDER">預購中</Option>
                  <Option value="CONFIRMED">已確認</Option>
                  <Option value="PARTIALLY_CONFIRMED">部分確認</Option>
                  <Option value="BACKORDER">缺貨補單</Option>
                  <Option value="SHIPPED">已出貨</Option>
                  <Option value="DELIVERED">已送達</Option>
                  <Option value="CANCELLED">已取消</Option>
                </Select>
              </Space>
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
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'normal',
                        label: '一般銷售',
                        icon: <ShoppingCartOutlined />,
                        onClick: () => handleEdit(undefined, false)
                      },
                      {
                        key: 'preorder',
                        label: '預購單（未到貨）',
                        icon: <CalendarOutlined />,
                        onClick: () => handleEdit(undefined, true)
                      }
                    ]
                  }}
                  trigger={['click']}
                >
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ flexShrink: 0 }}
                  >
                    新增銷售訂單 <DownOutlined />
                  </Button>
                </Dropdown>
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
            <Table<Sale>
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
          setIsPreorderMode(false)
        }}
        onSubmit={handleSubmit}
        editingSale={editingSale || undefined}
        loading={submitting}
        isPreorder={isPreorderMode}
      />

      {/* 查看詳情Modal */}
      <Modal
        title="銷售訂單詳情"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false)
          setEditingSale(null)
        }}
        footer={
          editingSale?.status === 'PREORDER' ? (
            <HideFromInvestor>
              <Space>
                <Button onClick={() => {
                  setViewModalVisible(false)
                  setEditingSale(null)
                }}>
                  關閉
                </Button>
                <Button
                  type="primary"
                  icon={<CalendarOutlined />}
                  onClick={() => setConvertModalVisible(true)}
                >
                  商品已到貨
                </Button>
              </Space>
            </HideFromInvestor>
          ) : null
        }
        width="90%"
        style={{
          maxWidth: '800px',
          width: '90vw'
        }}
      >
        {editingSale && (
          <div>
            {/* 預購單提示 */}
            {editingSale.is_preorder && editingSale.status === 'PREORDER' && (
              <Alert
                message="預購訂單"
                description={
                  <div>
                    <div>此訂單為預購單，商品尚未到貨。</div>
                    {editingSale.expected_arrival_date && (
                      <div>預計到貨日期：{dayjs(editingSale.expected_arrival_date).format('YYYY年MM月DD日')}</div>
                    )}
                  </div>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <div style={{ marginBottom: '24px' }}>
              <h3>基本資訊</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><strong>銷售單號：</strong>{editingSale.sale_number}</div>
                <div><strong>狀態：</strong>
                  <Tag color={getStatusColor(editingSale.status)}>
                    {getStatusName(editingSale.status)}
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
                            {record.product?.name || '未知商品'}
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

      {/* 出貨單列印對話框 */}
      {currentShippingData && (
        <PrintableDocument
          visible={shippingPrintVisible}
          onClose={() => setShippingPrintVisible(false)}
          documentType={DOCUMENT_TYPES.SHIPPING}
          documentNumber={currentShippingData.shippingOrder?.shipping_number || ''}
          title="出貨單預覽"
          width={900}
          additionalHeaderInfo={
            <div>
              <div>出貨日期：{currentShippingData.shippingOrder?.shipped_at ? new Date(currentShippingData.shippingOrder.shipped_at).toLocaleDateString('zh-TW') : new Date().toLocaleDateString('zh-TW')}</div>
              {currentShippingData.shippingOrder?.tracking_number && (
                <div>追蹤號碼：{currentShippingData.shippingOrder.tracking_number}</div>
              )}
            </div>
          }
        >
          {/* 客戶資訊區塊 */}
          <div className="customer-section" style={{
            margin: '20px 0',
            padding: '15px',
            border: '1px solid #d9d9d9',
            backgroundColor: '#fafafa',
            borderRadius: '4px'
          }}>
            <Row gutter={[24, 16]}>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: '14px' }}>收貨客戶</Text>
                  <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
                    <div><strong>客戶名稱：</strong>{currentShippingData.sale?.customer?.name}</div>
                    <div><strong>聯絡電話：</strong>{currentShippingData.sale?.customer?.phone || '-'}</div>
                    <div><strong>電子信箱：</strong>{currentShippingData.sale?.customer?.email || '-'}</div>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: '14px' }}>出貨資訊</Text>
                  <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
                    <div><strong>出貨地址：</strong>{currentShippingData.shippingOrder?.shipping_address || currentShippingData.sale?.customer?.shipping_address || '-'}</div>
                    <div><strong>出貨方式：</strong>{currentShippingData.shippingOrder?.shipping_method === 'DELIVERY' ? '宅配送達' : currentShippingData.shippingOrder?.shipping_method === 'PICKUP' ? '自取' : '快遞'}</div>
                    <div><strong>銷售單號：</strong>{currentShippingData.sale?.sale_number}</div>
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          {/* 出貨明細表格 */}
          <Table
            title={() => <Text strong style={{ fontSize: '16px' }}>出貨明細</Text>}
            dataSource={(currentShippingData.sale?.items || []) as ShippingItemRow[]}
            rowKey="id"
            pagination={false}
            size="small"
            columns={[
              {
                title: '品名規格',
                key: 'product',
                width: '35%',
                render: (record: ShippingItemRow) => (
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{record.product?.name}</div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      品號：{record.product?.product_code}
                    </div>
                    {record.variant?.variant_code && (
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        規格：{record.variant.variant_code}
                      </div>
                    )}
                  </div>
                )
              },
              {
                title: '訂購數量',
                dataIndex: 'quantity',
                key: 'quantity',
                align: 'center' as const,
                width: '12%',
                render: (value: number) => <strong>{value ?? 0}</strong>
              },
              {
                title: '出貨數量',
                key: 'shipped_quantity',
                align: 'center' as const,
                width: '12%',
                render: (record: ShippingItemRow) => (
                  <strong style={{ color: '#1890ff' }}>
                    {record.shipped_quantity ?? record.quantity ?? 0}
                  </strong>
                )
              },
              {
                title: '單價 (NT$)',
                dataIndex: 'unit_price',
                key: 'unit_price',
                align: 'right' as const,
                width: '15%',
                render: (value: number) => `$${(value ?? 0).toLocaleString()}`
              },
              {
                title: '金額 (NT$)',
                key: 'subtotal',
                align: 'right' as const,
                width: '15%',
                render: (record: ShippingItemRow) => {
                  const qty = record.shipped_quantity ?? record.quantity ?? 0
                  const price = record.unit_price ?? 0
                  return <strong>${(qty * price).toLocaleString()}</strong>
                }
              }
            ]}
            summary={(data: readonly ShippingItemRow[]) => {
              const totalQuantity = data.reduce((sum, item) => {
                if (typeof item === 'object' && item !== null) {
                  const qty = item.shipped_quantity ?? item.quantity ?? 0
                  return sum + qty
                }
                return sum
              }, 0)

              const totalAmount = data.reduce((sum, item) => {
                if (typeof item === 'object' && item !== null) {
                  const qty = item.shipped_quantity ?? item.quantity ?? 0
                  const price = item.unit_price ?? 0
                  return sum + (qty * price)
                }
                return sum
              }, 0)

              return (
                <Table.Summary>
                  <Table.Summary.Row style={{ backgroundColor: '#f0f0f0' }}>
                    <Table.Summary.Cell index={0}>
                      <Text strong style={{ fontSize: '14px' }}>合計</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <Text strong style={{ fontSize: '14px' }}>{totalQuantity}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>{totalQuantity}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3}></Table.Summary.Cell>
                    <Table.Summary.Cell index={4}>
                      <Text strong style={{ fontSize: '14px', color: '#f50' }}>
                        ${totalAmount.toLocaleString()}
                      </Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )
            }}
          />

          {/* 備註區域 */}
          {currentShippingData.shippingOrder?.notes && (
            <div style={{ marginTop: '20px' }}>
              <Text strong style={{ fontSize: '14px' }}>備註事項：</Text>
              <div style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: '4px',
                lineHeight: '1.5'
              }}>
                {currentShippingData.shippingOrder.notes}
              </div>
            </div>
          )}

          {/* 頁尾 */}
          <DocumentFooter documentType={DOCUMENT_TYPES.SHIPPING} />
        </PrintableDocument>
      )}

      {/* 出貨對話框 */}
      <ShipModal
        visible={shipModalVisible}
        onCancel={() => {
          setShipModalVisible(false)
          setShippingSale(null)
        }}
        onSubmit={handleShipSubmit}
        loading={shipping}
        saleNumber={shippingSale?.sale_number}
      />

      {/* 預購單轉換確認對話框 */}
      <Modal
        title="確認商品已到貨"
        open={convertModalVisible}
        onCancel={() => setConvertModalVisible(false)}
        onOk={handleConvertToConfirmed}
        confirmLoading={converting}
        okText="確認轉換"
        cancelText="取消"
        width={600}
      >
        {editingSale && (
          <div>
            <Alert
              message="預購單轉換說明"
              description={
                <div>
                  <p>將預購訂單轉換為正式訂單後：</p>
                  <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                    <li>系統會檢查庫存是否足夠</li>
                    <li>庫存充足時，訂單狀態將變更為「已確認」</li>
                    <li>系統會自動預留對應的庫存</li>
                    <li>如果庫存不足，將顯示錯誤訊息</li>
                  </ul>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Card size="small" title="訂單資訊">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><strong>銷售單號：</strong>{editingSale.sale_number}</div>
                <div><strong>客戶：</strong>{editingSale.customer?.name}</div>
                <div><strong>商品數量：</strong>{editingSale.items?.length || 0} 項</div>
                <div><strong>訂單金額：</strong>NT$ {editingSale.total_amount.toLocaleString()}</div>
                {editingSale.expected_arrival_date && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>預計到貨日：</strong>
                    {dayjs(editingSale.expected_arrival_date).format('YYYY年MM月DD日')}
                  </div>
                )}
              </div>
            </Card>

            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                請確認商品已實際到貨後再執行轉換操作。
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
