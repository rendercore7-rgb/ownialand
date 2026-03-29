'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { formatUSD } from '@/lib/utils'
import { COMMISSION_RATES } from '@/lib/constants'
import type { Profile, SalesRecord } from '@/types'

type TeamFilter = 'all' | 'team1' | 'team2'

interface PersonStats {
  profile: Profile
  monthlySales: number
  closingCount: number
  commissionRate: number
  tier: string
}

function getTier(sales: number): { rate: number; label: string } {
  if (sales >= COMMISSION_RATES.tier2.threshold) {
    return { rate: COMMISSION_RATES.base + COMMISSION_RATES.tier2.bonus, label: '슈퍼 ★★★' }
  }
  if (sales >= COMMISSION_RATES.tier1.threshold) {
    return { rate: COMMISSION_RATES.base + COMMISSION_RATES.tier1.bonus, label: '가속 ★★' }
  }
  return { rate: COMMISSION_RATES.base, label: '기본' }
}

export default function LeaderboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [records, setRecords] = useState<SalesRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TeamFilter>('all')

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [profilesRes, recordsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'sales'),
        supabase.from('sales_records').select('*'),
      ])

      if (profilesRes.data) setProfiles(profilesRes.data)
      if (recordsRes.data) setRecords(recordsRes.data as SalesRecord[])
      setLoading(false)
    }
    load()
  }, [])

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const stats = useMemo((): PersonStats[] => {
    const filtered = filter === 'all'
      ? profiles
      : profiles.filter((p) => p.sales_team === filter)

    return filtered
      .map((profile) => {
        const personRecords = records.filter(
          (r) => r.sales_user_id === profile.id && r.created_at.startsWith(currentMonth)
        )
        const monthlySales = personRecords.reduce((sum, r) => sum + r.amount, 0)
        const { rate, label } = getTier(monthlySales)
        return {
          profile,
          monthlySales,
          closingCount: personRecords.length,
          commissionRate: rate,
          tier: label,
        }
      })
      .sort((a, b) => b.monthlySales - a.monthlySales)
  }, [profiles, records, filter, currentMonth])

  const top3 = stats.slice(0, 3)
  const medals = ['🥇', '🥈', '🥉']
  const medalColors = [
    'from-yellow-500/20 to-yellow-600/5 border-yellow-500/30',
    'from-gray-400/20 to-gray-500/5 border-gray-400/30',
    'from-orange-500/20 to-orange-600/5 border-orange-500/30',
  ]

  const filters: { label: string; value: TeamFilter }[] = [
    { label: '전체', value: 'all' },
    { label: '1팀', value: 'team1' },
    { label: '2팀', value: 'team2' },
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
      <PageHeader title="리더보드" description="이번 달 영업 실적 순위" />

      {/* 팀 필터 */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === f.value
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 탑 3 하이라이트 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {top3.map((entry, idx) => (
            <div
              key={entry.profile.id}
              className={`bg-gradient-to-b ${medalColors[idx]} rounded-xl border p-5 text-center`}
            >
              <div className="text-3xl mb-2">{medals[idx]}</div>
              <p className="text-sm font-medium text-white">{entry.profile.full_name || '(이름 없음)'}</p>
              {entry.profile.sales_team && (
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                  {entry.profile.sales_team === 'team1' ? '1팀' : '2팀'}
                </p>
              )}
              <p className="text-xl font-bold text-[var(--color-accent)] mt-2">{formatUSD(entry.monthlySales)}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{entry.closingCount}건 클로징</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                entry.tier === '슈퍼 ★★★' ? 'bg-red-500/20 text-red-400' :
                entry.tier === '가속 ★★' ? 'bg-orange-500/20 text-orange-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {entry.tier}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 전체 순위 테이블 */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-medium text-white">전체 순위</h3>
        </div>

        {/* 테이블 헤더 */}
        <div className="grid grid-cols-[40px_1fr_60px_100px_80px_100px_80px] gap-2 px-5 py-3 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)]">
          <span>#</span>
          <span>이름</span>
          <span>팀</span>
          <span className="text-right">이번달 매출</span>
          <span className="text-right">클로징</span>
          <span className="text-right">커미션</span>
          <span className="text-right">티어</span>
        </div>

        {stats.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] p-5">영업 기록이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {stats.map((entry, idx) => {
              const commission = entry.monthlySales * entry.commissionRate
              return (
                <div
                  key={entry.profile.id}
                  className={`grid grid-cols-[40px_1fr_60px_100px_80px_100px_80px] gap-2 px-5 py-3 items-center text-xs ${
                    idx < 3 ? 'bg-[var(--color-bg-hover)]' : ''
                  }`}
                >
                  <span className={`font-bold ${
                    idx === 0 ? 'text-yellow-400' :
                    idx === 1 ? 'text-gray-300' :
                    idx === 2 ? 'text-orange-400' :
                    'text-[var(--color-text-muted)]'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-white font-medium truncate">{entry.profile.full_name || '(이름 없음)'}</span>
                  <span className={`text-[10px] ${
                    entry.profile.sales_team === 'team1' ? 'text-blue-400' :
                    entry.profile.sales_team === 'team2' ? 'text-purple-400' :
                    'text-[var(--color-text-muted)]'
                  }`}>
                    {entry.profile.sales_team === 'team1' ? '1팀' : entry.profile.sales_team === 'team2' ? '2팀' : '—'}
                  </span>
                  <span className="text-right text-[var(--color-accent)]">{formatUSD(entry.monthlySales)}</span>
                  <span className="text-right text-[var(--color-text-secondary)]">{entry.closingCount}건</span>
                  <span className="text-right text-green-400">{formatUSD(commission)}</span>
                  <span className={`text-right text-[10px] ${
                    entry.tier === '슈퍼 ★★★' ? 'text-red-400' :
                    entry.tier === '가속 ★★' ? 'text-orange-400' :
                    'text-[var(--color-text-muted)]'
                  }`}>
                    {entry.tier}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
