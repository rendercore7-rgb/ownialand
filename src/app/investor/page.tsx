'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatKRW, formatKRWShort, formatDate, isBefore12PM, getPaymentDate } from '@/lib/utils'
import { INVESTMENT_OPTIONS } from '@/lib/constants'
import type { Investment, PaymentRequest } from '@/types'

export default function InvestorDashboard() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [payments, setPayments] = useState<PaymentRequest[]>([])
  const [todayRequested, setTodayRequested] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const today = new Date().toISOString().split('T')[0]

      const [invRes, payRes, todayRes] = await Promise.all([
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
          .from('payment_requests')
          .select('investment_id')
          .eq('user_id', user.id)
          .eq('request_date', today),
      ])

      if (invRes.data) setInvestments(invRes.data)
      if (payRes.data) setPayments(payRes.data)
      if (todayRes.data) {
        setTodayRequested(new Set(todayRes.data.map((r) => r.investment_id)))
      }
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

  async function handleRequestPayment(inv: Investment) {
    if (!userId) return
    setRequesting(inv.id)

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const sameDayFlag = isBefore12PM()
    const paymentDate = getPaymentDate()

    const { error } = await supabase
      .from('payment_requests')
      .insert({
        investment_id: inv.id,
        user_id: userId,
        request_date: today,
        payment_date: paymentDate,
        amount: inv.daily_payment,
        is_same_day: sameDayFlag,
        status: 'requested',
      })

    if (!error) {
      setTodayRequested((prev) => new Set([...prev, inv.id]))
      setPayments((prev) => [{
        id: crypto.randomUUID(),
        investment_id: inv.id,
        user_id: userId,
        request_date: today,
        payment_date: paymentDate,
        amount: inv.daily_payment,
        is_same_day: sameDayFlag,
        status: 'requested' as const,
        confirmed_at: null,
        transferred_at: null,
        created_at: new Date().toISOString(),
      }, ...prev])
    }

    setRequesting(null)
  }

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
            {investments.map((inv) => {
              const alreadyRequested = todayRequested.has(inv.id)
              const isActive = inv.status === 'active'
              const canRequest = isActive && !alreadyRequested
              const sameDayFlag = isBefore12PM()

              return (
                <div
                  key={inv.id}
                  className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 space-y-4"
                >
                  {/* 헤더: 옵션명 + 상태 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">
                        {INVESTMENT_OPTIONS[inv.option].label}
                      </p>
                      <StatusBadge status={inv.status} />
                    </div>
                    {inv.start_date && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        시작 {formatDate(inv.start_date)}
                      </span>
                    )}
                  </div>

                  {/* 금액 정보 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-[var(--color-text-muted)]">투자 금액</span>
                      <p className="text-lg font-semibold text-white mt-0.5">
                        {formatKRWShort(inv.amount)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[var(--color-text-muted)]">일일 지급액</span>
                      <p className="text-lg font-semibold text-[var(--color-accent)] mt-0.5">
                        {formatKRW(inv.daily_payment)}
                      </p>
                    </div>
                  </div>

                  {/* 지급 요청 버튼 */}
                  {isActive && (
                    <button
                      onClick={() => handleRequestPayment(inv)}
                      disabled={!canRequest || requesting === inv.id}
                      className={`w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        canRequest
                          ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white'
                          : 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] cursor-not-allowed'
                      }`}
                    >
                      {requesting === inv.id
                        ? '요청 중...'
                        : alreadyRequested
                          ? '오늘 이미 요청 완료'
                          : sameDayFlag
                            ? '지급 요청 (당일 송금)'
                            : '지급 요청 (익일 송금)'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
