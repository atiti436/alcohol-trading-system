import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * POST /api/imports-v2/[id]/declaration
 * 更新進貨單的報關資訊（手動輸入或OCR辨識）
 */
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
      items = [],
      totalAlcoholTax = 0,
      totalBusinessTax = 0,
      totalTaxes = 0
    } = body

    // 檢查進貨單是否存在
    const existingImport = await prisma.import.findUnique({
      where: { id: importId }
    })

    if (!existingImport) {
      return NextResponse.json(
        { success: false, error: '進貨單不存在' },
        { status: 404 }
      )
    }

    // 更新進貨單
    await prisma.$transaction(async (tx) => {
      // 1. 更新進貨單基本資訊
      await tx.import.update({
        where: { id: importId },
        data: {
          declaration_number: declarationNumber,
          declaration_date: declarationDate ? new Date(declarationDate) : null,
          tariff_amount: totalTaxes,
          status: 'PROCESSING' // 更新狀態為處理中
        }
      })

      // 2. 更新進貨明細的稅費資訊（如果有提供）
      for (const item of items) {
        if (item.id) {
          await tx.importItem.update({
            where: { id: item.id },
            data: {
              tariff_amount: item.alcoholTax + item.businessTax
            }
          })
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: '報單資料已更新'
    })

  } catch (error) {
    console.error('更新報單資料失敗:', error)

    let errorMessage = '更新失敗'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { success: false, error: '更新失敗', details: errorMessage },
      { status: 500 }
    )
  }
}
