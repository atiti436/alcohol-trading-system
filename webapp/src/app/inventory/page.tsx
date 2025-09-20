'use client'

import React, { useState, useEffect } from 'react'
import { Card, Table, Row, Col, Statistic, Typography, Space, Button, Input, Select, Tag, Modal, Form, InputNumber, message } from 'antd'
import {
  AppstoreOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Search } = Input
const { Option } = Select

interface InventoryItem {
  id: string
  productName: string
  category: string
  currentStock: number
  minStock: number
  maxStock: number
  unitCost: number
  totalValue: number
  location: string
  status: 'normal' | 'low' | 'out' | 'excess'
  lastUpdated: string
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Mock data - 在實際環境中這會從API獲取
  useEffect(() => {
    const mockInventory: InventoryItem[] = [
      {
        id: 'INV001',
        productName: '山崎18年威士忌',
        category: '威士忌',
        currentStock: 3,
        minStock: 10,
        maxStock: 50,
        unitCost: 45000,
        totalValue: 135000,
        location: 'A1-01',
        status: 'low',
        lastUpdated: '2025-09-20'
      },
      {
        id: 'INV002',
        productName: '響21年威士忌',
        category: '威士忌',
        currentStock: 1,
        minStock: 5,
        maxStock: 25,
        unitCost: 120000,
        totalValue: 120000,
        location: 'A1-02',
        status: 'low',
        lastUpdated: '2025-09-20'
      },
      {
        id: 'INV003',
        productName: '獺祭純米大吟釀',
        category: '清酒',
        currentStock: 45,
        minStock: 20,
        maxStock: 100,
        unitCost: 1800,
        totalValue: 81000,
        location: 'B2-15',
        status: 'normal',
        lastUpdated: '2025-09-21'
      },
      {
        id: 'INV004',
        productName: 'Dom Pérignon 2015',
        category: '香檳',
        currentStock: 12,
        minStock: 8,
        maxStock: 30,
        unitCost: 8500,
        totalValue: 102000,
        location: 'C1-05',
        status: 'normal',
        lastUpdated: '2025-09-19'
      }
    ]

    setTimeout(() => {
      setInventory(mockInventory)
      setLoading(false)
    }, 500)
  }, [])

  // 計算統計數據
  const statistics = {
    totalItems: inventory.length,
    totalValue: inventory.reduce((sum, item) => sum + item.totalValue, 0),
    lowStockCount: inventory.filter(item => item.status === 'low').length,
    outOfStockCount: inventory.filter(item => item.status === 'out').length
  }

  // 過濾邏輯
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchText.toLowerCase()) ||
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

  const columns = [
    {
      title: '商品編號',
      dataIndex: 'id',
      key: 'id',
      width: 120
    },
    {
      title: '商品名稱',
      dataIndex: 'productName',
      key: 'productName',
      width: 200
    },
    {
      title: '類別',
      dataIndex: 'category',
      key: 'category',
      width: 100
    },
    {
      title: '當前庫存',
      dataIndex: 'currentStock',
      key: 'currentStock',
      width: 100,
      align: 'center' as const,
      render: (stock: number, record: InventoryItem) => (
        <Space>
          <Text strong={record.status === 'low'}>{stock}</Text>
          <Text type="secondary">/ {record.maxStock}</Text>
        </Space>
      )
    },
    {
      title: '安全庫存',
      dataIndex: 'minStock',
      key: 'minStock',
      width: 100,
      align: 'center' as const
    },
    {
      title: '單位成本',
      dataIndex: 'unitCost',
      key: 'unitCost',
      width: 120,
      align: 'right' as const,
      render: (cost: number) => `NT$ ${cost.toLocaleString()}`
    },
    {
      title: '庫存價值',
      dataIndex: 'totalValue',
      key: 'totalValue',
      width: 120,
      align: 'right' as const,
      render: (value: number) => `NT$ ${value.toLocaleString()}`
    },
    {
      title: '存放位置',
      dataIndex: 'location',
      key: 'location',
      width: 100,
      align: 'center' as const
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
      render: (_, record: InventoryItem) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => message.info(`編輯 ${record.productName}`)}
          >
            調整
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: 0 }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        庫存管理
      </Title>

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
          pagination={{
            total: filteredInventory.length,
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 項庫存`
          }}
        />
      </Card>
    </div>
  )
}