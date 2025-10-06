'use client'

import React, { useEffect, useState } from 'react'
import { Card, Button, Descriptions, Tag, Alert, Spin, Space, Typography, Table, Collapse } from 'antd'
import { CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { Panel } = Collapse

export default function DBHealthPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  const loadHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/db-health')
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('載入健康檢查失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealth()
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>正在檢查資料庫健康狀態...</div>
      </div>
    )
  }

  if (!data) {
    return <Alert message="無法載入健康檢查資料" type="error" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'OK':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
      case 'WARNING':
        return <WarningOutlined style={{ color: '#faad14', fontSize: 24 }} />
      case 'ERROR':
        return <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 24 }} />
      default:
        return null
    }
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'OK':
        return <Tag color="success">{status}</Tag>
      case 'WARNING':
        return <Tag color="warning">{status}</Tag>
      case 'ERROR':
        return <Tag color="error">{status}</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>資料庫健康檢查</Title>
          <Button icon={<ReloadOutlined />} onClick={loadHealth}>
            重新檢查
          </Button>
        </div>

        {/* 整體狀態 */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {getStatusIcon(data.overall_health.status)}
            <div>
              <Title level={4} style={{ margin: 0 }}>
                整體健康狀態：{getStatusTag(data.overall_health.status)}
              </Title>
              <Text type="secondary">
                錯誤：{data.overall_health.errors_count} | 警告：{data.overall_health.warnings_count}
              </Text>
            </div>
          </div>
        </Card>

        {/* 錯誤和警告 */}
        {data.errors.length > 0 && (
          <Alert
            message="錯誤"
            description={
              <ul>
                {data.errors.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
          />
        )}

        {data.warnings.length > 0 && (
          <Alert
            message="警告"
            description={
              <ul>
                {data.warnings.map((warn: string, i: number) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            }
            type="warning"
            showIcon
          />
        )}

        {/* 表格狀態 */}
        <Card title="資料表狀態">
          <Collapse defaultActiveKey={['inventory', 'variants']}>
            {/* Inventory 表 */}
            <Panel
              header={
                <span>
                  Inventory 表 {getStatusTag(data.tables.inventory?.status || 'UNKNOWN')}
                </span>
              }
              key="inventory"
            >
              {data.tables.inventory?.exists ? (
                <>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="記錄數量">
                      {data.tables.inventory.count}
                    </Descriptions.Item>
                    <Descriptions.Item label="狀態">
                      {getStatusTag(data.tables.inventory.status)}
                    </Descriptions.Item>
                  </Descriptions>

                  {data.tables.inventory.samples && data.tables.inventory.samples.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <Title level={5}>樣本資料：</Title>
                      <Table
                        dataSource={data.tables.inventory.samples}
                        columns={[
                          { title: '商品', dataIndex: 'product_name', key: 'product_name' },
                          { title: '規格碼', dataIndex: 'variant_code', key: 'variant_code' },
                          { title: '倉庫', dataIndex: 'warehouse', key: 'warehouse' },
                          { title: '數量', dataIndex: 'quantity', key: 'quantity' },
                          { title: '可用', dataIndex: 'available', key: 'available' },
                          { title: '預留', dataIndex: 'reserved', key: 'reserved' }
                        ]}
                        pagination={false}
                        size="small"
                      />
                    </div>
                  )}
                </>
              ) : (
                <Alert
                  message="Inventory 表不存在"
                  description={data.tables.inventory?.error}
                  type="error"
                  showIcon
                />
              )}
            </Panel>

            {/* ProductVariant 表 */}
            <Panel
              header={
                <span>
                  ProductVariant 表 {getStatusTag(data.tables.product_variants?.status || 'UNKNOWN')}
                </span>
              }
              key="variants"
            >
              {data.tables.product_variants?.exists ? (
                <>
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="變體數量">
                      {data.tables.product_variants.count}
                    </Descriptions.Item>
                    <Descriptions.Item label="總庫存">
                      {data.tables.product_variants.total_stock}
                    </Descriptions.Item>
                    <Descriptions.Item label="最小庫存">
                      {data.tables.product_variants.min_stock}
                    </Descriptions.Item>
                    <Descriptions.Item label="最大庫存">
                      {data.tables.product_variants.max_stock}
                    </Descriptions.Item>
                  </Descriptions>

                  {data.tables.product_variants.negative_samples && (
                    <div style={{ marginTop: 16 }}>
                      <Alert
                        message="發現負數庫存"
                        description={
                          <Table
                            dataSource={data.tables.product_variants.negative_samples}
                            columns={[
                              {
                                title: '商品',
                                dataIndex: ['product', 'name'],
                                key: 'product_name'
                              },
                              {
                                title: '規格碼',
                                dataIndex: 'variant_code',
                                key: 'variant_code'
                              },
                              {
                                title: '庫存數量',
                                dataIndex: 'stock_quantity',
                                key: 'stock_quantity',
                                render: (val: number) => (
                                  <Text type="danger">{val}</Text>
                                )
                              }
                            ]}
                            pagination={false}
                            size="small"
                          />
                        }
                        type="warning"
                        showIcon
                      />
                    </div>
                  )}
                </>
              ) : (
                <Alert message="ProductVariant 表無法訪問" type="error" showIcon />
              )}
            </Panel>
          </Collapse>
        </Card>

        {/* 資料一致性 */}
        {data.consistency?.inventory_vs_variant && (
          <Card title="資料一致性檢查">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Inventory 總量">
                {data.consistency.inventory_vs_variant.inventory_total}
              </Descriptions.Item>
              <Descriptions.Item label="ProductVariant 總量">
                {data.consistency.inventory_vs_variant.variant_total}
              </Descriptions.Item>
              <Descriptions.Item label="差異">
                <Text
                  type={data.consistency.inventory_vs_variant.difference === 0 ? 'success' : 'warning'}
                >
                  {data.consistency.inventory_vs_variant.difference}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="狀態">
                {getStatusTag(data.consistency.inventory_vs_variant.status)}
              </Descriptions.Item>
            </Descriptions>

            {data.consistency.missing_inventory_samples && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  message="有 Variant 缺少 Inventory 記錄"
                  description={
                    <Table
                      dataSource={data.consistency.missing_inventory_samples}
                      columns={[
                        { title: '商品', dataIndex: 'product_name', key: 'product_name' },
                        { title: '規格碼', dataIndex: 'variant_code', key: 'variant_code' },
                        {
                          title: 'ProductVariant 庫存',
                          dataIndex: 'stock_quantity',
                          key: 'stock_quantity'
                        }
                      ]}
                      pagination={false}
                      size="small"
                    />
                  }
                  type="warning"
                  showIcon
                />
              </div>
            )}
          </Card>
        )}

        {/* 最近的庫存異動 */}
        {data.tables.inventory_movements?.exists && (
          <Card title="最近的庫存異動">
            <Table
              dataSource={data.tables.inventory_movements.recent_movements}
              columns={[
                { title: '商品', dataIndex: 'variant', key: 'variant' },
                { title: '類型', dataIndex: 'type', key: 'type' },
                { title: '調整', dataIndex: 'adjustment', key: 'adjustment' },
                {
                  title: '數量變化',
                  dataIndex: 'quantity_change',
                  key: 'quantity_change',
                  render: (val: number) => (
                    <Text type={val > 0 ? 'success' : 'danger'}>
                      {val > 0 ? '+' : ''}{val}
                    </Text>
                  )
                },
                { title: '倉庫', dataIndex: 'warehouse', key: 'warehouse' },
                { title: '原因', dataIndex: 'reason', key: 'reason' },
                {
                  title: '時間',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  render: (val: string) => new Date(val).toLocaleString('zh-TW')
                }
              ]}
              pagination={false}
              size="small"
            />
          </Card>
        )}

        {/* 檢查時間 */}
        <Text type="secondary">
          檢查時間：{new Date(data.timestamp).toLocaleString('zh-TW')}
        </Text>
      </Space>
    </div>
  )
}
