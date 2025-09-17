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
  Divider
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'

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
  totalAmount: number
  status: string
  declarationNumber?: string
  declarationDate?: string
  notes?: string
  createdAt: string
  items: PurchaseItem[]
  _count: { items: number }
}

interface PurchaseItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
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
    orderBy: 'createdAt',
    order: 'desc'
  })

  // Modal狀態
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [form] = Form.useForm()

  // 載入採購單列表
  const loadPurchases = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value))
        }
      })

      const response = await fetch(`/api/purchases?${queryParams}`)
      const result = await response.json()

      if (result.success) {
        setPurchases(result.data.purchases)
        setTotal(result.data.total)
      } else {
        message.error(result.error || '載入失敗')
      }
    } catch (error) {
      message.error('載入採購單列表失敗')
      console.error(error)
    } finally {
      setLoading(false)
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
            {dayjs(record.createdAt).format('YYYY/MM/DD')}
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
            {record.currency} {record.totalAmount.toLocaleString()}
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

          {/* 編輯按鈕 - 只有草稿和待審狀態可編輯 */}
          {['DRAFT', 'PENDING'].includes(record.status) &&
           session?.user?.role !== 'INVESTOR' && (
            <Tooltip title="編輯">
              <Button
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
          )}

          {/* 確認按鈕 - 草稿和待審狀態可確認 */}
          {['DRAFT', 'PENDING'].includes(record.status) &&
           session?.user?.role !== 'INVESTOR' && (
            <Tooltip title="確認採購單">
              <Button
                icon={<CheckOutlined />}
                size="small"
                type="primary"
                onClick={() => handleConfirm(record)}
              />
            </Tooltip>
          )}

          {/* 刪除按鈕 - 只有超級管理員可刪除草稿 */}
          {record.status === 'DRAFT' && session?.user?.role === 'SUPER_ADMIN' && (
            <Popconfirm
              title="確定要刪除此採購單嗎？"
              onConfirm={() => handleDelete(record.id)}
              okText="確定"
              cancelText="取消"
            >
              <Tooltip title="刪除">
                <Button
                  icon={<DeleteOutlined />}
                  size="small"
                  danger
                />
              </Tooltip>
            </Popconfirm>
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
    if (purchase) {
      form.setFieldsValue({
        ...purchase,
        declarationDate: purchase.declarationDate ? dayjs(purchase.declarationDate) : null
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        currency: 'JPY',
        exchangeRate: 0.2,
        fundingSource: 'COMPANY'
      })
    }
    setModalVisible(true)
  }

  // 處理確認採購單
  const handleConfirm = async (purchase: Purchase) => {
    try {
      const response = await fetch(`/api/purchases/${purchase.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'confirm' })
      })

      const result = await response.json()

      if (result.success) {
        message.success('採購單確認成功')
        loadPurchases()
      } else {
        message.error(result.error || '確認失敗')
      }
    } catch (error) {
      console.error('確認採購單失敗:', error)
      message.error('確認失敗')
    }
  }

  // 處理刪除
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/purchases/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        message.success('採購單已刪除')
        loadPurchases()
      } else {
        message.error(result.error || '刪除失敗')
      }
    } catch (error) {
      console.error('刪除採購單失敗:', error)
      message.error('刪除失敗')
    }
  }

  // 處理儲存
  const handleSave = async (values: any) => {
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
        body: JSON.stringify({
          ...values,
          declarationDate: values.declarationDate?.toISOString(),
          items: [] // 基礎版本暫時不處理採購明細
        })
      })

      const result = await response.json()

      if (result.success) {
        message.success(editingPurchase ? '採購單更新成功' : '採購單創建成功')
        setModalVisible(false)
        setEditingPurchase(null)
        form.resetFields()
        loadPurchases()
      } else {
        message.error(result.error || '操作失敗')
      }
    } catch (error) {
      console.error('儲存採購單失敗:', error)
      message.error('操作失敗')
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextOutlined />
            採購管理
          </div>
        }
        extra={
          <Space>
            <Search
              placeholder="搜尋採購單號、供應商..."
              allowClear
              style={{ width: 250 }}
              onSearch={(value) => setFilters(prev => ({ ...prev, search: value, page: 1 }))}
            />
            {session?.user?.role !== 'INVESTOR' && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleEdit()}
              >
                新增採購單
              </Button>
            )}
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={purchases}
          rowKey="id"
          loading={loading}
          pagination={{
            current: filters.page,
            pageSize: filters.limit,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
            onChange: (page, limit) =>
              setFilters(prev => ({ ...prev, page, limit }))
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新增/編輯採購單Modal */}
      <Modal
        title={editingPurchase ? '編輯採購單' : '新增採購單'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingPurchase(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="supplier"
            label="供應商"
            rules={[{ required: true, message: '請輸入供應商' }]}
          >
            <Input placeholder="請輸入供應商名稱" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="currency"
              label="幣別"
              style={{ flex: 1 }}
              rules={[{ required: true, message: '請選擇幣別' }]}
            >
              <Select placeholder="請選擇幣別">
                <Option value="JPY">日圓 (JPY)</Option>
                <Option value="USD">美元 (USD)</Option>
                <Option value="EUR">歐元 (EUR)</Option>
                <Option value="GBP">英鎊 (GBP)</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="exchangeRate"
              label="匯率"
              style={{ flex: 1 }}
              rules={[{ required: true, message: '請輸入匯率' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="請輸入匯率"
                step={0.01}
                min={0}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="fundingSource"
            label="資金來源"
            rules={[{ required: true, message: '請選擇資金來源' }]}
          >
            <Select placeholder="請選擇資金來源">
              <Option value="COMPANY">公司資金</Option>
              <Option value="PERSONAL">個人調貨</Option>
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="declarationNumber"
              label="報單號碼"
              style={{ flex: 1 }}
            >
              <Input placeholder="請輸入報單號碼" />
            </Form.Item>

            <Form.Item
              name="declarationDate"
              label="報關日期"
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item
            name="notes"
            label="備註"
          >
            <TextArea rows={3} placeholder="請輸入備註資訊" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看詳情Modal */}
      <Modal
        title="採購單詳情"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false)
          setEditingPurchase(null)
        }}
        footer={null}
        width={800}
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
                <div><strong>總金額：</strong>{editingPurchase.currency} {editingPurchase.totalAmount.toLocaleString()}</div>
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
                      dataIndex: 'productName',
                      key: 'productName'
                    },
                    {
                      title: '數量',
                      dataIndex: 'quantity',
                      key: 'quantity',
                      width: 80,
                      align: 'center'
                    },
                    {
                      title: '單價',
                      dataIndex: 'unitPrice',
                      key: 'unitPrice',
                      width: 100,
                      align: 'right',
                      render: (price: number) => price.toLocaleString()
                    },
                    {
                      title: '小計',
                      dataIndex: 'totalPrice',
                      key: 'totalPrice',
                      width: 100,
                      align: 'right',
                      render: (price: number) => price.toLocaleString()
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