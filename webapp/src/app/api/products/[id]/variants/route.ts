import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { normalizeVariantType, generateVariantCode } from '@/lib/variant-utils'

/**
 * ?? Room-2: �ӫ~����޲z API
 * GET /api/products/[id]/variants - ���o����M��
 * POST /api/products/[id]/variants - �إ߷s������
 */

// GET /api/products/[id]/variants - ���o����M��
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // �v���ˬd
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '���n�J' }, { status: 401 })
    }

    // �ˬd�ӫ~�O�_�s�b
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, product_code: true }
    })

    if (!product) {
      return NextResponse.json({ error: '�ӫ~���s�b' }, { status: 404 })
    }

    // �d������M��
    const variants = await prisma.productVariant.findMany({
      where: { product_id: params.id },
      orderBy: { variant_type: 'asc' },
      include: {
        _count: {
          select: {
            sale_items: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        product,
        variants
      }
    })

  } catch (error) {
    console.error('����M��d�ߥ���:', error)
    return NextResponse.json(
      { error: '�d�ߥ���', details: error },
      { status: 500 }
    )
  }
}

// POST /api/products/[id]/variants - �إ߷s������
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // �v���ˬd - �� SUPER_ADMIN �P EMPLOYEE �i�H�إ�����
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role === 'INVESTOR') {
      return NextResponse.json({ error: '�v������' }, { status: 403 })
    }

    const body = await request.json()
    const {
      variant_type,
      description,
      base_price,
      current_price,
      discount_rate,
      limited_edition = false,
      production_year,
      serial_number,
      condition = '�}�n',
      stock_quantity = 0,
      sku
    } = body

    let normalizedVariantType = ''
    try {
      normalizedVariantType = normalizeVariantType(variant_type)
    } catch (validationError) {
      return NextResponse.json({
        error: validationError instanceof Error ? validationError.message : '�����������X�k'
      }, { status: 400 })
    }

    const missingFields: string[] = []
    if (!normalizedVariantType) missingFields.push('variant_type')
    if (!description) missingFields.push('description')
    if (!base_price) missingFields.push('base_price')
    if (!current_price) missingFields.push('current_price')
    if (!sku) missingFields.push('sku')

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: '������쥼����',
        required: missingFields
      }, { status: 400 })
    }

    // �ˬd�ӫ~�O�_�s�b
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { product_code: true }
    })

    if (!product) {
      return NextResponse.json({ error: '�ӫ~���s�b' }, { status: 404 })
    }

    // �ˬd���������O�_�w�s�b�]�P�@�ӫ~�U���i���ơ^
    const existingVariant = await prisma.productVariant.findUnique({
      where: {
        product_id_variant_type: {
          product_id: params.id,
          variant_type: normalizedVariantType
        }
      }
    })

    if (existingVariant) {
      return NextResponse.json({
        error: ��������  �w�s�b
      }, { status: 400 })
    }

    // �ͦ�����N�X
    const variant_code = await generateVariantCode(
      prisma,
      params.id,
      product.product_code,
      normalizedVariantType
    )

    // �إ�����
    const variant = await prisma.productVariant.create({
      data: {
        product_id: params.id,
        variant_code,
        sku,
        variant_type: normalizedVariantType,
        description,
        base_price,
        current_price,
        discount_rate,
        limited_edition,
        production_year,
        serial_number,
        condition,
        stock_quantity
      }
    })

    return NextResponse.json({
      success: true,
      data: variant,
      message: '����إߦ��\'
    })

  } catch (error) {
    console.error('����إߥ���:', error)
    return NextResponse.json(
      { error: '�إߥ���', details: error },
      { status: 500 }
    )
  }
}
