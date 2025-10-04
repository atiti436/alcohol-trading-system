'use client'

import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Input,
  Button,
  Space,
  Table,
  Alert,
  Divider,
  Card,
  Tag,
  Collapse
} from 'antd'
import {
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'

const { Option } = Select
const { TextArea } = Input

interface PurchaseItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  product?: {
    id: string
    name: string
  }
}

interface Purchase {
  id: string
  purchaseNumber: string
  supplier: string
  currency: string
  exchangeRate: number
  total_amount: number
  items: PurchaseItem[]
}

interface ItemDamage {
  productId: string
  productName: string
  orderedQuantity: number
  damagedQuantity: number
}

interface ReceiveGoodsModalProps {
  visible: boolean
  purchase: Purchase | null
  onCancel: () => void
  onSubmit: (data: any) => Promise<void>
  loading?: boolean
}

export const ReceiveGoodsModal: React.FC<ReceiveGoodsModalProps> = ({
  visible,
  purchase,
  onCancel,
  onSubmit,
  loading = false
}) => {
  const [form] = Form.useForm()
  const [itemDamages, setItemDamages] = useState<ItemDamage[]>([])
  const [totalDamaged, setTotalDamaged] = useState(0)
  const [hasDamage, setHasDamage] = useState(false)

  useEffect(() => {
    if (visible && purchase) {
      // 初始化表單
      const totalQuantity = purchase.items.reduce((sum, item) => sum + item.quantity, 0)

      form.setFieldsValue({
        actual_quantity: totalQuantity,
        exchange_rate: purchase.exchangeRate || 1.0,
        loss_type: 'NONE',
        loss_quantity: 0,
        inspection_fee: 0,
        allocation_method: 'BY_AMOUNT',
        preorder_mode: 'MANUAL' // 預設為手動分配模式
      })

      // 初始化商品毀損列表
      const damages: ItemDamage[] = purchase.items.map(item => ({
        productId: item.product?.id || item.id,
        productName: item.product_name,
        orderedQuantity: item.quantity,
        damagedQuantity: 0
      }))
      setItemDamages(damages)
      setTotalDamaged(0)
      setHasDamage(false)
    }
  }, [visible, purchase, form])

  // 更新單個商品的毀損數量
  const updateItemDamage = (productId: string, damagedQty: number) => {
    const updated = itemDamages.map(item =>
      item.productId === productId
        ? { ...item, damagedQuantity: damagedQty }
        : item
    )
    setItemDamages(updated)

    const total = updated.reduce((sum, item) => sum + item.damagedQuantity, 0)
    setTotalDamaged(total)

    // 更新表單總毀損數量
    form.setFieldsValue({ loss_quantity: total })

    // 如果有毀損，自動設定損耗類型
    if (total > 0) {
      setHasDamage(true)
      if (form.getFieldValue('loss_type') === 'NONE') {
        form.setFieldsValue({ loss_type: 'DAMAGE' })
      }
    } else {
      setHasDamage(false)
      form.setFieldsValue({ loss_type: 'NONE' })
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // 準備提交數據，包含每個商品的毀損明細
      const submitData = {
        ...values,
        item_damages: itemDamages
          .filter(item => item.damagedQuantity > 0)
          .map(item => ({
            product_id: item.productId,
            damaged_quantity: item.damagedQuantity
          }))
      }

      await onSubmit(submitData)
      form.resetFields()
      setItemDamages([])
      setTotalDamaged(0)
      setHasDamage(false)
    } catch (error) {
      console.error('表單驗證失敗:', error)
    }
  }

  if (!purchase) return null

  const totalQuantity = purchase.items.reduce((sum, item) => sum + item.quantity, 0)
  const availableQuantity = totalQuantity - totalDamaged

  // 毀損商品明細表格
  const damageColumns = [
    {
      title: '商品名稱',
      dataIndex: 'productName',
      key: 'productName',
      width: 200
    },
    {
      title: '訂購數量',
      dataIndex: 'orderedQuantity',
      key: 'orderedQuantity',
      width: 100,
      align: 'center' as const
    },
    {
      title: '毀損數量',
      key: 'damagedQuantity',
      width: 150,
      render: (record: ItemDamage) => (
        <InputNumber
          min={0}
          max={record.orderedQuantity}
          value={record.damagedQuantity}
          onChange={(value) => updateItemDamage(record.productId, value || 0)}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '可用數量',
      key: 'available',
      width: 100,
      align: 'center' as const,
      render: (record: ItemDamage) => (
        <span style={{ fontWeight: 'bold', color: record.damagedQuantity > 0 ? '#fa8c16' : '#52c41a' }}>
          {record.orderedQuantity - record.damagedQuantity}
        </span>
      )
    }
  ]

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircleOutlined />
          <span>進貨收貨作業</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          確認收貨
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        {/* 採購單資訊 */}
        <Alert
          type="info"
          message={
            <div>
              <div><strong>採購單號：</strong>{purchase.purchaseNumber}</div>
              <div><strong>供應商：</strong>{purchase.supplier}</div>
              <div><strong>訂購總數：</strong>{totalQuantity} 件</div>
            </div>
          }
          style={{ marginBottom: 16 }}
        />

        {/* 收貨基本資訊 */}
        <Card size="small" title="收貨資訊" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="實際收貨數量"
              name="actual_quantity"
              rules={[{ required: true, message: '請輸入實際收貨數量' }]}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                addonAfter="件"
              />
            </Form.Item>

            <Form.Item
              label="實際匯率"
              name="exchange_rate"
              rules={[{ required: true, message: '請輸入實際匯率' }]}
            >
              <InputNumber
                min={0.01}
                step={0.01}
                precision={2}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              label="檢驗費"
              name="inspection_fee"
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                addonBefore="NT$"
              />
            </Form.Item>

            <Form.Item
              label="費用分攤方式"
              name="allocation_method"
            >
              <Select>
                <Option value="BY_AMOUNT">按金額分攤</Option>
                <Option value="BY_QUANTITY">按數量分攤</Option>
                <Option value="BY_WEIGHT">按重量分攤</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="預購單處理"
              name="preorder_mode"
              tooltip="收貨後如何處理等待的預購單"
            >
              <Select>
                <Option value="MANUAL">🎯 手動分配（可選客戶優先順序）</Option>
                <Option value="AUTO">⚡ 自動分配（先到先得）</Option>
                <Option value="SKIP">⏸️ 暫不處理（稍後手動）</Option>
              </Select>
            </Form.Item>
          </div>
        </Card>

        {/* 毀損處理 */}
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <WarningOutlined />
              <span>毀損商品處理</span>
              {hasDamage && (
                <Tag color="orange">
                  共 {totalDamaged} 件毀損
                </Tag>
              )}
            </div>
          }
          style={{ marginBottom: 16 }}
        >
          <Alert
            type="warning"
            message="毀損商品將自動調撥到盒損變體（00X），價格為原價 80%"
            style={{ marginBottom: 12 }}
            showIcon
          />

          <Table
            size="small"
            dataSource={itemDamages}
            columns={damageColumns}
            rowKey="productId"
            pagination={false}
            bordered
          />

          <Divider />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="損耗類型"
              name="loss_type"
            >
              <Select disabled={totalDamaged > 0}>
                <Option value="NONE">無損耗</Option>
                <Option value="DAMAGE">運輸損壞</Option>
                <Option value="SHORTAGE">數量短缺</Option>
                <Option value="QUALITY">品質問題</Option>
                <Option value="CUSTOM">其他</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="總損耗數量"
              name="loss_quantity"
            >
              <InputNumber
                disabled
                style={{ width: '100%' }}
                addonAfter="件"
              />
            </Form.Item>
          </div>
        </Card>

        {/* 收貨統計 */}
        <Alert
          type={hasDamage ? 'warning' : 'success'}
          icon={hasDamage ? <WarningOutlined /> : <CheckCircleOutlined />}
          message={
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>訂購總數：</strong>{totalQuantity} 件
              </div>
              {hasDamage && (
                <div style={{ color: '#fa8c16' }}>
                  <strong>毀損：</strong>{totalDamaged} 件
                </div>
              )}
              <div style={{ color: hasDamage ? '#fa8c16' : '#52c41a' }}>
                <strong>可用庫存：</strong>{availableQuantity} 件
              </div>
            </div>
          }
        />

        {hasDamage && (
          <Alert
            type="info"
            icon={<InfoCircleOutlined />}
            message="系統將自動執行以下操作："
            description={
              <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                <li>將毀損商品調撥至 00X 盒損變體</li>
                <li>優先處理缺貨訂單（BACKORDER）補貨</li>
                <li>自動轉換剩餘預購單</li>
                <li>建立庫存異動記錄</li>
              </ul>
            }
            style={{ marginTop: 16 }}
          />
        )}
      </Form>
    </Modal>
  )
}
