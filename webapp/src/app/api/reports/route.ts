import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { DatabaseWhereCondition, GroupingQuery } from '@/types/business'
import { ProductAnalysisAccumulator } from '@/types/api'

/**
 * 📊 Room-5: 報表圖表 API
 * 核心功能：銷售統計 + 圖表數據 + 投資方數據隔離
 */

// GET /api/reports - 獲取報表數據
export async function GET(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview' // overview, sales-trend, product-analysis, customer-analysis
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const period = searchParams.get('period') || 'month' // day, week, month, quarter, year

    // 🔒 投資方數據隔離：只能看公司資金的交易
    const baseWhere: DatabaseWhereCondition = {
      isPaid: true
    }

    if (session.user.role === 'INVESTOR') {
      baseWhere.fundingSource = 'COMPANY'
    }

    // 日期範圍篩選
    if (dateFrom || dateTo) {
      baseWhere.createdAt = {}
      if (dateFrom) {
        baseWhere.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        baseWhere.createdAt.lte = endDate
      }
    } else {
      // 預設為最近3個月
      const now = new Date()
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      baseWhere.createdAt = {
        gte: threeMonthsAgo,
        lte: now
      }
    }

    switch (reportType) {
      case 'overview':
        return await getOverviewReport(baseWhere, session.user.role)

      case 'sales-trend':
        return await getSalesTrendReport(baseWhere, period, session.user.role)

      case 'product-analysis':
        return await getProductAnalysisReport(baseWhere, session.user.role)

      case 'customer-analysis':
        return await getCustomerAnalysisReport(baseWhere, session.user.role)

      default:
        return NextResponse.json({ error: '無效的報表類型' }, { status: 400 })
    }

  } catch (error) {
    console.error('獲取報表數據失敗:', error)
    return NextResponse.json(
      { error: '獲取失敗', details: error },
      { status: 500 }
    )
  }
}

// 總覽報表
async function getOverviewReport(baseWhere: DatabaseWhereCondition, userRole: string) {
  // 基本統計
  const totalSales = await prisma.sale.count({ where: baseWhere })
  const totalCustomers = await prisma.customer.count({ where: { isActive: true } })
  const totalProducts = await prisma.product.count({ where: { isActive: true } })

  // 銷售金額統計
  const salesData = await prisma.sale.findMany({
    where: baseWhere,
    select: {
      totalAmount: true,
      actualAmount: true,
      commission: true,
      createdAt: true
    }
  })

  const totalRevenue = salesData.reduce((sum, sale) => sum + sale.totalAmount, 0)
  const totalActualRevenue = userRole === 'INVESTOR'
    ? totalRevenue
    : salesData.reduce((sum, sale) => sum + (sale.actualAmount || sale.totalAmount), 0)
  const totalCommission = userRole === 'INVESTOR'
    ? 0
    : salesData.reduce((sum, sale) => sum + (sale.commission || 0), 0)

  // 最近7天趨勢 - 🔧 優化：使用單一查詢取代多個平行查詢
  const last7DaysStart = new Date()
  last7DaysStart.setDate(last7DaysStart.getDate() - 6)
  last7DaysStart.setHours(0, 0, 0, 0)

  const last7DaysEnd = new Date()
  last7DaysEnd.setHours(23, 59, 59, 999)

  // 一次性查詢最近7天的所有銷售資料
  const last7DaysSales = await prisma.sale.findMany({
    where: {
      ...baseWhere,
      createdAt: {
        gte: last7DaysStart,
        lte: last7DaysEnd
      }
    },
    select: {
      totalAmount: true,
      actualAmount: true,
      createdAt: true
    }
  })

  // 手動分組資料按日期
  const dailyMap = new Map<string, { sales: number, revenue: number, actualRevenue: number }>()

  // 初始化最近7天的資料
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    dailyMap.set(dateStr, { sales: 0, revenue: 0, actualRevenue: 0 })
  }

  // 聚合銷售資料
  last7DaysSales.forEach(sale => {
    const dateStr = sale.createdAt.toISOString().split('T')[0]
    if (dailyMap.has(dateStr)) {
      const dayData = dailyMap.get(dateStr)!
      dayData.sales += 1
      dayData.revenue += sale.totalAmount
      dayData.actualRevenue += sale.actualAmount || sale.totalAmount
    }
  })

  const dailyTrend = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    sales: data.sales,
    revenue: data.revenue,
    actualRevenue: userRole === 'INVESTOR' ? undefined : data.actualRevenue
  }))

  // 熱銷商品 Top 5 - 🔧 修復N+1查詢問題
  const topProducts = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: {
      sale: baseWhere
    },
    _sum: {
      quantity: true,
      totalPrice: true
    },
    orderBy: {
      _sum: {
        quantity: 'desc'
      }
    },
    take: 5
  })

  // 取得所有熱銷商品的ID
  const topProductIds = topProducts.map(item => item.productId)

  // 一次性查詢所有熱銷商品資訊 - 解決N+1問題
  const topProductDetails = await prisma.product.findMany({
    where: {
      id: { in: topProductIds }
    },
    select: {
      id: true,
      name: true,
      product_code: true,
      category: true
    }
  })

  // 建立商品資訊快取
  const topProductMap = new Map(topProductDetails.map(p => [p.id, p]))

  const topProductsWithDetails = topProducts.map((item) => {
    const product = topProductMap.get(item.productId)
    return {
      ...product,
      totalQuantity: item._sum.quantity,
      totalRevenue: item._sum.totalPrice
    }
  }).filter(Boolean) // 移除null值

  return NextResponse.json({
    success: true,
    data: {
      overview: {
        totalSales,
        totalCustomers,
        totalProducts,
        totalRevenue,
        totalActualRevenue: userRole === 'INVESTOR' ? undefined : totalActualRevenue,
        totalCommission: userRole === 'INVESTOR' ? undefined : totalCommission
      },
      dailyTrend,
      topProducts: topProductsWithDetails
    }
  })
}

