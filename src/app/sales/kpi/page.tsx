'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { formatUSD, formatDate } from '@/lib/utils'
import { COMMISSION_RATES } from '@/lib/constants'
import type { SalesRecord, SalesJournal, Profile } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  Legend,
} from 'recharts'

const MONTHLY_TARGETS = {
  sales: 30000,
  closings: 10,
  consultations: 100,
  journals: 20,
}

export default function KPIPage() {
  const [records, setRecords] = useState<SalesRecord[]>([])
  const [journals, setJournals] = useState<SalesJournal[]>([])
  const [allRecords, setAllRecords] = useState<SalesRecord[]>([])
  const [salesProfiles, setSalesProfiles] = useState<Profile[]>([])
  const [myProfile, setMyProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [recRes, jrnRes, allRecRes, profileRes, myRes] = await Promise.all([
        supabase.from('sales_records').select('*').eq('sales_user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('sales_journals').select('*').eq('user_id', user.id).order('journal_date', { ascending: false }),
        supabase.from('sales_records').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'sales'),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])

      if (recRes.data) setRecords(recRes.data)
      if (jrnRes.data) setJournals(jrnRes.data)
      if (allRecRes.data) setAllRecords(allRecRes.data as SalesRecord[])
      if (profileRes.data) setSalesProfiles(profileRes.data)
      if (myRes.data) setMyProfile(myRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const monthlyRecords = useMemo(() => records.filter((r) => r.created_at.startsWith(currentMonth)), [records, currentMonth])
  const monthlyJournals = useMemo(() => journals.filter((j) => j.journal_date.startsWith(currentMonth)), [journals, currentMonth])

  const monthlySales = monthlyRecords.reduce((sum, r) => sum + r.amount, 0)
  const monthlyClosings = monthlyRecords.length
  const monthlyConsultations = monthlyJournals.reduce((sum, j) => sum + j.consultation_count, 0)
  const monthlyJournalCount = monthlyJournals.length

  const totalSales = records.reduce((sum, r) => sum + r.amount, 0)
  const avgDealSize = records.length > 0 ? totalSales / records.length : 0
  const conversionRate = monthlyConsultations > 0 ? (monthlyClosings / monthlyConsultations) * 100 : 0

  // 목표 대비 달성률
  const goalData = useMemo(() => [
    { name: '매출', value: Math.min((monthlySales / MONTHLY_TARGETS.sales) * 100, 100), fill: '#3b82f6' },
    { name: '클로징', value: Math.min((monthlyClosings / MONTHLY_TARGETS.closings) * 100, 100), fill: '#8b5cf6' },
    { name: '상담', value: Math.min((monthlyConsultations / MONTHLY_TARGETS.consultations) * 100, 100), fill: '#22c55e' },
    { name: '일지', value: Math.min((monthlyJournalCount / MONTHLY_TARGETS.journals) * 100, 100), fill: '#f59e0b' },
  ], [monthlySales, monthlyClosings, monthlyConsultations, monthlyJournalCount])

  // 월별 매출 (Recharts BarChart)
  const monthlyChartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${d.getMonth() + 1}월`
      const sales = records.filter((r) => r.created_at.startsWith(key)).reduce((sum, r) => sum + r.amount, 0)
      const closings = records.filter((r) => r.created_at.startsWith(key)).length
      return { month: label, sales, closings }
    })
  }, [records])

  // 팀 비교 KPI
  const teamComparison = useMemo(() => {
    const myTeam = myProfile?.sales_team
    if (!myTeam) return null

    const teamMembers = salesProfiles.filter((p) => p.sales_team === myTeam)
    const otherTeam = myTeam === 'team1' ? 'team2' : 'team1'
    const otherMembers = salesProfiles.filter((p) => p.sales_team === otherTeam)

    function teamMonthly(members: Profile[]) {
      const ids = new Set(members.map((m) => m.id))
      const recs = allRecords.filter((r) => ids.has(r.sales_user_id) && r.created_at.startsWith(currentMonth))
      return {
        sales: recs.reduce((sum, r) => sum + r.amount, 0),
        closings: recs.length,
        members: members.length,
      }
    }

    return {
      my: { ...teamMonthly(teamMembers), label: myTeam === 'team1' ? '1팀' : '2팀' },
      other: { ...teamMonthly(otherMembers), label: otherTeam === 'team1' ? '1팀' : '2팀' },
    }
  }, [myProfile, salesProfiles, allRecords, currentMonth])

  // 티어 프로그레스
  const currentRate = totalSales >= COMMISSION_RATES.tier2.threshold
    ? COMMISSION_RATES.base + COMMISSION_RATES.tier2.bonus
    : totalSales >= COMMISSION_RATES.tier1.threshold
      ? COMMISSION_RATES.base + COMMISSION_RATES.tier1.bonus
      : COMMISSION_RATES.base

  const nextTierThreshold = totalSales < COMMISSION_RATES.tier1.threshold
    ? COMMISSION_RATES.tier1.threshold
    : totalSales < COMMISSION_RATES.tier2.threshold
      ? COMMISSION_RATES.tier2.threshold
      : null

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

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="이번 달 매출" value={formatUSD(monthlySales)} sub={`목표 ${formatUSD(MONTHLY_TARGETS.sales)}`} accent />
        <StatCard label="클로징 건수" value={`${monthlyClosings}건`} sub={`목표 ${MONTHLY_TARGETS.closings}건`} />
        <StatCard label="평균 거래 금액" value={formatUSD(avgDealSize)} />
        <StatCard label="전환율" value={`${conversionRate.toFixed(1)}%`} sub="상담 대비 계약" />
      </div>

      {/* 목표 달성률 */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="text-sm font-medium text-white mb-4">이번 달 목표 달성률</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {goalData.map((item) => (
            <div key={item.name} className="text-center">
              <div className="relative w-20 h-20 mx-auto">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none" stroke={item.fill} strokeWidth="3"
                    strokeDasharray={`${item.value * 0.942} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                  {Math.round(item.value)}%
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">{item.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 월별 매출 차트 */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="text-sm font-medium text-white mb-4">월별 매출 추이</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e1e3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                formatter={(value: unknown) => [formatUSD(Number(value)), '매출']}
              />
              <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 팀 비교 */}
        {teamComparison && (
          <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
            <h3 className="text-sm font-medium text-white mb-4">팀 비교 (이번 달)</h3>
            <div className="space-y-4">
              {[teamComparison.my, teamComparison.other].map((team, idx) => {
                const maxSales = Math.max(teamComparison.my.sales, teamComparison.other.sales, 1)
                return (
                  <div key={team.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${idx === 0 ? 'text-blue-400' : 'text-purple-400'}`}>
                        {team.label} ({team.members}명)
                      </span>
                      <span className="text-[var(--color-accent)]">{formatUSD(team.sales)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${idx === 0 ? 'bg-blue-500' : 'bg-purple-500'}`}
                        style={{ width: `${(team.sales / maxSales) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-4 text-xs text-[var(--color-text-muted)]">
                      <span>클로징 {team.closings}건</span>
                      <span>인당 {team.members > 0 ? formatUSD(Math.round(team.sales / team.members)) : '$0'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 티어 + 기본급 */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 space-y-4">
          <h3 className="text-sm font-medium text-white">수수료 등급</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">현재 {(currentRate * 100).toFixed(0)}%</span>
            <span className="text-sm font-bold text-[var(--color-accent)]">{formatUSD(totalSales)}</span>
          </div>
          <div className="h-3 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${!nextTierThreshold ? 'bg-green-500' : 'bg-[var(--color-accent)]'}`}
              style={{ width: `${Math.min(nextTierThreshold ? (totalSales / nextTierThreshold) * 100 : 100, 100)}%` }}
            />
          </div>
          {nextTierThreshold && (
            <p className="text-xs text-[var(--color-text-muted)]">
              다음 등급까지 {formatUSD(nextTierThreshold - totalSales)} 남음
            </p>
          )}

          <div className="border-t border-[var(--color-border)] pt-4">
            <h4 className="text-xs text-[var(--color-text-muted)] mb-2">기본급 조건</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">월 일지 {monthlyJournalCount}/20</span>
              <span className={monthlyJournalCount >= 20 ? 'text-green-400' : 'text-yellow-400'}>
                {monthlyJournalCount >= 20 ? '달성' : `${20 - monthlyJournalCount}건 남음`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
