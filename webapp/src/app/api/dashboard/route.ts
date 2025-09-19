import { NextRequest, NextResponse } from 'next/server'
import { withAppAuth } from '@/modules/auth/middleware/permissions'
import { filterDataByRole } from '@/modules/auth/utils/data-filter'
import { prisma } from '@/lib/prisma'
import { PermissionContext, Role } from '@/types/auth'
import { SaleItem, Product, DashboardData } from '@/types/business'
import { MonthlySalesAccumulator } from '@/types/api'

/**
 * GET /api/dashboard - 獲取Dashboard資料
 * 🔒 根據使用者角色返回不同的Dashboard數據
 */
export const GET = withAppAuth(async (
  req: NextRequest,
  res: NextResponse,
  context: PermissionContext
) => {
  try {
    let dashboardData: Partial<DashboardData> = {}

    switch (context.role) {
      case Role.SUPER_ADMIN:
        dashboardData = await getSuperAdminDashboard(context)
        break
      case Role.INVESTOR:
        dashboardData = await getInvestorDashboard(context)
        break
      case Role.EMPLOYEE:
        dashboardData = await getEmployeeDashboard(context)
        break
      default:
        throw new Error('Unknown user role')
    }

    // 🔒 套用資料過濾器 (雙重保護)
    const filteredData = filterDataByRole(dashboardData, 'dashboard', context)

    return NextResponse.json({
      success: true,
      data: filteredData,
      metadata: {
        role: context.role,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Dashboard資料錯誤:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Dashboard資料載入失敗'
      }
    }, { status: 500 })
  }
})

/**
 * 超級管理員Dashboard - 完整的商業數據
 */
async function getSuperAdminDashboard(context: PermissionContext) {
  // 獲取所有銷售資料 (包含真實價格和傭金)
  const sales = await prisma.sale.findMany({
    include: {
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { created_at: 'desc' },
    take: 100 // 最近100筆
  })

  // 分離個人調貨和投資項目
  const personalSales = sales.filter(sale => sale.fundingSource === 'PERSONAL')
  const investmentSales = sales.filter(sale => sale.fundingSource === 'COMPANY')

  // 計算總營收 (真實金額)
  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.actual_amount || sale.total_amount), 0)
  const personalRevenue = personalSales.reduce((sum, sale) => sum + (sale.actual_amount || sale.total_amount), 0)
  const investmentRevenue = investmentSales.reduce((sum, sale) => sum + (sale.actual_amount || sale.total_amount), 0)

  // 計算總傭金 (老闆賺的差價)
  const totalCommission = sales.reduce((sum, sale) => sum + (sale.commission || 0), 0)

  // 庫存價值 - 🔧 修正：使用聚合查詢一次性計算避免N+1問題
  const stockAggregation = await prisma.productVariant.aggregate({
    where: {
      product: {
        is_active: true
      }
    },
    _sum: {
      stock_quantity: true
    }
  })

  // 計算庫存價值 - 使用原始SQL查詢避免複雜的nested循環
  const stockValueResult = await prisma.$queryRaw`
    SELECT
      SUM(pv.stock_quantity * COALESCE(pv.cost_price, p.cost_price)) as stock_value
    FROM product_variants pv
    INNER JOIN products p ON pv.product_id = p.id
    WHERE p.is_active = true
  ` as Array<{ stock_value: number }>

  const stockValue = Number(stockValueResult[0]?.stock_value || 0)
  const stockCount = stockAggregation._sum.stock_quantity || 0

  // 待收款項
  const unpaidSales = await prisma.sale.findMany({
    where: { isPaid: false },
    select: {
      actual_amount: true,
      total_amount: true
    }
  })
  const pendingReceivables = unpaidSales.reduce((sum, sale) =>
    sum + (sale.actual_amount || sale.total_amount), 0)

  // 低庫存商品 - 🔧 修正：使用優化的批次查詢避免N+1問題
  const lowStockItemsRaw = await prisma.$queryRaw`
    SELECT
      p.id,
      p.name,
      SUM(pv.stock_quantity) as total_stock
    FROM products p
    INNER JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.is_active = true
    GROUP BY p.id, p.name
    HAVING SUM(pv.stock_quantity) < 10
    ORDER BY SUM(pv.stock_quantity) ASC
    LIMIT 5
  ` as Array<{ id: string, name: string, total_stock: number }>

  const lowStockItems = lowStockItemsRaw.map(item => ({
    name: item.name,
    stock: Number(item.total_stock),
    minStock: 10
  }))

  return {
    // 🔑 關鍵KPI (包含真實數據)
    totalRevenue,           // 總營收 (包含真實1200)
    personalRevenue,        // 個人調貨營收
    investmentRevenue,      // 投資項目營收
    commission: totalCommission, // 老闆總傭金
    stockValue,
    stockCount,
    pendingReceivables,

    // 詳細資料
    lowStockItems,
    salesTrend: calculateMonthlySalesTrend(sales, true), // true = 包含真實數據

    // 快速操作 (超級管理員功能)
    quickActions: getSuperAdminQuickActions()
  }
}

