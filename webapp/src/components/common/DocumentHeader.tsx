import React from 'react'
import { Typography, Row, Col, Divider, Skeleton } from 'antd'
import { DOCUMENT_TITLES, DocumentType, DEFAULT_COMPANY_INFO } from '@/config/company'
import { useCompanySettings } from '@/hooks/useCompanySettings'

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
  // 🔗 HOOK 連動：使用動態公司設定
  const { settings: companySettings, loading } = useCompanySettings()

  // 使用實際設定或預設值
  const companyInfo = companySettings || DEFAULT_COMPANY_INFO

  if (loading) {
    return (
      <div className="document-header">
        <Skeleton active paragraph={{ rows: 3 }} />
      </div>
    )
  }

  return (
    <div className="document-header">
      <Row style={{ width: '100%' }}>
        <Col span={12}>
          {/* 公司資訊 - 動態載入 */}
          <div className="company-info">
            <Title level={2} style={{ margin: 0, color: '#000', fontSize: '24px' }}>
              {companyInfo.name}
            </Title>
            {companyInfo.englishName && (
              <Text style={{ fontSize: '14px', color: '#666' }}>
                {companyInfo.englishName}
              </Text>
            )}
            <div style={{ marginTop: '8px', fontSize: '12px', lineHeight: '1.4' }}>
              <div>地址：{companyInfo.address}</div>
              <div>電話：{companyInfo.phone}</div>
              {companyInfo.email && <div>Email：{companyInfo.email}</div>}
              {companyInfo.lineId && <div>LINE：{companyInfo.lineId}</div>}
              {companyInfo.customField1 && <div>{companyInfo.customField1}</div>}
              {companyInfo.customField2 && <div>{companyInfo.customField2}</div>}
              {companyInfo.taxId && <div>統編：{companyInfo.taxId}</div>}
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