'use client'

import { useRef, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COMPANY_INFO, INVESTMENT_OPTIONS } from '@/lib/constants'
import { formatKRW, formatDate } from '@/lib/utils'
import type { Investment } from '@/types'

interface PromissoryNoteProps {
  investment: Investment
  onSigned: () => void
}

export function PromissoryNote({ investment, onSigned }: PromissoryNoteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signed, setSigned] = useState(!!investment.signed_at)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    setIsDrawing(true)
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasSignature(true)
  }

  function endDraw() {
    setIsDrawing(false)
  }

  function clearSignature() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function handleSign() {
    if (!hasSignature) return
    setSaving(true)

    const signatureData = canvasRef.current?.toDataURL('image/png') ?? ''
    const supabase = createClient()

    const { error } = await supabase
      .from('investments')
      .update({
        signed_at: new Date().toISOString(),
        signature_data: signatureData,
        status: 'confirmed',
      })
      .eq('id', investment.id)

    if (error) {
      alert(`서명 저장 실패: ${error.message}`)
    } else {
      setSigned(true)
      onSigned()
    }
    setSaving(false)
  }

  const optInfo = INVESTMENT_OPTIONS[investment.option]

  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-6">
      <div className="text-center border-b border-[var(--color-border)] pb-4">
        <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">차 용 증</h3>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Promissory Note</p>
      </div>

      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">채권자</span>
          <span className="text-white">투자자 (본인)</span>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">채무자</span>
          <span className="text-white">{COMPANY_INFO.name}</span>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">대표</span>
          <span className="text-white">{COMPANY_INFO.representative}</span>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">사업자번호</span>
          <span className="text-white">{COMPANY_INFO.businessNumber}</span>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] pt-4 space-y-3 text-sm">
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">투자 금액</span>
          <span className="text-white font-medium">{formatKRW(investment.amount)}</span>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">투자 옵션</span>
          <span className="text-white">{optInfo.label}</span>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">일일 지급액</span>
          <span className="text-[var(--color-accent)]">{formatKRW(investment.daily_payment)}</span>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">계약 기간</span>
          <span className="text-white">{investment.contract_days}일</span>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">등록일</span>
          <span className="text-white">{formatDate(investment.created_at)}</span>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] pt-4 space-y-3 text-sm">
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">입금 은행</span>
          <span className="text-white">{investment.bank_name}</span>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">계좌번호</span>
          <span className="text-white">{investment.account_number}</span>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-[var(--color-text-muted)]">예금주</span>
          <span className="text-white">{investment.account_holder}</span>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          상기 내용을 확인하였으며, 본 차용증에 서명함으로써 투자 계약에 동의합니다.
        </p>

        {signed ? (
          <div className="text-center py-4">
            <p className="text-sm text-green-400">서명 완료</p>
            {investment.signature_data && (
              <img
                src={investment.signature_data}
                alt="서명"
                className="mx-auto mt-2 rounded border border-[var(--color-border)]"
                style={{ width: 280, height: 120 }}
              />
            )}
            <button
              onClick={onSigned}
              className="mt-4 px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            >
              완료
            </button>
          </div>
        ) : (
          <>
            <div className="text-xs text-[var(--color-text-muted)] mb-2">아래에 서명하세요</div>
            <canvas
              ref={canvasRef}
              width={280}
              height={120}
              className="w-full rounded-lg border border-[var(--color-border)] cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={clearSignature}
                className="flex-1 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm hover:text-white transition-colors"
              >
                지우기
              </button>
              <button
                onClick={handleSign}
                disabled={!hasSignature || saving}
                className="flex-1 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? '저장 중...' : '서명 확인'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
