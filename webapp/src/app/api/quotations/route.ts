import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// 報價列表查詢 Schema
const QuotationQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  customer_id: z.string().optional(),
  product_name: z.string().optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  source: z.enum(['WEB', 'LINE_BOT']).optional(),
  search: z.string().optional(),
})

// 新增報價 Schema
const CreateQuotationSchema = z.object({
  customer_id: z.string(),
  product_id: z.string().optional(),
  product_name: z.string(),
  quantity: z.number().positive(),
  unit_price: z.number().positive(),
  special_notes: z.string().optional(),
  valid_until: z.string().optional(),
  source: z.enum(['WEB', 'LINE_BOT']).optional().default('WEB'),
  line_user_id: z.string().optional(),
})

// GET - 獲取報價列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = QuotationQuerySchema.parse(Object.fromEntries(searchParams))

    const page = parseInt(query.page)
    const limit = parseInt(query.limit)
    const skip = (page - 1) * limit

    // 構建查詢條件
    const where: any = {}

    if (query.customer_id) {
      where.customer_id = query.customer_id
    }

    if (query.product_name) {
      where.product_name = {
        contains: query.product_name,
        mode: 'insensitive'
      }
    }

    if (query.status) {
      where.status = query.status
    }

    if (query.source) {
      where.source = query.source
    }

    if (query.search) {
      where.OR = [
        { product_name: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
        { special_notes: { contains: query.search, mode: 'insensitive' } }
      ]
    }

    // 獲取報價列表
    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
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
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.quotation.count({ where })
    ])

    return NextResponse.json({
      quotations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('獲取報價列表失敗:', error)
    return NextResponse.json({ error: '獲取報價列表失敗' }, { status: 500 })
  }
}

// POST - 新增報價
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = CreateQuotationSchema.parse(body)

    // 生成報價單號
    const currentDate = new Date()
    const dateString = currentDate.toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const quoteNumber = `QT${dateString}${randomSuffix}`

    // 計算總金額
    const totalAmount = data.quantity * data.unit_price

    // 處理有效期
    let validUntil: Date | undefined
    if (data.valid_until) {
      validUntil = new Date(data.valid_until)
    }

    // 創建報價記錄
    const quotation = await prisma.quotation.create({
      data: {
        quote_number: quoteNumber,
        customer_id: data.customer_id,
        product_id: data.product_id,
        product_name: data.product_name,
        quantity: data.quantity,
        unit_price: data.unit_price,
        total_amount: totalAmount,
        special_notes: data.special_notes,
        valid_until: validUntil,
        quoted_by: session.user.id,
        source: data.source,
        line_user_id: data.line_user_id,
      },
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

    return NextResponse.json(quotation, { status: 201 })

  } catch (error) {
    console.error('新增報價失敗:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '資料格式錯誤', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: '新增報價失敗' }, { status: 500 })
  }
}