'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, Table, Row, Col, Statistic, Typography, Space, Button, Input, Select, Tag, Modal, Form, InputNumber, message } from 'antd'
import {
  AppstoreOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  InboxOutlined
} from '@ant-design/icons'
import { InventoryAdjustmentModal } from '@/components/inventory/InventoryAdjustmentModal'
import QuickReceiveModal from '@/components/inventory/QuickReceiveModal'
import { useSession } from 'next-auth/react'

const { Title, Text } = Typography
const { Search } = Input
const { Option } = Select

interface InventoryItem {
  id: string
  name: string
  product_code: string
  category: string
  total_stock_quantity: number
  total_available_stock: number
  total_reserved_stock: number
  total_value: number
  unit_cost: number
  current_price: number
  status: 'normal' | 'low' | 'out' | 'excess'
  variants_count: number
  variants: Array<{
    id: string
    variant_code: string
    stock_quantity: number
    available_stock: number
    cost_price: number
  }>
}

export default function InventoryPage() {
  const { data: session } = useSession()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [adjustmentModalVisible, setAdjustmentModalVisible] = useState(false)
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null)
  const [adjustmentLoading, setAdjustmentLoading] = useState(false)
  const [quickReceiveVisible, setQuickReceiveVisible] = useState(false)
  const [products, setProducts] = useState([])

  // 🔗 連接真實API - 移除假資料
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        search: searchText,
        page: '1',
        limit: '100'
      })

      if (categoryFilter) params.append('category', categoryFilter)
      if (statusFilter === 'low') params.append('lowStock', 'true')

      const response = await fetch(`/api/inventory?${params}`)
      if (!response.ok) {
        throw new Error('庫存資料載入失敗')
      }

      const data = await response.json()

      // 轉換API數據為前端格式
      const inventoryData: InventoryItem[] = data.data.products.map((product: any) => {
        // 計算庫存狀態
        let status: 'normal' | 'low' | 'out' | 'excess' = 'normal'
        if (product.inventory.total_available_stock === 0) {
          status = 'out'
        } else if (product.inventory.total_available_stock <= (product.inventory.total_stock_quantity * 0.2)) {
          status = 'low'
        }

        return {
          id: product.id,
          name: product.name,
          product_code: product.product_code,
          category: product.category,
          total_stock_quantity: product.inventory.total_stock_quantity,
          total_available_stock: product.inventory.total_available_stock,
          total_reserved_stock: product.inventory.total_reserved_stock,
          total_value: product.inventory.total_value,
          unit_cost: product.cost_price,
          current_price: product.current_price,
          status,
          variants_count: product._count?.variants || 0,
          variants: product.variants || []
        }
      })

      setInventory(inventoryData)
    } catch (error) {
      console.error('庫存載入錯誤:', error)
      message.error('庫存資料載入失敗')
      setInventory([])
    } finally {
      setLoading(false)
    }
  }, [searchText, categoryFilter, statusFilter])

  // 載入商品列表（用於快速進貨）
  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products?limit=1000')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setProducts(result.data.products)
        }
      }
    } catch (error) {
      console.error('商品列表載入失敗:', error)
    }
  }, [])

  useEffect(() => {
    fetchInventory()
    fetchProducts()
  }, [searchText, categoryFilter, statusFilter, fetchInventory, fetchProducts])

  // 📊 計算真實統計數據
  const statistics = {
    totalItems: inventory.length,
    totalValue: inventory.reduce((sum, item) => sum + item.total_value, 0),
    totalStock: inventory.reduce((sum, item) => sum + item.total_stock_quantity, 0),
    availableStock: inventory.reduce((sum, item) => sum + item.total_available_stock, 0),
    reservedStock: inventory.reduce((sum, item) => sum + item.total_reserved_stock, 0),
    lowStockCount: inventory.filter(item => item.status === 'low').length,
    outOfStockCount: inventory.filter(item => item.status === 'out').length
  }

  // 📋 過濾邏輯 (修復欄位名稱)
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         item.product_code.toLowerCase().includes(searchText.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchText.toLowerCase())
    const matchesCategory = !categoryFilter || item.category === categoryFilter
    const matchesStatus = !statusFilter || item.status === statusFilter

    return matchesSearch && matchesCategory && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low': return 'orange'
      case 'out': return 'red'
      case 'excess': return 'blue'
      default: return 'green'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'low': return '庫存不足'
      case 'out': return '缺貨'
      case 'excess': return '庫存過多'
      default: return '正常'
    }
  }

  // 處理庫存調整
  const handleInventoryAdjustment = (record: InventoryItem) => {
    setSelectedInventoryItem(record)
    setAdjustmentModalVisible(true)
  }

  // 提交庫存調整
  const handleAdjustmentSubmit = async (data: any) => {
    setAdjustmentLoading(true)
    try {
      const response = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success('庫存調整成功')
        setAdjustmentModalVisible(false)
        setSelectedInventoryItem(null)
        await fetchInventory() // 重新載入庫存
      } else {
        message.error(result.error || '庫存調整失敗')
      }
    } catch (error) {
      console.error('庫存調整失敗:', error)
      message.error('庫存調整失敗，請檢查網路連線')
    } finally {
      setAdjustmentLoading(false)
    }
  }

  const columns = [
    {
      title: '商品編號',
      dataIndex: 'product_code',
      key: 'product_code',
      width: 120
    },
    {
      title: '商品名稱',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: '類別',
      dataIndex: 'category',
      key: 'category',
      width: 100
    },
    {
      title: '總庫存',
      dataIndex: 'total_stock_quantity',
      key: 'total_stock_quantity',
      width: 100,
      align: 'center' as const,
      render: (stock: number, record: InventoryItem) => (
        <Space>
          <Text strong={record.status === 'low' || record.status === 'out'}>{stock}</Text>
          <Text type="secondary">/ {record.total_available_stock}可用</Text>
        </Space>
      )
    },
    {
      title: '預留庫存',
      dataIndex: 'total_reserved_stock',
      key: 'total_reserved_stock',
      width: 100,
      align: 'center' as const
    },
    {
      title: '變體數量',
      dataIndex: 'variants_count',
      key: 'variants_count',
      width: 80,
      align: 'center' as const
    },
    {
      title: '單位成本',
      dataIndex: 'unit_cost',
      key: 'unit_cost',
      width: 120,
      align: 'right' as const,
      render: (cost: number) => cost ? `NT$ ${cost.toLocaleString()}` : 'N/A'
    },
    {
      title: '庫存價值',
      dataIndex: 'total_value',
      key: 'total_value',
      width: 120,
      align: 'right' as const,
      render: (value: number) => `NT$ ${value.toLocaleString()}`
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: '最後更新',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      width: 120
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: InventoryItem) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleInventoryAdjustment(record)}
          >
            調整
          </Button>
        </Space>
      )
    }
  ]

  // 權限檢查
  const canQuickReceive = session?.user?.role !== 'INVESTOR'

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          庫存管理
        </Title>
        {canQuickReceive && (
          <Button
            type="primary"
            icon={<InboxOutlined />}
            onClick={() => setQuickReceiveVisible(true)}
            style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
          >
            個人快速進貨
          </Button>
        )}
      </div>

      {/* 統計卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="總商品數"
              value={statistics.totalItems}
              prefix={<AppstoreOutlined />}
              suffix="項"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="總庫存價值"
              value={statistics.totalValue}
              precision={0}
              prefix="NT$"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="庫存不足"
              value={statistics.lowStockCount}
              prefix={<WarningOutlined />}
              suffix="項"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="缺貨項目"
              value={statistics.outOfStockCount}
              prefix={<ArrowDownOutlined />}
              suffix="項"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 篩選和搜尋 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Search
              placeholder="搜尋商品名稱或編號"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="選擇類別"
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="威士忌">威士忌</Option>
              <Option value="清酒">清酒</Option>
              <Option value="香檳">香檳</Option>
              <Option value="葡萄酒">葡萄酒</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              placeholder="庫存狀態"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="normal">正常</Option>
              <Option value="low">庫存不足</Option>
              <Option value="out">缺貨</Option>
              <Option value="excess">庫存過多</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => message.info('新增庫存調整')}
              >
                庫存調整
              </Button>
              <Button
                icon={<ArrowUpOutlined />}
                onClick={() => message.info('匯入庫存')}
              >
                匯入
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 庫存表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredInventory}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          expandable={{
            expandedRowRender: (record: InventoryItem) => {
              if (!record.variants || record.variants.length === 0) {
                return <div style={{ padding: '12px', color: '#999' }}>無變體資料</div>
              }

              return (
                <Table
                  size="small"
                  dataSource={record.variants}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: '變體代碼',
                      dataIndex: 'variant_code',
                      key: 'variant_code',
                      width: 150,
                      render: (text: string) => (
                        <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{text}</span>
                      )
                    },
                    {
                      title: '庫存數量',
                      dataIndex: 'stock_quantity',
                      key: 'stock_quantity',
                      width: 100,
                      align: 'center' as const
                    },
                    {
                      title: '可售庫存',
                      dataIndex: 'available_stock',
                      key: 'available_stock',
                      width: 100,
                      align: 'center' as const,
                      render: (value: number) => (
                        <span style={{ color: value > 0 ? '#52c41a' : '#ff4d4f' }}>
                          {value}
                        </span>
                      )
                    },
                    {
                      title: '成本價',
                      dataIndex: 'cost_price',
                      key: 'cost_price',
                      width: 100,
                      align: 'right' as const,
                      render: (value: number) => `$${value.toLocaleString()}`
                    }
                  ]}
                />
              )
            },
            rowExpandable: (record: InventoryItem) => (record.variants_count || 0) > 0
          }}
          pagination={{
            total: filteredInventory.length,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 項庫存`
          }}
        />
      </Card>

      {/* 庫存調整Modal */}
      <InventoryAdjustmentModal
        visible={adjustmentModalVisible}
        onCancel={() => {
          setAdjustmentModalVisible(false)
          setSelectedInventoryItem(null)
        }}
        onSubmit={handleAdjustmentSubmit}
        inventoryItem={selectedInventoryItem || undefined}
        loading={adjustmentLoading}
      />

      {/* 個人快速進貨Modal */}
      <QuickReceiveModal
        visible={quickReceiveVisible}
        onCancel={() => setQuickReceiveVisible(false)}
        onSuccess={() => {
          setQuickReceiveVisible(false)
          fetchInventory()
        }}
        products={products}
      />
    </div>
  )
}
