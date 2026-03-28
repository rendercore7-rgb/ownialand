'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatKRW, formatDate } from '@/lib/utils'
import type { PaymentRequest } from '@/types'

type FilterStatus = 'all' | 'requested' | 'confirmed' | 'transferred'

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [processing, setProcessing] = useState<string | null>(null)

  const loadPayments = useCallback(async () => {
    const supabase = createClient()

    let query = supabase
      .from('payment_requests')
      .select('*, investments(amount, option, bank_name, account_number, account_holder), profiles(full_name, phone, email)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    if (data) setPayments(data)
    setLoading(false)
  }, [filter])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  async function handleConfirm(paymentId: string) {
    setProcessing(paymentId)
    const supabase = createClient()

    const { error } = await supabase
      .from('payment_requests')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (!error) await loadPayments()
    setProcessing(null)
  }

  async function handleTransfer(paymentId: string) {
    setProcessing(paymentId)
    const supabase = createClient()

    const { error } = await supabase
      .from('payment_requests')
      .update({
        status: 'transferred',
        transferred_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    if (!error) await loadPayments()
    setProcessing(null)
  }

  const filters: { label: string; value: FilterStatus }[] = [
    { label: '전체', value: 'all' },
    { label: '요청됨', value: 'requested' },
    { label: '확인됨', value: 'confirmed' },
    { label: '송금완료', value: 'transferred' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="지급 관리" description="투자자 지급 요청을 확인하고 처리하세요" />

      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              filter === f.value
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        {payments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] p-5">해당하는 지급 요청이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {payments.map((p) => {
              const profile = p.profiles as unknown as { full_name: string; phone: string; email: string } | undefined
              const inv = p.investments as unknown as { amount: number; option: string; bank_name: string; account_number: string; account_holder: string } | undefined

              return (
                <div key={p.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-sm font-medium text-white">{profile?.full_name ?? '—'}</p>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[var(--color-text-muted)]">요청일</span>
                          <p className="text-white mt-0.5">{formatDate(p.request_date)}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">지급일</span>
                          <p className="text-white mt-0.5">{formatDate(p.payment_date)}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">일일지급액</span>
                          <p className="text-[var(--color-accent)] mt-0.5">{formatKRW(p.amount)}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">지급구분</span>
                          <p className="text-white mt-0.5">{p.is_same_day ? '당일' : '익일'}</p>
                        </div>
                      </div>
                      {inv && (
                        <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                          {inv.bank_name} · {inv.account_number} · {inv.account_holder} · 투자 {formatKRW(inv.amount)}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {p.status === 'requested' && (
                        <button
                          onClick={() => handleConfirm(p.id)}
                          disabled={processing === p.id}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {processing === p.id ? '처리중...' : '확인'}
                        </button>
                      )}
                      {p.status === 'confirmed' && (
                        <button
                          onClick={() => handleTransfer(p.id)}
                          disabled={processing === p.id}
                          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {processing === p.id ? '처리중...' : '송금완료'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
