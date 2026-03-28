'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { PaymentCalendar } from '@/components/investor/payment-calendar'
import { formatKRW, getPaymentDate, isBefore12PM } from '@/lib/utils'
import type { Investment, PaymentRequest } from '@/types'

export default function CalendarPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [payments, setPayments] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string>('')
  const [todayRequested, setTodayRequested] = useState<Set<string>>(new Set())
  const [debugInfo, setDebugInfo] = useState('')

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setDebugInfo('로그인 정보 없음')
      setLoading(false)
      return
    }

    const today = new Date().toISOString().split('T')[0]

    const [invRes, payRes, todayRes] = await Promise.all([
      supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'confirmed']),
      supabase
        .from('payment_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: true }),
      supabase
        .from('payment_requests')
        .select('investment_id')
        .eq('user_id', user.id)
        .eq('request_date', today),
    ])

    if (invRes.error) {
      setDebugInfo(`투자 조회 실패: ${invRes.error.message}`)
    } else {
      setDebugInfo(`투자 ${invRes.data?.length ?? 0}건 조회됨 (uid: ${user.id})`)
    }

    if (invRes.data) {
      setInvestments(invRes.data)
      if (invRes.data.length > 0 && !selectedInvestmentId) {
        setSelectedInvestmentId(invRes.data[0].id)
      }
    }
    if (payRes.data) setPayments(payRes.data)
    if (todayRes.data) {
      setTodayRequested(new Set(todayRes.data.map((r) => r.investment_id)))
    }
    setLoading(false)
  }, [selectedInvestmentId])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleRequestPayment() {
    if (!selectedInvestmentId) return
    setRequesting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setRequesting(false)
      return
    }

    const inv = investments.find((i) => i.id === selectedInvestmentId)
    if (!inv) {
      setRequesting(false)
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const paymentDate = getPaymentDate()
    const isSameDay = isBefore12PM()

    const { error } = await supabase.from('payment_requests').insert({
      investment_id: inv.id,
      user_id: user.id,
      request_date: today,
      payment_date: paymentDate,
      amount: inv.daily_payment,
      is_same_day: isSameDay,
      status: 'requested',
    })

    if (!error) {
      setTodayRequested((prev) => new Set([...prev, inv.id]))
      await loadData()
    }
    setRequesting(false)
  }

  const selectedInvestment = investments.find((i) => i.id === selectedInvestmentId)
  const filteredPayments = payments.filter((p) => p.investment_id === selectedInvestmentId)
  const alreadyRequested = todayRequested.has(selectedInvestmentId)

  // 지급 시작일 체크 (투자 시작일 + 7일)
  const canRequestToday = (() => {
    if (!selectedInvestment?.start_date) return false
    const paymentStart = new Date(selectedInvestment.start_date)
    paymentStart.setDate(paymentStart.getDate() + 7)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today >= paymentStart
  })()

  const sameDayFlag = isBefore12PM()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="지급 캘린더" description="일일 지급을 요청하고 현황을 확인하세요" />

      {debugInfo && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
          {debugInfo}
        </div>
      )}

      {investments.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--color-text-muted)]">활성 투자가 없습니다. 먼저 투자를 등록하세요.</p>
        </div>
      ) : (
        <>
          {/* 투자 선택 */}
          {investments.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {investments.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvestmentId(inv.id)}
                  className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    selectedInvestmentId === inv.id
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
                  }`}
                >
                  {formatKRW(inv.amount)} ({inv.option === 'option1' ? '옵션1' : '옵션2'})
                </button>
              ))}
            </div>
          )}

          {/* 지급 요청 */}
          <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-white">일일 지급 요청</h3>
                {selectedInvestment && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    일일 지급액: <span className="text-[var(--color-accent)]">{formatKRW(selectedInvestment.daily_payment)}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {sameDayFlag ? '당일 송금 (12시 이전)' : '익일 송금 (12시 이후)'}
                </p>
              </div>
            </div>

            <button
              onClick={handleRequestPayment}
              disabled={requesting || alreadyRequested || !canRequestToday}
              className={`w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                !alreadyRequested && canRequestToday
                  ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white'
                  : 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] cursor-not-allowed'
              }`}
            >
              {requesting
                ? '요청 중...'
                : alreadyRequested
                  ? '오늘 이미 요청 완료'
                  : !canRequestToday
                    ? '지급 시작일 전입니다 (투자일 + 7일)'
                    : sameDayFlag
                      ? '지급 요청 (당일 송금)'
                      : '지급 요청 (익일 송금)'}
            </button>
          </div>

          {/* 캘린더 */}
          {selectedInvestment && (
            <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
              <PaymentCalendar
                payments={filteredPayments}
                investment={selectedInvestment}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
