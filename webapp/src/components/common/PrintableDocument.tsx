import React from 'react'
import { Modal, Button } from 'antd'
import { PrinterOutlined } from '@ant-design/icons'
import { DocumentType } from '@/config/company'
import { DocumentHeader } from './DocumentHeader'

interface PrintableDocumentProps {
  visible: boolean
  onClose: () => void
  documentType: DocumentType
  documentNumber: string
  title?: string
  children: React.ReactNode
  width?: number
  additionalHeaderInfo?: React.ReactNode
}

/**
 * 可列印單據的統一容器組件
 * 提供專業的列印樣式和公司抬頭
 */
export const PrintableDocument: React.FC<PrintableDocumentProps> = ({
  visible,
  onClose,
  documentType,
  documentNumber,
  title,
  children,
  width = 900,
  additionalHeaderInfo
}) => {
  const handlePrint = () => {
    // 隱藏 Modal 背景，只列印內容
    const printContent = document.querySelector('.printable-content')
    if (printContent) {
      // 創建新視窗進行列印
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>${title || documentNumber}</title>
              <link href="/shipping-print.css" rel="stylesheet" type="text/css">
              <style>
                body {
                  font-family: "Microsoft JhengHei", "SimHei", sans-serif;
                  margin: 0;
                  padding: 20px;
                  background: white;
                }
                @media print {
                  body { margin: 0; }
                  @page { margin: 1.5cm; size: A4; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()

        // 等待樣式載入後列印
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)
      }
    }
  }

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      width={width}
      footer={[
        <Button key="cancel" onClick={onClose}>
          關閉
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
        >
          列印
        </Button>
      ]}
      className="printable-document-modal"
    >
      <div className="printable-content shipping-document">
        <DocumentHeader
          documentType={documentType}
          documentNumber={documentNumber}
          date={new Date().toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })}
          additionalInfo={additionalHeaderInfo}
        />

        <div className="document-body">
          {children}
        </div>

        {/* 簽章區域 */}
        <div className="signature-area" style={{ marginTop: '40px' }}>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '30px' }}>承辦人員</div>
            <div style={{ borderBottom: '1px solid #000', width: '120px', margin: '0 auto' }}>&nbsp;</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '30px' }}>主管核准</div>
            <div style={{ borderBottom: '1px solid #000', width: '120px', margin: '0 auto' }}>&nbsp;</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '30px' }}>客戶簽收</div>
            <div style={{ borderBottom: '1px solid #000', width: '120px', margin: '0 auto' }}>&nbsp;</div>
          </div>
        </div>

        {/* 頁尾資訊 */}
        <div className="footer-info" style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '10px',
          color: '#666',
          borderTop: '1px solid #ddd',
          paddingTop: '10px'
        }}>
          此單據由系統自動生成，如有疑問請洽詢業務人員 |
          滿帆洋行有限公司 版權所有 © {new Date().getFullYear()}
        </div>
      </div>
    </Modal>
  )
}