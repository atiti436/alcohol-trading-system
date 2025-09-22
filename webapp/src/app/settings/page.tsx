'use client'

import React, { useState } from 'react'
import { Card, Row, Col, Typography, Space, Switch, Form, Input, Button, Select, Divider, message, Tabs } from 'antd'
import {
  SettingOutlined,
  SecurityScanOutlined,
  BellOutlined,
  DatabaseOutlined,
  UserOutlined,
  LockOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import ApiKeySettings from '@/components/settings/ApiKeySettings'

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

export default function SettingsPage() {
  const { data: session } = useSession()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSave = async (values: any) => {
    setLoading(true)
    try {
      // 模擬保存設定
      await new Promise(resolve => setTimeout(resolve, 1000))
      message.success('設定已保存')
    } catch (error) {
      message.error('保存失敗')
    } finally {
      setLoading(false)
    }
  }

  // 只有SUPER_ADMIN能看到完整設定
  const isAdmin = session?.user?.role === 'SUPER_ADMIN';

  return (
    <div style={{ padding: 0 }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        <SettingOutlined style={{ marginRight: 8 }} />
        系統設定
      </Title>

      <Tabs defaultActiveKey="general" type="card">
        {/* 一般設定 */}
        <TabPane tab="一般設定" key="general">
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card title={
                <>
                  <SettingOutlined style={{ marginRight: 8 }} />
                  系統基本設定
                </>
              }>
                <Form form={form} layout="vertical" onFinish={handleSave}>
                  <Form.Item label="系統名稱" name="systemName" initialValue="酒類進口貿易管理系統">
                    <Input disabled={!isAdmin} />
                  </Form.Item>

                  <Form.Item label="預設語言" name="language" initialValue="zh-TW">
                    <Select disabled={!isAdmin}>
                      <Option value="zh-TW">繁體中文</Option>
                      <Option value="zh-CN">简体中文</Option>
                      <Option value="en-US">English</Option>
                      <Option value="ja-JP">日本語</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="預設貨幣" name="currency" initialValue="TWD">
                    <Select disabled={!isAdmin}>
                      <Option value="TWD">新台幣 (TWD)</Option>
                      <Option value="USD">美元 (USD)</Option>
                      <Option value="JPY">日圓 (JPY)</Option>
                      <Option value="CNY">人民幣 (CNY)</Option>
                    </Select>
                  </Form.Item>

                  {isAdmin && (
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={loading}>
                        保存設定
                      </Button>
                    </Form.Item>
                  )}
                </Form>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title={
                <>
                  <BellOutlined style={{ marginRight: 8 }} />
                  通知設定
                </>
              }>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>低庫存警報</Text>
                    <Switch defaultChecked disabled={!isAdmin} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>新訂單通知</Text>
                    <Switch defaultChecked disabled={!isAdmin} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>帳款到期提醒</Text>
                    <Switch defaultChecked disabled={!isAdmin} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text>系統維護通知</Text>
                    <Switch defaultChecked disabled={!isAdmin} />
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 安全設定 - 只有管理員能看到 */}
        {isAdmin && (
          <TabPane tab="安全設定" key="security">
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <Card title={
                  <>
                    <SecurityScanOutlined style={{ marginRight: 8 }} />
                    安全政策
                  </>
                }>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>強制密碼政策</Text>
                      <Switch defaultChecked />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>雙因子認證</Text>
                      <Switch />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>自動登出（30分鐘）</Text>
                      <Switch defaultChecked />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>IP限制</Text>
                      <Switch />
                    </div>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card title={
                  <>
                    <UserOutlined style={{ marginRight: 8 }} />
                    權限管理
                  </>
                }>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>角色統計</Text>
                    <div style={{ padding: '8px 0' }}>
                      <Text>超級管理員: 1 人</Text>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <Text>投資方: 0 人</Text>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <Text>員工: 0 人</Text>
                    </div>
                    <Button type="link" style={{ padding: 0 }}>
                      管理用戶權限 →
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          </TabPane>
        )}

        {/* 資料庫設定 - 只有管理員能看到 */}
        {isAdmin && (
          <TabPane tab="資料庫" key="database">
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <Card title={
                  <>
                    <DatabaseOutlined style={{ marginRight: 8 }} />
                    備份設定
                  </>
                }>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>自動備份</Text>
                      <Switch defaultChecked />
                    </div>
                    <div>
                      <Text strong>備份頻率:</Text>
                      <Select defaultValue="daily" style={{ width: '100%', marginTop: 8 }}>
                        <Option value="hourly">每小時</Option>
                        <Option value="daily">每日</Option>
                        <Option value="weekly">每週</Option>
                        <Option value="monthly">每月</Option>
                      </Select>
                    </div>
                    <div>
                      <Text strong>保留期限:</Text>
                      <Select defaultValue="30" style={{ width: '100%', marginTop: 8 }}>
                        <Option value="7">7 天</Option>
                        <Option value="30">30 天</Option>
                        <Option value="90">90 天</Option>
                        <Option value="365">1 年</Option>
                      </Select>
                    </div>
                    <Button type="primary">立即備份</Button>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card title={
                  <>
                    <DatabaseOutlined style={{ marginRight: 8 }} />
                    資料庫狀態
                  </>
                }>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>連接狀態: </Text>
                      <Text style={{ color: '#52c41a' }}>正常</Text>
                    </div>
                    <div>
                      <Text strong>資料庫大小: </Text>
                      <Text>125.6 MB</Text>
                    </div>
                    <div>
                      <Text strong>最後備份: </Text>
                      <Text>2025-09-21 01:30</Text>
                    </div>
                    <div>
                      <Text strong>記錄數量: </Text>
                      <Text>1,247 筆</Text>
                    </div>
                    <Button type="link" danger style={{ padding: 0 }}>
                      資料庫維護 →
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          </TabPane>

        {/* API 設定 - 只有管理員可見 */}
        {isAdmin && (
          <TabPane tab="API 設定" key="api">
            <Row gutter={[24, 24]}>
              <Col span={24}>
                <ApiKeySettings />
              </Col>
            </Row>
          </TabPane>
        )}
      </Tabs>

      {!isAdmin && (
        <Card style={{ marginTop: 24 }}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <LockOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
            <Title level={4}>權限不足</Title>
            <Text type="secondary">
              部分系統設定需要超級管理員權限才能查看和修改
            </Text>
          </div>
        </Card>
      )}
    </div>
  )
}