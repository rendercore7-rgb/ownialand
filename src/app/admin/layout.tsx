'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/ui/sidebar'

const navItems = [
  { label: '대시보드', href: '/admin', icon: '◈' },
  { label: '지급 관리', href: '/admin/payments', icon: '▤' },
  { label: '투자 관리', href: '/admin/investments', icon: '▦' },
  { label: '회원 관리', href: '/admin/members', icon: '◉' },
  { label: 'LAND 관리', href: '/admin/lands', icon: '◩' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.replace('/')
        return
      }

      setAuthorized(true)
    }
    checkAdmin()
  }, [router])

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <p className="text-[var(--color-text-muted)]">권한 확인 중...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar title="Admin Console" items={navItems} />
      <main className="flex-1 ml-60 p-6">{children}</main>
    </div>
  )
}
