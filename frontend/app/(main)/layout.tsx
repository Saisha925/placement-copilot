import { Navbar } from '@/components/shared/Navbar'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 container max-w-[1600px] mx-auto p-6 overflow-x-hidden pt-8">
        {children}
      </main>
    </div>
  )
}