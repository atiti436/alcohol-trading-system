import { Role, PermissionContext } from '@/types/auth'

/**
 * 銷售資料過濾（核心商業邏輯）
 * 確保投資方永遠看不到真實的銷售價格和老闆傭金
 * 🔒 關鍵商業機密保護：投資方看到 800→1000→獲利200，實際 800→1200→老闆抽成200
 */
export function filterSalesData<T extends Record<string, any>>(
  data: T[],
  context: PermissionContext
): Partial<T>[] {
  // 記錄敏感資料存取 (審計用)
  logSensitiveAccess('sales', context.userId, context.role, data.length)

  if (context.role === Role.SUPER_ADMIN) {
    // 超級管理員看完整資料：包含真實價格1200和傭金200
    return data
  }

  if (context.role === Role.INVESTOR) {
    const filteredData = data
      .filter(item => {
        // 🔒 核心邏輯：只顯示投資項目，隱藏個人調貨
        return item.fundingSource === 'COMPANY' &&
               (!item.investor_id || item.investor_id === context.investor_id)
      })
      .map(item => {
        // 🚨 關鍵：完全移除所有真實價格相關欄位
        const filtered = { ...item }

        // 移除所有包含 'actual' 的欄位 (真實價格)
        Object.keys(filtered).forEach(key => {
          if (key.toLowerCase().includes('actual')) {
            delete filtered[key]
          }
        })

        // 🔒 移除老闆傣金和個人調貨相關欄位
        delete filtered.commission
        delete filtered.personalPurchases
        delete filtered.ownerProfit
        delete filtered.actualPrice
        delete filtered.actual_amount
        delete filtered.actual_total_price
        delete filtered.actual_unit_price
        delete filtered.realPrice
        delete filtered.trueAmount

        // ✅ 只保留投資方應該看到的顯示價格
        return {
          ...filtered,
          // 確保只顯示調整後的價格 (如投資方看到的1000)
          total_amount: item.total_amount || item.displayAmount, // 顯示價格
          unit_price: item.unit_price || item.displayPrice,     // 顯示單價
          // 基於顯示價格計算獲利 (1000 - 800 = 200)
          profit: (item.total_amount || item.displayAmount || 0) - (item.cost || 0),
          // 確保資金來源標記
          fundingSource: 'COMPANY',
          // 投資方可見的利潤率
          profitMargin: item.total_amount ?
            ((item.total_amount - (item.cost || 0)) / item.total_amount * 100) : 0
        }
      })

    // 記錄投資方資料存取
    logSensitiveAccess('sales_filtered', context.userId, context.role, filteredData.length)
    return filteredData
  }

  // 員工看到基本資料但不含任何財務敏感資訊
  return data.map(item => {
    const filtered = { ...item }
    // 移除所有財務敏感欄位
    delete filtered.actualPrice
    delete filtered.actual_amount
    delete filtered.commission
    delete filtered.profit
    delete filtered.cost
    delete filtered.margin
    return filtered
  })
}

/**
 * 敏感資料存取記錄 (審計功能)
 */
function logSensitiveAccess(
  dataType: string,
  userId: string,
  role: Role,
  recordCount: number
) {
  // 這裡可以整合到實際的審計系統
  console.log(`[AUDIT] ${new Date().toISOString()} - User ${userId} (${role}) accessed ${recordCount} ${dataType} records`)

  // TODO: 整合到資料庫審計日誌
  // await prisma.auditLog.create({
  //   data: {
  //     userId,
  //     userRole: role,
  //     dataType,
  //     recordCount,
  //     timestamp: new Date()
  //   }
  // })
}

/**
 * 產品資料過濾
 */
