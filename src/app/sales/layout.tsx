'use client'

import { Sidebar } from '@/components/ui/sidebar'

const navItems = [
  { label: '대시보드', href: '/sales', icon: '◈' },
  { label: '리더보드', href: '/sales/leaderboard', icon: '▥' },
  { label: '영업 일지', href: '/sales/journal', icon: '▤' },
  { label: '수수료 계산', href: '/sales/commission', icon: '◫' },
  { label: 'KPI', href: '/sales/kpi', icon: '▦' },
]

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar title="Sales Portal" items={navItems} />
      <main className="flex-1 ml-60 p-6">{children}</main>
    </div>
  )
}
