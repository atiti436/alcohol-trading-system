import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAppActiveUser } from '@/modules/auth/middleware/permissions'
import { Role } from '@/types/auth'
import { Decimal } from '@prisma/client/runtime/library'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 查詢進貨單所有費用
 * GET /api/imports/[id]/costs
 */
export const GET = withAppActiveUser(async (request: NextRequest, response: NextResponse, context: any) => {
  try {
    const { params } = context
    const importId = params.id

    // 查詢進貨單
    const importRecord = await prisma.legacyImportRecord.findUnique({
      where: { id: importId }
    })

    if (!importRecord) {
      return NextResponse.json(
        { success: false, error: '進貨單不存在' },
        { status: 404 }
      )
    }

    // 查詢所有費用
    const costs = await prisma.importCost.findMany({
      where: { import_id: importId },
      orderBy: { created_at: 'asc' }
    })

    // 計算費用總計
    const totalAdditionalCost = costs.reduce((sum, cost) =>
      sum.plus(cost.amount), new Decimal(0)
    )

    return NextResponse.json({
      success: true,
      data: {
        import_id: importId,
        import_number: importRecord.import_number,
        cost_status: importRecord.cost_status,
        costs,
        total_additional_cost: totalAdditionalCost,
        base_cost: importRecord.total_value,
        estimated_final_cost: importRecord.total_value.plus(totalAdditionalCost)
      }
    })

  } catch (error) {
    console.error('查詢進貨單費用失敗:', error)
    return NextResponse.json(
      { success: false, error: '查詢進貨單費用失敗' },
      { status: 500 }
    )
  }
}, [Role.SUPER_ADMIN, Role.EMPLOYEE])

/**
 * 新增費用到進貨單
 * POST /api/imports/[id]/costs
 *
 * Body:
 * {
 *   cost_type: string, // 'SHIPPING' | 'INSPECTION' | 'STORAGE' | 'CUSTOMS' | 'OTHER'
 *   description: string,
 *   amount: number,
 *   notes?: string
 * }
 */
export const POST = withAppActiveUser(async (request: NextRequest, response: NextResponse, context: any) => {
  try {
    const { params } = context
    const importId = params.id

    const body = await request.json()
    const { cost_type, description, amount, notes } = body

    // 驗證必填欄位
    if (!cost_type || !description || !amount) {
      return NextResponse.json(
        { success: false, error: '費用類型、描述和金額為必填' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: '金額必須大於 0' },
        { status: 400 }
      )
    }

    // 查詢進貨單
    const importRecord = await prisma.legacyImportRecord.findUnique({
      where: { id: importId }
    })

    if (!importRecord) {
      return NextResponse.json(
        { success: false, error: '進貨單不存在' },
        { status: 404 }
      )
    }

    // 檢查是否已結算
    if (importRecord.cost_status === 'FINALIZED') {
      return NextResponse.json(
        { success: false, error: '進貨單已結算,無法新增費用' },
        { status: 400 }
      )
    }

    // 創建費用記錄
    const cost = await prisma.importCost.create({
      data: {
        import_id: importId,
        cost_type,
        description,
        amount: new Decimal(amount),
        notes
      }
    })

    return NextResponse.json({
      success: true,
      data: cost,
      message: '費用新增成功'
    })

  } catch (error) {
    console.error('新增進貨單費用失敗:', error)
    return NextResponse.json(
      { success: false, error: '新增進貨單費用失敗' },
      { status: 500 }
    )
  }
}, [Role.SUPER_ADMIN, Role.EMPLOYEE])

/**
 * 刪除費用
 * DELETE /api/imports/[id]/costs?cost_id=xxx
 */
export const DELETE = withAppActiveUser(async (request: NextRequest, response: NextResponse, context: any) => {
  try {
    const { params } = context
    const importId = params.id
    const costId = request.nextUrl.searchParams.get('cost_id')

    if (!costId) {
      return NextResponse.json(
        { success: false, error: '缺少費用 ID' },
        { status: 400 }
      )
    }

    // 查詢進貨單
    const importRecord = await prisma.legacyImportRecord.findUnique({
      where: { id: importId }
    })

    if (!importRecord) {
      return NextResponse.json(
        { success: false, error: '進貨單不存在' },
        { status: 404 }
      )
    }

    // 檢查是否已結算
    if (importRecord.cost_status === 'FINALIZED') {
      return NextResponse.json(
        { success: false, error: '進貨單已結算,無法刪除費用' },
        { status: 400 }
      )
    }

    // 刪除費用
    await prisma.importCost.delete({
      where: { id: costId }
    })

    return NextResponse.json({
      success: true,
      message: '費用刪除成功'
    })

  } catch (error) {
    console.error('刪除進貨單費用失敗:', error)
    return NextResponse.json(
      { success: false, error: '刪除進貨單費用失敗' },
      { status: 500 }
    )
  }
}, [Role.SUPER_ADMIN])
