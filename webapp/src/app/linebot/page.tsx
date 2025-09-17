'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Table,
  Typography,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Tabs,
  Alert,
  Divider
} from 'antd'
import {
  RobotOutlined,
  MessageOutlined,
  EyeOutlined,
  SettingOutlined,
  BarChartOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import dayjs from 'dayjs'
import { SuperAdminOnly } from '@/components/auth/RoleGuard'

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs

interface BotMessage {
  id: string
  userId: string
  userName?: string
  messageType: 'text' | 'image' | 'sticker'
  content: string
  response?: string
  responseTime?: number
  timestamp: string
  status: 'pending' | 'replied' | 'failed'
}

interface BotStats {
  totalMessages: number
  todayMessages: number
  activeUsers: number
  responseTime: number
  successRate: number
}

/**
 * 🤖 Room-6: LINE BOT 管理頁面
 * 核心功能：BOT監控 + 設定管理 + 對話記錄
 */
export default function LineBotPage() {
  const { data: session } = useSession()

  // 狀態管理
  const [loading, setLoading] = useState(false)
  const [botStats, setBotStats] = useState<BotStats>({
    totalMessages: 156,
    todayMessages: 23,
    activeUsers: 45,
    responseTime: 1.2,
    successRate: 98.5
  })
  const [messages, setMessages] = useState<BotMessage[]>([])
  const [configVisible, setConfigVisible] = useState(false)
  const [testVisible, setTestVisible] = useState(false)

  // 表單
  const [configForm] = Form.useForm()
  const [testForm] = Form.useForm()

  useEffect(() => {
    loadBotMessages()
  }, [])

  // 載入BOT訊息記錄
  const loadBotMessages = async () => {
    setLoading(true)
    try {
      // 模擬數據
      const mockMessages: BotMessage[] = [
        {
          id: '1',
          userId: 'U1234567890',
          userName: '小明',
          messageType: 'text',
          content: '計算100萬日圓的成本',
          response: '💰 成本計算結果：\n原價：¥1,000,000\n台幣：NT$210,000...',
          responseTime: 0.8,
          timestamp: dayjs().subtract(10, 'minutes').toISOString(),
          status: 'replied'
        },
        {
          id: '2',
          userId: 'U0987654321',
          userName: '小華',
          messageType: 'text',
          content: '查詢威士忌庫存',
          response: '🍷 威士忌庫存查詢：\n山崎12年：5瓶\n響21年：2瓶...',
          responseTime: 1.2,
          timestamp: dayjs().subtract(25, 'minutes').toISOString(),
          status: 'replied'
        },
        {
          id: '3',
          userId: 'U1357924680',
          userName: '小美',
          messageType: 'image',
          content: '[圖片] 報單掃描',
          response: '📷 圖片辨識功能開發中...',
          responseTime: 2.1,
          timestamp: dayjs().subtract(1, 'hours').toISOString(),
          status: 'replied'
        },
        {
          id: '4',
          userId: 'U2468013579',
          userName: '小李',
          messageType: 'text',
          content: '今日銷售報表',
          response: '📊 今日銷售統計：\n銷售筆數：8筆\n銷售金額：NT$125,000',
          responseTime: 1.5,
          timestamp: dayjs().subtract(2, 'hours').toISOString(),
          status: 'replied'
        },
        {
          id: '5',
          userId: 'U9876543210',
          messageType: 'text',
          content: '系統狀態查詢',
          timestamp: dayjs().subtract(5, 'minutes').toISOString(),
          status: 'pending'
        }
      ]

      setMessages(mockMessages)
    } catch (error) {
      console.error('載入BOT訊息失敗:', error)
      message.error('載入訊息記錄失敗')
    } finally {
      setLoading(false)
    }
  }

  // 測試BOT
  const testBot = async (values: any) => {
    setLoading(true)
    try {
      // TODO: 實作BOT測試API
      await new Promise(resolve => setTimeout(resolve, 1000))
      message.success('測試訊息已發送')
      setTestVisible(false)
      testForm.resetFields()
    } catch (error) {
      message.error('測試失敗')
    } finally {
      setLoading(false)
    }
  }

  // 保存BOT設定
  const saveConfig = async (values: any) => {
    setLoading(true)
    try {
      // TODO: 實作設定保存API
      await new Promise(resolve => setTimeout(resolve, 1000))
      message.success('設定已保存')
      setConfigVisible(false)
    } catch (error) {
      message.error('保存設定失敗')
    } finally {
      setLoading(false)
    }
  }

  // 訊息記錄表格欄位
  const messageColumns = [
    {
      title: '時間',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (timestamp: string) => dayjs(timestamp).format('HH:mm:ss')
    },
    {
      title: '用戶',
      key: 'user',
      width: 100,
      render: (_: any, record: BotMessage) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.userName || '匿名'}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.userId.substring(0, 8)}...
          </div>
        </div>
      )
    },
    {
      title: '訊息類型',
      dataIndex: 'messageType',
      key: 'messageType',
      width: 80,
      render: (type: string) => {
        const typeMap = {
          text: { color: 'blue', text: '文字' },
          image: { color: 'green', text: '圖片' },
          sticker: { color: 'orange', text: '貼圖' }
        }
        const config = typeMap[type as keyof typeof typeMap] || { color: 'default', text: type }
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: '用戶訊息',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Text style={{ maxWidth: 200, display: 'block' }}>{content}</Text>
      )
    },
    {
      title: 'BOT回應',
      dataIndex: 'response',
      key: 'response',
      ellipsis: true,
      render: (response: string) => (
        response ? (
          <Text style={{ maxWidth: 250, display: 'block' }}>{response}</Text>
        ) : (
          <Text type="secondary">處理中...</Text>
        )
      )
    },
    {
      title: '回應時間',
      dataIndex: 'responseTime',
      key: 'responseTime',
      width: 80,
      render: (time: number) => time ? `${time}s` : '-'
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const statusMap = {
          pending: { color: 'orange', icon: <ClockCircleOutlined />, text: '處理中' },
          replied: { color: 'green', icon: <CheckCircleOutlined />, text: '已回應' },
          failed: { color: 'red', icon: <ExclamationCircleOutlined />, text: '失敗' }
        }
        const config = statusMap[status as keyof typeof statusMap]
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      }
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      {/* 頁面標題 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <RobotOutlined style={{ marginRight: '8px' }} />
          LINE BOT 智慧助手
        </Title>
        <Text type="secondary">
          AI驅動的酒類貿易智慧助手，提供即時成本計算、商品查詢與客服支援
        </Text>
      </div>

      {/* BOT狀態概覽 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="總訊息數"
              value={botStats.totalMessages}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日訊息"
              value={botStats.todayMessages}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活躍用戶"
              value={botStats.activeUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均回應時間"
              value={botStats.responseTime}
              suffix="秒"
              precision={1}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* BOT功能介紹 */}
      <Card style={{ marginBottom: '24px' }}>
        <Title level={4}>🤖 BOT功能特色</Title>
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div>
              <div style={{ fontWeight: 'bold' }}>即時成本計算</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                支援日圓匯率轉換<br />
                自動計算進口稅費
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🍷</div>
              <div style={{ fontWeight: 'bold' }}>智慧商品查詢</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                商品庫存查詢<br />
                價格資訊即時更新
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
              <div style={{ fontWeight: 'bold' }}>圖片OCR辨識</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                報單自動辨識<br />
                商品標籤識別
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
              <div style={{ fontWeight: 'bold' }}>銷售數據查詢</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                即時銷售報表<br />
                客戶數據分析
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* BOT管理功能 */}
      <Tabs defaultActiveKey="messages">
        <TabPane tab="對話記錄" key="messages">
          <Card
            title="最近對話記錄"
            extra={
              <Space>
                <Button onClick={loadBotMessages} loading={loading}>
                  重新載入
                </Button>
                <SuperAdminOnly>
                  <Button
                    type="primary"
                    icon={<SettingOutlined />}
                    onClick={() => setConfigVisible(true)}
                  >
                    BOT設定
                  </Button>
                </SuperAdminOnly>
              </Space>
            }
          >
            <Table
              columns={messageColumns}
              dataSource={messages}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1000 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="功能測試" key="test">
          <Card title="BOT功能測試">
            <Alert
              message="測試說明"
              description="可以測試BOT的各種回應功能，包括成本計算、商品查詢等。"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Button
              type="primary"
              icon={<MessageOutlined />}
              onClick={() => setTestVisible(true)}
            >
              發送測試訊息
            </Button>

            <Divider />

            <Title level={5}>常用測試指令</Title>
            <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
              <Paragraph style={{ margin: 0 }}>
                <Text code>計算100萬日圓的成本</Text> - 測試成本計算功能<br />
                <Text code>查詢威士忌庫存</Text> - 測試商品查詢功能<br />
                <Text code>今日銷售報表</Text> - 測試報表查詢功能<br />
                <Text code>系統狀態</Text> - 測試系統健康檢查
              </Paragraph>
            </div>
          </Card>
        </TabPane>

        <SuperAdminOnly>
          <TabPane tab="統計分析" key="analytics">
            <Card title="BOT使用統計">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="成功率"
                    value={botStats.successRate}
                    suffix="%"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="平均回應時間"
                    value={botStats.responseTime}
                    suffix="秒"
                    precision={1}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="活躍用戶"
                    value={botStats.activeUsers}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Col>
              </Row>

              <div style={{ marginTop: '24px' }}>
                <Text type="secondary">
                  📊 詳細分析功能開發中，將提供更豐富的使用數據與用戶行為分析
                </Text>
              </div>
            </Card>
          </TabPane>
        </SuperAdminOnly>
      </Tabs>

      {/* BOT設定Modal */}
      <Modal
        title="LINE BOT 設定"
        open={configVisible}
        onCancel={() => setConfigVisible(false)}
        onOk={() => configForm.submit()}
        width={600}
        confirmLoading={loading}
      >
        <Form
          form={configForm}
          layout="vertical"
          onFinish={saveConfig}
          initialValues={{
            autoReply: true,
            responseTimeout: 30,
            maxRetries: 3
          }}
        >
          <Form.Item
            name="autoReply"
            label="自動回應"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="responseTimeout"
            label="回應超時時間 (秒)"
            rules={[{ required: true, message: '請輸入超時時間' }]}
          >
            <Input type="number" />
          </Form.Item>

          <Form.Item
            name="maxRetries"
            label="最大重試次數"
            rules={[{ required: true, message: '請輸入重試次數' }]}
          >
            <Input type="number" />
          </Form.Item>

          <Form.Item name="welcomeMessage" label="歡迎訊息">
            <Input.TextArea rows={3} placeholder="新用戶加入時的歡迎訊息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 測試訊息Modal */}
      <Modal
        title="發送測試訊息"
        open={testVisible}
        onCancel={() => setTestVisible(false)}
        onOk={() => testForm.submit()}
        confirmLoading={loading}
      >
        <Form
          form={testForm}
          layout="vertical"
          onFinish={testBot}
        >
          <Form.Item
            name="testMessage"
            label="測試訊息"
            rules={[{ required: true, message: '請輸入測試訊息' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="輸入要測試的訊息內容..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}