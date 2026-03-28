'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: string
}

interface SidebarProps {
  title: string
  items: NavItem[]
}

export function Sidebar({ title, items }: SidebarProps) {
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <aside className="fixed left-0 top-0 h-dvh w-60 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col z-30">
      {/* Logo */}
      <div className="p-5 border-b border-[var(--color-border)]">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-bold text-white tracking-tight">
          OWNIA LAND
        </h1>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{title}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                isActive
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-white'
              )}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-[var(--color-border)]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <span className="text-base">↩</span>
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  )
}
