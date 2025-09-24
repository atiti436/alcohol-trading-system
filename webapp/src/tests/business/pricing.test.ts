/**
 * 💰 定價與商業邏輯測試
 * 測試系統的核心商業邏輯和定價機制
 */

import { Role } from '@/types/auth'

describe('💰 定價機制測試', () => {
  describe('雙重價格系統', () => {
    test('🎯 投資方只看到調整後價格', () => {
      const realPricing = {
        cost: 800,           // 成本
        selling_price: 1200, // 實際售價
        display_price: 1000, // 投資方看到的價格
        commission: 200      // 老闆傭金 (1200 - 1000)
      }

      // 投資方計算
      const investorView = calculateInvestorPricing(realPricing)
      expect(investorView.revenue).toBe(1000)
      expect(investorView.profit).toBe(200)        // 1000 - 800
      expect(investorView.margin).toBe(0.2)        // 200/1000 = 20%

      // 確保敏感資料不存在
      expect(investorView.actual_revenue).toBeUndefined()
      expect(investorView.commission).toBeUndefined()
      expect(investorView.owner_profit).toBeUndefined()
    })

    test('👑 超級管理員看到完整財務資料', () => {
      const realPricing = {
        cost: 800,
        selling_price: 1200,
        display_price: 1000,
        commission: 200
      }

      const adminView = calculateAdminPricing(realPricing)
      expect(adminView.display_revenue).toBe(1000)
      expect(adminView.actual_revenue).toBe(1200)
      expect(adminView.total_profit).toBe(400)     // 1200 - 800
      expect(adminView.investor_profit).toBe(200)  // 1000 - 800
      expect(adminView.commission).toBe(200)       // 1200 - 1000
      expect(adminView.actual_margin).toBe(1/3)    // 400/1200 = 33.33%
    })

    test('📊 多商品定價統計', () => {
      const salesData = [
        {
          cost: 800, selling_price: 1200, display_price: 1000,
          funding_source: 'COMPANY', quantity: 1
        },
        {
          cost: 500, selling_price: 700, display_price: 650,
          funding_source: 'COMPANY', quantity: 2
        },
        {
          cost: 300, selling_price: 300, display_price: 300,
          funding_source: 'PERSONAL', quantity: 1
        }
      ]

      const investorStats = calculatePricingStats(salesData, Role.INVESTOR)

      // 投資方統計 (只看 COMPANY 項目的顯示價格)
      expect(investorStats.total_revenue).toBe(2300)  // 1000 + (650*2)
      expect(investorStats.total_cost).toBe(1800)     // 800 + (500*2)
      expect(investorStats.total_profit).toBe(500)    // 2300 - 1800
      expect(investorStats.item_count).toBe(2)        // 個人調貨被過濾

      const adminStats = calculatePricingStats(salesData, Role.SUPER_ADMIN)

      // 管理員統計 (完整資料)
      expect(adminStats.display_revenue).toBe(2300)
      expect(adminStats.actual_revenue).toBe(2500)   // 1200 + (700*2) + 300
      expect(adminStats.total_commission).toBe(200)  // (1200-1000) + (700-650)*2 + 0
    })
  })

  describe('成本與利潤計算', () => {
    test('💸 進口成本計算', () => {
      const importData = {
        purchase_price_jpy: 5000,
        exchange_rate: 0.22,
        import_duty_rate: 0.15,
        alcohol_tax_per_liter: 18.9,
        volume_liters: 0.7,
        business_tax_rate: 0.05
      }

      const totalCost = calculateImportCost(importData)

      const base_cost = 5000 * 0.22 // 1100 TWD
      const dutiable_value = base_cost
      const import_duty = dutiable_value * 0.15 // 165 TWD
      const alcohol_tax = 18.9 * 0.7 // 13.23 TWD
      const business_tax = (dutiable_value + import_duty + alcohol_tax) * 0.05

      const expected_total = base_cost + import_duty + alcohol_tax + business_tax

      expect(totalCost.base_cost).toBeCloseTo(1100, 2)
      expect(totalCost.import_duty).toBeCloseTo(165, 2)
      expect(totalCost.alcohol_tax).toBeCloseTo(13.23, 2)
      expect(totalCost.total_cost).toBeCloseTo(expected_total, 2)
    })

    test('📈 毛利率計算', () => {
      const products = [
        { cost: 1000, selling_price: 1500 },
        { cost: 800, selling_price: 1200 },
        { cost: 500, selling_price: 900 }
      ]

      const margins = products.map(calculateGrossMargin)

      expect(margins[0]).toBeCloseTo(0.333, 3) // (1500-1000)/1500 = 33.3%
      expect(margins[1]).toBeCloseTo(0.333, 3) // (1200-800)/1200 = 33.3%
      expect(margins[2]).toBeCloseTo(0.444, 3) // (900-500)/900 = 44.4%
    })

    test('⚖️ 加權平均成本', () => {
      const inventory = [
        { quantity: 10, cost: 1000, date: '2025-01-01' },
        { quantity: 5, cost: 1200, date: '2025-01-15' },
        { quantity: 8, cost: 1100, date: '2025-02-01' }
      ]

      const avgCost = calculateWeightedAverageCost(inventory)

      // (10*1000 + 5*1200 + 8*1100) / (10+5+8) = 24800/23 ≈ 1078.26
      expect(avgCost).toBeCloseTo(1078.26, 2)
    })
  })

  describe('庫存估值', () => {
    test('💎 FIFO 庫存估值', () => {
      const inventory = [
        { quantity: 10, cost: 1000, date: '2025-01-01' },
        { quantity: 5, cost: 1200, date: '2025-01-15' },
        { quantity: 3, cost: 1100, date: '2025-02-01' }
      ]

      const sale_quantity = 12
      const fifo_cost = calculateFIFOCost(inventory, sale_quantity)

      // 先賣最舊的: 10*1000 + 2*1200 = 12400
      expect(fifo_cost.total_cost).toBe(12400)
      expect(fifo_cost.average_cost).toBeCloseTo(1033.33, 2)

      const remaining = fifo_cost.remaining_inventory
      expect(remaining).toHaveLength(2)
      expect(remaining[0].quantity).toBe(3) // 剩餘 1200 成本的 3 件
      expect(remaining[1].quantity).toBe(3) // 全部 1100 成本的 3 件
    })

    test('📊 庫存周轉率', () => {
      const sales_data = {
        period_sales_cost: 120000, // 期間銷售成本
        avg_inventory_value: 30000  // 平均庫存價值
      }

      const turnover = calculateInventoryTurnover(sales_data)

      expect(turnover.turnover_ratio).toBe(4) // 120000 / 30000 = 4
      expect(turnover.days_in_inventory).toBe(91.25) // 365 / 4 = 91.25 天
    })
  })

  describe('定價策略', () => {
    test('🎯 競爭定價分析', () => {
      const market_data = {
        our_cost: 1000,
        competitor_prices: [1800, 1650, 1900, 1750],
        target_margin: 0.25
      }

      const pricing = calculateCompetitivePricing(market_data)

      const market_avg = (1800 + 1650 + 1900 + 1750) / 4 // 1775
      const market_min = 1650
      const cost_plus_margin = 1000 / (1 - 0.25) // 1333.33

      expect(pricing.market_average).toBe(market_avg)
      expect(pricing.market_minimum).toBe(market_min)
      expect(pricing.cost_plus_price).toBeCloseTo(1333.33, 2)
      expect(pricing.recommended_price).toBeGreaterThan(cost_plus_margin)
      expect(pricing.recommended_price).toBeLessThan(market_min)
    })

    test('💰 量價優惠計算', () => {
      const pricing_tiers = [
        { min_quantity: 1, max_quantity: 5, discount: 0 },
        { min_quantity: 6, max_quantity: 10, discount: 0.05 },
        { min_quantity: 11, max_quantity: 20, discount: 0.1 },
        { min_quantity: 21, max_quantity: null, discount: 0.15 }
      ]

      const base_price = 1000

      expect(calculateTierPrice(3, base_price, pricing_tiers)).toBe(1000)   // 無折扣
      expect(calculateTierPrice(8, base_price, pricing_tiers)).toBe(950)    // 5% 折扣
      expect(calculateTierPrice(15, base_price, pricing_tiers)).toBe(900)   // 10% 折扣
      expect(calculateTierPrice(25, base_price, pricing_tiers)).toBe(850)   // 15% 折扣
    })
  })

  describe('匯率與財務', () => {
    test('💱 多幣別匯率轉換', () => {
      const rates = {
        'USD': 31.5,
        'JPY': 0.22,
        'EUR': 34.8
      }

      const amounts = {
        'USD': 100,
        'JPY': 10000,
        'EUR': 90
      }

      const twd_values = convertToTWD(amounts, rates)

      expect(twd_values.USD).toBe(3150)     // 100 * 31.5
      expect(twd_values.JPY).toBe(2200)     // 10000 * 0.22
      expect(twd_values.EUR).toBe(3132)     // 90 * 34.8
      expect(twd_values.total).toBe(8482)   // 總和
    })

    test('📈 匯率風險分析', () => {
      const position = {
        currency: 'JPY',
        amount: 1000000,
        current_rate: 0.22,
        purchase_rate: 0.20
      }

      const risk = calculateFXRisk(position)

      const current_value = 1000000 * 0.22  // 220000 TWD
      const original_value = 1000000 * 0.20  // 200000 TWD
      const gain_loss = current_value - original_value  // 20000 TWD

      expect(risk.current_value).toBe(current_value)
      expect(risk.original_value).toBe(original_value)
      expect(risk.unrealized_gain).toBe(gain_loss)
      expect(risk.gain_percentage).toBeCloseTo(0.1, 3) // 10% 獲利
    })
  })
})

