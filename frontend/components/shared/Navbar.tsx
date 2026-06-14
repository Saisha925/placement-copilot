'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  BrainCircuit,
  Code2,
  FolderGit2,
  MessageSquare,
  LogOut,
  Sparkles,
  Map,
  Server,
  GraduationCap,
  Settings
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/copilot', label: 'Copilot', icon: Sparkles },
  { href: '/career-plan', label: 'Plan & Gap', icon: Map },
  { href: '/resume', label: 'Resume', icon: FileText },
  { href: '/dsa', label: 'DSA', icon: Code2 },
  { href: '/system-design', label: 'Sys Design', icon: Server },
  { href: '/projects', label: 'Projects', icon: FolderGit2 },
  { href: '/interview', label: 'Interview', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-4 z-50 w-full px-4 sm:px-6">
      <div className="mx-auto max-w-[1600px] flex h-14 items-center px-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        
        <Link href="/dashboard" className="flex items-center space-x-3 mr-8 group">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/30 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300 group-hover:scale-105 group-hover:border-[#3b82f6]/50">
            <GraduationCap className="w-4 h-4 text-[#3b82f6]" />
            <Sparkles className="w-3 h-3 text-[#3b82f6] absolute -top-1 -right-1" />
          </div>
          <span className="font-semibold text-[17px] tracking-tight text-white hidden md:inline-block group-hover:text-white transition-colors">
            Placement Copilot
          </span>
        </Link>

        <div className="flex flex-1 items-center space-x-1 text-[13px] font-medium overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-white/10 text-white border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.05)]'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex items-center ml-4 pl-4 border-l border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline-block">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}
