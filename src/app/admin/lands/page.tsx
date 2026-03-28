'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatUSD, formatDate } from '@/lib/utils'
import { LAND_GRADES } from '@/lib/constants'
import type { Land, LandGrade, LandStatus } from '@/types'

type FilterGrade = 'all' | LandGrade
type FilterStatus = 'all' | LandStatus

const PAGE_SIZE = 50

const GRADE_FILTERS: { label: string; value: FilterGrade }[] = [
  { label: '전체', value: 'all' },
  { label: 'Central Crystal', value: 'central_crystal' },
  { label: 'Skyline', value: 'skyline' },
  { label: 'Neon', value: 'neon' },
  { label: 'Riverside', value: 'riverside' },
  { label: 'Startup', value: 'startup' },
]

const STATUS_FILTERS: { label: string; value: FilterStatus }[] = [
  { label: '전체', value: 'all' },
  { label: '판매가능', value: 'available' },
  { label: '예약중', value: 'reserved' },
  { label: '판매완료', value: 'sold' },
]

export default function AdminLandsPage() {
  const [allLands, setAllLands] = useState<Land[]>([])
  const [loading, setLoading] = useState(true)
  const [gradeFilter, setGradeFilter] = useState<FilterGrade>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [page, setPage] = useState(1)

  const loadLands = useCallback(async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('lands')
      .select('*, profiles(full_name)')
      .order('grade', { ascending: true })
      .order('grid_x', { ascending: true })
      .order('grid_y', { ascending: true })

    if (data) setAllLands(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadLands()
  }, [loadLands])

  const filtered = useMemo(() => {
    let result = allLands
    if (gradeFilter !== 'all') {
      result = result.filter((land) => land.grade === gradeFilter)
    }
    if (statusFilter !== 'all') {
      result = result.filter((land) => land.status === statusFilter)
    }
    return result
  }, [allLands, gradeFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setPage(1)
  }, [gradeFilter, statusFilter])

  const stats = useMemo(() => {
    const totalCount = allLands.length
    const soldCount = allLands.filter((l) => l.status === 'sold').length
    const reservedCount = allLands.filter((l) => l.status === 'reserved').length
    const availableCount = allLands.filter((l) => l.status === 'available').length
    const totalSalesUSD = allLands
      .filter((l) => l.status === 'sold')
      .reduce((sum, l) => sum + l.price, 0)
    return { totalCount, soldCount, reservedCount, availableCount, totalSalesUSD }
  }, [allLands])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="LAND 관리" description="전체 LAND 필지를 조회하고 관리하세요" />

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="전체 필지수" value={`${stats.totalCount}필지`} />
        <StatCard label="판매완료" value={`${stats.soldCount}필지`} color="text-green-400" />
        <StatCard label="예약중" value={`${stats.reservedCount}필지`} color="text-yellow-400" />
        <StatCard label="판매가능" value={`${stats.availableCount}필지`} />
        <StatCard label="총 판매 매출" value={formatUSD(stats.totalSalesUSD)} accent />
      </div>

      {/* 등급 필터 */}
      <div className="space-y-3">
        <p className="text-xs text-[var(--color-text-muted)]">등급 필터</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {GRADE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setGradeFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                gradeFilter === f.value
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 상태 필터 */}
      <div className="space-y-3">
        <p className="text-xs text-[var(--color-text-muted)]">상태 필터</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                statusFilter === f.value
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 카운트 + 페이지 정보 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--color-text-muted)]">
          검색 결과: {filtered.length}필지
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {page} / {totalPages} 페이지
        </p>
      </div>

      {/* LAND 목록 */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        {paginated.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] p-5">해당하는 LAND가 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {paginated.map((land) => {
              const profile = land.profiles as unknown as { full_name: string } | undefined
              const grade = LAND_GRADES[land.grade]

              return (
                <div key={land.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: grade?.color }}
                        />
                        <p className="text-sm font-medium text-white">{grade?.label ?? land.grade}</p>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          ({land.grid_x}, {land.grid_y})
                        </span>
                        <StatusBadge status={land.status} />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
                        <div>
                          <span className="text-[var(--color-text-muted)]">등급</span>
                          <p className="text-white font-medium mt-0.5">{grade?.label}</p>
                          <p className="text-[var(--color-text-muted)] mt-0.5">{formatUSD(grade?.price ?? 0)}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">가격</span>
                          <p className="text-[var(--color-accent)] font-medium mt-0.5">{formatUSD(land.price)}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">좌표</span>
                          <p className="text-white mt-0.5">X: {land.grid_x} / Y: {land.grid_y}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">소유자</span>
                          <p className="text-white mt-0.5">{profile?.full_name ?? '—'}</p>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-muted)]">구매일</span>
                          <p className="text-white mt-0.5">
                            {land.status === 'sold' ? formatDate(land.updated_at) : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg text-sm bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            이전
          </button>

          {generatePageNumbers(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`dot-${i}`} className="px-2 text-[var(--color-text-muted)]">...</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={`w-10 h-10 rounded-lg text-sm transition-colors ${
                  page === p
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg text-sm bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent, color }: { label: string; value: string; accent?: boolean; color?: string }) {
  const textClass = accent
    ? 'text-[var(--color-accent)]'
    : color ?? 'text-white'

  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${textClass}`}>{value}</p>
    </div>
  )
}

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | '...')[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) pages.push('...')

  pages.push(total)

  return pages
}
