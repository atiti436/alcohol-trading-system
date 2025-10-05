export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 🤖 LINE Bot - 收支記錄 API
 * 功能：從 LINE 訊息快速記錄收入/支出
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, userId } = body

    // 解析收支記錄格式
    // 格式1: #收入 1000 商品銷售
    // 格式2: #支出 500 辦公用品
    // 格式3: #收支 查詢
    const result = parseCashFlowCommand(text)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.error || '格式錯誤'
      })
    }

    // 查詢模式
    if (result.action === 'query') {
      return await handleCashFlowQuery(result)
    }

    // 記錄模式
    if (result.action === 'record') {
      return await handleCashFlowRecord(result, userId)
    }

    return NextResponse.json({
      success: false,
      message: '未知的操作'
    })

  } catch (error) {
    console.error('LINE Bot CashFlow API error:', error)
    return NextResponse.json({
      success: false,
      message: '處理收支記錄時發生錯誤'
    }, { status: 500 })
  }
}

// 解析收支指令
function parseCashFlowCommand(text: string) {
  // 查詢模式
  if (text.includes('查詢') || text.includes('統計') || text.includes('明細')) {
    const dateMatch = text.match(/(\d{4})-?(\d{2})-?(\d{2})?/)
    let dateFrom: Date | undefined
    let dateTo: Date | undefined

    if (dateMatch) {
      const [, year, month, day] = dateMatch
      if (day) {
        dateFrom = new Date(`${year}-${month}-${day}`)
        dateTo = new Date(dateFrom)
        dateTo.setHours(23, 59, 59, 999)
      } else {
        dateFrom = new Date(`${year}-${month}-01`)
        dateTo = new Date(year, parseInt(month), 0, 23, 59, 59, 999)
      }
    }

    return {
      success: true,
      action: 'query' as const,
      dateFrom,
      dateTo,
      type: text.includes('收入') ? 'INCOME' : text.includes('支出') ? 'EXPENSE' : undefined
    }
  }

  // 記錄模式：#收入 1000 商品銷售 [投資方/個人/公司]
  const recordMatch = text.match(/#?(收入|支出)\s+(\d+(?:[,\s]*\d+)?)\s+(.+)/)

  if (!recordMatch) {
    return {
      success: false,
      error: '❌ 格式錯誤\n\n正確格式：\n📥 #收入 1000 商品銷售\n📤 #支出 500 辦公用品\n📊 #收支 查詢 2025-10\n\n可選加上：[投資方/個人/公司]'
    }
  }

  const [, type, amountStr, descriptionRaw] = recordMatch
  const amount = parseFloat(amountStr.replace(/[,\s]/g, ''))

  // 解析描述和資金來源
  let description = descriptionRaw.trim()
  let fundingSource: 'INVESTOR' | 'PERSONAL' | 'COMPANY' = 'COMPANY' // 預設公司資金

  if (description.includes('[投資方]') || description.includes('[投資]')) {
    fundingSource = 'INVESTOR'
    description = description.replace(/\[投資方?\]/g, '').trim()
  } else if (description.includes('[個人]') || description.includes('[墊付]')) {
    fundingSource = 'PERSONAL'
    description = description.replace(/\[個人\]|\[墊付\]/g, '').trim()
  } else if (description.includes('[公司]')) {
    fundingSource = 'COMPANY'
    description = description.replace(/\[公司\]/g, '').trim()
  }

  // 自動分類
  const category = categorizeDescription(description)

  return {
    success: true,
    action: 'record' as const,
    type: type === '收入' ? 'INCOME' : 'EXPENSE',
    amount,
    description,
    category,
    fundingSource
  }
}

// 自動分類
function categorizeDescription(description: string): string {
  const categoryMap: Record<string, string[]> = {
    '商品銷售': ['銷售', '賣出', '出貨', '訂單'],
    '進貨成本': ['進貨', '採購', '補貨', '廠商'],
    '運費': ['運費', '物流', '快遞', '宅配'],
    '辦公費用': ['辦公', '文具', '印刷'],
    '餐費': ['午餐', '晚餐', '餐費', '聚餐'],
    '稅金': ['營業稅', '所得稅', '稅金'],
    '其他': []
  }

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(keyword => description.includes(keyword))) {
      return category
    }
  }

  return '其他'
}

