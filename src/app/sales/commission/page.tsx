'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { formatUSD } from '@/lib/utils'
import { COMMISSION_RATES } from '@/lib/constants'
import type { SalesRecord } from '@/types'

export default function CommissionPage() {
  const [records, setRecords] = useState<SalesRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('sales_records')
        .select('*')
        .eq('sales_user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setRecords(data)
      setLoading(false)
    }
    load()
  }, [])

  const totalSales = records.reduce((sum, r) => sum + r.amount, 0)

  const tiers = [
    {
      label: '기본',
      range: `$0 ~ ${formatUSD(COMMISSION_RATES.tier1.threshold)}`,
      rate: COMMISSION_RATES.base,
      active: true,
    },
    {
      label: 'Tier 1',
      range: `${formatUSD(COMMISSION_RATES.tier1.threshold)}+`,
      rate: COMMISSION_RATES.base + COMMISSION_RATES.tier1.bonus,
      active: totalSales >= COMMISSION_RATES.tier1.threshold,
    },
    {
      label: 'Tier 2',
      range: `${formatUSD(COMMISSION_RATES.tier2.threshold)}+`,
      rate: COMMISSION_RATES.base + COMMISSION_RATES.tier2.bonus,
      active: totalSales >= COMMISSION_RATES.tier2.threshold,
    },
  ]

  const currentRate = totalSales >= COMMISSION_RATES.tier2.threshold
    ? COMMISSION_RATES.base + COMMISSION_RATES.tier2.bonus
    : totalSales >= COMMISSION_RATES.tier1.threshold
      ? COMMISSION_RATES.base + COMMISSION_RATES.tier1.bonus
      : COMMISSION_RATES.base

  const totalCommission = totalSales * currentRate

  const recordsWithCommission = records.map((r) => {
    const runningTotal = records
      .filter((rec) => new Date(rec.created_at) <= new Date(r.created_at))
      .reduce((sum, rec) => sum + rec.amount, 0)

    const rate = runningTotal >= COMMISSION_RATES.tier2.threshold
      ? COMMISSION_RATES.base + COMMISSION_RATES.tier2.bonus
      : runningTotal >= COMMISSION_RATES.tier1.threshold
        ? COMMISSION_RATES.base + COMMISSION_RATES.tier1.bonus
        : COMMISSION_RATES.base

    return { ...r, commission: r.amount * rate, rate }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="수수료 계산" description="누적 매출 기준 수수료율이 적용됩니다" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">총 매출</p>
          <p className="text-xl font-bold text-white mt-1">{formatUSD(totalSales)}</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">현재 수수료율</p>
          <p className="text-xl font-bold text-[var(--color-accent)] mt-1">{(currentRate * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">총 수수료</p>
          <p className="text-xl font-bold text-green-400 mt-1">{formatUSD(totalCommission)}</p>
        </div>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="text-sm font-medium text-white mb-4">수수료 구간</h3>
        <div className="space-y-3">
          {tiers.map((tier) => (
            <div
              key={tier.label}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                tier.active && tier.rate === currentRate
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                  : tier.active
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-hover)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${
                  tier.active && tier.rate === currentRate
                    ? 'bg-[var(--color-accent)]'
                    : tier.active
                      ? 'bg-green-500'
                      : 'bg-[var(--color-text-muted)]'
                }`} />
                <div>
                  <p className="text-sm text-white font-medium">{tier.label}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{tier.range}</p>
                </div>
              </div>
              <p className={`text-sm font-bold ${
                tier.active && tier.rate === currentRate ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
              }`}>
                {(tier.rate * 100).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-medium text-white">거래별 수수료 내역</h3>
        </div>
        {recordsWithCommission.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] p-5">영업 기록이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {recordsWithCommission.map((r) => (
              <div key={r.id} className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{r.description}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    매출 {formatUSD(r.amount)} × {(r.rate * 100).toFixed(0)}%
                  </p>
                </div>
                <p className="text-sm font-medium text-green-400">{formatUSD(r.commission)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
