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
    pages: number
  }
}

export default function UserManagementTab() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  // 載入用戶列表
  const loadUsers = async (page = 1, pageSize = 10) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/users?page=${page}&limit=${pageSize}`)
      const data: UserListResponse = await response.json()

      setUsers(data.users || [])
      setPagination({
        current: data.pagination?.page || 1,
        pageSize: data.pagination?.limit || 10,
        total: data.pagination?.total || 0
      })
    } catch (error) {
      console.error('載入用戶列表失敗:', error)
      message.error('載入用戶列表失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // 更新用戶角色
  const updateUserRole = async (userId: string, newRole: Role) => {
    try {
      const response = await fetch('/api/users/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: newRole
        })
      })

      const data = await response.json()

      if (data.success) {
        message.success('用戶角色已更新')
        loadUsers(pagination.current, pagination.pageSize)
      } else {
        message.error(data.error || '更新失敗')
      }
    } catch (error) {
      console.error('更新用戶角色失敗:', error)
      message.error('更新用戶角色失敗')
    }
  }

  // 切換用戶狀態
  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/users/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          is_active: isActive
        })
      })

      const data = await response.json()

      if (data.success) {
        message.success(`用戶已${isActive ? '啟用' : '停用'}`)
        loadUsers(pagination.current, pagination.pageSize)
      } else {
        message.error(data.error || '操作失敗')
      }
    } catch (error) {
      console.error('更新用戶狀態失敗:', error)
      message.error('更新用戶狀態失敗')
    }
  }

  // 角色標籤渲染
  const renderRoleTag = (role: Role) => {
    const roleConfig = {
      [Role.SUPER_ADMIN]: { color: 'red', icon: <CrownOutlined />, text: '超級管理員' },
      [Role.EMPLOYEE]: { color: 'blue', icon: <UserOutlined />, text: '員工' },
      [Role.INVESTOR]: { color: 'green', icon: <EyeOutlined />, text: '投資方' },
      [Role.PENDING]: { color: 'orange', icon: <ClockCircleOutlined />, text: '待審核' }
    }

    const config = roleConfig[role] || roleConfig[Role.PENDING]
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  // 表格欄位定義
  const columns = [
    {
      title: '用戶',
      key: 'user',
      render: (record: User) => (
        <Space>
          <Avatar src={record.image} icon={<UserOutlined />} size={32} />
          <div>
            <div>{record.name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.email}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: renderRoleTag
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'status',
      render: (isActive: boolean) => (
        <Badge
          status={isActive ? 'success' : 'error'}
          text={isActive ? '啟用' : '停用'}
        />
      )
    },
    {
      title: '註冊時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <Tooltip title={moment(date).format('YYYY-MM-DD HH:mm:ss')}>
          {moment(date).fromNow()}
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: User) => {
        const isCurrentUser = record.id === session?.user?.id

        return (
          <Space>
            <Select
              value={record.role}
              style={{ width: 120 }}
              onChange={(newRole) => updateUserRole(record.id, newRole)}
              disabled={isCurrentUser}
              size="small"
            >
              <Option value={Role.SUPER_ADMIN}>超級管理員</Option>
              <Option value={Role.EMPLOYEE}>員工</Option>
              <Option value={Role.INVESTOR}>投資方</Option>
              <Option value={Role.PENDING}>待審核</Option>
            </Select>

            <Popconfirm
              title={`確定要${record.is_active ? '停用' : '啟用'}此用戶嗎？`}
              onConfirm={() => toggleUserStatus(record.id, !record.is_active)}
              disabled={isCurrentUser}
            >
              <Button
                type={record.is_active ? 'default' : 'primary'}
                size="small"
                disabled={isCurrentUser}
                icon={record.is_active ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
              >
                {record.is_active ? '停用' : '啟用'}
              </Button>
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  return (
    <Card
      title={
        <Space>
          <UserOutlined />
          用戶管理
          <Badge count={users.length} style={{ backgroundColor: '#52c41a' }} />
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `第 ${range[0]}-${range[1]} 項，共 ${total} 個用戶`,
          onChange: (page, pageSize) => {
            loadUsers(page, pageSize!)
          }
        }}
        scroll={{ x: 800 }}
      />
    </Card>
  )
}