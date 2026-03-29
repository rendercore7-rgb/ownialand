'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatUSD, formatDate } from '@/lib/utils'
import { LAND_GRADES, CELL_SIZE_PYEONG } from '@/lib/constants'
import type { Land, LandTransaction, LandGrade } from '@/types'

const GRID_SIZE = 100
const CELL_PX = 6
const CANVAS_SIZE = GRID_SIZE * CELL_PX

// 등급별 색상 (절대 변경 금지)
const GRADE_COLORS: Record<LandGrade, string> = {
  central_crystal: '#f5a623',
  skyline: '#8b5cf6',
  neon: '#3b82f6',
  riverside: '#22c55e',
  startup: '#9ca3af',
}

const GRADE_COLORS_SOLD: Record<LandGrade, string> = {
  central_crystal: '#7a5312',
  skyline: '#46307b',
  neon: '#1e4178',
  riverside: '#11632e',
  startup: '#4e5156',
}

interface SelectedCell {
  x: number
  y: number
  land: Land | null
}

export default function LandPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [lands, setLands] = useState<Map<string, Land>>(new Map())
  const [transactions, setTransactions] = useState<LandTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const [showPurchase, setShowPurchase] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState<LandGrade>('riverside')
  const [cells, setCells] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'usdt' | 'bank'>('bank')
  const [submitting, setSubmitting] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // lands: 10,000행 → 1,000행씩 분할 로드
    const allLands: Land[] = []
    let from = 0
    const pageSize = 1000
    while (true) {
      const { data } = await supabase
        .from('lands')
        .select('id, grid_x, grid_y, grade, status, price, owner_id, profiles(full_name)')
        .range(from, from + pageSize - 1)
      if (!data || data.length === 0) break
      allLands.push(...(data as unknown as Land[]))
      if (data.length < pageSize) break
      from += pageSize
    }

    const map = new Map<string, Land>()
    for (const land of allLands) {
      map.set(`${land.grid_x}-${land.grid_y}`, land)
    }
    setLands(map)

    const { data: txData } = await supabase
      .from('land_transactions')
      .select('*')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })

    if (txData) setTransactions(txData)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || lands.size === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const land = lands.get(`${x}-${y}`)
        if (!land) {
          ctx.fillStyle = '#1a1a2e'
        } else if (land.status === 'sold') {
          ctx.fillStyle = GRADE_COLORS_SOLD[land.grade as LandGrade] ?? '#333'
        } else {
          ctx.fillStyle = GRADE_COLORS[land.grade as LandGrade] ?? '#555'
        }
        ctx.fillRect(x * CELL_PX, y * CELL_PX, CELL_PX - 1, CELL_PX - 1)
      }
    }

    // 선택된 셀 하이라이트
    if (selectedCell) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(
        selectedCell.x * CELL_PX - 1,
        selectedCell.y * CELL_PX - 1,
        CELL_PX + 1,
        CELL_PX + 1
      )
    }
  }, [lands, selectedCell])

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_SIZE / rect.width
    const scaleY = CANVAS_SIZE / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX / CELL_PX)
    const y = Math.floor((e.clientY - rect.top) * scaleY / CELL_PX)

    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return

    const land = lands.get(`${x}-${y}`) ?? null
    setSelectedCell({ x, y, land })
  }

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

    if (error) {
      alert(`구매 신청 실패: ${error.message}`)
    } else {
      setShowPurchase(false)
      setJustSubmitted(true)
      setCells(1)
      await loadData()
    }
    setSubmitting(false)
  }

  const totalCells = transactions
    .filter((t) => t.status === 'approved')
    .reduce((sum) => sum + 1, 0)
  const totalPyeong = totalCells * CELL_SIZE_PYEONG

  // 등급별 통계
  const gradeStats = Array.from(lands.values()).reduce((acc, land) => {
    const grade = land.grade as LandGrade
    if (!acc[grade]) acc[grade] = { total: 0, sold: 0, available: 0 }
    acc[grade].total++
    if (land.status === 'sold') acc[grade].sold++
    else acc[grade].available++
    return acc
  }, {} as Record<LandGrade, { total: number; sold: number; available: number }>)

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
        title="LAND 지도"
        description="OWNIA LAND 지도를 확인하고 구매하세요"
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

      {/* 캔버스 그리드 + 정보 패널 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
          {/* 범례 */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs">
            {(Object.entries(GRADE_COLORS) as [LandGrade, string][]).map(([grade, color]) => (
              <span key={grade} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                {LAND_GRADES[grade].label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-gray-700" /> Sold
            </span>
          </div>

          {/* 캔버스 */}
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            onClick={handleCanvasClick}
            className="w-full aspect-square rounded-lg cursor-crosshair"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* 셀 정보 패널 */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 space-y-4">
          <h3 className="text-sm font-medium text-white">셀 정보</h3>

          {selectedCell ? (
            selectedCell.land ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-[var(--color-text-muted)] text-xs">좌표</span>
                  <p className="text-white">({selectedCell.x}, {selectedCell.y})</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] text-xs">등급</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: GRADE_COLORS[selectedCell.land.grade as LandGrade] }}
                    />
                    <span className="text-white">{LAND_GRADES[selectedCell.land.grade as LandGrade]?.label}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] text-xs">가격</span>
                  <p className="text-[var(--color-accent)]">{formatUSD(selectedCell.land.price)}</p>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)] text-xs">상태</span>
                  <div className="mt-0.5">
                    <StatusBadge status={selectedCell.land.status} />
                  </div>
                </div>
                {selectedCell.land.status === 'sold' && (
                  <div>
                    <span className="text-[var(--color-text-muted)] text-xs">소유자</span>
                    <p className="text-white">
                      {(selectedCell.land as unknown as { profiles?: { full_name: string } }).profiles?.full_name ?? '—'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                ({selectedCell.x}, {selectedCell.y}) — 데이터 없음
              </p>
            )
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">셀을 클릭하여 정보를 확인하세요</p>
          )}

          {/* 등급별 현황 */}
          <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
            <h4 className="text-xs text-[var(--color-text-muted)]">등급별 현황</h4>
            {(Object.entries(GRADE_COLORS) as [LandGrade, string][]).map(([grade, color]) => {
              const stat = gradeStats[grade]
              if (!stat) return null
              return (
                <div key={grade} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[var(--color-text-secondary)]">{LAND_GRADES[grade].label}</span>
                  </div>
                  <span className="text-[var(--color-text-muted)]">
                    {stat.sold}/{stat.total}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 구매 폼 */}
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
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: GRADE_COLORS[key] }} />
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

          {paymentMethod === 'bank' && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-blue-400">입금 계좌 정보</p>
              <div className="grid grid-cols-[60px_1fr] gap-1.5 text-sm">
                <span className="text-[var(--color-text-muted)]">은행</span>
                <span className="text-white">농협</span>
                <span className="text-[var(--color-text-muted)]">계좌</span>
                <span className="text-white font-mono">355-0095-7077-13</span>
                <span className="text-[var(--color-text-muted)]">예금주</span>
                <span className="text-white">(주)렌더코어에이아이</span>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] pt-1">
                위 계좌로 입금 후 아래 버튼을 눌러주세요.
              </p>
            </div>
          )}

          {paymentMethod === 'usdt' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-emerald-400">USDT 입금 주소 (ERC-20)</p>
              <div className="bg-black/30 rounded-lg p-3">
                <p className="text-xs text-white font-mono break-all select-all">
                  0x7b591b8ab50282b7a4bc70cb4a1e2f6f4ffa36e4
                </p>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] pt-1">
                위 주소로 USDT를 전송한 후 아래 버튼을 눌러주세요.
              </p>
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? '신청 중...' : paymentMethod === 'bank' ? '입금 완료' : '전송 완료'}
          </button>
        </div>
      )}

      {/* 입금 확인 대기 안내 */}
      {justSubmitted && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5 text-center space-y-2">
          <p className="text-sm font-medium text-yellow-400">입금 확인 대기중</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            관리자가 입금을 확인한 후 승인 처리됩니다. 잠시만 기다려주세요.
          </p>
        </div>
      )}

      {/* 구매 내역 */}
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
