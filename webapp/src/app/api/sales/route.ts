import { NextRequest, NextResponse } from 'next/server'
import { withAppActiveUser } from '@/modules/auth/middleware/permissions'
import { filterSalesData } from '@/modules/auth/utils/data-filter'
import { prisma } from '@/lib/prisma'
import { PermissionContext, Role } from '@/types/auth'
import { validateSaleData } from '@/lib/validation'
import { DatabaseWhereCondition } from '@/types/business'
import { Sale, SaleItem, Customer, Product, ProductVariant } from '@prisma/client'
import { syncSaleCashflow } from '@/lib/cashflow/syncSaleCashflow'

// 強制動態渲染
export const dynamic = 'force-dynamic'

// Define Sale with included relations
type SaleWithRelations = Sale & {
  customer: Pick<Customer, 'id' | 'name' | 'tier'>
  items: (SaleItem & {
    product: Pick<Product, 'id' | 'product_code' | 'name' | 'cost_price'>
    variant: Pick<ProductVariant, 'id' | 'variant_code' | 'description'> | null
  })[]
}

// 🔒 核心商業邏輯：銷售管理API with 投資方數據隔離

/**
 * GET /api/sales - 獲取銷售資料
 * 🚨 關鍵：根據角色自動過濾敏感資料
 */
export const GET = withAppActiveUser(async (
  req: NextRequest,
  res: NextResponse,
  context: PermissionContext
) => {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const customer_id = searchParams.get('customer_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const funding_source = searchParams.get('funding_source')
    const status = searchParams.get('status') // 🆕 狀態篩選（包含預購）
    const is_preorder = searchParams.get('is_preorder') // 🆕 預購篩選

    // 建立基礎查詢條件
    const where: any = {}

    // 🔒 投資方只能看到投資項目
    if (context.role === Role.INVESTOR) {
      where.funding_source = 'COMPANY'
      if (context.investor_id) {
        // 如果有投資方ID，只顯示該投資方的項目
        where.creator = { investor_id: context.investor_id }
      }
    }

    // 其他篩選條件
    if (customer_id) where.customer_id = customer_id
    if (funding_source && context.role === Role.SUPER_ADMIN) {
      where.funding_source = funding_source
    }
    if (dateFrom || dateTo) {
      where.created_at = {}
      if (dateFrom) where.created_at.gte = new Date(dateFrom)
      if (dateTo) where.created_at.lte = new Date(dateTo)
    }

    // 🆕 狀態篩選
    if (status) {
      where.status = status
    }

    // 🆕 預購篩選
    if (is_preorder !== null && is_preorder !== undefined) {
      where.is_preorder = is_preorder === 'true'
    }

    // 查詢銷售資料
    const [sales, total]: [SaleWithRelations[], number] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              tier: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  product_code: true,
                  name: true,
                  cost_price: true
                }
              },
              variant: {
                select: {
                  id: true,
                  variant_code: true,
                  description: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.sale.count({ where })
    ])

    // 🔒 關鍵：套用資料過濾器
    const filteredSales = filterSalesData(sales as any, context)

    // 計算匯總資料（也要過濾）
    const summary = calculateSalesSummary(sales as any, context)

    return NextResponse.json({
      success: true,
      data: {
        sales: filteredSales,
        total,
        summary,
        page,
        limit
      },
      metadata: {
        total,
        page,
        limit,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('獲取銷售資料錯誤:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '獲取銷售資料失敗'
      }
    }, { status: 500 })
  }
})

/**
 * POST /api/sales - 建立新銷售單
 * 🚨 只有超級管理員和員工可以建立銷售單
 */
