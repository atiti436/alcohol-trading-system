import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateTaxes } from '@/lib/tax-calculator'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    const importId = params.id
    const body = await request.json()
    const {
      declarationNumber,
      declarationDate,
      totalValue,
      exchangeRate,
      items,
      extractedData
    } = body

    // 查詢進貨記錄
    const importRecord = await prisma.importRecord.findUnique({
      where: { id: importId },
      include: { items: true }
    })

    if (!importRecord) {
      return NextResponse.json(
        { success: false, error: '進貨記錄不存在' },
        { status: 404 }
      )
    }

    // 計算總稅金
    let totalAlcoholTax = 0
    let totalBusinessTax = 0
    let totalTradePromotionFee = 0

    // 更新進貨商品項目
    const updatePromises = items.map(async (item: any, index: number) => {
      const existingItem = importRecord.items[index]
      if (!existingItem) return null

      // 使用稅金計算器計算稅費
      const taxResult = calculateTaxes({
        baseAmount: item.dutiableValue,
        productType: determineProductType(item.product_name),
        alcoholPercentage: item.alcoholPercentage,
        volumeML: item.volume,
        quantity: item.quantity,
        includeShipping: false,
        includeTax: true
      })

      totalAlcoholTax += taxResult.costs.alcoholTax
      totalBusinessTax += taxResult.costs.businessTax
      totalTradePromotionFee += taxResult.costs.tradePromotion

      // 更新商品項目
      return prisma.importItem.update({
        where: { id: existingItem.id },
        data: {
          product_name: item.product_name,
          quantity: item.quantity,
          alcoholPercentage: item.alcoholPercentage,
          volume: item.volume,
          dutiableValue: item.dutiableValue,
          alcoholTax: taxResult.costs.alcoholTax,
          businessTax: taxResult.costs.businessTax
        }
      })
    })

    await Promise.all(updatePromises.filter(Boolean))

    const totalTaxes = totalAlcoholTax + totalBusinessTax + totalTradePromotionFee

    // 更新進貨記錄
    const updatedImportRecord = await prisma.importRecord.update({
      where: { id: importId },
      data: {
        declarationNumber,
        declarationDate: declarationDate ? new Date(declarationDate) : undefined,
        totalValue: totalValue || importRecord.totalValue,
        exchangeRate: exchangeRate || importRecord.exchangeRate,
        alcoholTax: totalAlcoholTax,
        businessTax: totalBusinessTax,
        tradePromotionFee: totalTradePromotionFee,
        totalTaxes,
        status: 'PROCESSING',
        extractedData: extractedData ? JSON.stringify(extractedData) : undefined
      },
      include: {
        items: true,
        _count: { select: { items: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedImportRecord,
      message: '報單處理完成，稅金已計算'
    })

  } catch (error) {
    console.error('處理報單失敗:', error)
    return NextResponse.json(
      { success: false, error: '處理報單失敗' },
      { status: 500 }
    )
  }
}

// 根據商品名稱判斷酒類類型
function determineProductType(productName: string): string {
  const upperName = productName.toUpperCase()

  if (upperName.includes('WHISKY') || upperName.includes('WHISKEY')) return 'whisky'
  if (upperName.includes('SAKE') || upperName.includes('清酒')) return 'sake'
  if (upperName.includes('WINE') || upperName.includes('葡萄酒')) return 'wine'
  if (upperName.includes('BEER') || upperName.includes('啤酒')) return 'beer'
  if (upperName.includes('VODKA')) return 'vodka'
  if (upperName.includes('RUM')) return 'rum'
  if (upperName.includes('GIN')) return 'gin'
  if (upperName.includes('BRANDY')) return 'brandy'
  if (upperName.includes('LIQUEUR') || upperName.includes('利口酒')) return 'liqueur'

  return 'spirits' // 預設為烈酒
}