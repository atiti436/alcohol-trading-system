'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Tooltip
} from 'antd'
import {
  CreditCardOutlined,
  PlusOutlined,
  EditOutlined,
  PayCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  CalendarOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import { SecurePriceDisplay } from '@/components/common/SecurePriceDisplay'
import { SuperAdminOnly } from '@/components/auth/RoleGuard'
import type { ColumnType } from 'antd/es/table'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

interface AccountsPayable {
  id: string
  ap_number: string
  purchase_id: string
  supplier_name: string
  original_amount: number
  remaining_amount: number
  due_date: string
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'PARTIAL'
  days_past_due: number
  notes?: string
  created_at: string
  purchase: {
    purchase_number: string
    total_amount: number
    status: string
  }
  payments: SupplierPayment[]
}

interface SupplierPayment {
  id: string
  payment_number: string
  payment_amount: number
  payment_date: string
  payment_method: string
  reference_number?: string
  notes?: string
}

interface PayableStats {
  total_pending: number
  total_overdue: number
  total_partial: number
  count_pending: number
  count_overdue: number
  average_days_overdue: number
}

export default function PayablesPage() {
  const { data: session } = useSession()
  const [payables, setPayables] = useState<AccountsPayable[]>([])
  const [stats, setStats] = useState<PayableStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [selectedPayable, setSelectedPayable] = useState<AccountsPayable | null>(null)
  const [form] = Form.useForm()

  // 篩選狀態
  const [filters, setFilters] = useState({
    status: '',
    supplier: '',
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null
  })

  // 載入應付帳款列表
  const loadPayables = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.supplier) params.append('supplier', filters.supplier)
      if (filters.dateRange) {
        params.append('date_from', filters.dateRange[0].format('YYYY-MM-DD'))
        params.append('date_to', filters.dateRange[1].format('YYYY-MM-DD'))
      }

      const response = await fetch(`/api/finance/payables?${params}`)
      const result = await response.json()

      if (response.ok && result.success) {
        // 確保資料結構正確
        const payablesData = Array.isArray(result.data?.payables) ? result.data.payables : []
        const filteredPayables = payablesData.filter((item: any) => item && typeof item === 'object' && item.id)

        setPayables(filteredPayables)
        setStats(result.data.stats || {
          total_pending: 0,
          total_overdue: 0,
          total_partial: 0,
          count_pending: 0,
          count_overdue: 0,
          average_days_overdue: 0
        })
      } else {
        console.error('API錯誤:', result)
        message.error(result.error || '載入失敗')
        // 暫時顯示空資料
        setPayables([])
        setStats({
          total_pending: 0,
          total_overdue: 0,
          total_partial: 0,
          count_pending: 0,
          count_overdue: 0,
          average_days_overdue: 0
        })
      }
    } catch (error) {
      console.error('載入應付帳款失敗:', error)
      message.error('載入失敗，請檢查網路連線')
      setPayables([])
      setStats({
        total_pending: 0,
        total_overdue: 0,
        total_partial: 0,
        count_pending: 0,
        count_overdue: 0,
        average_days_overdue: 0
      })
    } finally {
      setLoading(false)
    }
  }

  // 記錄付款給供應商
  const handleMakePayment = async (values: any) => {
    if (!selectedPayable) return

    try {
      const response = await fetch(`/api/finance/payables/${selectedPayable.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          payment_date: values.payment_date.format('YYYY-MM-DD')
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        message.success('付款記錄新增成功')
        setPaymentModalVisible(false)
        setSelectedPayable(null)
        form.resetFields()
        await loadPayables()
      } else {
        message.error(result.error || '新增失敗')
      }
    } catch (error) {
      console.error('新增付款記錄失敗:', error)
      message.error('新增失敗，請檢查網路連線')
    }
  }

  // 狀態標籤渲染
  const renderStatusTag = (status: string, daysPastDue: number) => {
    const statusConfig = {
      PENDING: { color: 'blue', text: '待付款' },
      OVERDUE: { color: 'red', text: `逾期${daysPastDue}天` },
      PARTIAL: { color: 'orange', text: '部分付款' },
      PAID: { color: 'green', text: '已付款' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // 表格欄位定義
  const columns: ColumnType<AccountsPayable>[] = [
    {
      title: '應付帳款編號',
      dataIndex: 'ap_number',
      key: 'ap_number',
      width: 150,
      fixed: 'left'
    },
    {
      title: '供應商',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      width: 180,
      render: (text: string) => (
        <div style={{ fontWeight: 'bold' }}>{text || '-'}</div>
      )
    },
    {
      title: '關聯採購單',
      key: 'purchase_number',
      width: 140,
      render: (record: AccountsPayable) => (
        record.purchase?.purchase_number || '-'
      )
    },
    {
      title: '原始金額',
      key: 'original_amount',
      width: 120,
      align: 'right',
      render: (record: AccountsPayable) => (
        <SecurePriceDisplay amount={record.original_amount} />
      )
    },
    {
      title: '未付金額',
      key: 'remaining_amount',
      width: 120,
      align: 'right',
      render: (record: AccountsPayable) => (
        <SecurePriceDisplay
          amount={record.remaining_amount}
          style={{
            color: record.remaining_amount > 0 ? '#ff4d4f' : '#52c41a',
            fontWeight: 'bold'
          }}
        />
      )
    },
    {
      title: '到期日',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 110,
      render: (date: string) => {
        const dueDate = dayjs(date)
        const isOverdue = dueDate.isBefore(dayjs(), 'day')
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {dueDate.format('YYYY-MM-DD')}
          </span>
        )
      }
    },
    {
      title: '狀態',
      key: 'status',
      width: 120,
      render: (record: AccountsPayable) => renderStatusTag(record.status, record.days_past_due)
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (record: AccountsPayable) => (
        <Space size="small">
          {record.remaining_amount > 0 && (
            <Button
              type="primary"
              size="small"
              icon={<PayCircleOutlined />}
              onClick={() => {
                setSelectedPayable(record)
                setPaymentModalVisible(true)
                form.setFieldsValue({
                  payment_amount: record.remaining_amount,
                  payment_date: dayjs(),
                  payment_method: 'BANK_TRANSFER'
                })
              }}
            >
              付款
            </Button>
          )}
        </Space>
      )
    }
  ]

  useEffect(() => {
    loadPayables()
  }, [filters])

  return (
    <SuperAdminOnly>
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2}>
            <CreditCardOutlined style={{ marginRight: 8 }} />
            應付帳款管理
          </Title>
          <Text type="secondary">
            管理供應商付款、追蹤採購欠款、記錄付款紀錄
          </Text>
        </div>

        {/* 統計卡片 */}
        {stats && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} lg={6}>
              <Card>
                <Statistic
                  title="待付金額"
                  value={stats.total_pending}
                  precision={0}
                  prefix={<CreditCardOutlined />}
                  formatter={(value) => `$${Number(value).toLocaleString()}`}
                  valueStyle={{ color: '#faad14' }}
                />
                <Text type="secondary">{stats.count_pending} 筆</Text>
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card>
                <Statistic
                  title="逾期金額"
                  value={stats.total_overdue}
                  precision={0}
                  prefix={<ExclamationCircleOutlined />}
                  formatter={(value) => `$${Number(value).toLocaleString()}`}
                  valueStyle={{ color: '#ff4d4f' }}
                />
                <Text type="secondary">{stats.count_overdue} 筆</Text>
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card>
                <Statistic
                  title="部分付款"
                  value={stats.total_partial}
                  precision={0}
                  prefix={<PayCircleOutlined />}
                  formatter={(value) => `$${Number(value).toLocaleString()}`}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card>
                <Statistic
                  title="平均逾期天數"
                  value={stats.average_days_overdue}
                  precision={1}
                  suffix="天"
                  prefix={<CalendarOutlined />}
                  valueStyle={{
                    color: stats.average_days_overdue > 30 ? '#ff4d4f' : '#52c41a'
                  }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* 篩選工具列 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              <Space>
                <Select
                  placeholder="狀態篩選"
                  style={{ width: 120 }}
                  allowClear
                  value={filters.status || undefined}
                  onChange={(value) => setFilters({ ...filters, status: value || '' })}
                >
                  <Option value="PENDING">待付款</Option>
                  <Option value="OVERDUE">逾期</Option>
                  <Option value="PARTIAL">部分付款</Option>
                  <Option value="PAID">已付款</Option>
                </Select>

                <Input
                  placeholder="供應商名稱"
                  style={{ width: 150 }}
                  value={filters.supplier}
                  onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
                  allowClear
                />

                <RangePicker
                  placeholder={['開始日期', '結束日期']}
                  value={filters.dateRange}
                  onChange={(dates) => setFilters({ ...filters, dateRange: dates as [dayjs.Dayjs, dayjs.Dayjs] | null })}
                />

                <Button
                  icon={<SearchOutlined />}
                  onClick={loadPayables}
                >
                  查詢
                </Button>
              </Space>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<ShoppingCartOutlined />}
                onClick={() => {
                  // 導航到採購頁面
                  window.location.href = '/purchases'
                }}
              >
                查看採購單
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 應付帳款表格 */}
        <Card>
          <Table<AccountsPayable>
            columns={columns}
            dataSource={payables}
            rowKey={(record) => record.id}
            loading={loading}
            scroll={{ x: 1200 }}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range?.[0] || 0}-${range?.[1] || 0} 項，共 ${total || 0} 項`
            }}
          />
        </Card>

        {/* 付款記錄 Modal */}
        <Modal
          title={`記錄付款 - ${selectedPayable?.ap_number}`}
          open={paymentModalVisible}
          onCancel={() => {
            setPaymentModalVisible(false)
            setSelectedPayable(null)
            form.resetFields()
          }}
          onOk={() => form.submit()}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleMakePayment}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="付款金額"
                  name="payment_amount"
                  rules={[
                    { required: true, message: '請輸入付款金額' },
                    { type: 'number', min: 0.01, message: '金額必須大於 0' }
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="請輸入付款金額"
                    formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => (value as string).replace(/\$\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="付款日期"
                  name="payment_date"
                  rules={[{ required: true, message: '請選擇付款日期' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="付款方式"
                  name="payment_method"
                  rules={[{ required: true, message: '請選擇付款方式' }]}
                >
                  <Select placeholder="請選擇付款方式">
                    <Option value="BANK_TRANSFER">銀行轉帳</Option>
                    <Option value="CASH">現金</Option>
                    <Option value="CHECK">支票</Option>
                    <Option value="CREDIT_CARD">信用卡</Option>
                    <Option value="OTHER">其他</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="參考號碼"
                  name="reference_number"
                >
                  <Input placeholder="轉帳號碼、支票號碼等" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="備註"
              name="notes"
            >
              <Input.TextArea rows={3} placeholder="付款相關備註" />
            </Form.Item>

            {selectedPayable && (
              <Card size="small" title="應付帳款資訊" style={{ marginTop: 16 }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Text type="secondary">供應商：</Text>
                    <Text strong>{selectedPayable.supplier_name}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">採購單號：</Text>
                    <Text strong>{selectedPayable.purchase?.purchase_number || '-'}</Text>
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 8 }}>
                  <Col span={12}>
                    <Text type="secondary">未付金額：</Text>
                    <Text strong style={{ color: '#ff4d4f' }}>
                      <SecurePriceDisplay amount={selectedPayable.remaining_amount} />
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">到期日：</Text>
                    <Text strong>{dayjs(selectedPayable.due_date).format('YYYY-MM-DD')}</Text>
                  </Col>
                </Row>
              </Card>
            )}
          </Form>
        </Modal>
      </div>
    </SuperAdminOnly>
  )
}