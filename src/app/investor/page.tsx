'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatKRW, formatKRWShort, formatUSD, formatDate } from '@/lib/utils'
import { INVESTMENT_OPTIONS, LAND_GRADES } from '@/lib/constants'
import type { Investment, PaymentRequest, LandTransaction, LandGrade } from '@/types'

export default function InvestorDashboard() {
  const router = useRouter()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [payments, setPayments] = useState<PaymentRequest[]>([])
  const [landTxs, setLandTxs] = useState<LandTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [invRes, payRes, landRes] = await Promise.all([
        supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('payment_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('land_transactions')
          .select('*')
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      if (invRes.data) setInvestments(invRes.data)
      if (payRes.data) setPayments(payRes.data)
      if (landRes.data) setLandTxs(landRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const totalInvested = useMemo(
    () => investments.reduce((sum, inv) => sum + inv.amount, 0),
    [investments]
  )

  const dailyPayment = useMemo(
    () => investments
      .filter((inv) => inv.status === 'active')
      .reduce((sum, inv) => sum + inv.daily_payment, 0),
    [investments]
  )

  const transferredPayments = useMemo(
    () => payments.filter((p) => p.status === 'transferred'),
    [payments]
  )

  const totalReceivedCount = transferredPayments.length
  const totalReceivedAmount = useMemo(
    () => transferredPayments.reduce((sum, p) => sum + p.amount, 0),
    [transferredPayments]
  )

  // 마지막 지급 요청일로부터 경과 일수 계산
  const missedDaysInfo = useMemo(() => {
    const activeInvestments = investments.filter((inv) => inv.status === 'active')
    if (activeInvestments.length === 0) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let maxMissedDays = 0

    for (const inv of activeInvestments) {
      const invPayments = payments.filter((p) => p.investment_id === inv.id)
      if (invPayments.length === 0) {
        // 지급 요청이 한 번도 없으면 시작일+7일부터 계산
        const paymentStart = new Date(inv.start_date ?? inv.created_at)
        paymentStart.setDate(paymentStart.getDate() + 7)
        if (today >= paymentStart) {
          const diff = Math.floor((today.getTime() - paymentStart.getTime()) / (1000 * 60 * 60 * 24))
          maxMissedDays = Math.max(maxMissedDays, diff)
        }
      } else {
        const lastRequest = invPayments
          .map((p) => new Date(p.request_date))
          .sort((a, b) => b.getTime() - a.getTime())[0]
        const diff = Math.floor((today.getTime() - lastRequest.getTime()) / (1000 * 60 * 60 * 24))
        if (diff > 0) {
          maxMissedDays = Math.max(maxMissedDays, diff)
        }
      }
    }

    return maxMissedDays
  }, [investments, payments])

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

      {/* 미요청 알림 */}
      {missedDaysInfo !== null && missedDaysInfo > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-400">
              {missedDaysInfo}일 동안 지급요청이 없었습니다.
            </p>
            <p className="text-xs text-yellow-400/70 mt-1">
              지급 캘린더에서 요청하세요.
            </p>
          </div>
          <button
            onClick={() => router.push('/investor/calendar')}
            className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition-colors"
          >
            지금 요청하기
          </button>
        </div>
      )}

      {/* 상단 요약 4카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="총 투자금액" value={formatKRWShort(totalInvested)} />
        <StatCard label="일일 수령액" value={formatKRW(dailyPayment)} accent />
        <StatCard label="누적 수령 횟수" value={`${totalReceivedCount}회`} />
        <StatCard label="누적 수령액" value={formatKRW(totalReceivedAmount)} />
      </div>

      {/* 투자 카드 목록 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white">내 투자 목록</h3>
        {investments.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-8 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">등록된 투자가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {investments.map((inv) => (
              <div
                key={inv.id}
                className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white truncate">
                    {INVESTMENT_OPTIONS[inv.option].label}
                  </p>
                  <StatusBadge status={inv.status} />
                  {inv.start_date && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      · 시작 {formatDate(inv.start_date)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] text-[var(--color-text-muted)]">투자 금액</span>
                    <p className="text-base font-semibold text-white">{formatKRWShort(inv.amount)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--color-text-muted)]">일일 지급액</span>
                    <p className="text-base font-semibold text-[var(--color-accent)]">{formatKRW(inv.daily_payment)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LAND 구매 내역 */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white">LAND 구매 내역</h3>
        {landTxs.length === 0 ? (
          <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-8 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">LAND 구매 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
            <div className="divide-y divide-[var(--color-border)]">
              {landTxs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: LAND_GRADES[tx.grade]?.color }}
                    />
                    <div>
                      <p className="text-sm text-white">{LAND_GRADES[tx.grade]?.label}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {formatDate(tx.created_at)} · {tx.payment_method === 'usdt' ? 'USDT' : '계좌이체'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--color-accent)]">{formatUSD(tx.price)}</span>
                    <StatusBadge status={tx.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
