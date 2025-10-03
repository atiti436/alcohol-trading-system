'use client'

import React, { useEffect, useState } from 'react'
import { Card, List, Tag, Space, Typography, Button, Empty, Spin } from 'antd'
import { CalendarOutlined, ShoppingCartOutlined, BellOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

const { Text, Title } = Typography

interface PreorderAlert {
  sale_id: string
  sale_number: string
  customer_name: string
  expected_arrival_date: string
  days_until_arrival: number
  item_count: number
  total_amount: number
}

export default function PreorderWidget() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [preorders, setPreorders] = useState<PreorderAlert[]>([])

  useEffect(() => {
    loadPreorderAlerts()
  }, [])

  const loadPreorderAlerts = async () => {
    setLoading(true)
    try {
      // 載入本週預計到貨的預購單
      const response = await fetch('/api/sales/preorder-alerts')
      const result = await response.json()

      if (response.ok && result.success) {
        setPreorders(result.data)
      }
    } catch (error) {
      console.error('載入預購提醒失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card title={
        <Space>
          <BellOutlined />
          預購提醒
        </Space>
      }>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin />
        </div>
      </Card>
    )
  }

  return (
    <Card
      title={
        <Space>
          <BellOutlined />
          預購提醒
        </Space>
      }
      extra={
        <Button
          type="link"
          size="small"
          onClick={() => router.push('/sales/preorder-summary')}
        >
          查看全部
        </Button>
      }
    >
      {preorders.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="本週無預計到貨的預購單"
        />
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              本週預計到貨：<Text strong>{preorders.length}</Text> 筆預購單
            </Text>
          </div>

          <List
            size="small"
            dataSource={preorders}
            renderItem={(item) => {
              const isUrgent = item.days_until_arrival <= 2
              const isPast = item.days_until_arrival < 0

              return (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Space>
                        <Tag color="purple">{item.sale_number}</Tag>
                        <Text strong>{item.customer_name}</Text>
                      </Space>
                      {isPast ? (
                        <Tag color="red">已逾期 {Math.abs(item.days_until_arrival)} 天</Tag>
                      ) : isUrgent ? (
                        <Tag color="orange">還有 {item.days_until_arrival} 天</Tag>
                      ) : (
                        <Tag color="blue">還有 {item.days_until_arrival} 天</Tag>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                      <Space size="middle">
                        <span>
                          <CalendarOutlined /> {dayjs(item.expected_arrival_date).format('MM/DD')}
                        </span>
                        <span>
                          <ShoppingCartOutlined /> {item.item_count} 項商品
                        </span>
                      </Space>
                      <Text type="secondary">NT$ {item.total_amount.toLocaleString()}</Text>
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />
        </>
      )}
    </Card>
  )
}