// 銷售趨勢報表
async function getSalesTrendReport(baseWhere: DatabaseWhereCondition, period: string, userRole: string) {
  // 根據期間類型生成時間序列
  const now = new Date()
  let dateFormat: string
  let groupingQuery: GroupingQuery

  switch (period) {
    case 'day':
      dateFormat = '%Y-%m-%d'
      break
    case 'week':
      dateFormat = '%Y-%u'
      break
    case 'month':
      dateFormat = '%Y-%m'
      break
    case 'quarter':
      dateFormat = '%Y-Q%q'
      break
    case 'year':
      dateFormat = '%Y'
      break
    default:
      dateFormat = '%Y-%m'
  }

  // 使用原始SQL查詢進行分組統計
  const sales = await prisma.sale.findMany({
    where: baseWhere,
    select: {
      createdAt: true,
      totalAmount: true,
      actualAmount: true,
      commission: true
    },
    orderBy: { createdAt: 'asc' }
  })

  // 手動分組數據 - 🔧 修復：使用正確的Accumulator型別
  interface SalesTrendAccumulator {
    [key: string]: {
      period: string
      sales: number
      revenue: number
      actualRevenue: number
      commission: number
    }
  }

  const groupedData = sales.reduce((acc: SalesTrendAccumulator, sale) => {
    let key: string
    const date = new Date(sale.createdAt)

    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0]
        break
      case 'week':
        const year = date.getFullYear()
        const week = getWeekNumber(date)
        key = `${year}-W${week.toString().padStart(2, '0')}`
        break
      case 'month':
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        break
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1
        key = `${date.getFullYear()}-Q${quarter}`
        break
      case 'year':
        key = date.getFullYear().toString()
        break
      default:
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    }

    if (!acc[key]) {
      acc[key] = {
        period: key,
        sales: 0,
        revenue: 0,
        actualRevenue: 0,
        commission: 0
      }
    }

    acc[key].sales += 1
    acc[key].revenue += sale.totalAmount
    acc[key].actualRevenue += sale.actualAmount || sale.totalAmount
    acc[key].commission += sale.commission || 0

    return acc
  }, {})

  const trendData = Object.values(groupedData).map((item) => ({
    period: item.period,
    sales: item.sales,
    revenue: item.revenue,
    actualRevenue: userRole === 'INVESTOR' ? undefined : item.actualRevenue,
    commission: userRole === 'INVESTOR' ? undefined : item.commission
  }))

  return NextResponse.json({
    success: true,
    data: {
      period,
      trend: trendData
    }
  })
}

