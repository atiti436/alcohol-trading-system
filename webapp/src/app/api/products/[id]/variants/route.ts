import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { normalizeVariantType, generateVariantCode } from '@/lib/variant-utils'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * @swagger
 * /api/products/{id}/variants:
 *   get:
 *     summary: Get all variants for a specific product
 *     description: Retrieves a list of all variants associated with a given product ID.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product.
 *     responses:
 *       200:
 *         description: A list of variants.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: object
 *                     variants:
 *                       type: array
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Product not found.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, product_code: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const variants = await prisma.productVariant.findMany({
      where: { product_id: params.id },
      orderBy: { created_at: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        product,
        variants
      }
    })
  } catch (error) {
    console.error('Failed to retrieve variants:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/products/{id}/variants:
 *   post:
 *     summary: Create a new variant for a product
 *     description: Creates a new product variant for a given product ID.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product to add a variant to.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               variant_type:
 *                 type: string
 *               description:
 *                 type: string
 *               base_price:
 *                 type: number
 *               current_price:
 *                 type: number
 *               sku:
 *                 type: string
 *     responses:
 *       201:
 *         description: Variant created successfully.
 *       400:
 *         description: Bad request (e.g., missing fields, validation error).
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Product not found.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      variant_type,
      description,
      cost_price = 0,
      investor_price,
      actual_price,
      current_price,
      stock_quantity = 0,
      warehouse = 'COMPANY',
      ...otherFields
    } = body

    // Validate required fields
    const missingFields: string[] = []
    if (!variant_type) missingFields.push('variant_type')
    if (!description) missingFields.push('description')
    if (investor_price === undefined) missingFields.push('investor_price')
    if (actual_price === undefined) missingFields.push('actual_price')
    if (current_price === undefined) missingFields.push('current_price')

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { product_code: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // 🎯 新邏輯：生成流水號變體代碼（P0001-001, P0001-002...）
    const existingVariants = await prisma.productVariant.findMany({
      where: { product_id: params.id },
      select: { variant_code: true },
      orderBy: { variant_code: 'desc' }
    })

    let nextSequence = 1
    if (existingVariants.length > 0) {
      const lastCode = existingVariants[0].variant_code
      const match = lastCode.match(/-(\d+)$/)
      if (match) {
        nextSequence = parseInt(match[1]) + 1
      }
    }

    const variant_code = `${product.product_code}-${nextSequence.toString().padStart(3, '0')}`
    const sku = `SKU-${variant_code}`

    // 使用 transaction 確保 variant 和 inventory 同時創建
    const result = await prisma.$transaction(async (tx) => {
      // 創建變體（不再維護 stock_quantity，改用 Inventory 表）
      const variant = await tx.productVariant.create({
        data: {
          product_id: params.id,
          variant_code,
          sku,
          variant_type,
          description,
          cost_price: parseFloat(cost_price.toString()),
          investor_price: parseFloat(investor_price.toString()),
          actual_price: parseFloat(actual_price.toString()),
          current_price: parseFloat(current_price.toString()),
          // 🔧 移除 stock_quantity - 改用 Inventory 表管理
          ...otherFields
        }
      })

      // 創建對應的庫存記錄
      await tx.inventory.create({
        data: {
          variant_id: variant.id,
          warehouse, // 使用傳入的 warehouse 參數
          quantity: parseInt(stock_quantity.toString(), 10),
          reserved: 0,
          available: parseInt(stock_quantity.toString(), 10),
          cost_price: parseFloat(cost_price.toString())
        }
      })

      return variant
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Variant created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create variant:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}