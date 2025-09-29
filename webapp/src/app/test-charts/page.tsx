'use client'

import React from 'react'
import { Typography, Space } from 'antd'
import SimpleLineChart from '@/components/charts/SimpleLineChart'
import SimplePieChart from '@/components/charts/SimplePieChart'

const { Title } = Typography

export default function TestChartsPage() {
  const testLineData = [
    { month: '1月', value: 100000 },
    { month: '2月', value: 150000 },
    { month: '3月', value: 120000 },
    { month: '4月', value: 200000 }
  ]

  const testPieData = [
    { name: '威士忌', value: 45, color: '#1890ff' },
    { name: '清酒', value: 30, color: '#52c41a' },
    { name: '紅酒', value: 25, color: '#faad14' }
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>圖表測試頁面</Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <SimpleLineChart
          title="測試折線圖"
          data={testLineData}
          prefix="NT$ "
          height={200}
        />

        <SimplePieChart
          title="測試圓餅圖"
          data={testPieData}
          height={200}
        />
      </Space>
    </div>
  )
}