import { redirect } from 'next/navigation'

export default function FinanceIndexPage() {
  // 暫時導向收支記錄，避免 404 與混淆
  redirect('/finance/cashflow')
}

