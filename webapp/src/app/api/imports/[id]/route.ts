import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * DELETE /api/imports/[id] - 刪除舊版進貨單（LegacyImportRecord）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    // 只有超級管理員可以刪除
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: '權限不足' }, { status: 403 })
    }

    const importId = params.id

    // 檢查進貨單是否存在
    const existingImport = await prisma.legacyImportRecord.findUnique({
      where: { id: importId },
      include: {
        items: true
      }
    })

    if (!existingImport) {
      return NextResponse.json(
        { success: false, error: '進貨單不存在' },
        { status: 404 }
      )
    }

    console.log('[刪除舊版進貨單] 進貨單ID:', importId)
    console.log('[刪除舊版進貨單] 進貨單號:', existingImport.import_number)

    // 舊版進貨單沒有關聯 InventoryMovement，只需要刪除記錄即可
    await prisma.$transaction(async (tx) => {
      // 1. 刪除進貨明細（LegacyImportItem 會級聯刪除）
      await tx.legacyImportItem.deleteMany({
        where: { import_record_id: importId }
      })

      // 2. 刪除進貨單本身
      await tx.legacyImportRecord.delete({
        where: { id: importId }
      })
    })

    console.log('[刪除舊版進貨單] 刪除成功')

    return NextResponse.json({
      success: true,
      message: '進貨單已刪除'
    })

  } catch (error) {
    console.error('刪除舊版進貨單失敗:', error)

    let errorMessage = '刪除失敗'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { success: false, error: '刪除失敗', details: errorMessage },
      { status: 500 }
    )
  }
}
