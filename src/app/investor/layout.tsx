'use client'

import { Sidebar } from '@/components/ui/sidebar'

const navItems = [
  { label: '대시보드', href: '/investor', icon: '◈' },
  { label: '내 투자', href: '/investor/investments', icon: '▦' },
  { label: '지급 캘린더', href: '/investor/calendar', icon: '◫' },
  { label: 'LAND 구매', href: '/investor/land', icon: '◩' },
]

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar title="Investor Portal" items={navItems} />
      <main className="flex-1 ml-60 p-6">{children}</main>
    </div>
  )
}
