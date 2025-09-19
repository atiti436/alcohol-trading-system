#!/usr/bin/env node
/**
 * 批量修復所有欄位命名問題
 * 救命用的緊急腳本！
 */

const fs = require('fs');
const path = require('path');
const { CORRECT_FIELDS, WRONG_FIELDS } = require('./check-field-naming');

function fixFile(filePath) {
  // 跳過檢查工具本身
  if (filePath.includes('check-field-naming.js') || filePath.includes('fix-all-fields.js')) {
    return { fixed: false, changes: 0 };
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  WRONG_FIELDS.forEach((wrongField, index) => {
    const correctField = CORRECT_FIELDS[index];
    const regex = new RegExp(`\\b${wrongField}\\b`, 'g');
    const matches = content.match(regex);

    if (matches) {
      content = content.replace(regex, correctField);
      changes += matches.length;
    }
  });

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    return { fixed: true, changes };
  }

  return { fixed: false, changes: 0 };
}

function fixDirectory(dir, extensions = ['.ts', '.js', '.tsx', '.jsx']) {
  let totalFixed = 0;
  let totalChanges = 0;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      const result = fixDirectory(fullPath, extensions);
      totalFixed += result.totalFixed;
      totalChanges += result.totalChanges;
    } else if (extensions.some(ext => file.endsWith(ext))) {
      const result = fixFile(fullPath);
      if (result.fixed) {
        console.log(`✅ 修復 ${fullPath} (${result.changes} 個欄位)`);
        totalFixed++;
        totalChanges += result.changes;
      }
    }
  }

  return { totalFixed, totalChanges };
}

function main() {
  console.log('🚑 緊急批量修復所有欄位命名問題...');
  console.log('📋 參考：DATA_MODELS.md (單一事實來源)');
  console.log('');

  const webappDir = path.join(__dirname, '..');
  const result = fixDirectory(webappDir);

  console.log('');
  console.log(`🎉 修復完成！`);
  console.log(`📁 修復檔案數: ${result.totalFixed}`);
  console.log(`🔧 修復欄位數: ${result.totalChanges}`);

  if (result.totalFixed > 0) {
    console.log('');
    console.log('🔍 驗證修復結果...');
    require('./check-field-naming');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, fixDirectory };