// 處理查詢
async function handleCashFlowQuery(params: any) {
  const where: any = {}

  if (params.dateFrom) {
    where.transaction_date = {
      gte: params.dateFrom,
      lte: params.dateTo || new Date()
    }
  }

  if (params.type) {
    where.type = params.type
  }

  // 查詢記錄
  const records = await prisma.cashFlowRecord.findMany({
    where,
    orderBy: { transaction_date: 'desc' },
    take: 10, // 最多顯示 10 筆
    include: {
      creator: {
        select: { name: true }
      }
    }
  })

  // 統計
  const stats = await prisma.cashFlowRecord.groupBy({
    by: ['type', 'funding_source'],
    where,
    _sum: {
      amount: true
    }
  })

  let totalIncome = 0
  let totalExpense = 0
  const sourceBreakdown: Record<string, { income: number; expense: number }> = {
    INVESTOR: { income: 0, expense: 0 },
    PERSONAL: { income: 0, expense: 0 },
    COMPANY: { income: 0, expense: 0 }
  }

  for (const stat of stats) {
    const amount = stat._sum.amount || 0
    if (stat.type === 'INCOME') {
      totalIncome += amount
      sourceBreakdown[stat.funding_source].income += amount
    } else {
      totalExpense += amount
      sourceBreakdown[stat.funding_source].expense += amount
    }
  }

  const netFlow = totalIncome - totalExpense

  // 組裝訊息
  let message = '💰 收支查詢結果\n\n'

  if (params.dateFrom) {
    const dateStr = params.dateFrom.toISOString().split('T')[0]
    message += `📅 期間：${dateStr}\n`
    if (params.dateTo && params.dateFrom !== params.dateTo) {
      const endDateStr = params.dateTo.toISOString().split('T')[0]
      message += ` ~ ${endDateStr}\n`
    }
    message += '\n'
  }

  message += `📊 統計摘要\n`
  message += `📥 總收入：$${totalIncome.toLocaleString()}\n`
  message += `📤 總支出：$${totalExpense.toLocaleString()}\n`
  message += `💵 淨流量：${netFlow >= 0 ? '+' : ''}$${netFlow.toLocaleString()}\n\n`

  message += `🏦 資金來源明細\n`
  for (const [source, amounts] of Object.entries(sourceBreakdown)) {
    if (amounts.income > 0 || amounts.expense > 0) {
      const sourceName = source === 'INVESTOR' ? '投資方' : source === 'PERSONAL' ? '個人墊付' : '公司資金'
      const net = amounts.income - amounts.expense
      message += `${sourceName}：${net >= 0 ? '+' : ''}$${net.toLocaleString()}\n`
    }
  }

  if (records.length > 0) {
    message += `\n📝 最近記錄（${records.length}筆）\n`
    for (const record of records) {
      const icon = record.type === 'INCOME' ? '📥' : '📤'
      const sign = record.type === 'INCOME' ? '+' : '-'
      const date = new Date(record.transaction_date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
      message += `${icon} ${date} ${sign}$${record.amount.toLocaleString()} ${record.description}\n`
    }
  } else {
    message += `\n📝 此期間無記錄\n`
  }

  return NextResponse.json({
    success: true,
    data: {
      message,
      stats: {
        totalIncome,
        totalExpense,
        netFlow,
        sourceBreakdown
      },
      records: records.slice(0, 5) // 只回傳前 5 筆詳細資料
    }
  })
}

// 處理記錄
async function handleCashFlowRecord(params: any, userId: string) {
  // 從 userId 查詢系統使用者 ID
  // 注意：這裡需要建立 LINE userId 和系統 User ID 的對應關係
  // 簡化版：使用第一個 SUPER_ADMIN 作為創建者
  const admin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' }
  })

  if (!admin) {
    return NextResponse.json({
      success: false,
      message: '❌ 系統錯誤：找不到管理員'
    }, { status: 500 })
  }

  // 建立收支記錄
  const record = await prisma.cashFlowRecord.create({
    data: {
      type: params.type,
      amount: params.amount,
      description: params.description,
      category: params.category,
      funding_source: params.fundingSource,
      transaction_date: new Date(),
      created_by: admin.id,
      notes: `透過 LINE Bot 記錄 (${userId})`
    }
  })

  const icon = params.type === 'INCOME' ? '📥' : '📤'
  const typeText = params.type === 'INCOME' ? '收入' : '支出'
  const fundingText = params.fundingSource === 'INVESTOR' ? '[投資方]' : params.fundingSource === 'PERSONAL' ? '[個人]' : '[公司]'

  const message = `✅ ${typeText}記錄成功\n\n` +
    `${icon} 金額：$${params.amount.toLocaleString()}\n` +
    `📝 描述：${params.description}\n` +
    `🏷️ 分類：${params.category}\n` +
    `💼 來源：${fundingText}\n` +
    `📅 日期：${new Date().toLocaleDateString('zh-TW')}\n\n` +
    `編號：${record.id.slice(0, 8)}...`

  return NextResponse.json({
    success: true,
    data: {
      message,
      record
    }
  })
}
