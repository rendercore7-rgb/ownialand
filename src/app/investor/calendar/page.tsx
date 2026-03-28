'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { PaymentCalendar } from '@/components/investor/payment-calendar'
import { formatKRW, isBefore12PM, getPaymentDate } from '@/lib/utils'
import type { Investment, PaymentRequest } from '@/types'

export default function CalendarPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [payments, setPayments] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string>('')
  const [todayRequested, setTodayRequested] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }
    setUserId(user.id)

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
    if (!selectedInvestmentId || !userId) return

    const supabase = createClient()
    const inv = investments.find((i) => i.id === selectedInvestmentId)
    if (!inv) return

    const today = new Date().toISOString().split('T')[0]
    const paymentDate = getPaymentDate()
    const isSameDay = isBefore12PM()

    const { error } = await supabase.from('payment_requests').insert({
      investment_id: inv.id,
      user_id: userId,
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
  }

  const selectedInvestment = investments.find((i) => i.id === selectedInvestmentId)
  const filteredPayments = payments.filter((p) => p.investment_id === selectedInvestmentId)
  const isAlreadyRequested = todayRequested.has(selectedInvestmentId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="지급 캘린더" description="날짜를 클릭하여 지급을 요청하세요" />

      {investments.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--color-text-muted)]">활성 투자가 없습니다. 먼저 투자를 등록하세요.</p>
        </div>
      ) : (
        <>
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

          {selectedInvestment && (
            <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
              <PaymentCalendar
                payments={filteredPayments}
                investment={selectedInvestment}
                onRequestPayment={handleRequestPayment}
                todayRequested={isAlreadyRequested}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
