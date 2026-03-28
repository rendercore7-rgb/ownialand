'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { formatUSD } from '@/lib/utils'
import type { Profile, SalesRecord } from '@/types'

interface SalesPersonStats {
  profile: Profile
  totalSales: number
  recordCount: number
}

export default function LeaderboardPage() {
  const [team1Stats, setTeam1Stats] = useState<SalesPersonStats[]>([])
  const [team2Stats, setTeam2Stats] = useState<SalesPersonStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [profilesRes, recordsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'sales'),
        supabase.from('sales_records').select('*'),
      ])

      const profiles = profilesRes.data ?? []
      const records = recordsRes.data as SalesRecord[] ?? []

      const buildStats = (team: 'team1' | 'team2'): SalesPersonStats[] => {
        return profiles
          .filter((p) => p.sales_team === team)
          .map((profile) => {
            const personRecords = records.filter((r) => r.sales_user_id === profile.id)
            return {
              profile,
              totalSales: personRecords.reduce((sum, r) => sum + r.amount, 0),
              recordCount: personRecords.length,
            }
          })
          .sort((a, b) => b.totalSales - a.totalSales)
      }

      setTeam1Stats(buildStats('team1'))
      setTeam2Stats(buildStats('team2'))
      setLoading(false)
    }
    load()
  }, [])

  const team1Total = team1Stats.reduce((sum, s) => sum + s.totalSales, 0)
  const team2Total = team2Stats.reduce((sum, s) => sum + s.totalSales, 0)
  const maxTotal = Math.max(team1Total, team2Total, 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="리더보드" description="Team 1 vs Team 2 실적 비교" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">Team 1 총 매출</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{formatUSD(team1Total)}</p>
          <div className="mt-3 h-2 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${(team1Total / maxTotal) * 100}%` }}
            />
          </div>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">Team 2 총 매출</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{formatUSD(team2Total)}</p>
          <div className="mt-3 h-2 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-700"
              style={{ width: `${(team2Total / maxTotal) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamBoard title="Team 1" stats={team1Stats} color="blue" />
        <TeamBoard title="Team 2" stats={team2Stats} color="purple" />
      </div>
    </div>
  )
}

function TeamBoard({
  title,
  stats,
  color,
}: {
  title: string
  stats: SalesPersonStats[]
  color: 'blue' | 'purple'
}) {
  const maxSales = stats.length > 0 ? Math.max(...stats.map((s) => s.totalSales), 1) : 1
  const colorMap = {
    blue: { badge: 'bg-blue-500/20 text-blue-400', bar: 'bg-blue-500' },
    purple: { badge: 'bg-purple-500/20 text-purple-400', bar: 'bg-purple-500' },
  }
  const colors = colorMap[color]

  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.badge}`}>{title}</span>
        <span className="text-xs text-[var(--color-text-muted)]">{stats.length}명</span>
      </div>
      {stats.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">팀원이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {stats.map((s, idx) => (
            <div key={s.profile.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-text-muted)] w-5">{idx + 1}</span>
                  <span className="text-white font-medium">{s.profile.full_name || '(이름 없음)'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--color-text-muted)]">{s.recordCount}건</span>
                  <span className="text-[var(--color-accent)] font-medium">{formatUSD(s.totalSales)}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
                <div
                  className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                  style={{ width: `${(s.totalSales / maxSales) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
