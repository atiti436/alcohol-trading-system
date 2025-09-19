#!/usr/bin/env node
/**
 * 欄位命名一致性檢查工具
 * 防止Claude螞蟻們再犯同樣錯誤！
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 根據 DATA_MODELS.md 定義的正確欄位名稱 (snake_case)
const CORRECT_FIELDS = [
  'is_active',
  'investor_id',
  'customer_id',
  'product_id',
  'variant_code',
  'hs_code',
  'standard_price',
  'current_price',
  'cost_price',
  'min_price',
  'total_amount',
  'actual_amount',
  'unit_price',
  'actual_unit_price',
  'total_price',
  'actual_total_price',
  'created_at',
  'updated_at'
];

// 常見錯誤的 camelCase 寫法
const WRONG_FIELDS = [
  'isActive',
  'investorId',
  'customerId',
  'productId',
  'variantCode',
  'hsCode',
  'standardPrice',
  'currentPrice',
  'costPrice',
  'minPrice',
  'totalAmount',
  'actualAmount',
  'unitPrice',
  'actualUnitPrice',
  'totalPrice',
  'actualTotalPrice',
  'createdAt',
  'updatedAt'
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