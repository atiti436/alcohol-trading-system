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
      base_price,
      current_price,
      stock_quantity = 0,
      sku,
      ...otherFields
    } = body

    // Validate required fields
    const missingFields: string[] = []
    if (!variant_type) missingFields.push('variant_type')
    if (!description) missingFields.push('description')
    if (base_price === undefined) missingFields.push('base_price')
    if (current_price === undefined) missingFields.push('current_price')
    if (!sku) missingFields.push('sku')

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 })
    }
    
    const normalizedVariantType = normalizeVariantType(variant_type);

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { product_code: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const existingVariant = await prisma.productVariant.findFirst({
        where: {
          product_id: params.id,
          variant_type: normalizedVariantType,
        },
    });

    if (existingVariant) {
      return NextResponse.json({
        error: `Variant with type \'${normalizedVariantType}\' already exists for this product.`
      }, { status: 409 }) // 409 Conflict is more appropriate
    }

    const variant_code = await generateVariantCode(
      prisma,
      params.id,
      product.product_code,
      normalizedVariantType
    )

    const variant = await prisma.productVariant.create({
      data: {
        product_id: params.id,
        variant_code,
        sku,
        variant_type: normalizedVariantType,
        description,
        base_price: parseFloat(base_price),
        current_price: parseFloat(current_price),
        stock_quantity: parseInt(stock_quantity, 10),
        ...otherFields
      }
    })

    return NextResponse.json({
      success: true,
      data: variant,
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