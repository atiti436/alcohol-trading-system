// 在瀏覽器開發者工具中執行這段代碼來創建測試變體

async function createTestVariants() {
  try {
    console.log('🎯 開始創建測試變體...');

    // 山崎18年的變體
    const yamazakiVariants = [
      {
        product_id: 'W001', // 需要替換為實際的產品ID
        variant_code: 'W001-A',
        sku: 'W001-A-700-43',
        variant_type: 'A',
        description: '普通版',
        base_price: 21000,
        current_price: 21000,
        cost_price: 15000,
        stock_quantity: 10,
        reserved_stock: 0,
        available_stock: 10,
        condition: '原裝無盒，瓶身完整'
      },
      {
        product_id: 'W001',
        variant_code: 'W001-B',
        sku: 'W001-B-700-43',
        variant_type: 'B',
        description: '禮盒版',
        base_price: 23000,
        current_price: 23000,
        cost_price: 16500,
        stock_quantity: 5,
        reserved_stock: 0,
        available_stock: 5,
        condition: '附原廠禮盒，含證書'
      },
      {
        product_id: 'W001',
        variant_code: 'W001-C',
        sku: 'W001-C-700-43',
        variant_type: 'C',
        description: '收藏版',
        base_price: 25000,
        current_price: 25000,
        cost_price: 18000,
        stock_quantity: 3,
        reserved_stock: 0,
        available_stock: 3,
        condition: '限量收藏盒，編號證書'
      },
      {
        product_id: 'W001',
        variant_code: 'W001-X',
        sku: 'W001-X-700-43',
        variant_type: 'X',
        description: '損傷品',
        base_price: 18000,
        current_price: 18000,
        cost_price: 15000,
        stock_quantity: 2,
        reserved_stock: 0,
        available_stock: 2,
        condition: '外盒破損，酒體完好'
      }
    ];

    console.log('📦 準備創建山崎18年變體:', yamazakiVariants);

    // 這裡需要你手動在 Prisma Studio 中創建
    // 或者我們可以建立一個 API 端點來創建

    console.log('✅ 變體資料準備完成');
    console.log('📋 請在 Prisma Studio 中手動創建這些變體');

    return yamazakiVariants;

  } catch (error) {
    console.error('❌ 創建變體失敗:', error);
  }
}

// 執行函數
createTestVariants();