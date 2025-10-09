'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Card, Row, Col, Typography, Space, Switch, Form, Input, Button, Select, Divider, message, Tabs, Alert, Tag, Spin } from 'antd'
import {
  SettingOutlined,
  SecurityScanOutlined,
  BellOutlined,
  DatabaseOutlined,
  UserOutlined,
  LockOutlined,
  BankOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import ApiKeySettings from '@/components/settings/ApiKeySettings'
import LineBotSettings from '@/components/settings/LineBotSettings'
import UserManagementTab from '@/components/settings/UserManagementTab'
import CompanyInfoTab from '@/components/settings/CompanyInfoTab'
import DBHealthTab from '@/components/settings/DBHealthTab'

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

interface UserStats {
  superAdmin: number
  investor: number
  employee: number
  pending: number
  total: number
  active: number
  inactive: number
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const activeTab = useMemo(() => params.get('tab') || 'general', [params])

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

  // 載入用戶統計數據
  const loadUserStats = async () => {
    setStatsLoading(true)
    try {
      const response = await fetch('/api/users/stats')
      const data = await response.json()
      if (data.success) {
        setUserStats(data.data)
      }
    } catch (error) {
      console.error('載入用戶統計失敗:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  // 只有SUPER_ADMIN能看到完整設定
  const isAdmin = session?.user?.role === 'SUPER_ADMIN'

  // 當進入安全設定分頁時載入統計數據
  useEffect(() => {
    if (isAdmin && activeTab === 'security') {
      loadUserStats()
    }
  }, [isAdmin, activeTab])

  return (
    <div style={{ padding: 0 }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: '#fff',
        paddingBottom: 16,
        borderBottom: '1px solid #f0f0f0'
      }}>
        <Title level={2} style={{ marginBottom: 16 }}>
          <SettingOutlined style={{ marginRight: 8 }} />
          系統設定
        </Title>

        <Tabs
          defaultActiveKey={activeTab}
          activeKey={activeTab}
          type="card"
          onChange={(key) => {
            router.push(`/settings?tab=${key}`)
          }}
          tabBarStyle={{ marginBottom: 0 }}
          renderTabBar={(props, DefaultTabBar) => (
            <DefaultTabBar {...props} />
          )}
        >
        {/* 公司資訊 */}
        {isAdmin && (
          <TabPane tab={
            <span>
              <BankOutlined style={{ marginRight: 8 }} />
              公司資訊
            </span>
          } key="company">
            <CompanyInfoTab />
          </TabPane>
        )}

        {/* 一般設定 */}
        <TabPane tab="一般設定" key="general">
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card title={
                <React.Fragment>
                  <SettingOutlined style={{ marginRight: 8 }} />
                  系統基本設定
                </React.Fragment>
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
                <React.Fragment>
                  <BellOutlined style={{ marginRight: 8 }} />
                  通知設定 <Tag color="orange" style={{ marginLeft: 8 }}>開發中</Tag>
                </React.Fragment>
              }>
                <Alert
                  message="功能開發中"
                  description="通知設定功能正在開發中，目前設定不會生效。敬請期待後續版本更新。"
                  type="info"
                  style={{ marginBottom: 16 }}
                  showIcon
                />
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ opacity: 0.6 }}>低庫存警報</Text>
                    <Switch defaultChecked disabled />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ opacity: 0.6 }}>新訂單通知</Text>
                    <Switch defaultChecked disabled />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ opacity: 0.6 }}>帳款到期提醒</Text>
                    <Switch defaultChecked disabled />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ opacity: 0.6 }}>系統維護通知</Text>
                    <Switch defaultChecked disabled />
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24}>
              <Card title="預購訂單自動轉換設定">
                <Alert
                  message="自動轉換功能說明"
                  description="進貨收貨完成後，系統會自動檢查並轉換庫存充足的預購訂單。轉換時使用 FIFO（先進先出）策略分配庫存，並自動選擇 A 版變體（如果未指定）。"
                  type="info"
                  style={{ marginBottom: 16 }}
                  showIcon
                />
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong>進貨收貨時自動轉換</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        當進貨單完成收貨時，系統會自動檢查並轉換相關的預購訂單
                      </Text>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong>啟用批次轉換功能</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        允許在預購統計頁面使用批次轉換功能
                      </Text>
                    </div>
                    <Switch defaultChecked />
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
                  <React.Fragment>
                    <SecurityScanOutlined style={{ marginRight: 8 }} />
                    安全政策 <Tag color="orange" style={{ marginLeft: 8 }}>開發中</Tag>
                  </React.Fragment>
                }>
                  <Alert
                    message="安全功能開發中"
                    description="進階安全設定功能正在開發中，目前使用 Google OAuth 基礎安全機制。"
                    type="info"
                    style={{ marginBottom: 16 }}
                    showIcon
                  />
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ opacity: 0.6 }}>強制密碼政策</Text>
                      <Switch defaultChecked disabled />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ opacity: 0.6 }}>雙因子認證</Text>
                      <Switch disabled />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ opacity: 0.6 }}>自動登出（30分鐘）</Text>
                      <Switch defaultChecked disabled />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ opacity: 0.6 }}>IP限制</Text>
                      <Switch disabled />
                    </div>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card title={
                  <React.Fragment>
                    <UserOutlined style={{ marginRight: 8 }} />
                    權限管理
                  </React.Fragment>
                }>
                  {statsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin tip="載入統計數據中..." />
                    </div>
                  ) : (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>角色統計</Text>
                      <div style={{ padding: '8px 0' }}>
                        <Text>超級管理員: {userStats?.superAdmin || 0} 人</Text>
                      </div>
                      <div style={{ padding: '8px 0' }}>
                        <Text>投資方: {userStats?.investor || 0} 人</Text>
                      </div>
                      <div style={{ padding: '8px 0' }}>
                        <Text>員工: {userStats?.employee || 0} 人</Text>
                      </div>
                      {userStats && userStats.pending > 0 && (
                        <div style={{ padding: '8px 0' }}>
                          <Text type="warning">待審核: {userStats.pending} 人</Text>
                        </div>
                      )}
                      <Divider style={{ margin: '12px 0' }} />
                      <div style={{ padding: '8px 0' }}>
                        <Text type="secondary">總用戶數: {userStats?.total || 0} 人</Text>
                      </div>
                      <div style={{ padding: '8px 0' }}>
                        <Text type="secondary">啟用: {userStats?.active || 0} 人 / 停用: {userStats?.inactive || 0} 人</Text>
                      </div>
                      <Button
                        type="primary"
                        style={{ marginTop: 8 }}
                        onClick={() => router.push('/settings?tab=users')}
                      >
                        管理用戶權限 →
                      </Button>
                    </Space>
                  )}
                </Card>
              </Col>
            </Row>
          </TabPane>
        )}

        {/* 資料庫設定 - 只有管理員能看到 */}
        {isAdmin && (
          <TabPane tab="資料庫" key="database">
            <DBHealthTab />
          </TabPane>
        )}

        {/* API 設定 - 只有管理員可見 */}
        {isAdmin && (
          <TabPane tab="API 設定" key="api">
            <Row gutter={[24, 24]}>
              <Col span={24}>
                <ApiKeySettings />
              </Col>
              {process.env.NEXT_PUBLIC_ENABLE_LINEBOT_SETTINGS === 'true' && (
                <Col span={24}>
                  <LineBotSettings />
                </Col>
              )}
            </Row>
          </TabPane>
        )}

        {/* 用戶管理 - 只有管理員可見 */}
        {isAdmin && (
          <TabPane tab="用戶管理" key="users">
            <UserManagementTab />
          </TabPane>
        )}
      </Tabs>
      </div>

      <div style={{ paddingTop: 24 }}>
        {!isAdmin && (
          <Card>
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
    </div>
  )
}
