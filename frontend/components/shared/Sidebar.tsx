'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  BrainCircuit,
  Code2,
  MessageSquare,
  LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/resume', label: 'Resume Analyzer', icon: FileText },
  { href: '/skill-gap', label: 'Skill Gap', icon: BrainCircuit },
  { href: '/dsa', label: 'DSA Mentor', icon: Code2 },
  { href: '/interview', label: 'Mock Interview', icon: MessageSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col h-full w-64 bg-card border-r px-4 py-6">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold text-primary">Placement Copilot</h1>
        <p className="text-xs text-muted-foreground mt-1">AI Career Assistant</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </div>
  )
}