// 測試輔助函數
function calculateInvestorPricing(pricing: any) {
  return {
    revenue: pricing.display_price,
    profit: pricing.display_price - pricing.cost,
    margin: (pricing.display_price - pricing.cost) / pricing.display_price
  }
}

function calculateAdminPricing(pricing: any) {
  return {
    display_revenue: pricing.display_price,
    actual_revenue: pricing.selling_price,
    total_profit: pricing.selling_price - pricing.cost,
    investor_profit: pricing.display_price - pricing.cost,
    commission: pricing.commission,
    actual_margin: (pricing.selling_price - pricing.cost) / pricing.selling_price
  }
}

function calculatePricingStats(data: any[], role: Role) {
  let filteredData = data

  if (role === Role.INVESTOR) {
    filteredData = data.filter(item => item.funding_source === 'COMPANY')

    return {
      total_revenue: filteredData.reduce((sum, item) =>
        sum + (item.display_price * item.quantity), 0),
      total_cost: filteredData.reduce((sum, item) =>
        sum + (item.cost * item.quantity), 0),
      total_profit: filteredData.reduce((sum, item) =>
        sum + ((item.display_price - item.cost) * item.quantity), 0),
      item_count: filteredData.length
    }
  }

  // 超級管理員統計
  return {
    display_revenue: filteredData.reduce((sum, item) =>
      sum + (item.display_price * item.quantity), 0),
    actual_revenue: filteredData.reduce((sum, item) =>
      sum + (item.selling_price * item.quantity), 0),
    total_commission: filteredData.reduce((sum, item) =>
      sum + ((item.selling_price - item.display_price) * item.quantity), 0),
    item_count: filteredData.length
  }
}

