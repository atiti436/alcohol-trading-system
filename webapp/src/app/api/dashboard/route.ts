import { NextRequest, NextResponse } from 'next/server'
import { withAppActiveUser } from '@/modules/auth/middleware/permissions'
import { filterDataByRole } from '@/modules/auth/utils/data-filter'
import { prisma } from '@/lib/prisma'
import { PermissionContext, Role } from '@/types/auth'
import { SaleItem, Product, DashboardData } from '@/types/business'
import { MonthlySalesAccumulator } from '@/types/api'
import { getProductInventorySummary } from '@/lib/inventory-helpers'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard - 獲取Dashboard資料
 * 🔒 根據使用者角色返回不同的Dashboard數據
 */
export const GET = withAppActiveUser(async (
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
async function getSuperAdminDashboard(context: PermissionContext): Promise<Partial<DashboardData>> {
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
  const personalSales = sales.filter(sale => sale.funding_source === 'PERSONAL')
  const investmentSales = sales.filter(sale => sale.funding_source === 'COMPANY')

  // 計算總營收 (真實金額)
  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.actual_amount || sale.total_amount), 0)
  const personalRevenue = personalSales.reduce((sum, sale) => sum + (sale.actual_amount || sale.total_amount), 0)
  const investmentRevenue = investmentSales.reduce((sum, sale) => sum + (sale.actual_amount || sale.total_amount), 0)

  // 計算總傭金 (老闆賺的差價)
  const totalCommission = sales.reduce((sum, sale) => sum + (sale.commission || 0), 0)

  // 庫存價值 - ⚠️ 暫用 ProductVariant（Inventory 表尚未同步到 Production）
  const stockValueResult = await prisma.$queryRaw`
    SELECT
      COALESCE(SUM(GREATEST(pv.stock_quantity, 0) * COALESCE(pv.cost_price, 0)), 0) as stock_value,
      COALESCE(SUM(GREATEST(pv.stock_quantity, 0)), 0) as stock_count
    FROM product_variants pv
    INNER JOIN products p ON pv.product_id = p.id
    WHERE p.is_active = true
  ` as Array<{ stock_value: number | bigint, stock_count: number | bigint }>

  const stockValue = Number(stockValueResult[0]?.stock_value || 0)
  const stockCount = Number(stockValueResult[0]?.stock_count || 0)

  // 待收款項
  const unpaidSales = await prisma.sale.findMany({
    where: { is_paid: false },
    select: {
      actual_amount: true,
      total_amount: true
    }
  })
  const pendingReceivables = unpaidSales.reduce((sum, sale) =>
    sum + (sale.actual_amount || sale.total_amount), 0)

  // 低庫存商品 - ⚠️ 暫用 ProductVariant（Inventory 表尚未同步到 Production）
  const lowStockItemsRaw = await prisma.$queryRaw`
    SELECT
      p.id,
      p.name,
      COALESCE(SUM(GREATEST(pv.stock_quantity, 0)), 0) as total_stock
    FROM products p
    INNER JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.is_active = true
    GROUP BY p.id, p.name
    HAVING COALESCE(SUM(GREATEST(pv.stock_quantity, 0)), 0) < 10
    ORDER BY COALESCE(SUM(GREATEST(pv.stock_quantity, 0)), 0) ASC
    LIMIT 5
  ` as Array<{ id: string, name: string, total_stock: number | bigint }>

  const lowStockItems = lowStockItemsRaw.map(item => ({
    name: item.name,
    stock: Number(item.total_stock),
    minStock: 10
  }))

  // 商品類別銷售分布
  const categoryDistribution = await calculateCategoryDistribution(sales)

  // 客戶分布統計
  const customerDistribution = await calculateCustomerDistribution()

  return {
    // 🔑 關鍵KPI (包含真實數據)
    totalRevenue,
    personalRevenue,
    investmentRevenue,
    commission: totalCommission,
    stockValue,
    stockCount,
    pendingReceivables,

    // 詳細資料
    lowStockItems,
    salesTrend: calculateMonthlySalesTrend(sales, true), // true = 包含真實數據
    categoryDistribution,
    customerDistribution,

    // 快速操作 (超級管理員功能)
    quickActions: getSuperAdminQuickActions()
  }
}

/**
 * 投資方Dashboard - 過濾後的投資數據
 */
