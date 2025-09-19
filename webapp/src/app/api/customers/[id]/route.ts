import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * 🏠 Room-2: 單一客戶管理 API
 * GET /api/customers/[id] - 客戶詳情
 * PUT /api/customers/[id] - 更新客戶
 * DELETE /api/customers/[id] - 刪除客戶
 */

// GET /api/customers/[id] - 客戶詳情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        sales: {
          take: 10, // 最近10筆訂單
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            sale_number: true,
            total_amount: true,
            actual_amount: session.user.role === 'SUPER_ADMIN' ? true : false, // 只有超級管理員看得到實際金額
            created_at: true,
            is_paid: true
          }
        },
        _count: {
          select: {
            sales: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: '客戶不存在' }, { status: 404 })
    }

    // 計算客戶統計資料
    const totalAmount = await prisma.sale.aggregate({
      where: { customer_id: params.id },
      _sum: {
        total_amount: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        customer,
        statistics: {
          totalOrders: customer._count.sales,
          totalAmount: totalAmount._sum.total_amount || 0
        }
      }
    })

  } catch (error) {
    console.error('客戶詳情查詢失敗:', error)
    return NextResponse.json(
      { error: '查詢失敗', details: error },
      { status: 500 }
    )
  }
}

// PUT /api/customers/[id] - 更新客戶
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN和EMPLOYEE可以更新客戶
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      contact_person,
      phone,
      email,
      company,
      tax_id,
      address,
      shipping_address,
      tier,
      payment_terms,
      requires_invoice,
      credit_limit,
      notes,
      is_active
    } = body

    // 檢查客戶是否存在
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: params.id }
    })

    if (!existingCustomer) {
      return NextResponse.json({ error: '客戶不存在' }, { status: 404 })
    }

    // 更新客戶資料
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(contact_person !== undefined && { contact_person }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(company !== undefined && { company }),
        ...(tax_id !== undefined && { tax_id }),
        ...(address !== undefined && { address }),
        ...(shipping_address !== undefined && { shipping_address }),
        ...(tier && { tier }),
        ...(payment_terms && { payment_terms }),
        ...(requires_invoice !== undefined && { requires_invoice }),
        ...(credit_limit !== undefined && { credit_limit }),
        ...(notes !== undefined && { notes }),
        ...(is_active !== undefined && { is_active })
      }
    })

    return NextResponse.json({
      success: true,
      data: customer,
      message: '客戶更新成功'
    })

  } catch (error) {
    console.error('客戶更新失敗:', error)
    return NextResponse.json(
      { error: '更新失敗', details: error },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - 刪除客戶(軟刪除)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 權限檢查 - 只有SUPER_ADMIN可以刪除客戶
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    // 檢查客戶是否存在
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            sales: true
          }
        }
      }
    })

    if (!existingCustomer) {
      return NextResponse.json({ error: '客戶不存在' }, { status: 404 })
    }

    // 檢查是否有關聯的銷售記錄
    if (existingCustomer._count.sales > 0) {
      // 有銷售記錄的客戶只能軟刪除
      await prisma.customer.update({
        where: { id: params.id },
        data: { is_active: false }
      })

      return NextResponse.json({
        success: true,
        message: '客戶已停用（因有交易記錄）'
      })
    } else {
      // 無銷售記錄可以直接刪除
      await prisma.customer.delete({
        where: { id: params.id }
      })

      return NextResponse.json({
        success: true,
        message: '客戶已刪除'
      })
    }

  } catch (error) {
    console.error('客戶刪除失敗:', error)
    return NextResponse.json(
      { error: '刪除失敗', details: error },
      { status: 500 }
    )
  }
}
