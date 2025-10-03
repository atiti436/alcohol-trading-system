'use client'

import React, { useState, useEffect } from 'react'
import { Card, Table, Statistic, Row, Col, Space, Tag, Typography, Tabs, Empty, Spin, Timeline, message, Button, Modal } from 'antd'
import { ShoppingCartOutlined, AppstoreOutlined, UserOutlined, DollarOutlined, CalendarOutlined, ThunderboltOutlined } from '@ant-design/icons'
import type { ColumnType } from 'antd/es/table'
import dayjs from 'dayjs'
import { HideFromInvestor } from '@/components/auth/RoleGuard'

const { Title, Text } = Typography

interface PreorderSummary {
  overview: {
    total_preorders: number
    total_products: number
    total_customers: number
    total_quantity: number
    total_amount: number
  }
  by_product: ProductSummary[]
  by_customer: CustomerSummary[]
  by_timeline: TimelineSummary[]
}

interface ProductSummary {
  product_id: string
  product_code: string
  product_name: string
  category: string
  variants: VariantSummary[]
  total_quantity: number
  order_count: number
  customer_count: number
  total_amount: number
}

interface VariantSummary {
  variant_id: string
  variant_code: string
  variant_type: string
  description: string | null
  total_quantity: number
  order_count: number
  customer_count: number
  orders: {
    sale_id: string
    sale_number: string
    customer_name: string
    quantity: number
    expected_arrival_date: string | null
  }[]
}

interface CustomerSummary {
  customer_id: string
  customer_code: string
  customer_name: string
  company: string | null
  order_count: number
  total_quantity: number
  total_amount: number
  orders: {
    sale_id: string
    sale_number: string
    expected_arrival_date: string | null
    total_amount: number
    item_count: number
    items: {
      product_name: string
      variant_code: string | null
      quantity: number
      unit_price: number
    }[]
  }[]
}

interface TimelineSummary {
  date: string
  order_count: number
  total_quantity: number
  total_amount: number
  orders: {
    sale_id: string
    sale_number: string
    customer_name: string
    total_amount: number
    item_count: number
  }[]
}

