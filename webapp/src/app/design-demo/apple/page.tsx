'use client'

import React from 'react'
import { Card, Typography, Button, Space, Avatar, Progress } from 'antd'
import {
  AppleOutlined,
  TrophyOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  RiseOutlined,
  ArrowRightOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

export default function AppleStyleDemo() {
  return (
    <div style={{
      background: '#f5f5f7',
      minHeight: '100vh',
      padding: '32px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '24px 32px',
        marginBottom: '32px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #007AFF, #5AC8FA)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AppleOutlined style={{ fontSize: '24px', color: 'white' }} />
            </div>
            <div>
              <Title level={2} style={{ margin: 0, color: '#1d1d1f', fontWeight: 600 }}>
                酒類交易系統
              </Title>
              <Text style={{ color: '#6e6e73', fontSize: '16px' }}>
                Apple Design Language
              </Text>
            </div>
          </div>
          <Button
            type="primary"
            size="large"
            style={{
              background: 'linear-gradient(135deg, #007AFF, #5AC8FA)',
              border: 'none',
              borderRadius: '12px',
              height: '48px',
              padding: '0 24px',
              fontWeight: 500,
              boxShadow: '0 4px 16px rgba(0, 122, 255, 0.3)'
            }}
          >
            開始使用
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {[
          {
            title: '今日營收',
            value: '₹287,500',
            change: '+12.5%',
            icon: DollarOutlined,
            gradient: 'linear-gradient(135deg, #34C759, #30D158)'
          },
          {
            title: '活躍客戶',
            value: '1,247',
            change: '+8.3%',
            icon: UserOutlined,
            gradient: 'linear-gradient(135deg, #FF9500, #FFCC02)'
          },
          {
            title: '訂單數量',
            value: '156',
            change: '+15.7%',
            icon: ShoppingCartOutlined,
            gradient: 'linear-gradient(135deg, #FF3B30, #FF6482)'
          },
          {
            title: '庫存價值',
            value: '₹12.8M',
            change: '+5.2%',
            icon: TrophyOutlined,
            gradient: 'linear-gradient(135deg, #5856D6, #AF52DE)'
          }
        ].map((stat, index) => (
          <Card
            key={index}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{
                  width: '52px',
                  height: '52px',
                  background: stat.gradient,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <stat.icon style={{ fontSize: '24px', color: 'white' }} />
                </div>
                <Text style={{ color: '#6e6e73', fontSize: '14px', fontWeight: 500 }}>
                  {stat.title}
                </Text>
                <div style={{ marginTop: '4px' }}>
                  <Title level={3} style={{ margin: 0, color: '#1d1d1f', fontWeight: 600 }}>
                    {stat.value}
                  </Title>
                </div>
              </div>
              <div style={{
                background: '#f1f8ff',
                color: '#007AFF',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                {stat.change}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        {/* Chart Section */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <RiseOutlined style={{ color: '#007AFF' }} />
              <span style={{ color: '#1d1d1f', fontWeight: 600 }}>營收趨勢</span>
            </div>
          }
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <div style={{
            height: '300px',
            background: 'linear-gradient(135deg, #f8faff, #f0f8ff)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              bottom: '20px',
              background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(90, 200, 250, 0.1))',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Text style={{ color: '#007AFF', fontSize: '18px', fontWeight: 500 }}>
                互動式圖表區域
              </Text>
            </div>
          </div>
        </Card>

        {/* Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Customers */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <TrophyOutlined style={{ color: '#FF9500' }} />
                <span style={{ color: '#1d1d1f', fontWeight: 600 }}>頂級客戶</span>
              </div>
            }
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {[
                { name: '王大明', amount: '₹125,000', avatar: '王' },
                { name: '李小華', amount: '₹98,500', avatar: '李' },
                { name: '張三豐', amount: '₹87,200', avatar: '張' }
              ].map((customer, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(248, 250, 255, 0.6)',
                  borderRadius: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar
                      style={{
                        backgroundColor: '#007AFF',
                        color: 'white',
                        fontWeight: 600
                      }}
                    >
                      {customer.avatar}
                    </Avatar>
                    <Text style={{ color: '#1d1d1f', fontWeight: 500 }}>
                      {customer.name}
                    </Text>
                  </div>
                  <Text style={{ color: '#007AFF', fontWeight: 600 }}>
                    {customer.amount}
                  </Text>
                </div>
              ))}
            </Space>

            <Button
              type="link"
              style={{
                color: '#007AFF',
                padding: 0,
                marginTop: '16px',
                fontWeight: 500
              }}
            >
              查看全部 <ArrowRightOutlined />
            </Button>
          </Card>

          {/* Progress */}
          <Card
            title={
              <span style={{ color: '#1d1d1f', fontWeight: 600 }}>月度目標</span>
            }
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text style={{ color: '#6e6e73' }}>營收目標</Text>
                  <Text style={{ color: '#1d1d1f', fontWeight: 600 }}>75%</Text>
                </div>
                <Progress
                  percent={75}
                  showInfo={false}
                  strokeColor={{
                    '0%': '#007AFF',
                    '100%': '#5AC8FA',
                  }}
                  trailColor="rgba(0, 122, 255, 0.1)"
                  strokeWidth={8}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text style={{ color: '#6e6e73' }}>客戶增長</Text>
                  <Text style={{ color: '#1d1d1f', fontWeight: 600 }}>85%</Text>
                </div>
                <Progress
                  percent={85}
                  showInfo={false}
                  strokeColor={{
                    '0%': '#34C759',
                    '100%': '#30D158',
                  }}
                  trailColor="rgba(52, 199, 89, 0.1)"
                  strokeWidth={8}
                />
              </div>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  )
}