'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatUSD, formatDate } from '@/lib/utils'
import { LAND_GRADES } from '@/lib/constants'
import type { LandTransaction, LandGrade } from '@/types'

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

export default function AdminLandsPage() {
  const [transactions, setTransactions] = useState<LandTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [processing, setProcessing] = useState<string | null>(null)

  const loadTransactions = useCallback(async () => {
    const supabase = createClient()

    let query = supabase
      .from('land_transactions')
      .select('*, profiles(full_name, phone, email)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    if (data) setTransactions(data)
    setLoading(false)
  }, [filter])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  async function handleApprove(txId: string) {
    setProcessing(txId)
    const supabase = createClient()

    const { error } = await supabase
      .from('land_transactions')
      .update({ status: 'approved' })
      .eq('id', txId)

    if (!error) await loadTransactions()
    setProcessing(null)
  }

  async function handleReject(txId: string) {
    setProcessing(txId)
    const supabase = createClient()

    const { error } = await supabase
      .from('land_transactions')
      .update({ status: 'rejected' })
      .eq('id', txId)

    if (!error) await loadTransactions()
    setProcessing(null)
  }

  const filters: { label: string; value: FilterStatus }[] = [
    { label: '전체', value: 'all' },
    { label: '대기중', value: 'pending' },
    { label: '승인됨', value: 'approved' },
    { label: '거절됨', value: 'rejected' },
  ]

  const totalApproved = transactions
    .filter((tx) => tx.status === 'approved')
    .reduce((sum, tx) => sum + tx.price, 0)
  const pendingCount = transactions.filter((tx) => tx.status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="LAND 관리" description="LAND 구매 신청을 승인하고 관리하세요" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">총 신청</p>
          <p className="text-lg font-semibold text-white mt-1">{transactions.length}건</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">대기중</p>
          <p className="text-lg font-semibold text-yellow-400 mt-1">{pendingCount}건</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">승인 매출</p>
          <p className="text-lg font-semibold text-[var(--color-accent)] mt-1">{formatUSD(totalApproved)}</p>
        </div>
      </div>

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
        {transactions.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] p-5">해당하는 거래가 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {transactions.map((tx) => {
              const profile = tx.profiles as unknown as { full_name: string; phone: string; email: string } | undefined
              const grade = LAND_GRADES[tx.grade as LandGrade]

              return (
                <div key={tx.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: grade?.color }} />
                        <p className="text-sm font-medium text-white">{grade?.label ?? tx.grade}</p>
                        <StatusBadge status={tx.status} />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[var(--color-text-muted)]">구매자</span>
                          <p className="text-white mt-0.5">{profile?.full_name ?? '—'}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">연락처</span>
                          <p className="text-white mt-0.5">{profile?.phone ?? '—'}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">금액</span>
                          <p className="text-[var(--color-accent)] mt-0.5">{formatUSD(tx.price)}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">결제</span>
                          <p className="text-white mt-0.5">{tx.payment_method === 'usdt' ? 'USDT' : '계좌이체'}</p>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2">
                        신청일: {formatDate(tx.created_at)} · {profile?.email}
                      </p>
                    </div>

                    {tx.status === 'pending' && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(tx.id)}
                          disabled={processing === tx.id}
                          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {processing === tx.id ? '처리중...' : '승인'}
                        </button>
                        <button
                          onClick={() => handleReject(tx.id)}
                          disabled={processing === tx.id}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {processing === tx.id ? '처리중...' : '거절'}
                        </button>
                      </div>
                    )}
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
