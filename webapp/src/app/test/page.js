export default function TestPage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🎉 測試成功！</h1>
      <p>Next.js 開發伺服器正常運行</p>
      <p>時間: {new Date().toLocaleString()}</p>
      <p>Node.js 版本: v20.17.0</p>
      <p>狀態: 依賴安裝完成，伺服器運行中</p>
    </div>
  )
}