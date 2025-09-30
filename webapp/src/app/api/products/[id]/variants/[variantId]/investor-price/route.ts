import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/products/[id]/variants/[variantId]/investor-price
 * 投資方調整期望售價
 * - INVESTOR 只能修改 investor_price
 * - SUPER_ADMIN 可以修改所有價格
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { investor_price } = body

    if (investor_price === undefined) {
      return NextResponse.json({
        error: 'investor_price is required'
      }, { status: 400 })
    }

    // 檢查變體是否存在
    const variant = await prisma.productVariant.findUnique({
      where: { id: params.variantId },
      include: { product: { select: { name: true, product_code: true } } }
    })

    if (!variant) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }

    if (variant.product_id !== params.id) {
      return NextResponse.json({ error: 'Variant does not belong to this product' }, { status: 400 })
    }

    // 權限檢查
    if (session.user.role === 'INVESTOR') {
      // INVESTOR 只能修改 investor_price
      const updatedVariant = await prisma.productVariant.update({
        where: { id: params.variantId },
        data: { investor_price: parseFloat(investor_price.toString()) }
      })

      return NextResponse.json({
        success: true,
        data: updatedVariant,
        message: '投資方期望售價已更新'
      })
    } else if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'EMPLOYEE') {
      // SUPER_ADMIN/EMPLOYEE 可以幫投資方調整
      const updatedVariant = await prisma.productVariant.update({
        where: { id: params.variantId },
        data: { investor_price: parseFloat(investor_price.toString()) }
      })

      return NextResponse.json({
        success: true,
        data: updatedVariant,
        message: '投資方期望售價已更新'
      })
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

  } catch (error) {
    console.error('Failed to update investor price:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