/**
 * 投資方Dashboard - 過濾後的投資數據
 */
async function getInvestorDashboard(context: PermissionContext) {
  // 🔒 只獲取投資項目的銷售資料
  const investmentSales = await prisma.sale.findMany({
    where: {
      fundingSource: 'COMPANY',
      // 如果有investor_id，只顯示該投資方的項目
      ...(context.investor_id && { investor_id: context.investor_id })
    },
    include: {
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  })

  // 🔒 關鍵：基於顯示價格計算投資方看到的數據
  const investmentRevenue = investmentSales.reduce((sum, sale) => sum + sale.total_amount, 0) // 顯示價格
  const investmentCost = investmentSales.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum: number, item: SaleItem) =>
      itemSum + (item.product?.cost_price || 0) * item.quantity, 0)
  }, 0)
  const investmentProfit = investmentRevenue - investmentCost // 基於顯示價格的獲利

  // 投資商品庫存 - 🔧 修正：使用一次性聚合查詢避免N+1問題
  const investmentStockResult = await prisma.productVariant.aggregate({
    where: {
      product: {
        // 這裡可以根據業務邏輯篩選投資項目相關的商品
        is_active: true
      }
    },
    _sum: {
      stock_quantity: true
    }
  })
  const investmentStock = investmentStockResult._sum.stock_quantity || 0

  return {
    // 🔑 投資方可見的KPI (基於顯示價格)
    investmentRevenue,      // 投資項目營收 (1000 不是 1200)
    investmentProfit,       // 投資獲利 (200)
    investmentStock,        // 投資商品庫存
    profitMargin: investmentRevenue ? (investmentProfit / investmentRevenue * 100) : 0,

    // 投資趨勢 (過濾後的數據)
    monthlyTrend: calculateMonthlySalesTrend(investmentSales, false), // false = 只顯示價格

    // 投資項目明細
    investmentItems: investmentSales.slice(0, 10).map(sale => ({
      id: sale.id,
      saleNumber: sale.saleNumber,
      amount: sale.total_amount, // 顯示金額
      profit: sale.total_amount - (sale.items.reduce((sum: number, item: SaleItem) =>
        sum + (item.product?.cost_price || 0) * item.quantity, 0)),
      date: sale.created_at
    }))
  }
}

/**
 * 員工Dashboard - 基本操作數據
 */
