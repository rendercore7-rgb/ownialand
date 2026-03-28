'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { formatUSD } from '@/lib/utils'
import { LAND_GRADES, COMMISSION_RATES } from '@/lib/constants'
import type { LandTransaction, SalesJournal, SalesRecord, LandGrade } from '@/types'

export default function SalesDashboard() {
  const [records, setRecords] = useState<SalesRecord[]>([])
  const [journals, setJournals] = useState<SalesJournal[]>([])
  const [landTxs, setLandTxs] = useState<LandTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [recRes, jrnRes, landRes] = await Promise.all([
        supabase
          .from('sales_records')
          .select('*')
          .eq('sales_user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('sales_journals')
          .select('*')
          .eq('user_id', user.id)
          .order('journal_date', { ascending: false }),
        supabase
          .from('land_transactions')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false }),
      ])

      if (recRes.data) setRecords(recRes.data)
      if (jrnRes.data) setJournals(jrnRes.data)
      if (landRes.data) setLandTxs(landRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const totalSales = records.reduce((sum, r) => sum + r.amount, 0)

  const commissionRate = totalSales >= COMMISSION_RATES.tier2.threshold
    ? COMMISSION_RATES.base + COMMISSION_RATES.tier2.bonus
    : totalSales >= COMMISSION_RATES.tier1.threshold
      ? COMMISSION_RATES.base + COMMISSION_RATES.tier1.bonus
      : COMMISSION_RATES.base

  const totalCommission = totalSales * commissionRate

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthlyJournals = journals.filter((j) => j.journal_date.startsWith(currentMonth))
  const journalGoal = 20

  const landSalesByGrade = (Object.keys(LAND_GRADES) as LandGrade[]).map((grade) => {
    const txs = landTxs.filter((tx) => tx.grade === grade)
    const totalAmount = txs.reduce((sum, tx) => sum + tx.price, 0)
    return {
      grade,
      ...LAND_GRADES[grade],
      count: txs.length,
      totalAmount,
    }
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
      <PageHeader title="영업 대시보드" description="영업 현황을 한눈에 확인하세요" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="총 매출" value={formatUSD(totalSales)} />
        <StatCard label="수수료율" value={`${(commissionRate * 100).toFixed(0)}%`} />
        <StatCard label="예상 수수료" value={formatUSD(totalCommission)} accent />
        <StatCard
          label="이번 달 일지"
          value={`${monthlyJournals.length}/${journalGoal}`}
          sub={monthlyJournals.length >= journalGoal ? '기본급 달성' : `${journalGoal - monthlyJournals.length}건 남음`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="text-sm font-medium text-white mb-4">LAND 구역별 판매 현황</h3>
          <div className="space-y-3">
            {landSalesByGrade.map((item) => (
              <div key={item.grade} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-white">{item.label}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-[var(--color-text-muted)]">{item.count}건</span>
                  <span className="text-[var(--color-accent)]">{formatUSD(item.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="text-sm font-medium text-white mb-4">최근 영업 기록</h3>
          {records.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">영업 기록이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {records.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-bg-hover)] text-xs"
                >
                  <span className="text-[var(--color-text-secondary)] truncate max-w-[60%]">{r.description}</span>
                  <span className="text-[var(--color-accent)]">{formatUSD(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