async function getInvestorDashboard(context: PermissionContext): Promise<Partial<DashboardData>> {
  // 🔒 只獲取投資項目的銷售資料
  const investmentSales = await prisma.sale.findMany({
    where: {
      funding_source: 'COMPANY',
      // 如果有investor_id，只顯示該投資方的項目
      ...(context.investor_id && { creator: { investor_id: context.investor_id } })
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
    return sum + sale.items.reduce((itemSum: number, item: any) =>
      itemSum + (item.product?.cost_price || 0) * item.quantity, 0)
  }, 0)
  const investmentProfit = investmentRevenue - investmentCost // 基於顯示價格的獲利

  // 投資商品庫存 - ⚠️ 暫用 ProductVariant（Inventory 表尚未同步到 Production）
  const investmentStockResult = await prisma.productVariant.aggregate({
    where: {
      product: {
        is_active: true
      }
    },
    _sum: {
      stock_quantity: true
    }
  })
  const investmentStock = Math.max(0, investmentStockResult._sum.stock_quantity || 0)

  return {
    // 🔑 投資方可見的KPI (基於顯示價格)
    investmentRevenue,
    investmentProfit,
    investmentStock,
    profitMargin: investmentRevenue ? (investmentProfit / investmentRevenue * 100) : 0,

    // 投資趨勢 (過濾後的數據)
    monthlyTrend: calculateMonthlySalesTrend(investmentSales, false), // false = 只顯示價格

    // 投資項目明細
    investmentItems: investmentSales.slice(0, 10).map(sale => ({
      id: sale.id,
      sale_number: sale.sale_number,
      amount: sale.total_amount, // 顯示金額
      profit: sale.total_amount - (sale.items.reduce((sum: number, item: any) =>
        sum + (item.product?.cost_price || 0) * item.quantity, 0)),
      date: sale.created_at
    }))
  }
}

/**
 * 員工Dashboard - 基本操作數據
 */
async function getEmployeeDashboard(context: PermissionContext): Promise<Partial<DashboardData>> {
  // 今日待辦事項 (這裡用模擬資料，實際可從任務系統取得)
  const todayTasks = [
    { id: 1, task: '處理客戶A的報價單', status: 'pending' },
    { id: 2, task: '更新山崎威士忌庫存', status: 'completed' },
    { id: 3, task: '確認本週到貨清單', status: 'pending' }
  ]

  // 最近訂單 (不含財務敏感資訊)
  const recentOrders = await prisma.sale.findMany({
    select: {
      id: true,
      sale_number: true,
      customer: {
        select: { id: true, name: true }
      },
      total_amount: true, // 顯示金額 (不含實際金額)
      is_paid: true,
      created_at: true
    },
    orderBy: { created_at: 'desc' },
    take: 5
  })

  // 庫存警報 - ⚠️ 暫用 ProductVariant（Inventory 表尚未同步到 Production）
  const stockAlertsRaw = await prisma.$queryRaw`
    SELECT
      p.id,
      p.name,
      COALESCE(SUM(GREATEST(pv.stock_quantity, 0)), 0) as total_stock
    FROM products p
    INNER JOIN product_variants pv ON pv.product_id = p.id
    WHERE p.is_active = true
    GROUP BY p.id, p.name
    HAVING COALESCE(SUM(GREATEST(pv.stock_quantity, 0)), 0) < 10
    ORDER BY COALESCE(SUM(GREATEST(pv.stock_quantity, 0)), 0) ASC
    LIMIT 5
  ` as Array<{ id: string, name: string, total_stock: number | bigint }>

  const stockAlerts = stockAlertsRaw.map(item => ({
    id: item.id,
    name: item.name,
    stock_quantity: Number(item.total_stock)
  }))

  return {
    todayTasks,
    recentOrders: recentOrders.map((order: any) => ({
      id: order.sale_number,
      customer: order.customer.name,
      amount: order.total_amount, // 只顯示顯示金額
      status: order.is_paid ? 'completed' : 'processing'
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

    const cost = sale.items.reduce((sum: number, item: any) =>
      sum + (item.product?.cost_price || 0) * item.quantity, 0)

    monthlyData[month].revenue += revenue
    monthlyData[month].profit += revenue - cost
    monthlyData[month].count += 1
  })

  const result = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6) // 最近6個月
    .map(([month, data]) => ({
      month,
      revenue: Number.isFinite(data.revenue) ? data.revenue : 0, // 🔒 NaN 保護
      profit: Number.isFinite(data.profit) ? data.profit : 0, // 🔒 NaN 保護
      orders: data.count
    }))

  // 如果沒有資料，返回空陣列（前端會顯示「暫無數據」）
  return result.length > 0 ? result : []
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

/**
 * 計算商品類別銷售分布
 */
async function calculateCategoryDistribution(sales: any[]) {
  const categoryData: { [key: string]: number } = {}

  sales.forEach(sale => {
    sale.items.forEach((item: any) => {
      const category = item.product?.category || '其他'
      const amount = item.actual_total_price || item.total_price || 0
      categoryData[category] = (categoryData[category] || 0) + amount
    })
  })

  const colors = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#eb2f96', '#f5222d']

  const result = Object.entries(categoryData)
    .map(([name, value], index) => ({
      name,
      value: Number.isFinite(value) ? value : 0, // 🔒 NaN 保護
      color: colors[index % colors.length]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6) // 只顯示前6個類別

  // 如果沒有資料，返回預設值
  if (result.length === 0) {
    return [{ name: '暫無數據', value: 1, color: '#d9d9d9' }]
  }

  return result
}

/**
 * 計算客戶分布統計
 */
async function calculateCustomerDistribution() {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        tier: true
      }
    })

    const tierData: { [key: string]: number } = {}
    customers.forEach(customer => {
      const tier = customer.tier || '一般客戶'
      tierData[tier] = (tierData[tier] || 0) + 1
    })

    const tierColors: { [key: string]: string } = {
      'VIP': '#f5222d',
      '優質': '#fa541c',
      '一般': '#1890ff',
      '新客戶': '#52c41a'
    }

    return Object.entries(tierData)
      .map(([name, value]) => ({
        name: name + '客戶',
        value,
        color: tierColors[name] || '#722ed1'
      }))
      .sort((a, b) => b.value - a.value)
  } catch (error) {
    console.error('計算客戶分布失敗:', error)
    return [{ name: '暫無數據', value: 1, color: '#d9d9d9' }]
  }
}
