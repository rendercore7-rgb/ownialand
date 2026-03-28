'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { formatUSD, formatDate } from '@/lib/utils'
import { COMMISSION_RATES } from '@/lib/constants'
import type { SalesRecord, SalesJournal } from '@/types'

export default function KPIPage() {
  const [records, setRecords] = useState<SalesRecord[]>([])
  const [journals, setJournals] = useState<SalesJournal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [recRes, jrnRes] = await Promise.all([
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
      ])

      if (recRes.data) setRecords(recRes.data)
      if (jrnRes.data) setJournals(jrnRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const monthlyRecords = records.filter((r) => r.created_at.startsWith(currentMonth))
  const monthlySales = monthlyRecords.reduce((sum, r) => sum + r.amount, 0)
  const monthlyJournals = journals.filter((j) => j.journal_date.startsWith(currentMonth))
  const monthlyConsultations = monthlyJournals.reduce((sum, j) => sum + j.consultation_count, 0)

  const totalSales = records.reduce((sum, r) => sum + r.amount, 0)
  const totalConsultations = journals.reduce((sum, j) => sum + j.consultation_count, 0)

  const currentRate = totalSales >= COMMISSION_RATES.tier2.threshold
    ? COMMISSION_RATES.base + COMMISSION_RATES.tier2.bonus
    : totalSales >= COMMISSION_RATES.tier1.threshold
      ? COMMISSION_RATES.base + COMMISSION_RATES.tier1.bonus
      : COMMISSION_RATES.base

  const avgDealSize = records.length > 0 ? totalSales / records.length : 0
  const conversionRate = totalConsultations > 0 ? (records.length / totalConsultations) * 100 : 0

  // Monthly sales data for simple bar chart
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getMonth() + 1}월`
    const monthRecords = records.filter((r) => r.created_at.startsWith(key))
    const sales = monthRecords.reduce((sum, r) => sum + r.amount, 0)
    return { key, label, sales }
  })

  const maxMonthlySales = Math.max(...last6Months.map((m) => m.sales), 1)

  // Next tier info
  const nextTierThreshold = totalSales < COMMISSION_RATES.tier1.threshold
    ? COMMISSION_RATES.tier1.threshold
    : totalSales < COMMISSION_RATES.tier2.threshold
      ? COMMISSION_RATES.tier2.threshold
      : null

  const progressToNextTier = nextTierThreshold
    ? (totalSales / nextTierThreshold) * 100
    : 100

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="KPI 대시보드" description="핵심 성과 지표를 분석하세요" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="이번 달 매출" value={formatUSD(monthlySales)} sub={`${monthlyRecords.length}건`} />
        <StatCard label="이번 달 상담" value={`${monthlyConsultations}건`} sub={`일지 ${monthlyJournals.length}건`} />
        <StatCard label="평균 거래 금액" value={formatUSD(avgDealSize)} />
        <StatCard label="전환율" value={`${conversionRate.toFixed(1)}%`} sub="상담 대비 계약" />
      </div>

      {/* Tier Progress */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-white">수수료 등급 진행</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              현재 {(currentRate * 100).toFixed(0)}%
              {nextTierThreshold && ` → 다음 등급까지 ${formatUSD(nextTierThreshold - totalSales)} 남음`}
              {!nextTierThreshold && ' (최고 등급)'}
            </p>
          </div>
          <p className="text-sm font-bold text-[var(--color-accent)]">{formatUSD(totalSales)}</p>
        </div>
        <div className="h-3 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              !nextTierThreshold ? 'bg-green-500' : 'bg-[var(--color-accent)]'
            }`}
            style={{ width: `${Math.min(progressToNextTier, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-[var(--color-text-muted)]">
          <span>$0</span>
          <span>{formatUSD(COMMISSION_RATES.tier1.threshold)} (35%)</span>
          <span>{formatUSD(COMMISSION_RATES.tier2.threshold)} (40%)</span>
        </div>
      </div>

      {/* Monthly Sales Chart */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="text-sm font-medium text-white mb-4">월별 매출 추이</h3>
        <div className="flex items-end gap-3 h-48">
          {last6Months.map((m) => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {m.sales > 0 ? formatUSD(m.sales) : ''}
              </span>
              <div className="w-full bg-[var(--color-bg-hover)] rounded-t-lg overflow-hidden" style={{ height: '100%' }}>
                <div
                  className="w-full bg-[var(--color-accent)] rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${m.sales > 0 ? (m.sales / maxMonthlySales) * 100 : 2}%`,
                    marginTop: 'auto',
                    position: 'relative',
                    top: `${100 - (m.sales > 0 ? (m.sales / maxMonthlySales) * 100 : 2)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Journal & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="text-sm font-medium text-white mb-4">기본급 조건 현황</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[var(--color-text-muted)]">월 일지 작성 (목표: 20건)</span>
                <span className="text-white font-medium">{monthlyJournals.length}/20</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    monthlyJournals.length >= 20 ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min((monthlyJournals.length / 20) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {monthlyJournals.length >= 20
                ? '이번 달 기본급 조건을 달성했습니다.'
                : `${20 - monthlyJournals.length}건 더 작성하면 기본급 조건을 달성합니다.`}
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="text-sm font-medium text-white mb-4">최근 활동</h3>
          {records.length === 0 && journals.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">활동 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {[
                ...records.slice(0, 3).map((r) => ({
                  id: r.id,
                  type: 'sale' as const,
                  text: r.description,
                  sub: formatUSD(r.amount),
                  date: r.created_at,
                })),
                ...journals.slice(0, 3).map((j) => ({
                  id: j.id,
                  type: 'journal' as const,
                  text: j.content.slice(0, 50) + (j.content.length > 50 ? '...' : ''),
                  sub: `상담 ${j.consultation_count}건`,
                  date: j.journal_date,
                })),
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-bg-hover)] text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        item.type === 'sale'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {item.type === 'sale' ? '매출' : '일지'}
                      </span>
                      <span className="text-[var(--color-text-secondary)] truncate">{item.text}</span>
                    </div>
                    <span className="text-[var(--color-text-muted)] shrink-0 ml-2">{formatDate(item.date)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
