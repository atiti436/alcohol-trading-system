import React from 'react'
import { Typography, Divider } from 'antd'
import { DocumentType, DOCUMENT_TYPES } from '@/config/company'
import { useCompanySettings } from '@/hooks/useCompanySettings'

const { Text } = Typography

interface DocumentFooterProps {
  documentType: DocumentType
  customMessage?: string
}

/**
 * 統一的單據頁尾組件
 * 根據公司設定自動顯示/隱藏銀行帳號資訊
 */
export const DocumentFooter: React.FC<DocumentFooterProps> = ({
  documentType,
  customMessage
}) => {
  const { settings: companySettings } = useCompanySettings()

  // 如果沒有設定，預設不顯示
  const showBankInfo = companySettings?.showBankInfo ?? false
  const hasBankInfo = companySettings?.bankName && companySettings?.bankAccount

  // 根據單據類型設定不同的提示訊息
  const getDocumentMessage = () => {
    switch (documentType) {
      case DOCUMENT_TYPES.QUOTATION:
        return (
          <div>
            <Text strong>📌 重要提醒：</Text>
            <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
              <div>✓ 本報價單有效期限請參考上方標示</div>
              <div>✓ 請於有效期內確認訂單</div>
              <div>✓ 已收到貨款後才安排出貨 💰</div>
            </div>
          </div>
        )
      case DOCUMENT_TYPES.STATEMENT:
        return (
          <div>
            <Text strong>📊 付款提醒：</Text>
            <div style={{ marginTop: '8px' }}>
              <div>請於 7 日內完成付款，謝謝您的配合</div>
            </div>
          </div>
        )
      case DOCUMENT_TYPES.SHIPPING:
        return (
          <div>
            <Text strong>📦 簽收確認：</Text>
            <div style={{ marginTop: '12px', display: 'flex', gap: '40px' }}>
              <div>簽收人：_____________________</div>
              <div>日期：______________</div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="document-footer" style={{ marginTop: '40px' }}>
      <Divider style={{ borderColor: '#d9d9d9' }} />

      {/* 單據特定訊息 */}
      {getDocumentMessage() && (
        <div style={{ marginBottom: '20px' }}>
          {getDocumentMessage()}
        </div>
      )}

      {/* 自訂訊息 */}
      {customMessage && (
        <div style={{ marginBottom: '20px' }}>
          <Text>{customMessage}</Text>
        </div>
      )}

      {/* 銀行帳號資訊 */}
      {showBankInfo && hasBankInfo && (
        <>
          <Divider style={{ margin: '16px 0', borderColor: '#d9d9d9' }} />
          <div style={{
            padding: '16px',
            backgroundColor: '#f5f5f5',
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            <Text strong>💰 匯款資訊：</Text>
            <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
              <div>
                <Text>銀行：{companySettings.bankName}</Text>
                {companySettings.bankCode && <Text> ({companySettings.bankCode})</Text>}
              </div>
              <div><Text>帳號：{companySettings.bankAccount}</Text></div>
              <div><Text>戶名：{companySettings.name}</Text></div>
            </div>
          </div>
        </>
      )}

      {/* 聯絡資訊 */}
      <div style={{
        textAlign: 'center',
        borderTop: '1px solid #d9d9d9',
        paddingTop: '16px'
      }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {documentType === DOCUMENT_TYPES.STATEMENT
            ? '此對帳單由系統自動生成，如有疑問請聯繫業務人員'
            : '如有任何疑問，請聯繫我們'}
        </Text>
        {companySettings && (
          <div style={{ marginTop: '4px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              📞 {companySettings.phone}
              {companySettings.email && ` ✉ ${companySettings.email}`}
            </Text>
          </div>
        )}
      </div>
    </div>
  )
}
