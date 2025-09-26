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
  purchase_id?: string
  supplier_name: string
  original_amount: number
  remaining_amount: number
  due_date: string
  status: 'PENDING' | 'OVERDUE' | 'PAID' | 'PARTIAL'
  days_past_due: number
  ap_category?: 'PURCHASE' | 'FREIGHT' | 'TAX' | 'WAREHOUSE' | 'ADMIN' | 'OTHER'
  reference?: string
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
  const [createForm] = Form.useForm()
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createMode, setCreateMode] = useState<'PURCHASE' | 'GENERAL'>('GENERAL')
  const [purchaseOptions, setPurchaseOptions] = useState<Array<{ value: string; label: string }>>([])
  const [purchaseLoading, setPurchaseLoading] = useState(false)

  const fetchPurchaseOptions = async (keyword: string) => {
    try {
      setPurchaseLoading(true)
      const params = new URLSearchParams({ search: keyword, limit: '20', page: '1' })
      const res = await fetch(`/api/purchases?${params.toString()}`)
      const json = await res.json()
      if (res.ok && json.success) {
        const opts = (json.data?.purchases || []).map((p: any) => ({
          value: p.id,
          label: `${p.purchase_number}｜${p.supplier}｜$${Number(p.total_amount).toLocaleString()}`
        }))
        setPurchaseOptions(opts)
      }
    } catch (e) {
      // ignore
    } finally {
      setPurchaseLoading(false)
    }
  }

  // 篩選狀態
  const [filters, setFilters] = useState({
    status: '',
    supplier: '',
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
    ap_category: '' as AccountsPayable['ap_category'] | ''
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
      if (filters.ap_category) params.append('ap_category', String(filters.ap_category))

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

  const renderCategoryTag = (cat?: AccountsPayable['ap_category']) => {
    const map: Record<string, { color: string; text: string }> = {
      PURCHASE: { color: 'blue', text: '採購' },
      FREIGHT: { color: 'geekblue', text: '運費' },
      TAX: { color: 'purple', text: '稅金' },
      WAREHOUSE: { color: 'cyan', text: '倉租' },
      ADMIN: { color: 'gold', text: '行政' },
      OTHER: { color: 'default', text: '其他' }
    }
    const cfg = (cat && map[cat]) || map.PURCHASE
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  // 表格欄位定義
  const columns: ColumnType<AccountsPayable>[] = [
    {
      title: '分類',
      key: 'ap_category',
      width: 90,
      render: (_: any, record) => renderCategoryTag(record.ap_category)
    },
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
      render: (_: any, record: AccountsPayable) => (
        record.purchase?.purchase_number || '-'
      )
    },
    {
      title: '原始金額',
      dataIndex: 'original_amount',
      key: 'original_amount',
      width: 120,
      align: 'right',
      render: (value: number) => (
        <SecurePriceDisplay amount={value} />
      )
    },
    {
      title: '未付金額',
      dataIndex: 'remaining_amount',
      key: 'remaining_amount',
      width: 120,
      align: 'right',
      render: (value: number, record: AccountsPayable) => (
        <SecurePriceDisplay
          amount={value}
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
      render: (_: any, record: AccountsPayable) => renderStatusTag(record.status, record.days_past_due)
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_: any, record: AccountsPayable) => (
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
                  placeholder="分類"
                  style={{ width: 120 }}
                  allowClear
                  value={filters.ap_category || undefined}
                  onChange={(value) => setFilters({ ...filters, ap_category: (value || '') as any })}
                >
                  <Option value="PURCHASE">採購</Option>
                  <Option value="FREIGHT">運費</Option>
                  <Option value="TAX">稅金</Option>
                  <Option value="WAREHOUSE">倉租</Option>
                  <Option value="ADMIN">行政</Option>
                  <Option value="OTHER">其他</Option>
                </Select>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateModalVisible(true); createForm.resetFields(); setCreateMode('GENERAL'); fetchPurchaseOptions('') }}>
              新增應付
            </Button>
          </div>
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

        {/* 新增應付 Modal */}
        <Modal
          title="新增應付帳款"
          open={createModalVisible}
          onCancel={() => setCreateModalVisible(false)}
          onOk={() => createForm.submit()}
          destroyOnClose
        >
          <Form form={createForm} layout="vertical" onFinish={async (values: any) => {
            try {
              const payload: any = {
                notes: values.notes,
                due_date: values.due_date.format('YYYY-MM-DD'),
              }
              if (values.mode === 'PURCHASE') {
                payload.purchase_id = values.purchase_id
              } else {
                payload.ap_category = values.ap_category
                payload.supplier_name = values.supplier_name
                payload.original_amount = Number(values.original_amount)
                if (values.reference) payload.reference = values.reference
              }
              const res = await fetch('/api/finance/payables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              })
              const result = await res.json()
              if (res.ok && result.success) {
                message.success('建立成功')
                setCreateModalVisible(false)
                await loadPayables()
              } else {
                message.error(result.error || '建立失敗')
              }
            } catch (e) {
              message.error('建立失敗，請稍後再試')
            }
          }}>
            <Form.Item label="來源類型" name="mode" initialValue={createMode}>
              <Select onChange={(v) => setCreateMode(v)}>
                <Option value="GENERAL">一般支出</Option>
                <Option value="PURCHASE">關聯採購</Option>
              </Select>
            </Form.Item>

            {createMode === 'PURCHASE' ? (
              <>
                <Form.Item label="採購單" name="purchase_id" rules={[{ required: true, message: '請選擇採購單' }]}>
                  <Select
                    showSearch
                    allowClear
                    placeholder="輸入單號或供應商關鍵字搜尋"
                    filterOption={false}
                    onSearch={(v) => fetchPurchaseOptions(v)}
                    options={purchaseOptions}
                    loading={purchaseLoading}
                  />
                </Form.Item>
              </>
            ) : (
              <>
                <Form.Item label="分類" name="ap_category" rules={[{ required: true, message: '請選擇分類' }]}>
                  <Select placeholder="選擇分類">
                    <Option value="FREIGHT">運費</Option>
                    <Option value="TAX">稅金</Option>
                    <Option value="WAREHOUSE">倉租</Option>
                    <Option value="ADMIN">行政</Option>
                    <Option value="OTHER">其他</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="供應商" name="supplier_name" rules={[{ required: true, message: '請輸入供應商名稱' }]}>
                  <Input />
                </Form.Item>
                <Form.Item label="原始金額" name="original_amount" rules={[{ required: true, message: '請輸入金額' }]}>
                  <InputNumber style={{ width: '100%' }} min={0.01} step={1} />
                </Form.Item>
                <Form.Item label="參考編號" name="reference">
                  <Input placeholder="承運商帳單/外部參考" />
                </Form.Item>
              </>
            )}

            <Form.Item label="到期日" name="due_date" rules={[{ required: true, message: '請選擇到期日' }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="備註" name="notes">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        </Modal>

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
