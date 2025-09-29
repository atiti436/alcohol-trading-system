import type { PrismaClient } from '@prisma/client'
import { DEFAULT_VARIANT_TYPE_LABEL } from '../../../shared/utils/constants'

export const MAX_VARIANT_TYPE_LENGTH = 100
export const DEFAULT_VARIANT_TYPE = DEFAULT_VARIANT_TYPE_LABEL
const FALLBACK_CODE_PREFIX = 'VAR'
const MAX_CODE_SEGMENT_LENGTH = 30

export function normalizeVariantType(raw: unknown): string {
  if (typeof raw !== 'string') {
    return ''
  }

  const normalized = raw.trim()
  if (!normalized) {
    return ''
  }

  if (normalized.length > MAX_VARIANT_TYPE_LENGTH) {
    throw new Error(`變體類型長度不可超過 ${MAX_VARIANT_TYPE_LENGTH} 字`)
  }

  return normalized
}

function sanitizeVariantCodeSegment(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized.slice(0, MAX_CODE_SEGMENT_LENGTH)
}

export async function generateVariantCode(
  prisma: PrismaClient,
  productId: string,
  productCode: string,
  variantType: string
): Promise<string> {
  const baseSegment =
    sanitizeVariantCodeSegment(variantType) ||
    `${FALLBACK_CODE_PREFIX}-${Date.now().toString(36).toUpperCase()}`

  let candidate = `${productCode}-${baseSegment}`
  let suffix = 1

  const existingCodes = new Set(
    (
      await prisma.productVariant.findMany({
        where: { product_id: productId },
        select: { variant_code: true }
      })
    ).map(variant => variant.variant_code)
  )

  while (existingCodes.has(candidate)) {
    suffix += 1
    candidate = `${productCode}-${baseSegment}-${suffix}`
  }

  return candidate
}
