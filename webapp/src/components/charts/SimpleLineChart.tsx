'use client'

import React from 'react'
import { Card, Typography } from 'antd'

const { Text } = Typography

interface DataPoint {
  month: string
  value: number
  color?: string
}

interface SimpleLineChartProps {
  title: string
  data: DataPoint[]
  height?: number
  prefix?: string
  suffix?: string
}

export default function SimpleLineChart({
  title,
  data,
  height = 200,
  prefix = '',
  suffix = ''
}: SimpleLineChartProps) {
  if (!data || data.length === 0) return null

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1 // 🔒 防止除以0產生NaN

  // 計算SVG路徑點
  const width = 300
  const chartHeight = height - 40
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * (width - 40) + 20
    // 🔒 當所有值都是0時，顯示在中間位置
    const normalizedValue = range > 0 ? ((item.value - minValue) / range) : 0.5
    const y = chartHeight - normalizedValue * (chartHeight - 20) + 10
    return { x, y, value: item.value, month: item.month }
  })

  // 創建路徑字符串
  const pathData = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`
    return `${path} L ${point.x} ${point.y}`
  }, '')

  // 創建面積填充路徑
  const areaPath = `${pathData} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`

  return (
    <Card title={title} style={{ height: height + 80 }}>
      <div style={{ position: 'relative', height: height }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* 網格線 */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1890ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1890ff" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* 背景網格 */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1="20"
              y1={10 + (i * (chartHeight - 20) / 4)}
              x2={width - 20}
              y2={10 + (i * (chartHeight - 20) / 4)}
              stroke="#f0f0f0"
              strokeWidth="1"
            />
          ))}

          {/* 面積填充 */}
          <path
            d={areaPath}
            fill="url(#areaGradient)"
          />

          {/* 主線條 */}
          <path
            d={pathData}
            fill="none"
            stroke="#1890ff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 數據點 */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#1890ff"
                stroke="#ffffff"
                strokeWidth="2"
              />
              {/* 懸停時顯示數值 */}
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="transparent"
                style={{ cursor: 'pointer' }}
              >
                <title>{`${point.month}: ${prefix}${point.value.toLocaleString()}${suffix}`}</title>
              </circle>
            </g>
          ))}

          {/* X軸標籤 */}
          {points.map((point, index) => (
            <text
              key={index}
              x={point.x}
              y={height - 5}
              textAnchor="middle"
              fontSize="12"
              fill="#666"
            >
              {point.month}
            </text>
          ))}
        </svg>

        {/* 最新數值顯示 */}
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: '#f0f8ff',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: '12px',
          color: '#1890ff'
        }}>
          最新: {prefix}{data[data.length - 1]?.value.toLocaleString()}{suffix}
        </div>
      </div>
    </Card>
  )
}