export function filterProductData<T extends Record<string, any>>(
  data: T[],
  context: PermissionContext
): Partial<T>[] {
  if (context.role === Role.SUPER_ADMIN) {
    return data
  }

  // 投資方和員工都能看到商品資料，但不含成本敏感資訊
  return data.map(item => {
    const filtered = { ...item }

    if (context.role !== Role.SUPER_ADMIN) {
      delete filtered.cost_price      // 成本價
      delete filtered.commission     // 傭金設定
      delete filtered.actualMargin   // 實際毛利
    }

    return filtered
  })
}

/**
 * 客戶資料過濾
 */
export function filterCustomerData<T extends Record<string, any>>(
  data: T[],
  context: PermissionContext
): Partial<T>[] {
  if (context.role === Role.SUPER_ADMIN) {
    return data
  }

  // 投資方和員工看到基本客戶資料
  return data.map(item => {
    const filtered = { ...item }

    if (context.role === Role.INVESTOR) {
      // 投資方不能看到客戶的特殊報價策略
      delete filtered.specialPricing
      delete filtered.discountStrategy
    }

    return filtered
  })
}

/**
 * 報表資料過濾
 */
export function filterReportData<T extends Record<string, any>>(
  data: T,
  context: PermissionContext
): Partial<T> {
  if (context.role === Role.SUPER_ADMIN) {
    return data
  }

  if (context.role === Role.INVESTOR) {
    // 投資方只看到投資項目的過濾後報表
    const filtered = { ...data }

    // 🔒 關鍵：移除所有真實收入和個人調貨資料
    delete filtered.actualTotalRevenue
    delete filtered.personalRevenue
    delete filtered.totalCommission
    delete filtered.actualProfit

    // 重新計算投資方可見的數據
    return {
      ...filtered,
      revenue: data.displayRevenue || 0,           // 顯示收入
      profit: (data.displayRevenue || 0) - (data.cost || 0), // 基於顯示收入計算獲利
      profitMargin: data.displayRevenue ?
        ((data.displayRevenue - data.cost) / data.displayRevenue * 100) : 0
    }
  }

  // 員工看到基本營運數據但不含財務細節
  const filtered = { ...data }
  delete filtered.revenue
  delete filtered.profit
  delete filtered.commission
  return filtered
}

/**
 * Dashboard資料過濾
 */
export function filterDashboardData<T extends Record<string, any>>(
  data: T,
  context: PermissionContext
): Partial<T> {
  if (context.role === Role.SUPER_ADMIN) {
    return data
  }

  if (context.role === Role.INVESTOR) {
    // 投資方Dashboard：只顯示投資項目的調整後數據
    return {
      investmentRevenue: data.displayRevenue || 0,
      investmentProfit: (data.displayRevenue || 0) - (data.cost || 0),
      investmentStock: data.investmentStock || 0,
      monthlyTrend: data.monthlyTrend?.map((trend: any) => ({
        ...trend,
        revenue: trend.displayRevenue || 0,
        profit: (trend.displayRevenue || 0) - (trend.cost || 0)
      })) || [],
      investmentItems: data.investmentItems || []
    }
  }

  // 員工Dashboard：基本操作資料
  return {
    todayTasks: data.todayTasks || [],
    recentOrders: data.recentOrders || [],
    stockAlerts: data.stockAlerts || [],
    quickActions: data.quickActions || []
  }
}

/**
 * 通用資料過濾器
 * 根據使用者角色和資料類型自動選擇合適的過濾器
 */
export function filterDataByRole<T extends Record<string, any>>(
  data: T[] | T,
  dataType: 'sales' | 'products' | 'customers' | 'reports' | 'dashboard',
  context: PermissionContext
): Partial<T>[] | Partial<T> {
  if (Array.isArray(data)) {
    switch (dataType) {
      case 'sales':
        return filterSalesData(data, context)
      case 'products':
        return filterProductData(data, context)
      case 'customers':
        return filterCustomerData(data, context)
      default:
        return data
    }
  } else {
    switch (dataType) {
      case 'reports':
        return filterReportData(data, context)
      case 'dashboard':
        return filterDashboardData(data, context)
      default:
        return data
    }
  }
}