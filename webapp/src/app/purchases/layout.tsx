import DashboardLayout from '@/components/layout/DashboardLayout'

export default function PurchasesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}