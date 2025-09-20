'use client'

import React from 'react'
import { Card, Typography, Button, Space, Progress, Divider } from 'antd'
import {
  ShopOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  RiseOutlined,
  MinusOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

export default function MujiStyleDemo() {
  return (
    <div style={{
      background: '#faf9f6',
      minHeight: '100vh',
      padding: '48px',
      fontFamily: '"Hiragino Sans", "Yu Gothic", "YuGothic", "Meiryo", sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        borderRadius: '0',
        padding: '32px',
        marginBottom: '48px',
        border: '1px solid #e8e8e8',
        boxShadow: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{
              width: '8px',
              height: '48px',
              background: '#2c2c2c',
              borderRadius: '0'
            }} />
            <div>
              <Title level={1} style={{
                margin: 0,
                color: '#2c2c2c',
                fontWeight: 300,
                fontSize: '28px',
                letterSpacing: '0.5px'
              }}>
                酒類交易系統
              </Title>
              <Text style={{
                color: '#8c8c8c',
                fontSize: '14px',
                fontWeight: 300,
                letterSpacing: '1px'
              }}>
                MUJI DESIGN PHILOSOPHY
              </Text>
            </div>
          </div>
          <Button
            style={{
              background: '#2c2c2c',
              border: 'none',
              borderRadius: '0',
              height: '48px',
              padding: '0 32px',
              color: '#ffffff',
              fontWeight: 300,
              fontSize: '14px',
              letterSpacing: '1px'
            }}
          >
            開始使用
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <MinusOutlined style={{ color: '#2c2c2c', fontSize: '20px' }} />
          <Title level={3} style={{
            margin: 0,
            color: '#2c2c2c',
            fontWeight: 300,
            fontSize: '18px',
            letterSpacing: '0.5px'
          }}>
            今日概況
          </Title>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2px',
          background: '#e8e8e8'
        }}>
          {[
            {
              title: '營收',
              value: '287,500',
              unit: 'TWD',
              icon: DollarOutlined
            },
            {
              title: '客戶',
              value: '1,247',
              unit: '人',
              icon: UserOutlined
            },
            {
              title: '訂單',
              value: '156',
              unit: '筆',
              icon: ShoppingCartOutlined
            },
            {
              title: '庫存',
              value: '12.8M',
              unit: 'TWD',
              icon: ShopOutlined
            }
          ].map((stat, index) => (
            <div
              key={index}
              style={{
                background: '#ffffff',
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start'
              }}
            >
              <stat.icon style={{
                fontSize: '24px',
                color: '#8c8c8c',
                marginBottom: '16px'
              }} />
              <Text style={{
                color: '#8c8c8c',
                fontSize: '12px',
                fontWeight: 300,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                {stat.title}
              </Text>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <Title level={2} style={{
                  margin: 0,
                  color: '#2c2c2c',
                  fontWeight: 300,
                  fontSize: '32px'
                }}>
                  {stat.value}
                </Title>
                <Text style={{
                  color: '#8c8c8c',
                  fontSize: '14px',
                  fontWeight: 300
                }}>
                  {stat.unit}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2px', background: '#e8e8e8' }}>
        {/* Chart Section */}
        <div style={{
          background: '#ffffff',
          padding: '48px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <MinusOutlined style={{ color: '#2c2c2c', fontSize: '20px' }} />
            <Title level={3} style={{
              margin: 0,
              color: '#2c2c2c',
              fontWeight: 300,
              fontSize: '18px',
              letterSpacing: '0.5px'
            }}>
              營收趨勢分析
            </Title>
          </div>

          <div style={{
            height: '320px',
            background: '#f8f8f8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '48px',
              left: '48px',
              right: '48px',
              bottom: '48px',
              border: '1px solid #e8e8e8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Text style={{
                color: '#8c8c8c',
                fontSize: '16px',
                fontWeight: 300,
                letterSpacing: '0.5px'
              }}>
                圖表區域
              </Text>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <Text style={{
              color: '#8c8c8c',
              fontSize: '14px',
              fontWeight: 300,
              lineHeight: '1.6'
            }}>
              簡潔的數據呈現，去除不必要的裝飾元素，讓資訊本身成為焦點。
              透過留白與線條的運用，創造寧靜而專注的使用體驗。
            </Text>
          </div>
        </div>

        {/* Side Panel */}
        <div style={{
          background: '#ffffff',
          padding: '48px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Top Customers */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <MinusOutlined style={{ color: '#2c2c2c', fontSize: '20px' }} />
              <Title level={4} style={{
                margin: 0,
                color: '#2c2c2c',
                fontWeight: 300,
                fontSize: '16px',
                letterSpacing: '0.5px'
              }}>
                重要客戶
              </Title>
            </div>

            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {[
                { name: '王大明', amount: '125,000' },
                { name: '李小華', amount: '98,500' },
                { name: '張三豐', amount: '87,200' }
              ].map((customer, index) => (
                <div key={index}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '12px'
                  }}>
                    <Text style={{
                      color: '#2c2c2c',
                      fontSize: '14px',
                      fontWeight: 300
                    }}>
                      {customer.name}
                    </Text>
                    <Text style={{
                      color: '#8c8c8c',
                      fontSize: '14px',
                      fontWeight: 300
                    }}>
                      {customer.amount}
                    </Text>
                  </div>
                  {index < 2 && <Divider style={{ margin: '12px 0', borderColor: '#f0f0f0' }} />}
                </div>
              ))}
            </Space>
          </div>

          {/* Progress Section */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <MinusOutlined style={{ color: '#2c2c2c', fontSize: '20px' }} />
              <Title level={4} style={{
                margin: 0,
                color: '#2c2c2c',
                fontWeight: 300,
                fontSize: '16px',
                letterSpacing: '0.5px'
              }}>
                月度進度
              </Title>
            </div>

            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <Text style={{
                    color: '#8c8c8c',
                    fontSize: '12px',
                    fontWeight: 300,
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                  }}>
                    營收目標
                  </Text>
                  <Text style={{
                    color: '#2c2c2c',
                    fontSize: '14px',
                    fontWeight: 300
                  }}>
                    75%
                  </Text>
                </div>
                <Progress
                  percent={75}
                  showInfo={false}
                  strokeColor="#2c2c2c"
                  trailColor="#f0f0f0"
                  strokeWidth={2}
                />
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <Text style={{
                    color: '#8c8c8c',
                    fontSize: '12px',
                    fontWeight: 300,
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                  }}>
                    客戶增長
                  </Text>
                  <Text style={{
                    color: '#2c2c2c',
                    fontSize: '14px',
                    fontWeight: 300
                  }}>
                    85%
                  </Text>
                </div>
                <Progress
                  percent={85}
                  showInfo={false}
                  strokeColor="#2c2c2c"
                  trailColor="#f0f0f0"
                  strokeWidth={2}
                />
              </div>
            </Space>
          </div>

          <div style={{ marginTop: '48px' }}>
            <Text style={{
              color: '#8c8c8c',
              fontSize: '12px',
              fontWeight: 300,
              lineHeight: '1.8',
              letterSpacing: '0.5px'
            }}>
              極簡設計哲學：
              功能性與美學的平衡，
              去蕪存菁的純粹體驗。
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}