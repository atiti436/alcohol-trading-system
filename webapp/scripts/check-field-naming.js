#!/usr/bin/env node
/**
 * 欄位命名一致性檢查工具
 * 防止Claude螞蟻們再犯同樣錯誤！
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 根據 DATA_MODELS.md 定義的正確欄位名稱
// 注意：Schema中有兩套標準混用
const CORRECT_FIELDS = [
  'is_active',      // 新標準 (有@@map)
  'investor_id',    // 新標準
  'customer_id',    // 新標準
  'product_id',     // 新標準 (除了SaleItem等舊模型)
  'variant_code',   // 新標準
  'hs_code',        // 新標準
  'standard_price', // 新標準
  'current_price',  // 新標準
  'cost_price',     // 新標準
  'min_price',      // 新標準
  'total_amount',   // 新標準
  'actual_amount',  // 新標準
  'unit_price',     // 新標準 (除了SaleItem等舊模型)
  'actual_unit_price', // 新標準 (除了SaleItem等舊模型)
  'total_price',    // 新標準 (除了SaleItem等舊模型)
  'actual_total_price', // 新標準 (除了SaleItem等舊模型)
  'created_at',     // 新標準
  'updated_at'      // 新標準
];

// 常見錯誤的 camelCase 寫法 (僅在新標準模型中是錯誤)
const WRONG_FIELDS = [
  'isActive',
  'investorId',
  'customerId',
  'productId',      // 注意：在SaleItem等舊模型中是正確的
  'variantCode',
  'hsCode',
  'standardPrice',
  'currentPrice',
  'costPrice',
  'minPrice',
  'totalAmount',
  'actualAmount',
  'unitPrice',      // 注意：在SaleItem等舊模型中是正確的
  'actualUnitPrice', // 注意：在SaleItem等舊模型中是正確的
  'totalPrice',     // 注意：在SaleItem等舊模型中是正確的
  'actualTotalPrice', // 注意：在SaleItem等舊模型中是正確的
  'createdAt',
  'updatedAt'
];

// 舊標準模型檔案 (這些檔案中某些camelCase是正確的)
const LEGACY_MODEL_FILES = [
  'SaleItem',
  'PurchaseItem',
  'AuditLog',
  'AccountingEntry',
  'JournalEntry'
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];

  // 跳過檢查工具本身
  if (filePath.includes('check-field-naming.js')) {
    return errors;
  }

  WRONG_FIELDS.forEach(wrongField => {
    const regex = new RegExp(`\\b${wrongField}\\b`, 'g');
    const matches = content.match(regex);
    if (matches) {
      const correctField = CORRECT_FIELDS[WRONG_FIELDS.indexOf(wrongField)];
      errors.push({
        file: filePath,
        wrong: wrongField,
        correct: correctField,
        count: matches.length
      });
    }
  });

  return errors;
}

function scanDirectory(dir, extensions = ['.ts', '.js', '.tsx', '.jsx']) {
  let errors = [];

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      errors = errors.concat(scanDirectory(fullPath, extensions));
    } else if (extensions.some(ext => file.endsWith(ext))) {
      errors = errors.concat(checkFile(fullPath));
    }
  }

  return errors;
}

function main() {
  console.log('🔍 檢查欄位命名一致性...');
  console.log('📋 參考：DATA_MODELS.md (單一事實來源)');
  console.log('');

  const webappDir = path.join(__dirname, '..');
  const errors = scanDirectory(webappDir);

  if (errors.length === 0) {
    console.log('✅ 所有欄位命名都符合規範！');
    process.exit(0);
  } else {
    console.log('❌ 發現欄位命名錯誤：');
    console.log('');

    errors.forEach(error => {
      console.log(`📁 ${error.file}`);
      console.log(`   ❌ ${error.wrong} (出現 ${error.count} 次)`);
      console.log(`   ✅ 應該改為: ${error.correct}`);
      console.log('');
    });

    console.log('🚨 請修復這些錯誤後再繼續！');
    console.log('💡 提示：使用以下命令批量替換：');
    errors.forEach(error => {
      console.log(`   sed -i 's/${error.wrong}/${error.correct}/g' ${error.file}`);
    });

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkFile, scanDirectory, CORRECT_FIELDS, WRONG_FIELDS };