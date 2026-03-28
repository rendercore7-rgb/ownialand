'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { formatKRW, formatUSD } from '@/lib/utils'
import type { Investment, PaymentRequest, LandTransaction, Profile } from '@/types'

export default function AdminDashboard() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [payments, setPayments] = useState<PaymentRequest[]>([])
  const [landTxs, setLandTxs] = useState<LandTransaction[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [invRes, payRes, landRes, memberRes] = await Promise.all([
        supabase.from('investments').select('*').order('created_at', { ascending: false }),
        supabase.from('payment_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('land_transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      ])

      if (invRes.data) setInvestments(invRes.data)
      if (payRes.data) setPayments(payRes.data)
      if (landRes.data) setLandTxs(landRes.data)
      if (memberRes.data) setMembers(memberRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0)
  const activeInvestments = investments.filter((inv) => inv.status === 'active' || inv.status === 'confirmed')
  const pendingPayments = payments.filter((p) => p.status === 'requested')
  const totalTransferred = payments
    .filter((p) => p.status === 'transferred')
    .reduce((sum, p) => sum + p.amount, 0)
  const pendingLandTxs = landTxs.filter((tx) => tx.status === 'pending')
  const totalLandSales = landTxs
    .filter((tx) => tx.status === 'approved')
    .reduce((sum, tx) => sum + tx.price, 0)
  const investorCount = members.filter((m) => m.role === 'investor').length
  const salesCount = members.filter((m) => m.role === 'sales').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="관리자 대시보드" description="전체 시스템 현황을 확인하세요" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="총 투자 금액" value={formatKRW(totalInvested)} sub={`${activeInvestments.length}건 활성`} />
        <StatCard label="총 송금 완료" value={formatKRW(totalTransferred)} accent />
        <StatCard label="대기 중 지급 요청" value={`${pendingPayments.length}건`} sub={pendingPayments.length > 0 ? formatKRW(pendingPayments.reduce((s, p) => s + p.amount, 0)) : undefined} />
        <StatCard label="대기 중 LAND 구매" value={`${pendingLandTxs.length}건`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 회원" value={`${members.length}명`} />
        <StatCard label="투자자" value={`${investorCount}명`} />
        <StatCard label="영업" value={`${salesCount}명`} />
        <StatCard label="LAND 매출" value={formatUSD(totalLandSales)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="text-sm font-medium text-white mb-4">최근 투자 등록</h3>
          {investments.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">투자 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {investments.slice(0, 5).map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-bg-hover)] text-xs"
                >
                  <span className="text-[var(--color-text-secondary)]">{formatKRW(inv.amount)}</span>
                  <span className="text-white">{inv.option === 'option1' ? '옵션1' : '옵션2'}</span>
                  <span className={`px-2 py-0.5 rounded-full ${inv.status === 'active' ? 'bg-green-500/20 text-green-400' : inv.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {inv.status === 'active' ? '진행중' : inv.status === 'confirmed' ? '확인됨' : '대기'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="text-sm font-medium text-white mb-4">최근 지급 요청</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">지급 요청이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-bg-hover)] text-xs"
                >
                  <span className="text-[var(--color-text-secondary)]">{p.payment_date}</span>
                  <span className="text-white">{formatKRW(p.amount)}</span>
                  <span className={`px-2 py-0.5 rounded-full ${p.status === 'transferred' ? 'bg-green-500/20 text-green-400' : p.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {p.status === 'transferred' ? '완료' : p.status === 'confirmed' ? '확인' : '요청'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
