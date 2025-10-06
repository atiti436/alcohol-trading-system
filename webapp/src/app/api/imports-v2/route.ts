import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { prisma } from '@/lib/prisma'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * GET /api/imports-v2
 * 查詢進貨單列表（新版）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授權' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const warehouse = searchParams.get('warehouse')
    const orderBy = searchParams.get('orderBy') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    const skip = (page - 1) * limit

    // 構建查詢條件
    const where: any = {}

    if (search) {
      where.OR = [
        { import_number: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
        { purchase_number: { contains: search, mode: 'insensitive' } },
        { declaration_number: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (status) {
      where.status = status
    }

    if (warehouse) {
      where.warehouse = warehouse
    }

    // 查詢進貨記錄
    const [imports, total] = await Promise.all([
      prisma.import.findMany({
        where,
        include: {
          items: {
            include: {
              variant: {
                select: {
                  variant_code: true,
                  product: {
                    select: {
                      name: true // ✅ 修正：欄位是 name 不是 product_name
                    }
                  }
                }
              }
            }
          },
          _count: { select: { items: true } }
        },
        orderBy: { [orderBy]: order },
        skip,
        take: limit
      }),
      prisma.import.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        imports,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('獲取進貨記錄失敗:', error)
    return NextResponse.json(
      { success: false, error: '獲取進貨記錄失敗' },
      { status: 500 }
    )
  }
}
