'use client'

import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Card,
  Typography,
  Tag,
  Space,
  Select,
  message,
  Modal,
  Input,
  Avatar,
  Badge,
  Tooltip,
  Popconfirm
} from 'antd'
import {
  UserOutlined,
  CrownOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { useSession } from 'next-auth/react'
import { Role } from '@/types/auth'
import moment from 'moment'

const { Title, Text } = Typography
const { Option } = Select

interface User {
  id: string
  email: string
  name: string
  image?: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

interface UserListResponse {
  users: User[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function UsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 })
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [roleModalVisible, setRoleModalVisible] = useState(false)

  // 檢查是否為管理員
  if (session?.user?.role !== Role.SUPER_ADMIN) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <ExclamationCircleOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
        <Title level={3}>權限不足</Title>
        <Text type="secondary">只有管理員可以訪問用戶管理頁面</Text>
      </div>
    )
  }

  // 載入用戶列表
  const loadUsers = async (page = 1, status = statusFilter) => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status
      })

      const response = await fetch(`/api/users?${queryParams}`)
      const result = await response.json()

      if (result.success) {
        setUsers(result.data.users)
        setPagination(result.data.pagination)
      } else {
        message.error(result.error?.message || '載入用戶列表失敗')
      }
    } catch (error) {
      console.error('載入用戶列表錯誤:', error)
      message.error('載入用戶列表失敗')
    } finally {
      setLoading(false)
    }
  }

  // 修改用戶角色
  const handleUpdateRole = async (userId: string, newRole: Role, investor_id?: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, investor_id })
      })

      const result = await response.json()

      if (result.success) {
        message.success(result.message || '用戶權限已更新')
        setRoleModalVisible(false)
        setEditingUser(null)
        loadUsers(pagination.page, statusFilter)  // 重新載入
      } else {
        message.error(result.error?.message || '權限更新失敗')
      }
    } catch (error) {
      console.error('更新用戶權限錯誤:', error)
      message.error('權限更新失敗')
    }
  }

  useEffect(() => {
    loadUsers()
  }, [session?.user?.id, statusFilter])

  // 角色標籤樣式
  const getRoleTag = (role: Role) => {
    switch (role) {
      case Role.SUPER_ADMIN:
        return <Tag color="red" icon={<CrownOutlined />}>超級管理員</Tag>
      case Role.INVESTOR:
        return <Tag color="gold" icon={<EyeOutlined />}>投資方</Tag>
      case Role.EMPLOYEE:
        return <Tag color="blue" icon={<UserOutlined />}>員工</Tag>
      case Role.PENDING:
        return <Tag color="orange" icon={<ClockCircleOutlined />}>待審核</Tag>
      default:
        return <Tag color="default">未知</Tag>
    }
  }

  // 表格欄位定義
  const columns = [
    {
      title: '用戶',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: User) => (
        <Space>
          <Avatar
            src={record.image}
            icon={<UserOutlined />}
            size="small"
          />
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: Role) => getRoleTag(role),
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active: boolean, record: User) => (
        record.role === Role.PENDING ? (
          <Badge status="processing" text="等待審核" />
        ) : is_active ? (
          <Badge status="success" text="已啟用" />
        ) : (
          <Badge status="error" text="已停用" />
        )
      ),
    },
    {
      title: '註冊時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <Tooltip title={moment(date).format('YYYY-MM-DD HH:mm:ss')}>
          {moment(date).fromNow()}
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          {record.role === Role.PENDING && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleUpdateRole(record.id, Role.EMPLOYEE)}
              >
                批准為員工
              </Button>
              <Button
                type="primary"
                size="small"
                ghost
                onClick={() => handleUpdateRole(record.id, Role.INVESTOR)}
              >
                批准為投資方
              </Button>
            </>
          )}
          {record.email !== session?.user?.email && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingUser(record)
                setRoleModalVisible(true)
              }}
            >
              編輯權限
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 0 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>用戶管理</Title>
          <Text type="secondary">管理系統用戶權限和審核新用戶</Text>
        </div>

        <Space>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            placeholder="篩選狀態"
          >
            <Option value="all">全部用戶</Option>
            <Option value="pending">待審核</Option>
            <Option value="active">已啟用</Option>
          </Select>
        </Space>
      </div>

      {/* 待審核用戶統計 */}
      {users.filter(u => u.role === Role.PENDING).length > 0 && (
        <Card
          style={{ marginBottom: 24, border: '1px solid #ffa940' }}
          bodyStyle={{ padding: 16 }}
        >
          <Space align="center">
            <ClockCircleOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
            <div>
              <Text strong style={{ color: '#fa8c16' }}>
                有 {users.filter(u => u.role === Role.PENDING).length} 位用戶等待審核
              </Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  請及時審核新用戶的權限申請
                </Text>
              </div>
            </div>
          </Space>
        </Card>
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            total: pagination.total,
            pageSize: pagination.limit,
            onChange: (page) => loadUsers(page, statusFilter),
            showSizeChanger: false,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 位用戶`,
          }}
          size="middle"
        />
      </Card>

      {/* 編輯權限 Modal */}
      <Modal
        title="編輯用戶權限"
        open={roleModalVisible}
        onCancel={() => {
          setRoleModalVisible(false)
          setEditingUser(null)
        }}
        footer={null}
        width={500}
      >
        {editingUser && (
          <div style={{ padding: '20px 0' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text strong>用戶資訊</Text>
                <div style={{ marginTop: 8, padding: 12, background: '#fafafa', borderRadius: 6 }}>
                  <Space>
                    <Avatar src={editingUser.image} icon={<UserOutlined />} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{editingUser.name}</div>
                      <Text type="secondary">{editingUser.email}</Text>
                    </div>
                  </Space>
                </div>
              </div>

              <div>
                <Text strong>選擇新角色</Text>
                <div style={{ marginTop: 12 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                      type={editingUser.role === Role.EMPLOYEE ? "primary" : "default"}
                      style={{ width: '100%', height: 48, textAlign: 'left' }}
                      icon={<UserOutlined />}
                      onClick={() => handleUpdateRole(editingUser.id, Role.EMPLOYEE)}
                    >
                      <div>
                        <div>員工</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          可以管理商品、庫存、採購等日常業務
                        </Text>
                      </div>
                    </Button>

                    <Button
                      type={editingUser.role === Role.INVESTOR ? "primary" : "default"}
                      style={{ width: '100%', height: 48, textAlign: 'left' }}
                      icon={<EyeOutlined />}
                      onClick={() => handleUpdateRole(editingUser.id, Role.INVESTOR)}
                    >
                      <div>
                        <div>投資方</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          只能查看投資項目的報表，看不到實際價格
                        </Text>
                      </div>
                    </Button>

                    <Popconfirm
                      title="確定要將此用戶設為待審核狀態嗎？"
                      onConfirm={() => handleUpdateRole(editingUser.id, Role.PENDING)}
                      okText="確定"
                      cancelText="取消"
                    >
                      <Button
                        type={editingUser.role === Role.PENDING ? "primary" : "default"}
                        danger={editingUser.role !== Role.PENDING}
                        style={{ width: '100%', height: 48, textAlign: 'left' }}
                        icon={<ClockCircleOutlined />}
                      >
                        <div>
                          <div>待審核</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            暫停用戶權限，需要重新審核
                          </Text>
                        </div>
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  )
}
