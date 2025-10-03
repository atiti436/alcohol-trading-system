import * as XLSX from 'xlsx'

interface PreorderSummary {
  overview: {
    total_preorders: number
    total_products: number
    total_customers: number
    total_quantity: number
    total_amount: number
  }
  by_product: any[]
  by_customer: any[]
  by_timeline: any[]
}

/**
 * 匯出預購統計為 Excel
 */
export function exportPreorderSummaryToExcel(data: PreorderSummary) {
  // 建立工作簿
  const workbook = XLSX.utils.book_new()

  // Sheet 1: 總覽
  const overviewData = [
    ['預購訂單統計總覽'],
    [''],
    ['項目', '數值'],
    ['預購訂單數', data.overview.total_preorders],
    ['商品種類', data.overview.total_products],
    ['預購客戶數', data.overview.total_customers],
    ['總數量', data.overview.total_quantity],
    ['總金額', `NT$ ${data.overview.total_amount.toLocaleString()}`]
  ]
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData)
  XLSX.utils.book_append_sheet(workbook, overviewSheet, '總覽')

  // Sheet 2: 按商品彙總
  const productData: any[] = [['商品編號', '商品名稱', '類別', '總需求', '訂單數', '客戶數', '總金額']]

  data.by_product.forEach(product => {
    productData.push([
      product.product_code,
      product.product_name,
      product.category,
      product.total_quantity,
      product.order_count,
      product.customer_count,
      product.total_amount
    ])

    // 變體明細
    product.variants.forEach((variant: any) => {
      productData.push([
        '',
        `  └─ ${variant.variant_code || variant.variant_type}`,
        variant.description || '',
        variant.total_quantity,
        variant.order_count,
        variant.customer_count,
        ''
      ])

      // 訂單明細
      variant.orders.forEach((order: any) => {
        productData.push([
          '',
          `      • ${order.sale_number}`,
          order.customer_name,
          order.quantity,
          '',
          '',
          order.expected_arrival_date || ''
        ])
      })
    })
  })

  const productSheet = XLSX.utils.aoa_to_sheet(productData)
  XLSX.utils.book_append_sheet(workbook, productSheet, '按商品彙總')

  // Sheet 3: 按客戶彙總
  const customerData: any[] = [['客戶編號', '客戶名稱', '公司', '訂單數', '總數量', '總金額']]

  data.by_customer.forEach(customer => {
    customerData.push([
      customer.customer_code,
      customer.customer_name,
      customer.company || '',
      customer.order_count,
      customer.total_quantity,
      customer.total_amount
    ])

    // 訂單明細
    customer.orders.forEach((order: any) => {
      customerData.push([
        '',
        `  └─ ${order.sale_number}`,
        order.expected_arrival_date || '',
        order.item_count,
        '',
        order.total_amount
      ])

      // 商品明細
      order.items.forEach((item: any) => {
        customerData.push([
          '',
          `      • ${item.product_name}`,
          item.variant_code || '',
          item.quantity,
          item.unit_price,
          ''
        ])
      })
    })
  })

  const customerSheet = XLSX.utils.aoa_to_sheet(customerData)
  XLSX.utils.book_append_sheet(workbook, customerSheet, '按客戶彙總')

  // Sheet 4: 時間軸
  const timelineData: any[] = [['預計到貨日', '訂單數', '總數量', '總金額', '訂單明細']]

  data.by_timeline.forEach(item => {
    const date = item.date === 'unknown' ? '未指定' : item.date

    timelineData.push([
      date,
      item.order_count,
      item.total_quantity,
      item.total_amount,
      ''
    ])

    // 訂單明細
    item.orders.forEach((order: any) => {
      timelineData.push([
        '',
        order.sale_number,
        order.customer_name,
        order.item_count,
        order.total_amount
      ])
    })
  })

  const timelineSheet = XLSX.utils.aoa_to_sheet(timelineData)
  XLSX.utils.book_append_sheet(workbook, timelineSheet, '時間軸')

  // 產生並下載檔案
  const fileName = `預購統計_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
