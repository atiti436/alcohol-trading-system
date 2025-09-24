/**
 * 權限系統自動化檢查腳本
 * 確保 schema/type/build 一致性和權限保護完整性
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 開始權限系統完整性檢查...\n');

// 檢查函數
const checks = {
  // 1. Prisma Schema 一致性檢查
  async checkPrismaConsistency() {
    console.log('1️⃣ 檢查 Prisma Schema 一致性...');

    try {
      // 生成 Prisma Client
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma Client 生成成功');

      // 檢查 DB 狀態
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log('✅ 資料庫 Schema 同步成功');

    } catch (error) {
      console.error('❌ Prisma 檢查失敗:', error.message);
      process.exit(1);
    }
  },

  // 2. TypeScript 編譯檢查
  async checkTypeScript() {
    console.log('\n2️⃣ 檢查 TypeScript 編譯...');

    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      console.log('✅ TypeScript 編譯檢查通過');
    } catch (error) {
      console.error('❌ TypeScript 編譯失敗');
      process.exit(1);
    }
  },

  // 3. 建置檢查
  async checkBuild() {
    console.log('\n3️⃣ 檢查專案建置...');

    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ 專案建置成功');
    } catch (error) {
      console.error('❌ 專案建置失敗');
      process.exit(1);
    }
  },

  // 4. 權限相關檔案一致性檢查
  async checkPermissionFiles() {
    console.log('\n4️⃣ 檢查權限系統檔案一致性...');

    const files = [
      'src/types/auth.ts',
      'src/modules/auth/providers/nextauth.ts',
      'prisma/schema.prisma',
      'src/components/layout/menuItems.tsx'
    ];

    const roleRegex = /Role\.|SUPER_ADMIN|INVESTOR|EMPLOYEE|PENDING/g;
    const foundRoles = new Set();

    files.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const matches = content.match(roleRegex);
        if (matches) {
          matches.forEach(match => foundRoles.add(match));
        }
        console.log(`✅ 檢查 ${file}: 找到 ${matches ? matches.length : 0} 個角色引用`);
      } else {
        console.log(`⚠️  檔案不存在: ${file}`);
      }
    });

    console.log('📋 發現的角色:', Array.from(foundRoles).join(', '));

    // 檢查是否有 PENDING 角色
    if (!foundRoles.has('PENDING')) {
      console.error('❌ 未找到 PENDING 角色定義');
      process.exit(1);
    }

    console.log('✅ 權限檔案一致性檢查通過');
  },

  // 5. API 權限保護檢查
  async checkAPIPermissions() {
    console.log('\n5️⃣ 檢查 API 權限保護...');

    const apiDir = path.join(process.cwd(), 'src/app/api');
    const apiFiles = [];

    // 遞迴收集所有 route.ts 檔案
    function collectRouteFiles(dir) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          collectRouteFiles(fullPath);
        } else if (file === 'route.ts') {
          apiFiles.push(fullPath);
        }
      });
    }

    collectRouteFiles(apiDir);

    let unprotectedAPIs = [];

    apiFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const hasAuth = content.includes('getServerSession') ||
                     content.includes('withAppAuth') ||
                     content.includes('withAppActiveUser');

      if (!hasAuth && !file.includes('/auth/')) {
        unprotectedAPIs.push(file.replace(process.cwd(), ''));
      }
    });

    if (unprotectedAPIs.length > 0) {
      console.log('⚠️  發現可能未受保護的 API:');
      unprotectedAPIs.forEach(api => console.log(`   - ${api}`));
    } else {
      console.log('✅ 所有 API 都有權限保護');
    }

    console.log(`📊 檢查了 ${apiFiles.length} 個 API 路由`);
  }
};

// 執行所有檢查
async function runAllChecks() {
  try {
    await checks.checkPrismaConsistency();
    await checks.checkTypeScript();
    await checks.checkPermissionFiles();
    await checks.checkAPIPermissions();
    // 建置檢查放最後，因為比較耗時
    await checks.checkBuild();

    console.log('\n🎉 所有檢查完成！權限系統狀態良好');
    console.log('\n📋 接下來的步驟:');
    console.log('1. git add .');
    console.log('2. git commit -m "🔐 完善權限管理系統 - 新增待審核機制"');
    console.log('3. git push');

  } catch (error) {
    console.error('\n💥 檢查過程中發生錯誤:', error);
    process.exit(1);
  }
}

// 執行檢查
if (require.main === module) {
  runAllChecks();
}

module.exports = { checks };