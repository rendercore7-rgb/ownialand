'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { formatKRW } from '@/lib/utils'
import { INVESTMENT_OPTIONS } from '@/lib/constants'
import type { Investment, PaymentRequest } from '@/types'

export default function InvestorDashboard() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [payments, setPayments] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [invRes, payRes] = await Promise.all([
        supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payment_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('payment_date', { ascending: false }),
      ])

      if (invRes.data) setInvestments(invRes.data)
      if (payRes.data) setPayments(payRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0)
  const activeInvestments = investments.filter((inv) => inv.status === 'active' || inv.status === 'confirmed')
  const totalDailyPayment = activeInvestments.reduce((sum, inv) => sum + inv.daily_payment, 0)
  const totalPaid = payments
    .filter((p) => p.status === 'transferred')
    .reduce((sum, p) => sum + p.amount, 0)
  const pendingPayments = payments.filter((p) => p.status === 'requested')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="대시보드" description="투자 현황을 한눈에 확인하세요" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="총 투자 금액" value={formatKRW(totalInvested)} />
        <StatCard label="일일 지급액" value={formatKRW(totalDailyPayment)} accent />
        <StatCard label="총 수령액" value={formatKRW(totalPaid)} sub="송금 완료 기준" />
        <StatCard
          label="대기 중 요청"
          value={`${pendingPayments.length}건`}
          sub={pendingPayments.length > 0 ? formatKRW(pendingPayments.reduce((s, p) => s + p.amount, 0)) : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="text-sm font-medium text-white mb-4">활성 투자</h3>
          {activeInvestments.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">활성 투자가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {activeInvestments.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-[var(--color-bg-hover)]"
                >
                  <div>
                    <p className="text-sm text-white">{INVESTMENT_OPTIONS[inv.option].label}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {formatKRW(inv.amount)} · {inv.contract_days}일 계약
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[var(--color-accent)]">{formatKRW(inv.daily_payment)}/일</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{inv.status === 'active' ? '진행중' : '확인됨'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="text-sm font-medium text-white mb-4">최근 지급 내역</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">지급 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-bg-hover)] text-xs"
                >
                  <span className="text-[var(--color-text-secondary)]">{p.payment_date}</span>
                  <span className="text-white">{formatKRW(p.amount)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      p.status === 'transferred'
                        ? 'bg-green-500/20 text-green-400'
                        : p.status === 'confirmed'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
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
