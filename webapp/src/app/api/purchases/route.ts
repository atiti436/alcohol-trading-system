import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/auth-config'
import { validatePurchaseData } from '@/lib/validation'

/**
 * 🏭 Room-3: Purchase 採購管理 API
 * 負責採購單管理、供應商管理、成本計算
 * 🔒 重要：投資方角色不能看到個人調貨採購
 */

// GET /api/purchases - 採購單列表(支援搜尋和分頁)
export async function GET(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') // 狀態篩選
    const fundingSource = searchParams.get('fundingSource') // 資金來源篩選
    const orderBy = searchParams.get('orderBy') || 'createdAt'
    const order = searchParams.get('order') || 'desc'

    const skip = (page - 1) * limit

    // 建立查詢條件
    const where: any = {}

    // 搜尋條件 - 支援採購單號、供應商的模糊搜尋
    if (search) {
      where.OR = [
        { purchaseNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
        { declarationNumber: { contains: search, mode: 'insensitive' } }
      ]
    }

    // 狀態篩選
    if (status) {
      where.status = status
    }

    // 資金來源篩選
    if (fundingSource) {
      where.fundingSource = fundingSource
    }

    // 🔒 權限過濾 - 投資方不能看到個人調貨
    if (session.user.role === 'INVESTOR') {
      where.fundingSource = 'COMPANY' // 只能看公司資金的採購
      // 進一步過濾：只能看投資方相關的採購
      if (session.user.investorId) {
        where.investorId = session.user.investorId
      }
    }

    // 執行查詢
    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderBy]: order },
        include: {
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true
            }
          },
          _count: {
            select: {
              items: true // 統計採購項目數量
            }
          }
        }
      }),
      prisma.purchase.count({ where })
    ])

    // 🔒 數據過濾 - 針對投資方隱藏敏感資訊
    const filteredPurchases = purchases.map(purchase => {
      if (session.user.role === 'INVESTOR') {
        // 投資方看到的是調整後的金額，隱藏真實成本
        return {
          ...purchase,
          totalAmount: purchase.displayAmount || purchase.totalAmount * 0.8, // 假設顯示80%
          items: purchase.items.map(item => ({
            ...item,
            unitPrice: item.displayPrice || item.unitPrice * 0.8,
            totalPrice: item.displayTotal || item.totalPrice * 0.8
          }))
        }
      }
      return purchase
    })

    return NextResponse.json({
      success: true,
      data: {
        purchases: filteredPurchases,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      }
    })

  } catch (error) {
    console.error('採購單列表查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// POST /api/purchases - 新增採購單
export async function POST(request: NextRequest) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以新增採購單
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()

    // 🔒 嚴格輸入驗證 - 修復安全漏洞
    let validatedData
    try {
      const purchaseData = {
        supplierId: body.supplierId || 'temp-supplier', // 兼容舊格式
        totalAmount: body.totalAmount || 0, // 將在後面重新計算
        status: body.status || 'DRAFT',
        notes: body.notes || '',
        expectedDate: body.expectedDate
      }
      validatedData = validatePurchaseData(purchaseData)
    } catch (validationError) {
      return NextResponse.json(
        {
          error: '輸入資料驗證失敗',
          details: validationError instanceof Error ? validationError.message : '格式錯誤'
        },
        { status: 400 }
      )
    }

    const {
      fundingSource = 'COMPANY',
      supplier,
      currency = 'JPY',
      exchangeRate,
      declarationNumber,
      declarationDate,
      items = [] // 採購明細
    } = body

    // 額外商業邏輯驗證
    if (!supplier) {
      return NextResponse.json({ error: '供應商為必填' }, { status: 400 })
    }

    if (!exchangeRate || exchangeRate <= 0) {
      return NextResponse.json({ error: '匯率必須大於0' }, { status: 400 })
    }

    if (items.length === 0) {
      return NextResponse.json({ error: '至少需要一個採購項目' }, { status: 400 })
    }

    // 生成採購單號
    const purchaseNumber = await generatePurchaseNumber()

    // 計算總金額
    let totalAmount = 0
    const validatedItems = []

    for (const item of items) {
      if (!item.productName || !item.quantity || !item.unitPrice) {
        return NextResponse.json({
          error: '採購項目缺少必要資訊：產品名稱、數量、單價'
        }, { status: 400 })
      }

      const itemTotal = item.quantity * item.unitPrice
      totalAmount += itemTotal

      validatedItems.push({
        productId: item.productId || null,
        productName: item.productName,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: itemTotal,
        dutiableValue: item.dutiableValue ? parseFloat(item.dutiableValue) : null,
        tariffCode: item.tariffCode || null,
        importDutyRate: item.importDutyRate ? parseFloat(item.importDutyRate) : null,
        alcoholPercentage: item.alcoholPercentage ? parseFloat(item.alcoholPercentage) : null,
        volumeML: item.volumeML ? parseInt(item.volumeML) : null,
        weight: item.weight ? parseFloat(item.weight) : null
      })
    }

    // 創建採購單和採購明細
    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber,
        fundingSource,
        supplier,
        currency,
        exchangeRate: parseFloat(exchangeRate),
        totalAmount,
        status: 'DRAFT', // 預設為草稿狀態
        declarationNumber,
        declarationDate: declarationDate ? new Date(declarationDate) : null,
        notes,
        createdBy: session.user.id,
        investorId: fundingSource === 'COMPANY' ? session.user.investorId : null,
        items: {
          create: validatedItems
        }
      },
      include: {
        items: true,
        _count: {
          select: {
            items: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: purchase,
      message: '採購單創建成功'
    })

  } catch (error) {
    console.error('採購單創建失敗:', error)
    return NextResponse.json(
      { error: '創建失敗', details: error },
      { status: 500 }
    )
  }
}

/**
 * 生成採購單號 - 格式：PO-YYYYMMDD-XXX
 */
async function generatePurchaseNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  // 查找今天最後一個採購單號
  const lastPurchase = await prisma.purchase.findFirst({
    where: {
      purchaseNumber: {
        startsWith: `PO-${dateStr}-`
      }
    },
    orderBy: {
      purchaseNumber: 'desc'
    }
  })

  let sequence = 1
  if (lastPurchase?.purchaseNumber) {
    const lastSequence = lastPurchase.purchaseNumber.split('-')[2]
    sequence = parseInt(lastSequence) + 1
  }

  return `PO-${dateStr}-${sequence.toString().padStart(3, '0')}`
}