export const POST = withAppActiveUser(async (
  req: NextRequest,
  res: NextResponse,
  context: PermissionContext
) => {
  try {
    // 投資方不能建立銷售單
    if (context.role === Role.INVESTOR) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '投資方無權建立銷售單'
        }
      }, { status: 403 })
    }

    const body = await req.json()

    // 🔒 嚴格輸入驗證 - 修復安全漏洞
    let validatedData
    try {
      const saleData = {
        customer_id: body.customer_id,
        total_amount: body.total_amount || 0, // 將在後面重新計算
        actual_total_amount: body.actual_amount || 0, // 將在後面重新計算
        status: body.status || 'PENDING',
        payment_status: body.payment_status || 'PENDING',
        notes: body.notes || '',
        payment_terms: body.payment_terms || 'CASH',
        funding_source: body.funding_source || 'COMPANY',
        items: body.items || []
      }
      console.log('準備驗證的銷售資料:', saleData) // 調試輸出
      validatedData = validateSaleData(saleData)
      console.log('驗證成功的銷售資料:', validatedData) // 調試輸出
    } catch (validationError) {
      console.error('銷售驗證錯誤:', validationError) // 調試輸出
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '輸入資料驗證失敗',
          details: validationError instanceof Error ? validationError.message : '格式錯誤',
          originalData: body // 調試時顯示原始數據
        }
      }, { status: 400 })
    }

    const {
      customer_id,
      items = [],
      displayPrices,
      actualPrices,
      payment_terms,
      notes,
      funding_source = 'COMPANY',
      // 🆕 預購相關欄位
      is_preorder = false,
      expected_arrival_date,
      preorder_notes
    } = body

    // 🔧 穩定性：若 display/actualPrices 缺失或長度不符，回退使用 items 內的單價
    // 以 items 內的單價為最終依據，避免前端陣列不同步導致儲存後被覆蓋
    const normDisplayPrices: number[] = items.map((it: any) => Number(it?.unit_price) || 0)

    const normActualPrices: number[] = items.map((it: any) => Number(it?.actual_unit_price ?? it?.unit_price) || 0)

    // 額外驗證
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '至少需要一個銷售項目'
        }
      }, { status: 400 })
    }

    if (!displayPrices || !Array.isArray(displayPrices) || displayPrices.length !== items.length) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '顯示價格數量必須與項目數量相符'
        }
      }, { status: 400 })
    }

    // 🔒 關鍵：雙重價格機制
    // displayPrices: 投資方看到的價格 (例如: 1000)
    // actualPrices: 實際收取價格 (例如: 1200)
    // commission: 老闆傭金 (actualPrices - displayPrices = 200)

    let totalDisplayAmount = 0
    let totalActualAmount = 0

    // 計算總金額
    normDisplayPrices.forEach((price: number, index: number) => {
      const quantity = items[index]?.quantity || 0
      totalDisplayAmount += price * quantity
    })

    if (normActualPrices) {
      normActualPrices.forEach((price: number, index: number) => {
        const quantity = items[index]?.quantity || 0
        totalActualAmount += price * quantity
      })
    } else {
      totalActualAmount = totalDisplayAmount
    }

    // 計算老闆傭金
    const commission = totalActualAmount - totalDisplayAmount

    // 生成銷售單號
    const sale_number = await generateSaleNumber()

    // 🆕 預購單驗證
    if (is_preorder && !expected_arrival_date) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '預購單必須填寫預計到貨日'
        }
      }, { status: 400 })
    }

    // 🔄 使用 Transaction 建立銷售單並同步 cashflow
    const sale = await prisma.$transaction(async (tx) => {
      // 建立銷售單
      const newSale = await tx.sale.create({
        data: {
          sale_number,
          customer_id,
          total_amount: totalDisplayAmount,       // 顯示金額 (投資方看到)
          actual_amount: totalActualAmount,       // 實際金額 (僅超級管理員)
          commission: commission,                // 老闆傭金 (僅超級管理員)
          funding_source,
          payment_terms,
          notes,
          created_by: context.userId,
          // 🆕 預購相關欄位
          is_preorder,
          status: is_preorder ? 'PREORDER' : 'DRAFT', // 預購單自動設為 PREORDER 狀態
          expected_arrival_date: expected_arrival_date ? new Date(expected_arrival_date) : null,
          preorder_notes,
          items: {
            create: items.map((item: any, index: number) => ({
              product_id: item.product_id,
              variant_id: item.variant_id,
              quantity: item.quantity,
              unit_price: normDisplayPrices[index],                    // 顯示單價
              actual_unit_price: normActualPrices?.[index] || normDisplayPrices[index], // 實際單價
              total_price: normDisplayPrices[index] * item.quantity,   // 顯示總價
              actual_total_price: (normActualPrices?.[index] || normDisplayPrices[index]) * item.quantity, // 實際總價
              is_personal_purchase: funding_source === 'PERSONAL'
            }))
          }
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              variant: true
            }
          }
        }
      })

      // 🔄 同步 cashflow 記錄（只有 CONFIRMED 狀態才會產生記錄）
      await syncSaleCashflow(tx, newSale)

      return newSale
    })

    // 🔒 回傳前也要過濾敏感資料
    const filteredSale = filterSalesData([sale as any], context)[0]

    return NextResponse.json({
      success: true,
      data: { sale: filteredSale }
    })

  } catch (error) {
    console.error('建立銷售單錯誤:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '建立銷售單失敗'
      }
    }, { status: 500 })
  }
})

/**
 * 計算銷售匯總（根據角色過濾）
 */
function calculateSalesSummary(sales: SaleWithRelations[], context: PermissionContext) {
  if (context.role === Role.SUPER_ADMIN) {
    // 超級管理員看到完整的財務摘要
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.actual_amount || sale.total_amount), 0)
    const totalDisplayRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const totalCommission = sales.reduce((sum, sale) => sum + (sale.commission || 0), 0)
    const totalCost = sales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum: number, item: any) =>
        itemSum + (item.product?.cost_price || 0) * item.quantity, 0)
    }, 0)

    return {
      totalRevenue,           // 實際總收入 (1200)
      totalDisplayRevenue,    // 顯示總收入 (1000)
      totalCommission,        // 總傭金 (200)
      totalCost,             // 總成本 (800)
      totalProfit: totalRevenue - totalCost,  // 實際總獲利 (400)
      commissionRate: totalDisplayRevenue ? (totalCommission / totalDisplayRevenue * 100) : 0
    }
  }

  if (context.role === Role.INVESTOR) {
    // 投資方只看到基於顯示價格的摘要
    const investmentSales = sales.filter(sale => sale.funding_source === 'COMPANY')
    const totalRevenue = investmentSales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const totalCost = investmentSales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum: number, item: any) =>
        itemSum + (item.product?.cost_price || 0) * item.quantity, 0)
    }, 0)

    return {
      totalRevenue,           // 顯示收入 (1000)
      totalCost,             // 成本 (800)
      totalProfit: totalRevenue - totalCost,  // 投資方獲利 (200)
      profitMargin: totalRevenue ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0
    }
  }

  // 員工看到基本統計
  return {
    totalOrders: sales.length,
    totalQuantity: sales.reduce((sum, sale) =>
      sum + sale.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0)
  }
}

/**
 * 生成銷售單號
 */
async function generateSaleNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  const lastSale = await prisma.sale.findFirst({
    where: {
      sale_number: {
        startsWith: `SA${dateStr}`
      }
    },
    orderBy: { sale_number: 'desc' }
  })

  let sequence = 1
  if (lastSale) {
    const lastSequence = parseInt(lastSale.sale_number.slice(-3))
    sequence = lastSequence + 1
  }

  return `SA${dateStr}${sequence.toString().padStart(3, '0')}`
}
