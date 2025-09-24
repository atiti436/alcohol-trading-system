'use client'

import React from 'react'
import { Card, Space, Typography } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

// 待審核用戶Dashboard
export default function PendingApprovalDashboard() {
  return (
    <div style={{ textAlign: 'center', padding: '100px 20px' }}>
      <Space direction="vertical" size="large">
        <div>
          <ClockCircleOutlined style={{ fontSize: 64, color: '#faad14', marginBottom: 24 }} />
          <Title level={2} style={{ color: '#faad14' }}>
            帳戶待審核中
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            您的帳戶正在等待管理員審核，請耐心等候
          </Text>
        </div>

        <Card
          style={{ maxWidth: 500, margin: '0 auto', textAlign: 'left' }}
          title="審核說明"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>📝 系統管理員將會審核您的帳戶權限</Text>
            <Text>⏰ 審核通常在1-2個工作日內完成</Text>
            <Text>📧 審核完成後將會收到Email通知</Text>
            <Text>🔔 您也可以重新登入查看審核狀態</Text>
          </Space>
        </Card>

        <div>
          <Text type="secondary">
            如有緊急需求，請聯繫系統管理員
          </Text>
          <br />
          <Text type="secondary" copyable>
            manpan.whisky@gmail.com
          </Text>
        </div>
      </Space>
    </div>
  )
}