export default function PreorderSummaryPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PreorderSummary | null>(null)
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([])
  const [converting, setConverting] = useState(false)
  const [convertModalVisible, setConvertModalVisible] = useState(false)
  const [convertResult, setConvertResult] = useState<any>(null)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/sales/preorder-summary')
      const result = await response.json()

      if (response.ok && result.success) {
        setData(result.data)
      } else {
        message.error(result.error || '載入失敗')
      }
    } catch (error) {
      console.error('載入預購統計失敗:', error)
      message.error('載入失敗，請檢查網路連線')
    } finally {
      setLoading(false)
    }
  }

  // 收集所有訂單 ID（從各個視圖）
  const getAllOrderIds = (): string[] => {
    const orderIds = new Set<string>()

    // 從商品彙總收集
    data?.by_product.forEach(product => {
      product.variants.forEach(variant => {
        variant.orders.forEach(order => {
          orderIds.add(order.sale_id)
        })
      })
    })

    return Array.from(orderIds)
  }

  // 批次轉換
  const handleBatchConvert = async () => {
    if (selectedSaleIds.length === 0) {
      message.warning('請選擇要轉換的預購單')
      return
    }

    setConverting(true)
    try {
      const response = await fetch('/api/sales/preorders/batch-convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleIds: selectedSaleIds })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setConvertResult(result.data)
        setConvertModalVisible(true)

        // 清空選擇
        setSelectedSaleIds([])

        // 重新載入統計
        loadSummary()

        message.success(`批次轉換完成：成功 ${result.summary.success} 張，失敗 ${result.summary.failed} 張`)
      } else {
        message.error(result.error || '批次轉換失敗')
      }
    } catch (error) {
      console.error('批次轉換失敗:', error)
      message.error('批次轉換失敗')
    } finally {
      setConverting(false)
    }
  }

  // 商品彙總表格
  const productColumns: ColumnType<ProductSummary>[] = [
    {
      title: '商品名稱',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 250,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.product_code} | {record.category}
          </div>
        </div>
      )
    },
    {
      title: '總需求',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 100,
      align: 'center',
      render: (qty) => <strong>{qty}</strong>
    },
    {
      title: '訂單數',
      dataIndex: 'order_count',
      key: 'order_count',
      width: 100,
      align: 'center'
    },
    {
      title: '客戶數',
      dataIndex: 'customer_count',
      key: 'customer_count',
      width: 100,
      align: 'center'
    },
    {
      title: '總金額',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 150,
      align: 'right',
      render: (amount) => <strong>NT$ {amount.toLocaleString()}</strong>
    }
  ]

  // 變體明細表格（展開列）
  const variantColumns: ColumnType<VariantSummary>[] = [
    {
      title: '變體',
      key: 'variant',
      width: 200,
      render: (_, record) => (
        <div style={{ paddingLeft: 20 }}>
          <Tag color="blue">{record.variant_code || record.variant_type}</Tag>
          {record.description && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              {record.description}
            </div>
          )}
        </div>
      )
    },
    {
      title: '數量',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 100,
      align: 'center'
    },
    {
      title: '訂單數',
      dataIndex: 'order_count',
      key: 'order_count',
      width: 100,
      align: 'center'
    },
    {
      title: '客戶數',
      dataIndex: 'customer_count',
      key: 'customer_count',
      width: 100,
      align: 'center'
    }
  ]

  // 客戶彙總表格
  const customerColumns: ColumnType<CustomerSummary>[] = [
    {
      title: '客戶',
      key: 'customer',
      width: 250,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.customer_name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.customer_code}
            {record.company && ` | ${record.company}`}
          </div>
        </div>
      )
    },
    {
      title: '訂單數',
      dataIndex: 'order_count',
      key: 'order_count',
      width: 100,
      align: 'center'
    },
    {
      title: '總數量',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 100,
      align: 'center'
    },
    {
      title: '總金額',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 150,
      align: 'right',
      render: (amount) => <strong>NT$ {amount.toLocaleString()}</strong>
    }
  ]

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="無法載入預購統計資料" />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <CalendarOutlined /> 預購訂單統計彙總
        </Title>
        <Space>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleBatchConvert}
            loading={converting}
            disabled={selectedSaleIds.length === 0}
          >
            批次轉換 {selectedSaleIds.length > 0 && `(${selectedSaleIds.length})`}
          </Button>
        </Space>
      </div>

      {/* 總覽卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="預購訂單數"
              value={data.overview.total_preorders}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="商品種類"
              value={data.overview.total_products}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="預購客戶數"
              value={data.overview.total_customers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="預購總金額"
              value={data.overview.total_amount}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#722ed1' }}
              formatter={(value) => `NT$ ${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs 切換視圖 */}
      <Tabs
        defaultActiveKey="product"
        items={[
          {
            key: 'product',
            label: (
              <span>
                <AppstoreOutlined />
                按商品彙總
              </span>
            ),
            children: (
              <Table
                dataSource={data.by_product}
                columns={productColumns}
                rowKey="product_id"
                expandable={{
                  expandedRowRender: (record) => (
                    <Table
                      dataSource={record.variants}
                      columns={variantColumns}
                      rowKey="variant_id"
                      pagination={false}
                      size="small"
                      expandable={{
                        expandedRowRender: (variant) => (
                          <div style={{ paddingLeft: 40 }}>
                            <Text strong>訂單明細：</Text>
                            <div style={{ marginTop: 8 }}>
                              {variant.orders.map((order) => (
                                <div key={order.sale_id} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid #d9d9d9', display: 'flex', alignItems: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedSaleIds.includes(order.sale_id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedSaleIds([...selectedSaleIds, order.sale_id])
                                      } else {
                                        setSelectedSaleIds(selectedSaleIds.filter(id => id !== order.sale_id))
                                      }
                                    }}
                                    style={{ marginRight: 12 }}
                                  />
                                  <Space size="middle">
                                    <Tag color="purple">{order.sale_number}</Tag>
                                    <Text>{order.customer_name}</Text>
                                    <Text>數量: {order.quantity}</Text>
                                    {order.expected_arrival_date && (
                                      <Text type="secondary">
                                        預計: {dayjs(order.expected_arrival_date).format('MM/DD')}
                                      </Text>
                                    )}
                                  </Space>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }}
                    />
                  )
                }}
                pagination={{ pageSize: 10 }}
              />
            )
          },
          {
            key: 'customer',
            label: (
              <span>
                <UserOutlined />
                按客戶彙總
              </span>
            ),
            children: (
              <Table
                dataSource={data.by_customer}
                columns={customerColumns}
                rowKey="customer_id"
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ paddingLeft: 20 }}>
                      {record.orders.map((order) => (
                        <Card key={order.sale_id} size="small" style={{ marginBottom: 8 }}>
                          <Row gutter={16}>
                            <Col span={8}>
                              <Space direction="vertical" size={0}>
                                <Tag color="purple">{order.sale_number}</Tag>
                                {order.expected_arrival_date && (
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    預計到貨: {dayjs(order.expected_arrival_date).format('YYYY/MM/DD')}
                                  </Text>
                                )}
                              </Space>
                            </Col>
                            <Col span={8}>
                              <Space direction="vertical" size={0}>
                                <Text type="secondary">商品數: {order.item_count}</Text>
                                <Text strong>NT$ {order.total_amount.toLocaleString()}</Text>
                              </Space>
                            </Col>
                            <Col span={8}>
                              <div>
                                {order.items.map((item, idx) => (
                                  <div key={idx} style={{ fontSize: '12px', color: '#666' }}>
                                    {item.product_name} {item.variant_code && `(${item.variant_code})`} x {item.quantity}
                                  </div>
                                ))}
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      ))}
                    </div>
                  )
                }}
                pagination={{ pageSize: 10 }}
              />
            )
          },
          {
            key: 'timeline',
            label: (
              <span>
                <CalendarOutlined />
                時間軸視圖
              </span>
            ),
            children: (
              <Timeline
                mode="left"
                items={data.by_timeline.map((item) => ({
                  label: item.date === 'unknown' ? '未指定' : dayjs(item.date).format('YYYY/MM/DD'),
                  children: (
                    <Card size="small">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Row gutter={16}>
                          <Col span={8}>
                            <Statistic
                              title="訂單數"
                              value={item.order_count}
                              valueStyle={{ fontSize: '18px' }}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="總數量"
                              value={item.total_quantity}
                              valueStyle={{ fontSize: '18px' }}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="總金額"
                              value={item.total_amount}
                              valueStyle={{ fontSize: '18px' }}
                              formatter={(value) => `NT$ ${Number(value).toLocaleString()}`}
                            />
                          </Col>
                        </Row>
                        <div style={{ marginTop: 12 }}>
                          {item.orders.map((order) => (
                            <div key={order.sale_id} style={{ marginBottom: 4 }}>
                              <Tag color="purple">{order.sale_number}</Tag>
                              <Text>{order.customer_name}</Text>
                              <Text type="secondary"> - {order.item_count} 項商品</Text>
                              <Text strong> NT$ {order.total_amount.toLocaleString()}</Text>
                            </div>
                          ))}
                        </div>
                      </Space>
                    </Card>
                  ),
                  color: item.date === 'unknown' ? 'gray' : 'blue'
                }))}
              />
            )
          }
        ]}
      />

      {/* 批次轉換結果 Modal */}
      <Modal
        title="批次轉換結果"
        open={convertModalVisible}
        onCancel={() => setConvertModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setConvertModalVisible(false)}>
            關閉
          </Button>
        ]}
        width={700}
      >
        {convertResult && (
          <div>
            {/* 成功的訂單 */}
            {convertResult.success.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <Title level={5} style={{ color: '#52c41a' }}>
                  ✅ 成功轉換（{convertResult.success.length} 張）
                </Title>
                {convertResult.success.map((item: any) => (
                  <div key={item.saleId} style={{ padding: 8, background: '#f6ffed', marginBottom: 8, borderRadius: 4 }}>
                    <Space>
                      <Tag color="purple">{item.saleNumber}</Tag>
                      <Text>{item.customer}</Text>
                      <Text type="secondary">（{item.itemCount} 項商品）</Text>
                    </Space>
                  </div>
                ))}
              </div>
            )}

            {/* 有警告的訂單 */}
            {convertResult.warnings.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <Title level={5} style={{ color: '#fa8c16' }}>
                  ⚠️ 成功但有警告（{convertResult.warnings.length} 張）
                </Title>
                {convertResult.warnings.map((item: any) => (
                  <div key={item.saleId} style={{ padding: 8, background: '#fffbe6', marginBottom: 8, borderRadius: 4 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Tag color="purple">{item.saleNumber}</Tag>
                        <Text>{item.customer}</Text>
                      </Space>
                      {item.warnings.map((warning: string, idx: number) => (
                        <Text key={idx} type="warning" style={{ fontSize: '12px' }}>
                          • {warning}
                        </Text>
                      ))}
                    </Space>
                  </div>
                ))}
              </div>
            )}

            {/* 失敗的訂單 */}
            {convertResult.failed.length > 0 && (
              <div>
                <Title level={5} style={{ color: '#ff4d4f' }}>
                  ❌ 轉換失敗（{convertResult.failed.length} 張）
                </Title>
                {convertResult.failed.map((item: any) => (
                  <div key={item.saleId} style={{ padding: 8, background: '#fff2f0', marginBottom: 8, borderRadius: 4 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Tag color="purple">{item.saleNumber}</Tag>
                        <Text>{item.customer}</Text>
                      </Space>
                      {item.errors.map((error: string, idx: number) => (
                        <Text key={idx} type="danger" style={{ fontSize: '12px' }}>
                          • {error}
                        </Text>
                      ))}
                    </Space>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
