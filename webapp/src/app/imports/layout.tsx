import DashboardLayout from '@/components/layout/DashboardLayout'

export default function ImportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}

