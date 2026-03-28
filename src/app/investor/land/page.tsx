'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatUSD, formatDate } from '@/lib/utils'
import { LAND_GRADES, CELL_SIZE_PYEONG } from '@/lib/constants'
import type { LandTransaction, LandGrade } from '@/types'

export default function LandPage() {
  const [transactions, setTransactions] = useState<LandTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showPurchase, setShowPurchase] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState<LandGrade>('riverside')
  const [cells, setCells] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'usdt' | 'bank'>('bank')
  const [submitting, setSubmitting] = useState(false)

  const loadTransactions = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('land_transactions')
      .select('*')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setTransactions(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  async function handlePurchase() {
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      return
    }

    const grade = LAND_GRADES[selectedGrade]
    const totalPrice = grade.price * cells

    const { error } = await supabase.from('land_transactions').insert({
      buyer_id: user.id,
      land_id: null,
      price: totalPrice,
      grade: selectedGrade,
      payment_method: paymentMethod,
      status: 'pending',
    })

    if (!error) {
      setShowPurchase(false)
      setCells(1)
      await loadTransactions()
    }
    setSubmitting(false)
  }

  const totalCells = transactions
    .filter((t) => t.status === 'approved')
    .reduce((sum) => sum + 1, 0)
  const totalPyeong = totalCells * CELL_SIZE_PYEONG

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--color-text-muted)]">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="LAND 구매"
        description="OWNIA LAND를 구매하세요"
        action={
          <button
            onClick={() => setShowPurchase(!showPurchase)}
            className="px-4 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors"
          >
            {showPurchase ? '취소' : '+ LAND 구매'}
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="보유 셀" value={`${totalCells}셀`} />
        <StatCard label="보유 면적" value={`${totalPyeong.toLocaleString()}평`} sub={`1셀 = ${CELL_SIZE_PYEONG}평`} />
        <StatCard label="구매 신청" value={`${transactions.length}건`} />
      </div>

      {showPurchase && (
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
          <h3 className="text-lg font-medium text-white">LAND 구매 신청</h3>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-3">등급 선택</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(Object.entries(LAND_GRADES) as [LandGrade, typeof LAND_GRADES[LandGrade]][]).map(
                ([key, grade]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedGrade(key)}
                    className={`text-left p-4 rounded-lg border transition-colors ${
                      selectedGrade === key
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                        : 'border-[var(--color-border)] bg-[var(--color-bg-hover)] hover:border-[var(--color-text-muted)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: grade.color }} />
                      <span className="text-sm font-medium text-white">{grade.label}</span>
                    </div>
                    <p className="text-sm text-[var(--color-accent)]">{formatUSD(grade.price)}/셀</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      총 {grade.supply.toLocaleString()}셀 · {CELL_SIZE_PYEONG}평/셀
                    </p>
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">구매 수량 (셀)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={cells}
              onChange={(e) => setCells(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-3 rounded-lg bg-[var(--color-bg-hover)] border border-[var(--color-border)] text-white focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-3">결제 방법</label>
            <div className="flex gap-3">
              <button
                onClick={() => setPaymentMethod('bank')}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                  paymentMethod === 'bank'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                계좌이체
              </button>
              <button
                onClick={() => setPaymentMethod('usdt')}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                  paymentMethod === 'usdt'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
                }`}
              >
                USDT
              </button>
            </div>
          </div>

          <div className="bg-[var(--color-bg-hover)] rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">등급</span>
              <span className="text-white">{LAND_GRADES[selectedGrade].label}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">단가</span>
              <span className="text-white">{formatUSD(LAND_GRADES[selectedGrade].price)}/셀</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">수량</span>
              <span className="text-white">{cells}셀 ({(cells * CELL_SIZE_PYEONG).toLocaleString()}평)</span>
            </div>
            <div className="flex justify-between text-sm font-medium pt-2 border-t border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)]">합계</span>
              <span className="text-[var(--color-accent)]">{formatUSD(LAND_GRADES[selectedGrade].price * cells)}</span>
            </div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? '신청 중...' : '구매 신청'}
          </button>
        </div>
      )}

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="text-sm font-medium text-white mb-4">구매 내역</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">구매 내역이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 px-4 rounded-lg bg-[var(--color-bg-hover)]"
              >
                <div>
                  <p className="text-sm text-white">{LAND_GRADES[tx.grade].label}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {formatDate(tx.created_at)} · {tx.payment_method === 'usdt' ? 'USDT' : '계좌이체'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white">{formatUSD(tx.price)}</span>
                  <StatusBadge status={tx.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
