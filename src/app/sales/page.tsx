'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { formatUSD } from '@/lib/utils'
import { LAND_GRADES } from '@/lib/constants'
import type { LandTransaction, SalesJournal, SalesRecord, LandGrade, Profile } from '@/types'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface MonthlyData {
  month: string
  team1: number
  team2: number
}

export default function SalesDashboard() {
  const [records, setRecords] = useState<SalesRecord[]>([])
  const [journals, setJournals] = useState<SalesJournal[]>([])
  const [landTxs, setLandTxs] = useState<LandTransaction[]>([])
  const [allRecords, setAllRecords] = useState<SalesRecord[]>([])
  const [salesProfiles, setSalesProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [recRes, jrnRes, landRes, allRecRes, profileRes] = await Promise.all([
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
        supabase
          .from('sales_records')
          .select('*, profiles!sales_records_sales_user_id_fkey(sales_team)')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'sales'),
      ])

      if (recRes.data) setRecords(recRes.data)
      if (jrnRes.data) setJournals(jrnRes.data)
      if (landRes.data) setLandTxs(landRes.data)
      if (allRecRes.data) setAllRecords(allRecRes.data as SalesRecord[])
      if (profileRes.data) setSalesProfiles(profileRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // KPI 계산
  const monthlyRecords = useMemo(
    () => records.filter((r) => r.created_at.startsWith(currentMonth)),
    [records, currentMonth]
  )

  const monthlyJournals = useMemo(
    () => journals.filter((j) => j.journal_date.startsWith(currentMonth)),
    [journals, currentMonth]
  )

  const monthlySales = monthlyRecords.reduce((sum, r) => sum + r.amount, 0)
  const closingCount = monthlyRecords.length
  const totalConsultations = monthlyJournals.reduce((sum, j) => sum + j.consultation_count, 0)
  const daysWithJournals = monthlyJournals.length
  const avgDailyContacts = daysWithJournals > 0 ? Math.round(totalConsultations / daysWithJournals) : 0
  const conversionRate = totalConsultations > 0 ? ((closingCount / totalConsultations) * 100).toFixed(1) : '0'

  // 월별 매출 차트 (최근 6개월, team1 vs team2)
  const chartData = useMemo(() => {
    const teamMap = new Map<string, string>()
    for (const p of salesProfiles) {
      teamMap.set(p.id, p.sales_team ?? '')
    }

    const months: MonthlyData[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${d.getMonth() + 1}월`

      let team1Total = 0
      let team2Total = 0

      for (const rec of allRecords) {
        if (!rec.created_at.startsWith(key)) continue
        const profile = (rec as unknown as { profiles?: { sales_team: string } }).profiles
        const team = profile?.sales_team ?? teamMap.get(rec.sales_user_id) ?? ''
        if (team === 'team1') team1Total += rec.amount
        else if (team === 'team2') team2Total += rec.amount
      }

      months.push({ month: label, team1: team1Total, team2: team2Total })
    }
    return months
  }, [allRecords, salesProfiles])

  // 탑 5 리더보드 (이번 달)
  const top5 = useMemo(() => {
    const salesMap = new Map<string, number>()
    for (const rec of allRecords) {
      if (!rec.created_at.startsWith(currentMonth)) continue
      salesMap.set(rec.sales_user_id, (salesMap.get(rec.sales_user_id) ?? 0) + rec.amount)
    }

    return salesProfiles
      .map((p) => ({ name: p.full_name, team: p.sales_team, sales: salesMap.get(p.id) ?? 0 }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
  }, [allRecords, salesProfiles, currentMonth])

  // LAND 구역별 판매
  const landSalesByGrade = useMemo(
    () =>
      (Object.keys(LAND_GRADES) as LandGrade[]).map((grade) => {
        const txs = landTxs.filter((tx) => tx.grade === grade)
        const totalAmount = txs.reduce((sum, tx) => sum + tx.price, 0)
        return { grade, ...LAND_GRADES[grade], count: txs.length, totalAmount }
      }),
    [landTxs]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="영업 대시보드" description="이번 달 영업 현황을 한눈에 확인하세요" />

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="이번 달 매출" value={formatUSD(monthlySales)} accent />
        <StatCard label="클로징 건수" value={`${closingCount}건`} />
        <StatCard label="평균 일일 접촉" value={`${avgDailyContacts}건`} />
        <StatCard label="리드 전환율" value={`${conversionRate}%`} />
      </div>

      {/* 월별 매출 차트 */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="text-sm font-medium text-white mb-4">월별 매출 비교 (1팀 vs 2팀)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="team1Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="team2Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e1e3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value: unknown, name: unknown) => [formatUSD(Number(value)), String(name) === 'team1' ? '1팀' : '2팀']}
              />
              <Area type="monotone" dataKey="team1" stroke="#3b82f6" fill="url(#team1Gradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="team2" stroke="#8b5cf6" fill="url(#team2Gradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-blue-500" /> 1팀
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-violet-500" /> 2팀
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 탑 5 리더보드 */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">이번 달 TOP 5</h3>
            <Link href="/sales/leaderboard" className="text-xs text-[var(--color-accent)] hover:underline">
              더보기
            </Link>
          </div>
          {top5.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">이번 달 매출 기록이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {top5.map((entry, idx) => (
                <div
                  key={entry.name}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[var(--color-bg-hover)]"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      idx === 1 ? 'bg-gray-400/20 text-gray-300' :
                      idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm text-white">{entry.name || '(이름 없음)'}</p>
                      {entry.team && (
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {entry.team === 'team1' ? '1팀' : '2팀'}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-[var(--color-accent)]">{formatUSD(entry.sales)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LAND 구역별 판매 현황 */}
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
      </div>
    </div>
  )
}
