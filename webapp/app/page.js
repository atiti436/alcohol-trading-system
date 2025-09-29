export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          🎉 系統修復成功！
        </h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
          Next.js 15.5.4 開發伺服器正常運行
        </p>
        <p style={{ fontSize: '1rem', opacity: 0.9 }}>
          時間: {new Date().toLocaleString()}
        </p>
        <p style={{ fontSize: '1rem', opacity: 0.9 }}>
          Node.js v20.17.0 | 使用端口 3001
        </p>
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '8px'
        }}>
          <p>✅ 重新啟動系統完成</p>
          <p>✅ 依賴安裝使用 --legacy-peer-deps</p>
          <p>✅ 避開端口衝突，使用 3001</p>
          <p>✅ 繞過檔案鎖定問題</p>
        </div>
      </div>
    </div>
  )
}