import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/modules/auth/providers/nextauth'
import { getProductInventorySummary } from '@/lib/inventory-helpers'

// 強制動態渲染
export const dynamic = 'force-dynamic'

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

    // 🆕 支援 * 查詢（顯示所有商品，用於下拉選單）
    const isShowAll = query.trim() === '*'

    // 建立動態搜尋條件
    let searchConditions: any[] = []
    let searchTerms: string[] = []  // ✅ 提升到外層作用域

    if (!isShowAll && query.trim()) {
      // 🔍 強化的模糊搜尋邏輯
      searchTerms = query.trim().toLowerCase().split(/\s+/)

      searchConditions = searchTerms.map(term => ({
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
    }

    const products = await prisma.product.findMany({
      where: {
        is_active: true,
        // 🔍 如果是顯示全部，不加搜尋條件
        ...(searchConditions.length > 0 && { AND: searchConditions })
      },
      take: limit,
      orderBy: [
        // 優先顯示名稱完全匹配的
        { name: 'asc' }
      ],
      include: {
        variants: {
          select: {
            id: true,
            variant_code: true,
            variant_type: true,
            description: true,
            current_price: true,
            condition: true,
            volume_ml: true,
            alc_percentage: true,
            cost_price: true,
            investor_price: true,
            actual_price: true,
            // 改用 Inventory 表查詢庫存
            inventory: {
              where: session.user.role === 'INVESTOR'
                ? { warehouse: 'COMPANY' }
                : undefined,
              select: {
                quantity: true,
                available: true,
                reserved: true
              }
            }
          },
          orderBy: { variant_code: 'asc' }
        },
        _count: {
          select: {
            variants: true
          }
        }
      }
    })

    // 計算每個產品的庫存（從 Inventory 表匯總）
    const productsWithStock = products.map(product => {
      const variantsWithStock = product.variants.map(v => {
        const totalStock = v.inventory.reduce((sum, inv) => sum + inv.quantity, 0)
        const availableStock = v.inventory.reduce((sum, inv) => sum + inv.available, 0)
        const reservedStock = v.inventory.reduce((sum, inv) => sum + inv.reserved, 0)

        return {
          ...v,
          total_stock: totalStock,
          available_stock: availableStock,
          reserved_stock: reservedStock
        }
      })

      const productTotalStock = variantsWithStock.reduce((sum, v) => sum + v.total_stock, 0)
      const productAvailableStock = variantsWithStock.reduce((sum, v) => sum + v.available_stock, 0)

      return {
        ...product,
        variants: variantsWithStock,
        total_stock: productTotalStock,
        available_stock: productAvailableStock,
        has_stock: productAvailableStock > 0
      }
    })

    // 🎯 智能排序：越匹配的越前面
    const scoredProducts = productsWithStock.map(product => {
      let score = 0

      if (!isShowAll && query.trim()) {
        const searchTerms = query.trim().toLowerCase().split(/\s+/)
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
      }

      return { ...product, searchScore: score }
    })

    // 按分數排序（顯示全部時按名稱排序）
    const sortedProducts = isShowAll
      ? scoredProducts.sort((a, b) => a.name.localeCompare(b.name))
      : scoredProducts.sort((a, b) => b.searchScore - a.searchScore)

    // 🏷️ 加入搜尋結果標籤
    const enhancedResults = sortedProducts.map(product => {
      const matchedTerms = isShowAll || !query.trim()
        ? []
        : query.trim().toLowerCase().split(/\s+/).filter(term =>
            product.name.toLowerCase().includes(term) ||
            product.product_code.toLowerCase().includes(term)
          )

      return {
        id: product.id,
        name: product.name,
        product_code: product.product_code,
        category: product.category,
        supplier: product.supplier,
        standard_price: product.standard_price,
        current_price: product.current_price,
        variants: product.variants,
        variant_count: product._count.variants,
        total_stock: product.total_stock,
        available_stock: product.available_stock,
        has_stock: product.has_stock,
        // 🔍 搜尋匹配資訊
        match_info: {
          score: product.searchScore,
          matched_terms: matchedTerms
        }
      }
    })

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