async function getEmployeeDashboard(context: PermissionContext) {
  // 今日待辦事項 (這裡用模擬資料，實際可從任務系統取得)
  const todayTasks = [
    { id: 1, task: '處理客戶A的報價單', status: 'pending' },
    { id: 2, task: '更新山崎威士忌庫存', status: 'completed' },
    { id: 3, task: '確認本週到貨清單', status: 'pending' }
  ]

  // 最近訂單 (不含財務敏感資訊)
  const recentOrders = await prisma.sale.findMany({
    include: {
      customer: {
        select: { id: true, name: true }
      }
    },
    orderBy: { created_at: 'desc' },
    take: 5,
    select: {
      id: true,
      saleNumber: true,
      customer: true,
      total_amount: true, // 顯示金額 (不含實際金額)
      isPaid: true,
      created_at: true
    }
  })

  // 庫存警報 - 🔧 修正：使用優化的原始SQL查詢避免N+1問題
  const stockAlertsRaw = await prisma.$queryRaw`
    SELECT
      p.id,
      p.name,
      SUM(pv.stock_quantity) as total_stock
    FROM products p
    INNER JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.is_active = true
    GROUP BY p.id, p.name
    HAVING SUM(pv.stock_quantity) < 10
    ORDER BY SUM(pv.stock_quantity) ASC
    LIMIT 5
  ` as Array<{ id: string, name: string, total_stock: number }>

  const stockAlerts = stockAlertsRaw.map(item => ({
    id: item.id,
    name: item.name,
    stock_quantity: Number(item.total_stock)
  }))

  return {
    todayTasks,
    recentOrders: recentOrders.map(order => ({
      id: order.saleNumber,
      customer: order.customer.name,
      amount: order.total_amount, // 只顯示顯示金額
      status: order.isPaid ? 'completed' : 'processing'
    })),
    stockAlerts: stockAlerts.map(product => ({
      id: product.id,
      name: product.name,
      stock: product.stock_quantity,
      alertLevel: 'low'
    })),
    quickActions: getEmployeeQuickActions()
  }
}

/**
 * 計算月度銷售趨勢
 */
function calculateMonthlySalesTrend(sales: any[], includeActualAmount: boolean) {
  const monthlyData: MonthlySalesAccumulator = {}

  sales.forEach(sale => {
    const month = sale.created_at.toISOString().slice(0, 7) // YYYY-MM

    if (!monthlyData[month]) {
      monthlyData[month] = { revenue: 0, profit: 0, count: 0 }
    }

    // 🔒 關鍵：根據角色決定使用真實金額還是顯示金額
    const revenue = includeActualAmount ?
      (sale.actual_amount || sale.total_amount) : sale.total_amount

    const cost = sale.items.reduce((sum: number, item: SaleItem) =>
      sum + (item.product?.cost_price || 0) * item.quantity, 0)

    monthlyData[month].revenue += revenue
    monthlyData[month].profit += revenue - cost
    monthlyData[month].count += 1
  })

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6) // 最近6個月
    .map(([month, data]) => ({
      month,
      revenue: data.revenue,
      profit: data.profit,
      orders: data.count
    }))
}

/**
 * 超級管理員快速操作
 */
function getSuperAdminQuickActions() {
  return [
    { id: 'new-purchase', title: '新增採購', icon: 'ShoppingCartOutlined', url: '/purchase/create' },
    { id: 'ai-recognition', title: 'AI報單辨識', icon: 'FileTextOutlined', url: '/purchase/ai-recognition' },
    { id: 'new-customer', title: '新增客戶', icon: 'UserAddOutlined', url: '/customers/create' },
    { id: 'inventory-transfer', title: '庫存調撥', icon: 'SwapOutlined', url: '/inventory/transfer' },
    { id: 'financial-report', title: '財務報表', icon: 'BarChartOutlined', url: '/reports/financial' }
  ]
}

/**
 * 員工快速操作
 */
function getEmployeeQuickActions() {
  return [
    { id: 'new-customer', title: '新增客戶', icon: 'UserAddOutlined', url: '/customers/create' },
    { id: 'update-inventory', title: '更新庫存', icon: 'EditOutlined', url: '/inventory/update' },
    { id: 'process-order', title: '處理訂單', icon: 'ShoppingOutlined', url: '/orders/process' }
  ]
}