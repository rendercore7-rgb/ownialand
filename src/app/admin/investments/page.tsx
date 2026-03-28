'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatKRW, formatDate } from '@/lib/utils'
import { INVESTMENT_OPTIONS } from '@/lib/constants'
import type { Investment, InvestmentStatus } from '@/types'

type FilterStatus = 'all' | InvestmentStatus

export default function AdminInvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [processing, setProcessing] = useState<string | null>(null)

  const loadInvestments = useCallback(async () => {
    const supabase = createClient()

    let query = supabase
      .from('investments')
      .select('*, profiles(full_name, phone, email)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    if (data) setInvestments(data)
    setLoading(false)
  }, [filter])

  useEffect(() => {
    loadInvestments()
  }, [loadInvestments])

  async function handleActivate(investmentId: string) {
    setProcessing(investmentId)
    const supabase = createClient()

    const { error } = await supabase
      .from('investments')
      .update({
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', investmentId)

    if (!error) await loadInvestments()
    setProcessing(null)
  }

  const filters: { label: string; value: FilterStatus }[] = [
    { label: '전체', value: 'all' },
    { label: '대기', value: 'pending' },
    { label: '확인됨', value: 'confirmed' },
    { label: '운용중', value: 'active' },
    { label: '완료', value: 'completed' },
    { label: '취소', value: 'cancelled' },
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
      <PageHeader title="투자 관리" description="전체 투자 내역을 조회하고 상태를 관리하세요" />

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
        {investments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] p-5">해당하는 투자 내역이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {investments.map((inv) => {
              const profile = inv.profiles as unknown as { full_name: string; phone: string; email: string } | undefined

              return (
                <div key={inv.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-sm font-medium text-white">{profile?.full_name ?? '—'}</p>
                        <StatusBadge status={inv.status} />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                        <div>
                          <span className="text-[var(--color-text-muted)]">투자옵션</span>
                          <p className="text-white mt-0.5">{INVESTMENT_OPTIONS[inv.option].label.split('—')[0].trim()}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">투자금액</span>
                          <p className="text-white mt-0.5">{formatKRW(inv.amount)}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">일일지급액</span>
                          <p className="text-[var(--color-accent)] mt-0.5">{formatKRW(inv.daily_payment)}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">계좌정보</span>
                          <p className="text-white mt-0.5">{inv.bank_name} {inv.account_number}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">시작일</span>
                          <p className="text-white mt-0.5">{inv.start_date ? formatDate(inv.start_date) : '—'}</p>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                        예금주: {inv.account_holder} · 계약 {inv.contract_days}일 · 등록 {formatDate(inv.created_at)}
                        {inv.signed_at && ` · 서명 ${formatDate(inv.signed_at)}`}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {inv.status === 'pending' && (
                        <button
                          onClick={() => handleActivate(inv.id)}
                          disabled={processing === inv.id}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {processing === inv.id ? '처리중...' : '운용 시작'}
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
