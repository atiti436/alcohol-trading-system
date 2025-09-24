import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma' 
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'

/**
 * GET /api/products/search - 強化的產品搜尋 API
 * 專門用於採購單、報價單的快速搜尋
 */

export async function GET(request: NextRequest) {
  try {
    // 權限檢查
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: [],
        message: '請輸入搜尋關鍵字'
      })
    }

    // 🔍 強化的模糊搜尋邏輯
    const searchTerms = query.trim().toLowerCase().split(/\s+/)

    // 建立動態搜尋條件
    const searchConditions = searchTerms.map(term => ({
      OR: [
        // 產品名稱包含關鍵字
        { name: { contains: term, mode: Prisma.QueryMode.insensitive } },
        // 產品編號包含關鍵字
        { product_code: { contains: term, mode: Prisma.QueryMode.insensitive } },
        // 供應商包含關鍵字
        { supplier: { contains: term, mode: Prisma.QueryMode.insensitive } },
        // 變體描述包含關鍵字
        { variants: { some: { description: { contains: term, mode: Prisma.QueryMode.insensitive } } } },
        // 變體代碼包含關鍵字
        { variants: { some: { variant_code: { contains: term, mode: Prisma.QueryMode.insensitive } } } }
      ]
    }))

    const products = await prisma.product.findMany({
      where: {
        is_active: true,
        AND: searchConditions
      },
      take: limit,
      orderBy: [
        // 優先顯示名稱完全匹配的
        { name: 'asc' }
      ],
      include: {
        variants: {
          where: { stock_quantity: { gt: 0 } }, // 只顯示有庫存的變體
          select: {
            id: true,
            variant_code: true,
            variant_type: true,
            description: true,
            current_price: true,
            stock_quantity: true,
            available_stock: true,
            condition: true
          },
          orderBy: { variant_type: 'asc' }
        },
        _count: {
          select: {
            variants: true
          }
        }
      }
    })

    // 🎯 智能排序：越匹配的越前面
    const scoredProducts = products.map(product => {
      let score = 0
      const productName = product.name.toLowerCase()
      const productCode = product.product_code.toLowerCase()

      searchTerms.forEach(term => {
        // 名稱完全匹配 +10分
        if (productName === term) score += 10
        // 名稱開頭匹配 +5分
        else if (productName.startsWith(term)) score += 5
        // 名稱包含 +2分
        else if (productName.includes(term)) score += 2

        // 產品編號匹配 +3分
        if (productCode.includes(term)) score += 3
      })

      return { ...product, searchScore: score }
    })

    // 按分數排序
    const sortedProducts = scoredProducts.sort((a, b) => b.searchScore - a.searchScore)

    // 🏷️ 加入搜尋結果標籤
    const enhancedResults = sortedProducts.map(product => ({
      id: product.id,
      name: product.name,
      product_code: product.product_code,
      category: product.category,
      supplier: product.supplier,
      standard_price: product.standard_price,
      current_price: product.current_price,
      variants: product.variants,
      variant_count: product._count.variants,
      has_stock: product.variants.length > 0,
      // 🔍 搜尋匹配資訊
      match_info: {
        score: product.searchScore,
        matched_terms: searchTerms.filter(term =>
          product.name.toLowerCase().includes(term) ||
          product.product_code.toLowerCase().includes(term)
        )
      }
    }))

    return NextResponse.json({
      success: true,
      data: enhancedResults,
      meta: {
        query: query,
        total_results: enhancedResults.length,
        search_terms: searchTerms,
        has_more: enhancedResults.length >= limit
      }
    })

  } catch (error) {
    console.error('產品搜尋失敗:', error)
    return NextResponse.json(
      { error: '搜尋失敗', details: error },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products/search/suggestions - 搜尋建議 API
 * 用於自動完成功能
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    const body = await request.json()
    const { query, type = 'all' } = body

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        suggestions: []
      })
    }

    // 🔮 智能建議邏輯
    let suggestions: string[] = []

    if (type === 'all' || type === 'brands') {
      // 品牌建議 (從產品名稱提取常見品牌)
      const brandResults = await prisma.product.findMany({
        where: {
          is_active: true,
          name: { contains: query, mode: Prisma.QueryMode.insensitive }
        },
        select: { name: true },
        take: 10
      })

      // 提取品牌關鍵字
      const brands = brandResults.map(p => {
        const name = p.name
        // 常見威士忌品牌匹配
        const brandPattern = /(山崎|響|白州|余市|宮城峡|輕井澤|秩父|麥卡倫|格蘭菲迪|皇家禮炮|約翰走路|威雀|百樂門|尊尼獲加)/gi
        const matches = name.match(brandPattern)
        return matches ? matches[0] : name.split(/\s+/)[0]
      }).filter(Boolean)

      suggestions.push(...Array.from(new Set(brands)).slice(0, 5))
    }

    if (type === 'all' || type === 'categories') {
      // 分類建議
      const categoryKeywords = {
        '威士忌': ['威士忌', 'whisky', 'whiskey', '山崎', '響', '白州'],
        '清酒': ['清酒', 'sake', '純米', '大吟醸', '獺祭'],
        '燒酎': ['燒酎', 'shochu', '芋', '麥', '米']
      }

      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => keyword.includes(query.toLowerCase()) || query.toLowerCase().includes(keyword))) {
          suggestions.push(category)
        }
      }
    }

    return NextResponse.json({
      success: true,
      suggestions: Array.from(new Set(suggestions)).slice(0, 8)
    })

  } catch (error) {
    console.error('搜尋建議失敗:', error)
    return NextResponse.json({ error: '建議失敗' }, { status: 500 })
  }
}
