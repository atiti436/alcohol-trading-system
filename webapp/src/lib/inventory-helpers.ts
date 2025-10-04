import { PrismaClient } from '@prisma/client'

type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Aggregate inventory totals for a single variant across all warehouses.
 */
export async function getVariantInventorySummary(
  tx: PrismaTransaction,
  variantId: string
) {
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
 * Aggregate inventory totals for a product by summing all of its variants.
 */
export async function getProductInventorySummary(
  tx: PrismaTransaction,
  productId: string
) {
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
