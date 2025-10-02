import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/imports/[id] - 更新進貨單
 * 只有超級管理員可以編輯
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    // 權限檢查 - 只有超級管理員可以編輯
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: '權限不足' },
        { status: 403 }
      )
    }

    const importId = params.id
    const body = await request.json()
    const {
      exchange_rate,
      declaration_number,
      declaration_date,
      notes,
      items
    } = body

    // 檢查進貨單是否存在
    const existingImport = await prisma.legacyImportRecord.findUnique({
      where: { id: importId },
      include: { items: true }
    })

    if (!existingImport) {
      return NextResponse.json(
        { success: false, error: '進貨單不存在' },
        { status: 404 }
      )
    }

    // 不允許編輯已完成的進貨單
    if (existingImport.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: '已完成的進貨單不允許編輯' },
        { status: 400 }
      )
    }

    // 更新進貨單基本資訊
    const updatedData: any = {
      updated_at: new Date()
    }

    if (exchange_rate !== undefined) {
      updatedData.exchange_rate = exchange_rate
    }

    if (declaration_number !== undefined) {
      updatedData.declaration_number = declaration_number
    }

    if (declaration_date !== undefined) {
      updatedData.declaration_date = declaration_date ? new Date(declaration_date) : null
    }

    if (notes !== undefined) {
      updatedData.notes = notes
    }

    // 使用事務更新
    const result = await prisma.$transaction(async (tx) => {
      // 更新進貨單主記錄
      const updatedImport = await tx.legacyImportRecord.update({
        where: { id: importId },
        data: updatedData
      })

      // 如果有提供商品明細，更新商品明細
      if (items && Array.isArray(items)) {
        // 刪除舊的明細
        await tx.legacyImportItem.deleteMany({
          where: { import_record_id: importId }
        })

        // 創建新的明細
        await tx.legacyImportItem.createMany({
          data: items.map((item: any) => ({
            import_record_id: importId,
            product_name: item.product_name,
            quantity: item.quantity,
            alcohol_percentage: item.alcohol_percentage || 40,
            volume: item.volume || 700,
            dutiable_value: item.dutiable_value,
            alcohol_tax: item.alcohol_tax || 0,
            business_tax: item.business_tax || 0,
            tariff_code: item.tariff_code
          }))
        })
      }

      // 返回更新後的完整記錄
      return await tx.legacyImportRecord.findUnique({
        where: { id: importId },
        include: { items: true }
      })
    })

    return NextResponse.json({
      success: true,
      message: '進貨單已更新',
      data: result
    })

  } catch (error) {
    console.error('更新進貨單失敗:', error)
    return NextResponse.json(
      { success: false, error: '更新進貨單失敗' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/imports/[id] - 刪除進貨單
 * 只有超級管理員可以刪除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    // 權限檢查
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: '權限不足' },
        { status: 403 }
      )
    }

    const importId = params.id

    // 檢查進貨單是否存在
    const existingImport = await prisma.legacyImportRecord.findUnique({
      where: { id: importId }
    })

    if (!existingImport) {
      return NextResponse.json(
        { success: false, error: '進貨單不存在' },
        { status: 404 }
      )
    }

    // 不允許刪除已完成的進貨單
    if (existingImport.status === 'COMPLETED' || existingImport.status === 'RECEIVED') {
      return NextResponse.json(
        { success: false, error: '已收貨或已完成的進貨單不允許刪除' },
        { status: 400 }
      )
    }

    // 刪除進貨單（級聯刪除明細）
    await prisma.legacyImportRecord.delete({
      where: { id: importId }
    })

    return NextResponse.json({
      success: true,
      message: '進貨單已刪除'
    })

  } catch (error) {
    console.error('刪除進貨單失敗:', error)
    return NextResponse.json(
      { success: false, error: '刪除進貨單失敗' },
      { status: 500 }
    )
  }
}