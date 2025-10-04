/**
 * 📦 Inventory Helper Functions
 *
 * 這個模組提供庫存匯總工具函數，用於從 Inventory 表計算庫存數據。
 *
 * **背景**：
 * - 舊架構：庫存數據存在 ProductVariant.stock_quantity 等欄位
 * - 新架構：庫存數據統一存在 Inventory 表（支援多倉庫）
 * - 這些函數幫助從 Inventory 表匯總計算，確保數據正確
 *
 * @module inventory-helpers
 * @since 2025-10-04 (Issue #1: 雙庫存系統統一)
 */

import { PrismaClient } from '@prisma/client'

/**
 * Prisma 事務類型定義
 *
 * 排除不可在事務中使用的方法
 */
type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * 變體庫存匯總結果
 */
export interface VariantInventorySummary {
  /** 總庫存數量（所有倉庫） */
  total_quantity: number
  /** 可用庫存（所有倉庫） */
  available: number
  /** 已預留庫存（所有倉庫） */
  reserved: number
  /** 各倉庫庫存明細 */
  by_warehouse: {
    /** 公司倉庫存（投資項目） */
    COMPANY: number
    /** 個人倉庫存（個人調貨） */
    PRIVATE: number
  }
}

/**
 * 獲取單一變體的庫存匯總（跨所有倉庫）
 *
 * **使用場景**：
 * - 顯示變體的總庫存數量
 * - 檢查庫存是否足夠（扣款前驗證）
 * - 生成庫存報表
 *
 * **範例**：
 * ```typescript
 * const summary = await getVariantInventorySummary(tx, 'variant_id')
 * console.log(`總庫存: ${summary.total_quantity}`)
 * console.log(`可用: ${summary.available}, 已預留: ${summary.reserved}`)
 * console.log(`公司倉: ${summary.by_warehouse.COMPANY}`)
 * ```
 *
 * @param tx - Prisma 事務對象（確保數據一致性）
 * @param variantId - 商品變體 ID
 * @returns 庫存匯總結果
 */
export async function getVariantInventorySummary(
  tx: PrismaTransaction,
  variantId: string
): Promise<VariantInventorySummary> {
  const inventories = await tx.inventory.findMany({
    where: { variant_id: variantId }
  })

  return {
    total_quantity: inventories.reduce((sum, inv) => sum + inv.quantity, 0),
    available: inventories.reduce((sum, inv) => sum + inv.available, 0),
    reserved: inventories.reduce((sum, inv) => sum + inv.reserved, 0),
    by_warehouse: {
      COMPANY: inventories
        .filter(inv => inv.warehouse === 'COMPANY')
        .reduce((sum, inv) => sum + inv.quantity, 0),
      PRIVATE: inventories
        .filter(inv => inv.warehouse === 'PRIVATE')
        .reduce((sum, inv) => sum + inv.quantity, 0)
    }
  }
}

/**
 * 產品庫存匯總結果
 */
export interface ProductInventorySummary {
  /** 總庫存數量（所有變體、所有倉庫） */
  total_quantity: number
  /** 可用庫存（所有變體、所有倉庫） */
  available: number
  /** 已預留庫存（所有變體、所有倉庫） */
  reserved: number
  /** 變體數量 */
  variant_count: number
}

/**
 * 獲取單一產品的庫存匯總（跨所有變體和倉庫）
 *
 * **使用場景**：
 * - 顯示產品的總庫存數量（包含所有變體）
 * - 產品列表頁面的庫存顯示
 * - Dashboard 的庫存統計
 *
 * **注意事項**：
 * - 此函數會匯總產品下所有變體的庫存
 * - 如果產品有多個變體（如一般版、盒損版），會全部加總
 * - 建議在需要總覽時使用，詳細資訊應查詢個別變體
 *
 * **範例**：
 * ```typescript
 * const summary = await getProductInventorySummary(tx, 'product_id')
 * console.log(`產品總庫存: ${summary.total_quantity}`)
 * console.log(`共 ${summary.variant_count} 個變體`)
 * ```
 *
 * @param tx - Prisma 事務對象（確保數據一致性）
 * @param productId - 產品 ID
 * @returns 產品庫存匯總結果
 */
export async function getProductInventorySummary(
  tx: PrismaTransaction,
  productId: string
): Promise<ProductInventorySummary> {
  const variants = await tx.productVariant.findMany({
    where: { product_id: productId },
    include: { inventory: true }
  })

  const allInventories = variants.flatMap(v => v.inventory)

  return {
    total_quantity: allInventories.reduce((sum, inv) => sum + inv.quantity, 0),
    available: allInventories.reduce((sum, inv) => sum + inv.available, 0),
    reserved: allInventories.reduce((sum, inv) => sum + inv.reserved, 0),
    variant_count: variants.length
  }
}