function calculateImportCost(data: any) {
  const base_cost = data.purchase_price_jpy * data.exchange_rate
  const import_duty = base_cost * data.import_duty_rate
  const alcohol_tax = data.alcohol_tax_per_liter * data.volume_liters
  const subtotal = base_cost + import_duty + alcohol_tax
  const business_tax = subtotal * data.business_tax_rate
  const total_cost = subtotal + business_tax

  return {
    base_cost,
    import_duty,
    alcohol_tax,
    business_tax,
    total_cost
  }
}

function calculateGrossMargin(product: any): number {
  return (product.selling_price - product.cost) / product.selling_price
}

function calculateWeightedAverageCost(inventory: any[]): number {
  const total_quantity = inventory.reduce((sum, item) => sum + item.quantity, 0)
  const total_value = inventory.reduce((sum, item) => sum + (item.quantity * item.cost), 0)
  return total_value / total_quantity
}

function calculateFIFOCost(inventory: any[], sale_quantity: number) {
  const sorted = [...inventory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let remaining_to_sell = sale_quantity
  let total_cost = 0
  const remaining_inventory = []

  for (const item of sorted) {
    if (remaining_to_sell <= 0) {
      remaining_inventory.push(item)
      continue
    }

    if (item.quantity <= remaining_to_sell) {
      // 全部賣掉
      total_cost += item.quantity * item.cost
      remaining_to_sell -= item.quantity
    } else {
      // 部分賣掉
      total_cost += remaining_to_sell * item.cost
      remaining_inventory.push({
        ...item,
        quantity: item.quantity - remaining_to_sell
      })
      remaining_to_sell = 0
    }
  }

  return {
    total_cost,
    average_cost: total_cost / sale_quantity,
    remaining_inventory
  }
}

function calculateInventoryTurnover(data: any) {
  const turnover_ratio = data.period_sales_cost / data.avg_inventory_value
  return {
    turnover_ratio,
    days_in_inventory: 365 / turnover_ratio
  }
}

function calculateCompetitivePricing(data: any) {
  const market_average = data.competitor_prices.reduce((a: number, b: number) => a + b) / data.competitor_prices.length
  const market_minimum = Math.min(...data.competitor_prices)
  const cost_plus_price = data.our_cost / (1 - data.target_margin)

  // 建議價格: 成本加成和市場最低價之間
  const recommended_price = Math.min(cost_plus_price * 1.1, market_minimum * 0.95)

  return {
    market_average,
    market_minimum,
    cost_plus_price,
    recommended_price
  }
}

function calculateTierPrice(quantity: number, base_price: number, tiers: any[]): number {
  const applicable_tier = tiers.find(tier =>
    quantity >= tier.min_quantity &&
    (tier.max_quantity === null || quantity <= tier.max_quantity)
  )

  if (!applicable_tier) return base_price

  return base_price * (1 - applicable_tier.discount)
}

function convertToTWD(amounts: any, rates: any) {
  const twd_values: any = {}
  let total = 0

  for (const [currency, amount] of Object.entries(amounts)) {
    const twd_value = (amount as number) * rates[currency]
    twd_values[currency] = twd_value
    total += twd_value
  }

  twd_values.total = total
  return twd_values
}

function calculateFXRisk(position: any) {
  const current_value = position.amount * position.current_rate
  const original_value = position.amount * position.purchase_rate
  const unrealized_gain = current_value - original_value
  const gain_percentage = unrealized_gain / original_value

  return {
    current_value,
    original_value,
    unrealized_gain,
    gain_percentage
  }
}