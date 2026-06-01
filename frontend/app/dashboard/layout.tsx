import { Sidebar } from '@/components/shared/Sidebar'
import { Header } from '@/components/shared/Header'
import { MobileSidebar } from '@/components/shared/MobileSidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-14 border-b bg-card flex items-center justify-between px-4">
          <MobileSidebar />
          <div className="flex items-center ml-auto">
            <Header />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}