// 商品分析報表 - 🔧 修復N+1查詢問題
async function getProductAnalysisReport(baseWhere: DatabaseWhereCondition, userRole: string) {
  // 一次性查詢所有商品統計和產品資訊 - 避免N+1問題
  const productStatsWithDetails = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: {
      sale: baseWhere
    },
    _sum: {
      quantity: true,
      totalPrice: true,
      actualTotalPrice: true
    },
    _count: {
      id: true
    }
  })

  // 取得所有相關產品的ID
  const productIds = productStatsWithDetails.map(stat => stat.productId)

  // 一次性查詢所有產品資訊 - 解決N+1問題
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds }
    },
    select: {
      id: true,
      name: true,
      product_code: true,
      category: true,
      currentPrice: true,
      costPrice: true
    }
  })

  // 建立產品資訊快取
  const productMap = new Map(products.map(p => [p.id, p]))

  const productAnalysis = productStatsWithDetails.map((stat) => {
    const product = productMap.get(stat.productId)

    if (!product) {
      return null // 跳過不存在的產品
    }

    const revenue = stat._sum.totalPrice || 0
    const actualRevenue = stat._sum.actualTotalPrice || revenue
    const profit = userRole === 'INVESTOR' ? 0 : actualRevenue - (product.costPrice || 0) * (stat._sum.quantity || 0)

    return {
      ...product,
      salesCount: stat._count.id,
      totalQuantity: stat._sum.quantity,
      revenue,
      actualRevenue: userRole === 'INVESTOR' ? undefined : actualRevenue,
      profit: userRole === 'INVESTOR' ? undefined : profit
    }
  }).filter(Boolean) // 移除null值

  // 分類統計 - 🔧 修復：使用正確的Accumulator型別
  const categoryStats = productAnalysis.reduce((acc: ProductAnalysisAccumulator, product) => {
    const category = product.category || 'OTHER'
    if (!acc[category]) {
      acc[category] = {
        category,
        salesCount: 0,
        totalQuantity: 0,
        revenue: 0,
        actualRevenue: 0
      }
    }
    acc[category].salesCount += product.salesCount
    acc[category].totalQuantity += product.totalQuantity || 0
    acc[category].revenue += product.revenue
    acc[category].actualRevenue += product.actualRevenue || product.revenue
    return acc
  }, {})

  return NextResponse.json({
    success: true,
    data: {
      products: productAnalysis.sort((a, b) => (b.totalQuantity || 0) - (a.totalQuantity || 0)),
      categories: Object.values(categoryStats)
    }
  })
}

// 客戶分析報表 - 🔧 進一步優化：使用單一查詢整合客戶和銷售統計
async function getCustomerAnalysisReport(baseWhere: DatabaseWhereCondition, userRole: string) {
  // 使用findMany搭配include一次性取得客戶和相關銷售資料
  const customersWithSales = await prisma.customer.findMany({
    where: {
      sales: {
        some: baseWhere // 只取有銷售記錄的客戶
      }
    },
    select: {
      id: true,
      name: true,
      customer_code: true,
      company: true,
      tier: true,
      paymentTerms: true,
      sales: {
        where: baseWhere,
        select: {
          totalAmount: true,
          actualAmount: true
        }
      }
    }
  })

  // 手動計算統計數據（避免二次查詢）
  const customerAnalysis = customersWithSales
    .map(customer => {
      const salesCount = customer.sales.length
      if (salesCount === 0) return null

      const revenue = customer.sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
      const actualRevenue = customer.sales.reduce((sum, sale) => sum + (sale.actualAmount || sale.totalAmount), 0)

      return {
        id: customer.id,
        name: customer.name,
        customer_code: customer.customer_code,
        company: customer.company,
        tier: customer.tier,
        paymentTerms: customer.paymentTerms,
        salesCount,
        revenue,
        actualRevenue: userRole === 'INVESTOR' ? undefined : actualRevenue,
        averageOrderValue: revenue / salesCount
      }
    })
    .filter(Boolean) // 移除null值
    .sort((a, b) => b.revenue - a.revenue)

  return NextResponse.json({
    success: true,
    data: {
      customers: customerAnalysis
    }
  })
}

// 輔助函數：獲取週數
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}