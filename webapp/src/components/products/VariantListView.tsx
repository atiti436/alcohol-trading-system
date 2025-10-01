'use client'

import React from 'react'
import { Table, Tag, Space, Button, Typography, Tooltip, Popconfirm } from 'antd'
import { DollarOutlined, EyeOutlined, EyeInvisibleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

interface Variant {
  id: string
  variant_code: string
  variant_type: string
  description: string
  cost_price: number
  investor_price: number
  actual_price: number
  stock_quantity: number
  is_active: boolean
}

interface VariantListViewProps {
  variants: Variant[]
  userRole: string // 'SUPER_ADMIN' | 'EMPLOYEE' | 'INVESTOR'
  onAdjustPrice?: (variant: Variant) => void
  onEdit?: (variant: Variant) => void
  onDelete?: (variant: Variant) => void
  loading?: boolean
}

/**
 * 變體列表展示組件
 * - 根據角色顯示不同價格欄位
 * - INVESTOR 只看成本價 + 投資方價
 * - SUPER_ADMIN 看全部價格
 */
export default function VariantListView({
  variants,
  userRole,
  onAdjustPrice,
  onEdit,
  onDelete,
  loading = false
}: VariantListViewProps) {
  const canViewActualPrice = userRole === 'SUPER_ADMIN' || userRole === 'EMPLOYEE'
  const canAdjustPrice = userRole === 'INVESTOR' || userRole === 'SUPER_ADMIN'
  const canEdit = userRole === 'SUPER_ADMIN' || userRole === 'EMPLOYEE' // 只有管理員可編輯

  const columns: ColumnsType<Variant> = [
    {
      title: '變體編號',
      dataIndex: 'variant_code',
      key: 'variant_code',
      width: 150,
      render: (code: string) => <Text code strong>{code}</Text>
    },
    {
      title: '變體類型',
      dataIndex: 'variant_type',
      key: 'variant_type',
      width: 200,
      render: (type: string, record: Variant) => (
        <Space direction="vertical" size={0}>
          <Text strong>{type}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </Space>
      )
    },
    {
      title: '成本價',
      dataIndex: 'cost_price',
      key: 'cost_price',
      width: 100,
      align: 'right',
      render: (price: number) => (
        <Text>${price.toFixed(2)}</Text>
      )
    },
    {
      title: '投資方價',
      dataIndex: 'investor_price',
      key: 'investor_price',
      width: 120,
      align: 'right',
      render: (price: number, record: Variant) => {
        const profit = price - record.cost_price
        return (
          <Space direction="vertical" size={0} style={{ alignItems: 'flex-end' }}>
            <Text strong>${price.toFixed(2)}</Text>
            <Text
              type={profit >= 0 ? 'success' : 'danger'}
              style={{ fontSize: '12px' }}
            >
              {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
            </Text>
          </Space>
        )
      }
    },
    ...(canViewActualPrice ? [{
      title: (
        <Space>
          <span>實際售價</span>
          <Tooltip title="僅 SUPER_ADMIN 和 EMPLOYEE 可見">
            <EyeOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'actual_price',
      key: 'actual_price',
      width: 120,
      align: 'right' as const,
      render: (price: number, record: Variant) => {
        const profit = price - record.investor_price
        return (
          <Space direction="vertical" size={0} style={{ alignItems: 'flex-end' }}>
            <Text strong type="warning">${price.toFixed(2)}</Text>
            <Text
              type={profit >= 0 ? 'success' : 'danger'}
              style={{ fontSize: '12px' }}
            >
              您賺 {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
            </Text>
          </Space>
        )
      }
    }] : []),
    {
      title: '庫存',
      dataIndex: 'stock_quantity',
      key: 'stock_quantity',
      width: 80,
      align: 'center',
      render: (qty: number) => {
        let color = 'success'
        if (qty === 0) color = 'error'
        else if (qty < 10) color = 'warning'

        return <Tag color={color}>{qty}</Tag>
      }
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      align: 'center',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? '啟用' : '停用'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      align: 'center' as const,
      render: (_: any, record: Variant) => (
        <Space size="small">
          {/* 編輯按鈕 - 僅管理員 */}
          {canEdit && onEdit && (
            <Tooltip title="編輯變體">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              >
                編輯
              </Button>
            </Tooltip>
          )}

          {/* 調價按鈕 - 投資方和管理員 */}
          {canAdjustPrice && onAdjustPrice && (
            <Tooltip title="調整價格">
              <Button
                type="link"
                size="small"
                icon={<DollarOutlined />}
                onClick={() => onAdjustPrice(record)}
              >
                調價
              </Button>
            </Tooltip>
          )}

          {/* 刪除按鈕 - 僅 SUPER_ADMIN */}
          {userRole === 'SUPER_ADMIN' && onDelete && (
            <Popconfirm
              title="確定要刪除此變體嗎？"
              description="刪除後將無法恢復"
              onConfirm={() => onDelete(record)}
              okText="確定"
              cancelText="取消"
            >
              <Tooltip title="刪除變體">
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  刪除
                </Button>
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      {/* 權限提示 */}
      {!canViewActualPrice && (
        <div style={{ marginBottom: 16, padding: '12px', background: '#fff7e6', borderRadius: 4 }}>
          <Space>
            <EyeInvisibleOutlined style={{ color: '#fa8c16' }} />
            <Text type="secondary">
              投資方模式：實際售價已隱藏，僅顯示您的期望售價
            </Text>
          </Space>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={variants}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
      />
    </div>
  )
}
