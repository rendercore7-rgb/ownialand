'use client'

import { Sidebar } from '@/components/ui/sidebar'

const navItems = [
  { label: '대시보드', href: '/admin', icon: '◈' },
  { label: '지급 관리', href: '/admin/payments', icon: '▤' },
  { label: '투자 관리', href: '/admin/investments', icon: '▦' },
  { label: '회원 관리', href: '/admin/members', icon: '◉' },
  { label: 'LAND 관리', href: '/admin/lands', icon: '◩' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar title="Admin Console" items={navItems} />
      <main className="flex-1 ml-60 p-6">{children}</main>
    </div>
  )
}
