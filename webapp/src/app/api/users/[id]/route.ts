import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/types/auth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * DELETE /api/users/[id] - 刪除用戶
 * 只有超級管理員可以刪除用戶
 * 不能刪除自己
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

    const userId = params.id

    // 不能刪除自己
    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: '不能刪除自己的帳號' },
        { status: 400 }
      )
    }

    // 檢查用戶是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用戶不存在' },
        { status: 404 }
      )
    }

    // 檢查用戶是否有相關記錄
    const [
      accountingEntries,
      accountsReceivable,
      paymentRecords,
      accountsPayable,
      supplierPayments,
      purchases,
      quotations,
      sales,
      cashflowRecords
    ] = await Promise.all([
      prisma.accountingEntry.count({ where: { created_by: userId } }),
      prisma.accountsReceivable.count({ where: { created_by: userId } }),
      prisma.paymentRecord.count({ where: { created_by: userId } }),
      prisma.accountsPayable.count({ where: { created_by: userId } }),
      prisma.supplierPayment.count({ where: { created_by: userId } }),
      prisma.purchase.count({ where: { created_by: userId } }),
      prisma.quotation.count({ where: { quoted_by: userId } }),
      prisma.sale.count({ where: { created_by: userId } }),
      prisma.cashFlowRecord.count({ where: { created_by: userId } })
    ])

    const hasRelatedRecords =
      accountingEntries > 0 ||
      accountsReceivable > 0 ||
      paymentRecords > 0 ||
      accountsPayable > 0 ||
      supplierPayments > 0 ||
      purchases > 0 ||
      quotations > 0 ||
      sales > 0 ||
      cashflowRecords > 0

    if (hasRelatedRecords) {
      return NextResponse.json(
        {
          success: false,
          error: '無法刪除：此用戶有相關業務記錄。建議改為停用該用戶。',
          details: {
            accountingEntries,
            accountsReceivable,
            paymentRecords,
            accountsPayable,
            supplierPayments,
            purchases,
            quotations,
            sales,
            cashflowRecords
          }
        },
        { status: 400 }
      )
    }

    // 刪除用戶
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: '用戶已刪除'
    })

  } catch (error) {
    console.error('刪除用戶失敗:', error)
    return NextResponse.json(
      { success: false, error: '刪除用戶失敗' },
      { status: 500 }
    )
  }
}