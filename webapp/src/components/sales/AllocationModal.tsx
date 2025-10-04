'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Button,
  Space,
  Table,
  Alert,
  Divider,
  Card,
  Tag,
  Statistic,
  Row,
  Col,
  message,
  Spin
} from 'antd'
import {
  CalculatorOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'

const { Option } = Select

interface PreorderItem {
  saleId: string
  saleNumber: string
  customerName: string
  requestedQuantity: number
  allocatedQuantity: number
  shortageQuantity: number
  fulfillmentRate: number
  createdAt?: string
  customerPriority?: number
}

interface AllocationStats {
  totalRequested: number
  totalAllocated: number
  totalShortage: number
  fullyFulfilled: number
  partiallyFulfilled: number
  notFulfilled: number
}

interface AllocationResult {
  variantId: string
  availableStock: number
  strategy: string
  allocation: PreorderItem[]
  stats: AllocationStats
}

interface AllocationModalProps {
  visible: boolean
  variantId: string | null
  variantName?: string
  availableStock: number
  onCancel: () => void
  onExecute: (allocations: any[]) => Promise<void>
}

export const AllocationModal: React.FC<AllocationModalProps> = ({
  visible,
  variantId,
  variantName,
  availableStock,
  onCancel,
  onExecute
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null)
  const [editedAllocations, setEditedAllocations] = useState<PreorderItem[]>([])
  const [currentStats, setCurrentStats] = useState<AllocationStats | null>(null)

  // 計算分配建議
  const handleCalculate = useCallback(async (strategy?: string) => {
    if (!variantId) return

    setCalculating(true)
    try {
      const selectedStrategy = strategy || form.getFieldValue('strategy')
      const stock = form.getFieldValue('availableStock') || availableStock

      const response = await fetch('/api/sales/preorders/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          availableStock: stock,
          strategy: selectedStrategy
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setAllocationResult(result.data)
        setEditedAllocations(result.data.allocation)
        setCurrentStats(result.data.stats)
      } else {
        message.error(result.error || '計算分配失敗')
      }
    } catch (error) {
      console.error('計算分配失敗:', error)
      message.error('計算分配失敗')
    } finally {
      setCalculating(false)
    }
  }, [variantId, availableStock, form])

  // 自動初始化
  useEffect(() => {
    if (visible && variantId) {
      form.setFieldsValue({
        strategy: 'PROPORTIONAL',
        availableStock: availableStock
      })
      handleCalculate('PROPORTIONAL')
    }
  }, [visible, variantId, availableStock, form, handleCalculate])

  // 手動調整單筆分配數量
  const handleManualAdjust = (saleId: string, newAllocated: number) => {
    const updated = editedAllocations.map(item => {
      if (item.saleId === saleId) {
        const shortage = Math.max(0, item.requestedQuantity - newAllocated)
        return {
          ...item,
          allocatedQuantity: newAllocated,
          shortageQuantity: shortage,
          fulfillmentRate: item.requestedQuantity > 0 ? newAllocated / item.requestedQuantity : 0
        }
      }
      return item
    })

    setEditedAllocations(updated)

    // 重新計算統計
    const totalAllocated = updated.reduce((sum, item) => sum + item.allocatedQuantity, 0)
    const totalShortage = updated.reduce((sum, item) => sum + item.shortageQuantity, 0)
    const fullyFulfilled = updated.filter(item => item.fulfillmentRate === 1).length
    const partiallyFulfilled = updated.filter(item => item.fulfillmentRate > 0 && item.fulfillmentRate < 1).length
    const notFulfilled = updated.filter(item => item.fulfillmentRate === 0).length

    setCurrentStats({
      totalRequested: currentStats?.totalRequested || 0,
      totalAllocated,
      totalShortage,
      fullyFulfilled,
      partiallyFulfilled,
      notFulfilled
    })
  }

  // 執行分配
  const handleExecute = async () => {
    if (!editedAllocations.length) {
      message.warning('沒有可執行的分配')
      return
    }

    setLoading(true)
    try {
      const allocations = editedAllocations.map(item => ({
        saleId: item.saleId,
        allocatedQuantity: item.allocatedQuantity,
        shortageQuantity: item.shortageQuantity
      }))

      await onExecute(allocations)
      message.success('分配執行成功')
      onCancel()
    } catch (error) {
      console.error('執行分配失敗:', error)
      message.error('執行分配失敗')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: '銷售單號',
      dataIndex: 'saleNumber',
      key: 'saleNumber',
      width: 120,
      fixed: 'left' as const
    },
    {
      title: '客戶',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 120
    },
    {
      title: '需求數量',
      dataIndex: 'requestedQuantity',
      key: 'requestedQuantity',
      width: 100,
      align: 'center' as const
    },
    {
      title: '分配數量',
      key: 'allocatedQuantity',
      width: 150,
      render: (record: PreorderItem) => (
        <InputNumber
          min={0}
          max={record.requestedQuantity}
          value={record.allocatedQuantity}
          onChange={(value) => handleManualAdjust(record.saleId, value || 0)}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '缺貨數量',
      dataIndex: 'shortageQuantity',
      key: 'shortageQuantity',
      width: 100,
      align: 'center' as const,
      render: (qty: number) => (
        <span style={{ color: qty > 0 ? '#fa8c16' : '#52c41a' }}>
          {qty}
        </span>
      )
    },
    {
      title: '滿足率',
      dataIndex: 'fulfillmentRate',
      key: 'fulfillmentRate',
      width: 100,
      align: 'center' as const,
      render: (rate: number) => {
        let color = '#52c41a'
        if (rate === 0) color = '#ff4d4f'
        else if (rate < 1) color = '#fa8c16'

        return (
          <Tag color={color}>
            {(rate * 100).toFixed(0)}%
          </Tag>
        )
      }
    },
    {
      title: '狀態',
      key: 'status',
      width: 100,
      render: (record: PreorderItem) => {
        if (record.fulfillmentRate === 1) {
          return <Tag icon={<CheckCircleOutlined />} color="success">完全滿足</Tag>
        } else if (record.fulfillmentRate > 0) {
          return <Tag icon={<WarningOutlined />} color="warning">部分滿足</Tag>
        } else {
          return <Tag icon={<CloseCircleOutlined />} color="error">無法滿足</Tag>
        }
      }
    }
  ]

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalculatorOutlined />
          <span>智能分配</span>
          {variantName && <Tag color="blue">{variantName}</Tag>}
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="recalculate"
          onClick={() => handleCalculate()}
          loading={calculating}
        >
          重新計算
        </Button>,
        <Button
          key="execute"
          type="primary"
          loading={loading}
          onClick={handleExecute}
          disabled={!editedAllocations.length}
        >
          執行分配
        </Button>
      ]}
    >
      <Spin spinning={calculating} tip="計算分配中...">
        {/* 分配策略選擇 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Form form={form} layout="inline">
            <Form.Item label="可用庫存" name="availableStock">
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item label="分配策略" name="strategy">
              <Select style={{ width: 200 }} onChange={handleCalculate}>
                <Option value="PROPORTIONAL">按比例分配</Option>
                <Option value="PRIORITY">按優先級分配</Option>
                <Option value="FCFS">先到先得</Option>
              </Select>
            </Form.Item>
          </Form>

          <Alert
            type="info"
            message="分配策略說明"
            description={
              <ul style={{ marginBottom: 0, paddingLeft: 20, fontSize: '12px' }}>
                <li><strong>按比例分配：</strong>每個訂單按需求比例公平分配</li>
                <li><strong>按優先級分配：</strong>VIP 客戶和早下單的優先</li>
                <li><strong>先到先得：</strong>嚴格按下單時間順序滿足</li>
              </ul>
            }
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* 統計資訊 */}
        {currentStats && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="總需求"
                  value={currentStats.totalRequested}
                  suffix="件"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="已分配"
                  value={currentStats.totalAllocated}
                  suffix="件"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="缺貨數"
                  value={currentStats.totalShortage}
                  suffix="件"
                  valueStyle={{ color: currentStats.totalShortage > 0 ? '#fa8c16' : '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>滿足情況</div>
                  <Space size="small" style={{ marginTop: 8 }}>
                    <Tag color="success">{currentStats.fullyFulfilled}</Tag>
                    <Tag color="warning">{currentStats.partiallyFulfilled}</Tag>
                    <Tag color="error">{currentStats.notFulfilled}</Tag>
                  </Space>
                </div>
              </Col>
            </Row>
          </Card>
        )}

        {/* 分配明細表格 */}
        {editedAllocations.length > 0 ? (
          <Table
            size="small"
            dataSource={editedAllocations}
            columns={columns}
            rowKey="saleId"
            pagination={false}
            scroll={{ x: 800, y: 400 }}
            bordered
          />
        ) : (
          <Alert
            type="info"
            message="沒有待分配的預購單"
            description="此商品目前沒有預購訂單需要分配"
          />
        )}

        {/* 操作提示 */}
        {editedAllocations.length > 0 && (
          <Alert
            type="warning"
            message="注意事項"
            description={
              <ul style={{ marginBottom: 0, paddingLeft: 20, fontSize: '12px' }}>
                <li>可以手動調整每個訂單的分配數量</li>
                <li>部分滿足的訂單將自動建立 BACKORDER 記錄</li>
                <li>執行分配後將預留庫存並更新訂單狀態</li>
                <li>無法滿足的訂單將保持 PREORDER 狀態</li>
              </ul>
            }
            style={{ marginTop: 16 }}
          />
        )}
      </Spin>
    </Modal>
  )
}
