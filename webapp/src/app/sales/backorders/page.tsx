'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Card,
  Tag,
  Space,
  Select,
  message,
  Popconfirm,
  Tooltip,
  Statistic,
  Row,
  Col,
  Alert,
  Spin
} from 'antd'
import {
  WarningOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  InboxOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'

const { Option } = Select

interface BackorderItem {
  id: string
  sale_id: string
  variant_id: string
  shortage_quantity: number
  priority: number
  status: string
  notes?: string
  created_at: string
  resolved_at?: string
  sale: {
    sale_number: string
    customer: {
      name: string
    }
    expected_arrival_date?: string
  }
  variant: {
    variant_code: string
    variant_type: string
    product: {
      name: string
    }
  }
}

interface BackorderGroup {
  variant_id: string
  variant_code: string
  variant_type: string
  product_name: string
  total_shortage: number
  order_count: number
  customer_count: number
  items: BackorderItem[]
}

export default function BackordersPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [backorders, setBackorders] = useState<BackorderItem[]>([])
  const [groupedData, setGroupedData] = useState<BackorderGroup[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [groupBy, setGroupBy] = useState<string>('variant')
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})

  // 載入缺貨記錄
  const loadBackorders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        groupBy: groupBy
      })

      const response = await fetch(`/api/backorders?${params}`)
      const result = await response.json()

      if (response.ok && result.success) {
        if (groupBy === 'variant') {
          // 按商品分組
          const grouped: BackorderGroup[] = []
          const variantMap = new Map<string, BackorderItem[]>()

          result.data.forEach((item: BackorderItem) => {
            const key = item.variant_id
            if (!variantMap.has(key)) {
              variantMap.set(key, [])
            }
            variantMap.get(key)!.push(item)
          })

          variantMap.forEach((items, variantId) => {
            const firstItem = items[0]
            grouped.push({
              variant_id: variantId,
              variant_code: firstItem.variant.variant_code,
              variant_type: firstItem.variant.variant_type,
              product_name: firstItem.variant.product.name,
              total_shortage: items.reduce((sum, item) => sum + item.shortage_quantity, 0),
              order_count: items.length,
              customer_count: new Set(items.map(item => item.sale.customer.name)).size,
              items: items.sort((a, b) => b.priority - a.priority)
            })
          })

          setGroupedData(grouped)
        } else {
          setBackorders(result.data)
        }
      } else {
        message.error(result.error || '載入失敗')
      }
    } catch (error) {
      console.error('載入缺貨記錄失敗:', error)
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, groupBy])

  useEffect(() => {
    loadBackorders()
  }, [loadBackorders])

  // 解決缺貨
  const handleResolve = async (id: string) => {
    const actionKey = `resolve-${id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const response = await fetch(`/api/backorders/${id}/resolve`, {
        method: 'POST'
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success('已標記為已解決')

        // 短暫延遲確保資料庫事務完成
        await new Promise(resolve => setTimeout(resolve, 300))
        await loadBackorders()
      } else {
        message.error(result.error || '操作失敗')
      }
    } catch (error) {
      console.error('解決缺貨失敗:', error)
      message.error('操作失敗')
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  // 取消缺貨
  const handleCancel = async (id: string) => {
    const actionKey = `cancel-${id}`
    setActionLoading(prev => ({ ...prev, [actionKey]: true }))

    try {
      const response = await fetch(`/api/backorders/${id}/resolve`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success('已取消缺貨記錄')

        // 短暫延遲確保資料庫事務完成
        await new Promise(resolve => setTimeout(resolve, 300))
        await loadBackorders()
      } else {
        message.error(result.error || '操作失敗')
      }
    } catch (error) {
      console.error('取消缺貨失敗:', error)
      message.error('操作失敗')
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  // 狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'orange'
      case 'RESOLVED': return 'green'
      case 'CANCELLED': return 'default'
      default: return 'default'
    }
  }

  // 狀態名稱
  const getStatusName = (status: string) => {
    const names: { [key: string]: string } = {
      PENDING: '待補貨',
      RESOLVED: '已解決',
      CANCELLED: '已取消'
    }
    return names[status] || status
  }

  // 商品分組表格
  const groupColumns = [
    {
      title: '商品',
      key: 'product',
      width: 200,
      render: (record: BackorderGroup) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.product_name}</div>
          <div className="text-xs text-gray-500">
            {record.variant_code} ({record.variant_type})
          </div>
        </div>
      )
    },
    {
      title: '總缺貨數',
      dataIndex: 'total_shortage',
      key: 'total_shortage',
      width: 100,
      align: 'center' as const,
      render: (qty: number) => (
        <Tag color="orange" style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {qty} 件
        </Tag>
      )
    },
    {
      title: '訂單數',
      dataIndex: 'order_count',
      key: 'order_count',
      width: 80,
      align: 'center' as const
    },
    {
      title: '客戶數',
      dataIndex: 'customer_count',
      key: 'customer_count',
      width: 80,
      align: 'center' as const
    }
  ]

  // 明細表格
  const detailColumns = [
    {
      title: '銷售單號',
      key: 'sale_number',
      width: 120,
      render: (record: BackorderItem) => record.sale.sale_number
    },
    {
      title: '商品',
      key: 'product',
      width: 150,
      render: (record: BackorderItem) => (
        <div>
          <div>{record.variant.product.name}</div>
          <div className="text-xs text-gray-500">
            {record.variant.variant_code}
          </div>
        </div>
      )
    },
    {
      title: '客戶',
      key: 'customer',
      width: 100,
      render: (record: BackorderItem) => record.sale.customer.name
    },
    {
      title: '缺貨數量',
      dataIndex: 'shortage_quantity',
      key: 'shortage_quantity',
      width: 80,
      align: 'center' as const,
      render: (qty: number) => (
        <Tag color="orange">{qty}</Tag>
      )
    },
    {
      title: '優先級',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      align: 'center' as const,
      render: (priority: number) => {
        let color = 'default'
        if (priority >= 100) color = 'red'
        else if (priority >= 50) color = 'orange'
        return <Tag color={color}>{priority}</Tag>
      }
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
      )
    },
    {
      title: '建立時間',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY/MM/DD')
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (record: BackorderItem) => (
        <Space>
          {record.status === 'PENDING' && (
            <>
              <Tooltip title="標記為已解決">
                <Button
                  icon={<CheckOutlined />}
                  size="small"
                  type="primary"
                  loading={actionLoading[`resolve-${record.id}`]}
                  onClick={() => handleResolve(record.id)}
                />
              </Tooltip>
              <Popconfirm
                title="確定要取消此缺貨記錄嗎？"
                onConfirm={() => handleCancel(record.id)}
                okText="確定"
                cancelText="取消"
              >
                <Tooltip title="取消">
                  <Button
                    icon={<CloseOutlined />}
                    size="small"
                    danger
                    loading={actionLoading[`cancel-${record.id}`]}
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      )
    }
  ]

  // 統計資訊
  const stats = {
    totalShortage: groupBy === 'variant'
      ? groupedData.reduce((sum, g) => sum + g.total_shortage, 0)
      : backorders.reduce((sum, item) => sum + item.shortage_quantity, 0),
    totalOrders: groupBy === 'variant'
      ? groupedData.reduce((sum, g) => sum + g.order_count, 0)
      : backorders.length,
    totalProducts: groupBy === 'variant'
      ? groupedData.length
      : new Set(backorders.map(item => item.variant_id)).size
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WarningOutlined />
            <span>缺貨管理</span>
          </div>
        }
        extra={
          <Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
            >
              <Option value="PENDING">待補貨</Option>
              <Option value="RESOLVED">已解決</Option>
              <Option value="CANCELLED">已取消</Option>
            </Select>
            <Select
              value={groupBy}
              onChange={setGroupBy}
              style={{ width: 140 }}
            >
              <Option value="variant">按商品分組</Option>
              <Option value="none">明細列表</Option>
            </Select>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadBackorders}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        {/* 統計卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="總缺貨數量"
                value={stats.totalShortage}
                suffix="件"
                valueStyle={{ color: '#fa8c16' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="缺貨訂單數"
                value={stats.totalOrders}
                suffix="筆"
                prefix={<InboxOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="缺貨商品種類"
                value={stats.totalProducts}
                suffix="種"
              />
            </Card>
          </Col>
        </Row>

        {statusFilter === 'PENDING' && (
          <Alert
            type="info"
            message="自動補貨說明"
            description="進貨收貨時，系統會自動檢查並優先補足待補貨的訂單（按優先級排序）"
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {/* 表格 */}
        <Spin spinning={loading}>
          {groupBy === 'variant' ? (
            <Table
              dataSource={groupedData}
              columns={groupColumns}
              rowKey="variant_id"
              pagination={false}
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    size="small"
                    dataSource={record.items}
                    columns={detailColumns.filter(col => col.key !== 'product')}
                    rowKey="id"
                    pagination={false}
                  />
                )
              }}
            />
          ) : (
            <Table
              dataSource={backorders}
              columns={detailColumns}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 筆`
              }}
              scroll={{ x: 1200 }}
            />
          )}
        </Spin>
      </Card>
    </div>
  )
}
