'use client'

import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Typography, Space, Avatar, Row, Col, Switch, Select, message, Upload, Alert, Tag } from 'antd'
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EditOutlined,
  SaveOutlined,
  CameraOutlined,
  SettingOutlined,
  CrownOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'

const { Title, Text } = Typography
const { Option } = Select

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  department?: string
  position?: string
  avatar?: string
  notifications: {
    email: boolean
    sms: boolean
    system: boolean
  }
  preferences: {
    language: string
    timezone: string
    currency: string
  }
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // 模擬獲取用戶資料
  useEffect(() => {
    if (session?.user) {
      const mockProfile: UserProfile = {
        id: session.user.id || '',
        name: session.user.name || '',
        email: session.user.email || '',
        phone: session.user.email === 'manpan.whisky@gmail.com' ? '+886-912-345-678' : '',
        department: session.user.email === 'manpan.whisky@gmail.com' ? '業務部' : '',
        position: session.user.email === 'manpan.whisky@gmail.com' ? '業務經理' : '',
        avatar: session.user.image || '',
        notifications: {
          email: true,
          sms: false,
          system: true
        },
        preferences: {
          language: 'zh-TW',
          timezone: 'Asia/Taipei',
          currency: 'TWD'
        }
      }
      setProfile(mockProfile)
      form.setFieldsValue(mockProfile)
    }
  }, [session, form])

  const handleSave = async (values: any) => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setProfile({ ...(profile as UserProfile), ...values })
      setEditing(false)
      message.success('個人資料已更新')
    } catch (error) {
      message.error('更新失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (profile) form.setFieldsValue(profile)
    setEditing(false)
  }

  const handleUpgradeRole = async () => {
    try {
      const response = await fetch('/api/admin/upgrade-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        message.success('申請已送出，請重新登入查看最新權限。')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        message.error('申請失敗，請稍後再試')
      }
    } catch (error) {
      message.error('升級過程中發生錯誤')
    }
  }

  if (!profile) {
    return <div>載入中...</div>
  }

  return (
    <div style={{ padding: 0 }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        個人設定
      </Title>

      <Row gutter={[24, 24]}>
        {/* 基本資料 */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>基本資料</span>
              </Space>
            }
            extra={
              !editing ? (
                <Button type="primary" icon={<EditOutlined />} onClick={() => setEditing(true)}>
                  編輯
                </Button>
              ) : (
                <Space>
                  <Button onClick={handleCancel}>取消</Button>
                  <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={() => form.submit()}>
                    保存
                  </Button>
                </Space>
              )
            }
          >
            {session?.user?.email !== 'manpan.whisky@gmail.com' && (
              <Alert
                message="個人資料功能開發中"
                description="個人資料編輯功能正在開發中，目前僅顯示基本 Google 帳戶資訊。"
                type="info"
                style={{ marginBottom: 16 }}
                showIcon
              />
            )}

            <Form form={form} layout="vertical" onFinish={handleSave} disabled={!editing}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item label="姓名" name="name" rules={[{ required: true, message: '請輸入姓名' }]}>
                    <Input prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="電子郵件"
                    name="email"
                    rules={[{ required: true, message: '請輸入電子郵件' }, { type: 'email', message: '請輸入有效的電子郵件' }]}
                  >
                    <Input prefix={<MailOutlined />} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={
                      <>
                        電話 {session?.user?.email !== 'manpan.whisky@gmail.com' && <Tag color="orange">範例資料</Tag>}
                      </>
                    }
                    name="phone"
                  >
                    <Input prefix={<PhoneOutlined />} placeholder={session?.user?.email !== 'manpan.whisky@gmail.com' ? '功能開發中' : ''} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={
                      <>
                        部門 {session?.user?.email !== 'manpan.whisky@gmail.com' && <Tag color="orange">範例資料</Tag>}
                      </>
                    }
                    name="department"
                  >
                    <Select placeholder={session?.user?.email !== 'manpan.whisky@gmail.com' ? '功能開發中' : ''}>
                      <Option value="業務部">業務部</Option>
                      <Option value="採購部">採購部</Option>
                      <Option value="財務部">財務部</Option>
                      <Option value="倉儲部">倉儲部</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={
                      <>
                        職位 {session?.user?.email !== 'manpan.whisky@gmail.com' && <Tag color="orange">範例資料</Tag>}
                      </>
                    }
                    name="position"
                  >
                    <Input placeholder={session?.user?.email !== 'manpan.whisky@gmail.com' ? '功能開發中' : ''} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        {/* 頭像和角色資訊 */}
        <Col xs={24} lg={8}>
          <Card title="個人資訊">
            <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
              <Avatar size={120} src={profile.avatar} icon={<UserOutlined />} style={{ marginBottom: 16 }} />
              {editing && (
                <Upload
                  showUploadList={false}
                  beforeUpload={() => {
                    message.info('頭像上傳功能開發中')
                    return false
                  }}
                >
                  <Button icon={<CameraOutlined />} size="small">更換頭像</Button>
                </Upload>
              )}
              <Title level={4}>{profile.name}</Title>
              <Text type="secondary">{profile.email}</Text>
              <Text>{profile.position} · {profile.department}</Text>

              {session?.user?.role && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>權限角色: </Text>
                  <Text code>
                    {session.user.role === 'SUPER_ADMIN' ? '超級管理員' :
                     session.user.role === 'INVESTOR' ? '投資方' :
                     session.user.role === 'EMPLOYEE' ? '員工' : session.user.role}
                  </Text>

                  {session.user.role === 'EMPLOYEE' && (
                    <div style={{ marginTop: 12 }}>
                      <Alert
                        message="需要管理員權限？"
                        description="點擊下方按鈕申請升級為管理員，查看更多 Dashboard 功能"
                        type="info"
                        showIcon
                        style={{ marginBottom: 12 }}
                      />
                      <Button type="primary" icon={<CrownOutlined />} onClick={handleUpgradeRole} style={{ width: '100%' }}>
                        申請升級為管理員
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Space>
          </Card>
        </Col>

        {/* 通知設定 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <SettingOutlined />
                <span>通知設定</span>
                <Tag color="orange">開發中</Tag>
              </Space>
            }
          >
            <Alert
              message="通知功能開發中"
              description="個人通知設定功能正在開發中，目前設定不會生效。"
              type="info"
              style={{ marginBottom: 16 }}
              showIcon
            />
            <Form layout="vertical" disabled={!editing}>
              <Form.Item label="電子郵件通知">
                <Switch
                  checked={profile.notifications.email}
                  disabled
                  onChange={(checked) =>
                    setProfile({
                      ...(profile as UserProfile),
                      notifications: { ...(profile as UserProfile).notifications, email: checked }
                    })
                  }
                />
                <Text style={{ marginLeft: 8 }} type="secondary">接收系統業務相關通知</Text>
              </Form.Item>

              <Form.Item label="簡訊通知">
                <Switch
                  checked={profile.notifications.sms}
                  disabled
                  onChange={(checked) =>
                    setProfile({
                      ...(profile as UserProfile),
                      notifications: { ...(profile as UserProfile).notifications, sms: checked }
                    })
                  }
                />
                <Text style={{ marginLeft: 8 }} type="secondary">緊急事件簡訊提醒</Text>
              </Form.Item>

              <Form.Item label="系統通知">
                <Switch
                  checked={profile.notifications.system}
                  disabled
                  onChange={(checked) =>
                    setProfile({
                      ...(profile as UserProfile),
                      notifications: { ...(profile as UserProfile).notifications, system: checked }
                    })
                  }
                />
                <Text style={{ marginLeft: 8 }} type="secondary">系統即時通知</Text>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 偏好設定 */}
        <Col xs={24} lg={12}>
          <Card title="偏好設定">
            <Form layout="vertical" disabled={!editing}>
              <Form.Item label="語言">
                <Select
                  value={profile.preferences.language}
                  onChange={(value) =>
                    setProfile({
                      ...(profile as UserProfile),
                      preferences: { ...(profile as UserProfile).preferences, language: value }
                    })
                  }
                >
                  <Option value="zh-TW">繁體中文</Option>
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="en-US">English</Option>
                  <Option value="ja-JP">日本語</Option>
                </Select>
              </Form.Item>

              <Form.Item label="時區">
                <Select
                  value={profile.preferences.timezone}
                  onChange={(value) =>
                    setProfile({
                      ...(profile as UserProfile),
                      preferences: { ...(profile as UserProfile).preferences, timezone: value }
                    })
                  }
                >
                  <Option value="Asia/Taipei">台北時間 (UTC+8)</Option>
                  <Option value="Asia/Tokyo">東京時間 (UTC+9)</Option>
                  <Option value="Asia/Shanghai">上海時間 (UTC+8)</Option>
                  <Option value="UTC">協調世界時 (UTC)</Option>
                </Select>
              </Form.Item>

              <Form.Item label="貨幣">
                <Select
                  value={profile.preferences.currency}
                  onChange={(value) =>
                    setProfile({
                      ...(profile as UserProfile),
                      preferences: { ...(profile as UserProfile).preferences, currency: value }
                    })
                  }
                >
                  <Option value="TWD">新台幣 (TWD)</Option>
                  <Option value="USD">美元 (USD)</Option>
                  <Option value="JPY">日圓 (JPY)</Option>
                  <Option value="CNY">人民幣 (CNY)</Option>
                </Select>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

