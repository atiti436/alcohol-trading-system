import React from 'react'
import { Typography, Row, Col, Divider } from 'antd'
import { COMPANY_INFO, DOCUMENT_TITLES, DocumentType } from '@/config/company'

const { Title, Text } = Typography

interface DocumentHeaderProps {
  documentType: DocumentType
  documentNumber: string
  date?: string
  additionalInfo?: React.ReactNode
}

/**
 * 統一的單據抬頭組件
 * 用於所有列印單據的公司資訊顯示
 */
export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  documentType,
  documentNumber,
  date,
  additionalInfo
}) => {
  return (
    <div className="document-header">
      <Row style={{ width: '100%' }}>
        <Col span={12}>
          {/* 公司資訊 */}
          <div className="company-info">
            <Title level={2} style={{ margin: 0, color: '#000', fontSize: '24px' }}>
              {COMPANY_INFO.name}
            </Title>
            {COMPANY_INFO.englishName && (
              <Text style={{ fontSize: '14px', color: '#666' }}>
                {COMPANY_INFO.englishName}
              </Text>
            )}
            <div style={{ marginTop: '8px', fontSize: '12px', lineHeight: '1.4' }}>
              <div>地址：{COMPANY_INFO.address}</div>
              <div>電話：{COMPANY_INFO.phone}</div>
              {COMPANY_INFO.fax && <div>傳真：{COMPANY_INFO.fax}</div>}
              {COMPANY_INFO.email && <div>Email：{COMPANY_INFO.email}</div>}
              {COMPANY_INFO.taxId && <div>統編：{COMPANY_INFO.taxId}</div>}
            </div>
          </div>
        </Col>
        <Col span={12}>
          {/* 單據資訊 */}
          <div className="document-info" style={{ textAlign: 'right' }}>
            <Title level={1} style={{ margin: 0, color: '#000', fontSize: '28px', fontWeight: 'bold' }}>
              {DOCUMENT_TITLES[documentType]}
            </Title>
            <div style={{ marginTop: '10px', fontSize: '14px', lineHeight: '1.6' }}>
              <div><strong>單據編號：{documentNumber}</strong></div>
              {date && <div>列印日期：{date}</div>}
              {additionalInfo}
            </div>
          </div>
        </Col>
      </Row>
      <Divider style={{
        margin: '15px 0',
        borderColor: '#000',
        borderWidth: '2px 0 0 0'
      }} />
    </div>
  )
}