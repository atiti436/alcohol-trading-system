/**
 * 檢查 NextAuth 配置和環境變數
 */

console.log('=== NextAuth 環境變數檢查 ===\n')

const requiredEnvVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DATABASE_URL'
]

let hasError = false

requiredEnvVars.forEach(key => {
  const value = process.env[key]
  if (value) {
    if (key === 'NEXTAUTH_SECRET' || key === 'GOOGLE_CLIENT_SECRET' || key === 'DATABASE_URL') {
      console.log(`✅ ${key}: ${value.substring(0, 10)}...`)
    } else {
      console.log(`✅ ${key}: ${value}`)
    }
  } else {
    console.log(`❌ ${key}: 未設定`)
    hasError = true
  }
})

console.log('\n=== 結論 ===')
if (hasError) {
  console.log('❌ 有環境變數未設定，NextAuth 可能無法正常運作')
} else {
  console.log('✅ 所有必要的環境變數都已設定')
}

console.log('\n=== 建議 ===')
console.log('1. 如果是在 Zeabur 上，請檢查後台的環境變數設定')
console.log('2. 如果是本地開發，請檢查 .env 檔案')
console.log('3. 確認 NEXTAUTH_URL 是否正確指向您的網域')