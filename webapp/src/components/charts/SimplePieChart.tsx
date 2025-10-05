'use client'

import React from 'react'
import { Card, Typography, Space } from 'antd'

const { Text } = Typography

interface PieDataPoint {
  name: string
  value: number
  color: string
}

interface SimplePieChartProps {
  title: string
  data: PieDataPoint[]
  height?: number
}

export default function SimplePieChart({
  title,
  data,
  height = 200
}: SimplePieChartProps) {
  if (!data || data.length === 0) return null

  const total = data.reduce((sum, item) => sum + item.value, 0)

  // 🔒 如果總數為0，顯示空狀態
  if (total === 0 || !Number.isFinite(total)) {
    return (
      <Card title={title} style={{ height: height + 120 }}>
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          暫無數據
        </div>
      </Card>
    )
  }

  const radius = Math.min(height, 200) / 3
  const centerX = 120
  const centerY = height / 2

  // 計算每個扇形的角度
  let currentAngle = -Math.PI / 2 // 從頂部開始
  const sectors = data.map(item => {
    const percentage = (item.value || 0) / total // 🔒 防止 undefined / total
    const angle = percentage * 2 * Math.PI
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    // 計算路徑
    const x1 = centerX + radius * Math.cos(startAngle)
    const y1 = centerY + radius * Math.sin(startAngle)
    const x2 = centerX + radius * Math.cos(endAngle)
    const y2 = centerY + radius * Math.sin(endAngle)

    const largeArcFlag = angle > Math.PI ? 1 : 0
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ')

    return {
      ...item,
      pathData,
      percentage: (percentage * 100).toFixed(1),
      startAngle,
      endAngle
    }
  })

  return (
    <Card title={title} style={{ height: height + 120 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* 圓餅圖 */}
        <div style={{ position: 'relative' }}>
          <svg width="240" height={height} viewBox={`0 0 240 ${height}`}>
            {sectors.map((sector, index) => (
              <g key={index}>
                <path
                  d={sector.pathData}
                  fill={sector.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                >
                  <title>{`${sector.name}: ${sector.value.toLocaleString()} (${sector.percentage}%)`}</title>
                </path>
              </g>
            ))}

            {/* 中心圓 */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius * 0.4}
              fill="white"
              stroke="#f0f0f0"
              strokeWidth="1"
            />

            {/* 中心文字 */}
            <text
              x={centerX}
              y={centerY - 8}
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="#333"
            >
              總計
            </text>
            <text
              x={centerX}
              y={centerY + 8}
              textAnchor="middle"
              fontSize="12"
              fill="#666"
            >
              {total.toLocaleString()}
            </text>
          </svg>
        </div>

        {/* 圖例 */}
        <div style={{ marginLeft: 20, flex: 1 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {sectors.map((sector, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: sector.color,
                      borderRadius: 2
                    }}
                  />
                  <Text style={{ fontSize: 13 }}>{sector.name}</Text>
                </Space>
                <div style={{ textAlign: 'right' }}>
                  <Text strong style={{ fontSize: 13 }}>{sector.value.toLocaleString()}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>{sector.percentage}%</Text>
                </div>
              </div>
            ))}
          </Space>
        </div>
      </div>
    </Card>
  )
}