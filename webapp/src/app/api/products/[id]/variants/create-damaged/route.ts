import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { findOrCreateDamagedVariant } from '@/lib/damage-transfer'

export const dynamic = 'force-dynamic'

/**
 * 手動建立盒損變體
 * POST /api/products/[id]/variants/create-damaged
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const {
      sourceVariantId,  // 來源變體 ID
      customPriceRatio  // 可選：自訂價格折扣比例（預設 0.8）
    } = body

    if (!sourceVariantId) {
      return NextResponse.json({ error: '請指定來源變體' }, { status: 400 })
    }

    // 使用 transaction 建立盒損變體
    const result = await prisma.$transaction(async (tx) => {
      // 查找來源變體
      const sourceVariant = await tx.productVariant.findUnique({
        where: { id: sourceVariantId },
        include: { product: true }
      })

      if (!sourceVariant) {
        throw new Error('來源變體不存在')
      }

      // 檢查是否已存在盒損變體
      const existingDamagedCode = `${sourceVariant.variant_code}-D`
      const existing = await tx.productVariant.findUnique({
        where: { variant_code: existingDamagedCode }
      })

      if (existing) {
        return {
          isNew: false,
          damagedVariant: existing,
          message: `盒損變體已存在：${existingDamagedCode}`
        }
      }

      // 建立新的盒損變體
      const damagedVariant = await findOrCreateDamagedVariant(
        tx,
        sourceVariantId,
        session.user.id,
        customPriceRatio
      )

      return {
        isNew: true,
        damagedVariant,
        message: `成功建立盒損變體：${damagedVariant.variant_code}`
      }
    })

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('建立盒損變體失敗:', error)
    return NextResponse.json(
      {
        error: '建立失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}
