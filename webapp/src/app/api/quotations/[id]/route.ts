import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// 更新報價 Schema
const UpdateQuotationSchema = z.object({
  customer_id: z.string().optional(),
  product_id: z.string().optional(),
  product_name: z.string().optional(),
  quantity: z.number().positive().optional(),
  unit_price: z.number().positive().optional(),
  special_notes: z.string().optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  valid_until: z.string().optional(),
})

// GET - 獲取單一報價詳情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            customer_code: true,
            tier: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            product_code: true,
            category: true
          }
        },
        quoter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!quotation) {
      return NextResponse.json({ error: '報價不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: quotation
    })

  } catch (error) {
    console.error('獲取報價詳情失敗:', error)
    return NextResponse.json({ error: '獲取報價詳情失敗' }, { status: 500 })
  }
}

// PUT - 更新報價
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = UpdateQuotationSchema.parse(body)

    // 檢查報價是否存在
    const existingQuotation = await prisma.quotation.findUnique({
      where: { id: params.id }
    })

    if (!existingQuotation) {
      return NextResponse.json({ error: '報價不存在' }, { status: 404 })
    }

    // 準備更新資料
    const updateData: any = {}

    if (data.customer_id) updateData.customer_id = data.customer_id
    if (data.product_id !== undefined) updateData.product_id = data.product_id
    if (data.product_name) updateData.product_name = data.product_name
    if (data.quantity) updateData.quantity = data.quantity
    if (data.unit_price) updateData.unit_price = data.unit_price
    if (data.special_notes !== undefined) updateData.special_notes = data.special_notes
    if (data.status) updateData.status = data.status

    // 處理有效期
    if (data.valid_until !== undefined) {
      updateData.valid_until = data.valid_until ? new Date(data.valid_until) : null
    }

    // 如果數量或單價有變更，重新計算總金額
    if (data.quantity || data.unit_price) {
      const quantity = data.quantity || existingQuotation.quantity
      const unit_price = data.unit_price || existingQuotation.unit_price
      updateData.total_amount = quantity * unit_price
    }

    // 更新報價
    const updatedQuotation = await prisma.quotation.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            customer_code: true,
            tier: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            product_code: true,
            category: true
          }
        },
        quoter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedQuotation
    })

  } catch (error) {
    console.error('更新報價失敗:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '資料格式錯誤', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: '更新報價失敗' }, { status: 500 })
  }
}

// DELETE - 刪除報價
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查報價是否存在
    const existingQuotation = await prisma.quotation.findUnique({
      where: { id: params.id }
    })

    if (!existingQuotation) {
      return NextResponse.json({ error: '報價不存在' }, { status: 404 })
    }

    // 只允許超級管理員或報價創建者刪除
    if (session.user.role !== 'SUPER_ADMIN' && existingQuotation.quoted_by !== session.user.id) {
      return NextResponse.json({ error: '沒有權限刪除此報價' }, { status: 403 })
    }

    await prisma.quotation.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: '報價已刪除'
    })

  } catch (error) {
    console.error('刪除報價失敗:', error)
    return NextResponse.json({ error: '刪除報價失敗' }, { status: 500 })
  }
}