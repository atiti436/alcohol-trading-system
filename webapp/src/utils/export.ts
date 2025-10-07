import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

/**
 * 匯出資料為 Excel 檔案
 * @param data 要匯出的資料陣列
 * @param filename 檔案名稱（不含副檔名）
 * @param sheetName 工作表名稱（預設：Sheet1）
 * @returns 是否匯出成功
 */
export function exportToExcel(
  data: any[],
  filename: string,
  sheetName: string = 'Sheet1'
): boolean {
  try {
    if (!data || data.length === 0) {
      console.warn('匯出資料為空')
      return false
    }

    // 建立工作表
    const ws = XLSX.utils.json_to_sheet(data)

    // 設定欄位寬度（自動調整）
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      ) + 2
    }))
    ws['!cols'] = colWidths

    // 建立工作簿
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // 下載檔案
    const timestamp = dayjs().format('YYYYMMDD_HHmmss')
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`)

    return true
  } catch (error) {
    console.error('Excel 匯出失敗:', error)
    return false
  }
}

/**
 * 匯出多個工作表的 Excel 檔案
 * @param sheets 工作表陣列，每個元素包含 name 和 data
 * @param filename 檔案名稱（不含副檔名）
 * @returns 是否匯出成功
 */
export function exportMultiSheetExcel(
  sheets: { name: string; data: any[] }[],
  filename: string
): boolean {
  try {
    if (!sheets || sheets.length === 0) {
      console.warn('工作表陣列為空')
      return false
    }

    const wb = XLSX.utils.book_new()

    sheets.forEach(sheet => {
      if (sheet.data && sheet.data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(sheet.data)

        // 設定欄位寬度
        const colWidths = Object.keys(sheet.data[0] || {}).map(key => ({
          wch: Math.max(
            key.length,
            ...sheet.data.map(row => String(row[key] || '').length)
          ) + 2
        }))
        ws['!cols'] = colWidths

        XLSX.utils.book_append_sheet(wb, ws, sheet.name)
      }
    })

    // 下載檔案
    const timestamp = dayjs().format('YYYYMMDD_HHmmss')
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`)

    return true
  } catch (error) {
    console.error('多工作表 Excel 匯出失敗:', error)
    return false
  }
}

/**
 * 取得狀態文字（中文）
 */
export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': '待處理',
    'CONFIRMED': '已確認',
    'SHIPPED': '已出貨',
    'DELIVERED': '已送達',
    'COMPLETED': '已完成',
    'CANCELLED': '已取消',
    'PARTIAL': '部分滿足',
    'BACKORDER': '缺貨中'
  }
  return statusMap[status] || status
}

/**
 * 取得付款狀態文字（中文）
 */
export function getPaymentStatusText(isPaid: boolean): string {
  return isPaid ? '已付款' : '未付款'
}

/**
 * 取得資金來源文字（中文）
 */
export function getFundingSourceText(fundingSource: string): string {
  const sourceMap: Record<string, string> = {
    'PERSONAL': '個人',
    'COMPANY': '投資方'
  }
  return sourceMap[fundingSource] || fundingSource
}
