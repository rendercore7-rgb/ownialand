'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { formatUSD } from '@/lib/utils'
import { COMMISSION_RATES, LAND_GRADES } from '@/lib/constants'
import type { SalesRecord, LandGrade } from '@/types'

const BASE_SALARY_KRW = 2_500_000
const TEAM_INCENTIVE_RATE = 0.03
const USD_TO_KRW = 1350

export default function CommissionPage() {
  const [records, setRecords] = useState<SalesRecord[]>([])
  const [loading, setLoading] = useState(true)

  // 시뮬레이터
  const [simGrade, setSimGrade] = useState<LandGrade | ''>('')
  const [simQuantity, setSimQuantity] = useState(1)
  const [simDirect, setSimDirect] = useState('')

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

  function getRate(sales: number) {
    if (sales >= COMMISSION_RATES.tier2.threshold) return COMMISSION_RATES.base + COMMISSION_RATES.tier2.bonus
    if (sales >= COMMISSION_RATES.tier1.threshold) return COMMISSION_RATES.base + COMMISSION_RATES.tier1.bonus
    return COMMISSION_RATES.base
  }

  function getTierLabel(sales: number) {
    if (sales >= COMMISSION_RATES.tier2.threshold) return '슈퍼 ★★★'
    if (sales >= COMMISSION_RATES.tier1.threshold) return '가속 ★★'
    return '기본'
  }

  const currentRate = getRate(totalSales)
  const currentTier = getTierLabel(totalSales)
  const totalCommission = totalSales * currentRate

  // 다음 티어 프로그레스
  const nextTierInfo = useMemo(() => {
    if (totalSales >= COMMISSION_RATES.tier2.threshold) {
      return { label: '최고 티어 달성!', remaining: 0, progress: 100, nextLabel: '' }
    }
    if (totalSales >= COMMISSION_RATES.tier1.threshold) {
      const remaining = COMMISSION_RATES.tier2.threshold - totalSales
      const progress = ((totalSales - COMMISSION_RATES.tier1.threshold) / (COMMISSION_RATES.tier2.threshold - COMMISSION_RATES.tier1.threshold)) * 100
      return { label: '슈퍼 ★★★ 까지', remaining, progress, nextLabel: `+${COMMISSION_RATES.tier2.bonus * 100}%` }
    }
    const remaining = COMMISSION_RATES.tier1.threshold - totalSales
    const progress = (totalSales / COMMISSION_RATES.tier1.threshold) * 100
    return { label: '가속 ★★ 까지', remaining, progress, nextLabel: `+${COMMISSION_RATES.tier1.bonus * 100}%` }
  }, [totalSales])

  // 시뮬레이터 계산
  const simResult = useMemo(() => {
    let simSales = 0
    if (simDirect) {
      simSales = parseFloat(simDirect) || 0
    } else if (simGrade) {
      simSales = LAND_GRADES[simGrade].price * simQuantity
    }

    if (simSales === 0) return null

    const newTotal = totalSales + simSales
    const newRate = getRate(newTotal)
    const baseCommission = simSales * newRate
    const teamIncentive = simSales * TEAM_INCENTIVE_RATE
    const totalComm = baseCommission + teamIncentive
    const totalKRW = Math.round(totalComm * USD_TO_KRW)
    const expectedMonthly = BASE_SALARY_KRW + totalKRW

    return {
      simSales,
      newTotal,
      newRate,
      newTier: getTierLabel(newTotal),
      baseCommission,
      bonusRate: newRate - COMMISSION_RATES.base,
      bonusAmount: simSales * (newRate - COMMISSION_RATES.base),
      teamIncentive,
      totalComm,
      totalKRW,
      expectedMonthly,
    }
  }, [simGrade, simQuantity, simDirect, totalSales])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="수수료 계산" description="커미션을 시뮬레이션하고 실적을 확인하세요" />

      {/* 현재 실적 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">누적 매출</p>
          <p className="text-lg font-semibold text-white mt-1">{formatUSD(totalSales)}</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">현재 수수료율</p>
          <p className="text-lg font-semibold text-[var(--color-accent)] mt-1">{(currentRate * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">누적 수수료</p>
          <p className="text-lg font-semibold text-green-400 mt-1">{formatUSD(totalCommission)}</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">현재 티어</p>
          <p className={`text-lg font-semibold mt-1 ${
            currentTier === '슈퍼 ★★★' ? 'text-red-400' :
            currentTier === '가속 ★★' ? 'text-orange-400' :
            'text-[var(--color-text-secondary)]'
          }`}>{currentTier}</p>
        </div>
      </div>

      {/* 다음 티어 프로그레스 */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">{nextTierInfo.label}</h3>
          {nextTierInfo.remaining > 0 && (
            <span className="text-xs text-[var(--color-accent)]">{formatUSD(nextTierInfo.remaining)} 남음 {nextTierInfo.nextLabel}</span>
          )}
        </div>
        <div className="h-3 rounded-full bg-[var(--color-bg-hover)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              nextTierInfo.progress >= 100 ? 'bg-green-500' : 'bg-[var(--color-accent)]'
            }`}
            style={{ width: `${Math.min(nextTierInfo.progress, 100)}%` }}
          />
        </div>
      </div>

      {/* 커미션 시뮬레이터 */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 space-y-5">
        <h3 className="text-sm font-medium text-white">커미션 시뮬레이터</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 구역 선택 */}
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-2">LAND 구역 선택</label>
            <select
              value={simGrade}
              onChange={(e) => {
                setSimGrade(e.target.value as LandGrade | '')
                setSimDirect('')
              }}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm"
            >
              <option value="">직접 입력</option>
              {(Object.entries(LAND_GRADES) as [LandGrade, typeof LAND_GRADES[LandGrade]][]).map(([key, grade]) => (
                <option key={key} value={key}>
                  {grade.label} — {formatUSD(grade.price)}/셀
                </option>
              ))}
            </select>
          </div>

          {/* 수량 또는 직접 입력 */}
          {simGrade ? (
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-2">판매 수량 (셀)</label>
              <input
                type="number"
                min={1}
                value={simQuantity}
                onChange={(e) => setSimQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-2">매출 직접 입력 (USD)</label>
              <input
                type="number"
                min={0}
                value={simDirect}
                onChange={(e) => setSimDirect(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          )}
        </div>

        {/* 시뮬레이션 결과 */}
        {simResult && (
          <div className="bg-[var(--color-bg-hover)] rounded-lg p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">시뮬레이션 매출</span>
              <span className="text-white">{formatUSD(simResult.simSales)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">기본 커미션 (30%)</span>
              <span className="text-white">{formatUSD(simResult.simSales * COMMISSION_RATES.base)}</span>
            </div>
            {simResult.bonusRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">가속 보너스 (+{(simResult.bonusRate * 100).toFixed(0)}%)</span>
                <span className="text-orange-400">{formatUSD(simResult.bonusAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">팀 인센티브 (3%)</span>
              <span className="text-blue-400">{formatUSD(simResult.teamIncentive)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-2 border-t border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">총 커미션</span>
              <span className="text-green-400">{formatUSD(simResult.totalComm)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">원화 환산 (₩{USD_TO_KRW.toLocaleString()}/USD)</span>
              <span className="text-white">₩{simResult.totalKRW.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-2 border-t border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">기본급 포함 예상 실수령액</span>
              <span className="text-[var(--color-accent)]">₩{simResult.expectedMonthly.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-[var(--color-text-muted)]">적용 티어</span>
              <span className={
                simResult.newTier === '슈퍼 ★★★' ? 'text-red-400' :
                simResult.newTier === '가속 ★★' ? 'text-orange-400' :
                'text-[var(--color-text-secondary)]'
              }>{simResult.newTier} ({(simResult.newRate * 100).toFixed(0)}%)</span>
            </div>
          </div>
        )}
      </div>

      {/* 거래별 수수료 내역 */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)]">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-medium text-white">거래별 수수료 내역</h3>
        </div>
        {records.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] p-5">영업 기록이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {records.map((r) => {
              const runningTotal = records
                .filter((rec) => new Date(rec.created_at) <= new Date(r.created_at))
                .reduce((sum, rec) => sum + rec.amount, 0)
              const rate = getRate(runningTotal)
              const commission = r.amount * rate

              return (
                <div key={r.id} className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{r.description}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      매출 {formatUSD(r.amount)} x {(rate * 100).toFixed(0)}%
                    </p>
                  </div>
                  <p className="text-sm font-medium text-green-400">{formatUSD(commission)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
