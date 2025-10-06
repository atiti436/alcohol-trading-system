'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Divider,
  message,
  Typography,
  Alert,
  Spin
} from 'antd'
import {
  PlusOutlined,
  DollarOutlined,
  EditOutlined,
  SearchOutlined,
  CalendarOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

interface CashFlowRecord {
  id: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  category: string
  funding_source: 'INVESTOR' | 'PERSONAL'
  transaction_date: string
  reference?: string
  notes?: string
  creator: {
    name: string
    email: string
  }
  created_at: string
}

interface CashFlowStats {
  total_income: number
  total_expense: number
  net_flow: number
  investor: {
    income: number
    expense: number
    net: number
  }
  personal: {
    income: number
    expense: number
    net: number
  }
}

export default function CashFlowManager() {
  const [records, setRecords] = useState<CashFlowRecord[]>([])
  const [stats, setStats] = useState<CashFlowStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editRecord, setEditRecord] = useState<CashFlowRecord | null>(null)
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()

  // 篩選狀態
  const [filters, setFilters] = useState({
    type: '',
    funding_source: '',
    search: '',
    date_range: null as [dayjs.Dayjs, dayjs.Dayjs] | null
  })

  // 分頁狀態
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })

  // 🔄 載入收支記錄
  const loadRecords = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString()
      })

      if (filters.type) params.append('type', filters.type)
      if (filters.funding_source) params.append('funding_source', filters.funding_source)
      if (filters.search) params.append('search', filters.search)
      if (filters.date_range) {
        params.append('date_from', filters.date_range[0].format('YYYY-MM-DD'))
        params.append('date_to', filters.date_range[1].format('YYYY-MM-DD'))
      }

      const response = await fetch(`/api/cashflow?${params}`)
      const data = await response.json()

      if (data.success) {
        setRecords(data.data.records)
        setStats(data.data.stats)
        setPagination({
          current: data.data.page,
          pageSize: data.data.limit,
          total: data.data.total
        })
      } else {
        message.error(data.error)
      }
    } catch (error) {
      console.error('載入收支記錄失敗:', error)
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  // 🆕 新增收支記錄
  const handleAdd = async (values: any) => {
    try {
      const response = await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          transaction_date: values.transaction_date?.format('YYYY-MM-DD')
        })
      })

      const data = await response.json()

      if (data.success) {
        message.success(data.message)
        setAddModalVisible(false)
        form.resetFields()
        loadRecords(pagination.current, pagination.pageSize)
      } else {
        message.error(data.error)
      }
    } catch (error) {
      console.error('新增失敗:', error)
      message.error('新增失敗')
    }
  }

  // ✏️ 編輯收支記錄
  const handleEdit = async (values: any) => {
    if (!editRecord) return

    try {
      const response = await fetch('/api/cashflow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editRecord.id,
          ...values,
          transaction_date: values.transaction_date?.format('YYYY-MM-DD')
        })
      })

      const data = await response.json()

      if (data.success) {
        message.success(data.message)
        setEditModalVisible(false)
        editForm.resetFields()
        setEditRecord(null)
        loadRecords(pagination.current, pagination.pageSize)
      } else {
        message.error(data.error)
      }
    } catch (error) {
      console.error('編輯失敗:', error)
      message.error('編輯失敗')
    }
  }

  // 🔍 篩選處理
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    // 重置到第一頁並重新載入
    setTimeout(() => {
      loadRecords(1, pagination.pageSize)
    }, 300)
  }

  // 🗂️ 表格欄位定義
  const columns = [
    {
      title: '日期',
      dataIndex: 'transaction_date',
      key: 'transaction_date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY/MM/DD')
    },
    {
      title: '類型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => (
        <Tag color={type === 'INCOME' ? 'green' : 'red'}>
          {type === 'INCOME' ? '收入' : '支出'}
        </Tag>
      )
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number, record: CashFlowRecord) => (
        <Text strong style={{ color: record.type === 'INCOME' ? '#52c41a' : '#f5222d' }}>
          {record.type === 'INCOME' ? '+' : '-'} NT$ {amount.toLocaleString()}
        </Text>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '分類',
      dataIndex: 'category',
      key: 'category',
      width: 100
    },
    {
      title: '資金來源',
      dataIndex: 'funding_source',
      key: 'funding_source',
      width: 100,
      render: (source: string) => (
        <Tag color={source === 'INVESTOR' ? 'blue' : 'orange'}>
          {source === 'INVESTOR' ? '投資方' : '個人墊付'}
        </Tag>
      )
    },
    {
      title: '參考編號',
      dataIndex: 'reference',
      key: 'reference',
      width: 120,
      render: (ref: string) => ref || '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (record: CashFlowRecord) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => {
            setEditRecord(record)
            editForm.setFieldsValue({
              ...record,
              transaction_date: dayjs(record.transaction_date)
            })
            setEditModalVisible(true)
          }}
        />
      )
    }
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 頁面標題 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <DollarOutlined style={{ marginRight: 8 }} />
          收支記錄管理
        </Title>
        <Text type="secondary">
          記錄日常收支明細、區分投資方與個人墊付、追蹤現金流量
        </Text>
      </div>

      {/* 📊 統計卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="總收入"
                value={stats.total_income}
                prefix="NT$"
                valueStyle={{ color: '#3f8600' }}
                formatter={value => value!.toLocaleString()}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="總支出"
                value={stats.total_expense}
                prefix="NT$"
                valueStyle={{ color: '#cf1322' }}
                formatter={value => value!.toLocaleString()}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="淨流量"
                value={stats.net_flow}
                prefix="NT$"
                valueStyle={{ color: stats.net_flow >= 0 ? '#3f8600' : '#cf1322' }}
                formatter={value => value!.toLocaleString()}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 14 }}>投資方餘額</Text>
              </div>
              <div style={{ color: stats.investor.net >= 0 ? '#3f8600' : '#cf1322', fontSize: 24, fontWeight: 'bold' }}>
                NT$ {stats.investor.net.toLocaleString()}
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 14 }}>個人墊付</Text>
              </div>
              <div style={{ color: stats.personal.net >= 0 ? '#3f8600' : '#cf1322', fontSize: 18 }}>
                NT$ {stats.personal.net.toLocaleString()}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 🎛️ 操作區域 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input
                placeholder="搜尋描述、分類、參考編號"
                prefix={<SearchOutlined />}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                style={{ width: 200 }}
                allowClear
              />

              <Select
                placeholder="類型"
                value={filters.type}
                onChange={(value) => handleFilterChange('type', value)}
                style={{ width: 120 }}
                allowClear
              >
                <Option value="INCOME">收入</Option>
                <Option value="EXPENSE">支出</Option>
              </Select>

              <Select
                placeholder="資金來源"
                value={filters.funding_source}
                onChange={(value) => handleFilterChange('funding_source', value)}
                style={{ width: 120 }}
                allowClear
              >
                <Option value="INVESTOR">投資方</Option>
                <Option value="PERSONAL">個人墊付</Option>
              </Select>

              <RangePicker
                value={filters.date_range}
                onChange={(dates) => handleFilterChange('date_range', dates)}
                placeholder={['開始日期', '結束日期']}
                style={{ width: 250 }}
              />
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields()
                form.setFieldsValue({ transaction_date: dayjs() })
                setAddModalVisible(true)
              }}
            >
              新增記錄
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 📋 收支記錄表格 */}
      <Card
        title={
          <Space>
            <FileTextOutlined />
            收支記錄
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 筆記錄`,
            onChange: (page, pageSize) => {
              loadRecords(page, pageSize!)
            }
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* ➕ 新增記錄對話框 */}
      <Modal
        title={
          <Space>
            <DollarOutlined />
            新增收支記錄
          </Space>
        }
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          onFinish={handleAdd}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="類型"
                rules={[{ required: true, message: '請選擇類型' }]}
              >
                <Select placeholder="選擇收入或支出">
                  <Option value="INCOME">收入</Option>
                  <Option value="EXPENSE">支出</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="funding_source"
                label="資金來源"
                rules={[{ required: true, message: '請選擇資金來源' }]}
              >
                <Select placeholder="選擇資金來源">
                  <Option value="INVESTOR">投資方</Option>
                  <Option value="PERSONAL">個人墊付</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="amount"
            label="金額 (NT$)"
            rules={[
              { required: true, message: '請輸入金額' },
              { type: 'number', min: 0.01, message: '金額必須大於0' }
            ]}
          >
            <InputNumber<number>
              style={{ width: '100%' }}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => {
                const cleaned = (value || '').replace(/\$\s?|,/g, '')
                const num = parseFloat(cleaned)
                return isNaN(num) ? 0 : num
              }}
              min={0}
              step={1}
              precision={0}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '請輸入描述' }]}
          >
            <Input placeholder="例：銷售收入、辦公用品採購、房租支出" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分類"
              >
                <Input placeholder="例：銷售收入、營運支出（選填）" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="transaction_date"
                label="交易日期"
                rules={[{ required: true, message: '請選擇交易日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reference"
            label="參考編號"
          >
            <Input placeholder="例：發票號碼、訂單編號（選填）" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備註"
          >
            <Input.TextArea rows={2} placeholder="其他說明（選填）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ✏️ 編輯記錄對話框 */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            編輯收支記錄
          </Space>
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false)
          setEditRecord(null)
          editForm.resetFields()
        }}
        onOk={() => editForm.submit()}
        width={600}
      >
        <Alert
          message="編輯提醒"
          description="修改收支記錄將影響統計資料，請謹慎操作。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={editForm}
          onFinish={handleEdit}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="類型"
                rules={[{ required: true, message: '請選擇類型' }]}
              >
                <Select placeholder="選擇收入或支出">
                  <Option value="INCOME">收入</Option>
                  <Option value="EXPENSE">支出</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="funding_source"
                label="資金來源"
                rules={[{ required: true, message: '請選擇資金來源' }]}
              >
                <Select placeholder="選擇資金來源">
                  <Option value="INVESTOR">投資方</Option>
                  <Option value="PERSONAL">個人墊付</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="amount"
            label="金額 (NT$)"
            rules={[
              { required: true, message: '請輸入金額' },
              { type: 'number', min: 0.01, message: '金額必須大於0' }
            ]}
          >
            <InputNumber<number>
              style={{ width: '100%' }}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => {
                const cleaned = (value || '').replace(/\$\s?|,/g, '')
                const num = parseFloat(cleaned)
                return isNaN(num) ? 0 : num
              }}
              min={0}
              step={1}
              precision={0}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '請輸入描述' }]}
          >
            <Input placeholder="例：銷售收入、辦公用品採購、房租支出" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分類"
              >
                <Input placeholder="例：銷售收入、營運支出（選填）" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="transaction_date"
                label="交易日期"
                rules={[{ required: true, message: '請選擇交易日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reference"
            label="參考編號"
          >
            <Input placeholder="例：發票號碼、訂單編號（選填）" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備註"
          >
            <Input.TextArea rows={2} placeholder="其他說明（選填）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
