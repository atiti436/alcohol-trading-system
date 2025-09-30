import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

// 強制動態渲染
export const dynamic = 'force-dynamic'

/**
 * 公司設定 API
 * GET - 獲取公司設定
 * POST - 更新公司設定
 */

// GET /api/settings/company - 獲取公司設定
export async function GET() {
  try {
    // 權限檢查 - 只有超級管理員可以查看
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    // 查詢公司設定 (使用固定ID或第一筆記錄)
    let companySettings = await prisma.companySettings.findFirst()

    // 如果不存在，創建預設設定
    if (!companySettings) {
      companySettings = await prisma.companySettings.create({
        data: {
          name: '滿帆洋行有限公司',
          englishName: 'Full Sail Trading Co., Ltd.',
          address: '台北市中山區南京東路二段123號8樓',
          phone: '(02) 2545-1234',
          email: 'info@fullsail-trading.com.tw',
          website: 'www.fullsail-trading.com.tw',
          taxId: '12345678',
          bankName: '台灣銀行',
          bankAccount: '123-456-789012',
          bankCode: '004',
          lineId: '@fullsail',
          customField1: '',
          customField2: ''
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: companySettings
    })

  } catch (error) {
    console.error('獲取公司設定失敗:', error)
    return NextResponse.json(
      { error: '獲取公司設定失敗' },
      { status: 500 }
    )
  }
}

// POST /api/settings/company - 更新公司設定
export async function POST(request: NextRequest) {
  try {
    // 權限檢查 - 只有超級管理員可以修改
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      englishName,
      address,
      phone,
      email,
      website,
      taxId,
      bankName,
      bankAccount,
      bankCode,
      lineId,
      customField1,
      customField2
    } = body

    // 驗證必要欄位
    if (!name || !address || !phone || !taxId) {
      return NextResponse.json(
        { error: '公司名稱、地址、電話和統一編號為必填欄位' },
        { status: 400 }
      )
    }

    // 查詢現有設定
    const existingSettings = await prisma.companySettings.findFirst()

    let companySettings
    if (existingSettings) {
      // 更新現有設定
      companySettings = await prisma.companySettings.update({
        where: { id: existingSettings.id },
        data: {
          name,
          englishName: englishName || '',
          address,
          phone,
          email: email || '',
          website: website || '',
          taxId,
          bankName: bankName || '',
          bankAccount: bankAccount || '',
          bankCode: bankCode || '',
          lineId: lineId || '',
          customField1: customField1 || '',
          customField2: customField2 || '',
          updated_at: new Date()
        }
      })
    } else {
      // 創建新設定
      companySettings = await prisma.companySettings.create({
        data: {
          name,
          englishName: englishName || '',
          address,
          phone,
          email: email || '',
          website: website || '',
          taxId,
          bankName: bankName || '',
          bankAccount: bankAccount || '',
          bankCode: bankCode || '',
          lineId: lineId || '',
          customField1: customField1 || '',
          customField2: customField2 || ''
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: '公司設定更新成功',
      data: companySettings
    })

  } catch (error) {
    console.error('更新公司設定失敗:', error)
    return NextResponse.json(
      { error: '更新公司設定失敗' },
      { status: 500 }
    )
  }
}