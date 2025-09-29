export default function TestPage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🎉 測試成功！</h1>
      <p>Next.js 開發伺服器正常運行</p>
      <p>時間: {new Date().toLocaleString()}</p>
    </div>
  )
}