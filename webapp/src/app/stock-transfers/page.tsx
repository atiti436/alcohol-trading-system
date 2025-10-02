'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  message,
  Tooltip
} from 'antd'
import {
  SwapOutlined,
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import StockTransferModal from '@/components/inventory/StockTransferModal'

const { Title, Text } = Typography

interface StockTransfer {
  id: string
  transfer_number: string
  source_variant_code: string
  target_variant_code: string
  quantity: number
  unit_cost: number
  total_cost: number
  reason: string
  notes: string | null
  created_at: string
  source_variant: {
    variant_code: string
    variant_type: string
    product: {
      name: string
      product_code: string
    }
  }
  target_variant: {
    variant_code: string
    variant_type: string
    product: {
      name: string
      product_code: string
    }
  }
  creator: {
    name: string
    email: string
  }
}

export default function StockTransfersPage() {
  const { data: session } = useSession()
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [products, setProducts] = useState([])

  // 載入調撥記錄
  const loadTransfers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stock-transfers?limit=100')
      const result = await response.json()

      if (result.success) {
        setTransfers(result.data)
      } else {
        message.error('載入失敗')
      }
    } catch (error) {
      console.error('載入調撥記錄失敗:', error)
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  // 載入商品列表（用於調撥選擇）
  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=1000')
      const result = await response.json()

      if (result.success) {
        setProducts(result.data.products)
      }
    } catch (error) {
      console.error('載入商品列表失敗:', error)
    }
  }

  useEffect(() => {
    loadTransfers()
    loadProducts()
  }, [])

  // 權限檢查
  const canCreateTransfer = session?.user?.role !== 'INVESTOR'

  const columns = [
    {
      title: '調撥單號',
      dataIndex: 'transfer_number',
      key: 'transfer_number',
      width: 140,
      render: (text: string) => <Text code>{text}</Text>
    },
    {
      title: '來源變體',
      key: 'source',
      width: 250,
      render: (_: any, record: StockTransfer) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.source_variant.product.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.source_variant.variant_code} - {record.source_variant.variant_type}
          </Text>
        </Space>
      )
    },
    {
      title: '',
      key: 'arrow',
      width: 40,
      align: 'center' as const,
      render: () => <SwapOutlined style={{ color: '#1890ff', fontSize: 16 }} />
    },
    {
      title: '目標變體',
      key: 'target',
      width: 250,
      render: (_: any, record: StockTransfer) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.target_variant.product.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.target_variant.variant_code} - {record.target_variant.variant_type}
          </Text>
        </Space>
      )
    },
    {
      title: '數量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'center' as const,
      render: (qty: number) => <Tag color="blue">{qty}</Tag>
    },
    {
      title: '成本',
      key: 'cost',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: StockTransfer) => (
        <Space direction="vertical" size={0} style={{ alignItems: 'flex-end' }}>
          <Text>NT$ {record.total_cost.toLocaleString()}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            @{record.unit_cost.toFixed(2)}
          </Text>
        </Space>
      )
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 150,
      render: (reason: string) => (
        <Tag color="orange">{reason}</Tag>
      )
    },
    {
      title: '操作人',
      key: 'creator',
      width: 120,
      render: (_: any, record: StockTransfer) => (
        <Tooltip title={record.creator.email}>
          <Text>{record.creator.name}</Text>
        </Tooltip>
      )
    },
    {
      title: '建立時間',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(date).toLocaleDateString('zh-TW')}
        </Text>
      )
    }
  ]

  return (
    <div>
      <Card
        title={
          <Space>
            <SwapOutlined style={{ fontSize: 20 }} />
            <Title level={4} style={{ margin: 0 }}>品號調撥管理</Title>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadTransfers}
              loading={loading}
            >
              刷新
            </Button>
            {canCreateTransfer && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setModalVisible(true)}
              >
                新增調撥
              </Button>
            )}
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={transfers}
          rowKey="id"
          loading={loading}
          pagination={{
            defaultPageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 筆記錄`
          }}
        />
      </Card>

      <StockTransferModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSuccess={() => {
          setModalVisible(false)
          loadTransfers()
        }}
        products={products}
      />
    </div>
  )
}
