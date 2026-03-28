'use client'

import { useState, useMemo } from 'react'
import { formatKRW, isBefore12PM } from '@/lib/utils'
import type { PaymentRequest, Investment } from '@/types'

interface PaymentCalendarProps {
  payments: PaymentRequest[]
  investment: Investment
  onRequestPayment: (date: string) => Promise<void>
  todayRequested: boolean
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function PaymentCalendar({ payments, investment, onRequestPayment, todayRequested }: PaymentCalendarProps) {
  const startDate = investment.start_date ?? investment.created_at
  const start = new Date(startDate)
  const [selectedYear, setSelectedYear] = useState(start.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(start.getMonth())
  const [requesting, setRequesting] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  const paymentStartDate = useMemo(() => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + 7)
    return d
  }, [startDate])

  const paymentEndDate = useMemo(() => {
    const d = new Date(paymentStartDate)
    d.setDate(d.getDate() + investment.contract_days)
    return d
  }, [paymentStartDate, investment.contract_days])

  // 지급 가능 날짜
  const eligibleDates = useMemo(() => {
    const dates = new Set<string>()
    const d = new Date(paymentStartDate)
    const end = paymentEndDate

    while (d <= end) {
      const isSunday = d.getDay() === 0
      if (investment.option === 'option2' && isSunday) {
        d.setDate(d.getDate() + 1)
        continue
      }
      dates.add(d.toISOString().split('T')[0])
      d.setDate(d.getDate() + 1)
    }
    return dates
  }, [paymentStartDate, paymentEndDate, investment.option])

  // 요청된 날짜 Set
  const requestedDates = useMemo(() => {
    const dates = new Set<string>()
    for (const p of payments) {
      dates.add(p.payment_date)
    }
    return dates
  }, [payments])

  // 결제 맵
  const paymentMap = useMemo(() => {
    const map: Record<string, PaymentRequest> = {}
    for (const p of payments) {
      map[p.payment_date] = p
    }
    return map
  }, [payments])

  const monthOptions = useMemo(() => {
    const options: { year: number; month: number; label: string }[] = []
    const d = new Date(start)
    const monthCount = investment.option === 'option1' ? 14 : 6
    for (let i = 0; i < monthCount; i++) {
      options.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
      })
      d.setMonth(d.getMonth() + 1)
    }
    return options
  }, [startDate, investment.option])

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
  const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth)

  const monthPayments = payments.filter((p) => {
    const d = new Date(p.payment_date)
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
  })

  const monthEligibleCount = Array.from(eligibleDates).filter((d) => {
    const date = new Date(d)
    return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth
  }).length

  // 미지급 일수 (지급 가능인데 요청 안 한 과거 날짜)
  const missedDates = useMemo(() => {
    const missed: string[] = []
    for (const d of eligibleDates) {
      if (d <= todayStr && !requestedDates.has(d)) {
        missed.push(d)
      }
    }
    return missed
  }, [eligibleDates, requestedDates, todayStr])

  const monthTotal = monthEligibleCount * investment.daily_payment
  const transferred = monthPayments.filter((p) => p.status === 'transferred')
  const transferredTotal = transferred.reduce((sum, p) => sum + p.amount, 0)

  function handleDateClick(dateStr: string) {
    // 오늘 또는 과거 미요청 날짜 클릭 가능
    if (!eligibleDates.has(dateStr)) return
    if (requestedDates.has(dateStr)) return
    if (dateStr > todayStr) return // 미래는 불가
    if (dateStr === todayStr && todayRequested) return

    setSelectedDate(dateStr)
  }

  async function confirmRequest() {
    if (!selectedDate) return
    setRequesting(true)
    await onRequestPayment(selectedDate)
    setRequesting(false)
    setSelectedDate(null)
  }

  return (
    <div className="space-y-4">
      {/* 미지급 알림 */}
      {missedDates.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">
          미지급 {missedDates.length}일 — 날짜를 클릭하여 요청하세요
        </div>
      )}

      {/* 월 선택 */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {monthOptions.map((opt) => (
          <button
            key={`${opt.year}-${opt.month}`}
            onClick={() => {
              setSelectedYear(opt.year)
              setSelectedMonth(opt.month)
            }}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
              selectedYear === opt.year && selectedMonth === opt.month
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 범례 */}
      <div className="flex gap-3 text-xs flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500/60" /> 미지급
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-yellow-500/60" /> 요청됨
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500/60" /> 확인됨
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-500/60" /> 송금완료
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/20" /> 지급 예정
        </span>
      </div>

      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d} className="py-2 text-[var(--color-text-muted)] font-medium">{d}</div>
        ))}

        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = toDateStr(selectedYear, selectedMonth, day)
          const payment = paymentMap[dateStr]
          const isEligible = eligibleDates.has(dateStr)
          const isSun = new Date(selectedYear, selectedMonth, day).getDay() === 0
          const isToday = dateStr === todayStr
          const isPast = dateStr <= todayStr
          const isMissed = isEligible && isPast && !payment // 지급 가능인데 요청 안 함
          const isFutureEligible = isEligible && !isPast && !payment
          const canClick = isMissed || (isToday && isEligible && !payment && !todayRequested)

          let cellClass = 'text-[var(--color-text-muted)]'

          if (payment) {
            // 상태별 색상
            const statusColors: Record<string, string> = {
              requested: 'bg-yellow-500/60 text-white',
              confirmed: 'bg-blue-500/60 text-white',
              transferred: 'bg-green-500/60 text-white',
            }
            cellClass = statusColors[payment.status] ?? 'bg-gray-500/30 text-white'
          } else if (isMissed) {
            cellClass = 'bg-red-500/40 text-white'
          } else if (isFutureEligible) {
            cellClass = 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 text-[var(--color-accent)]'
          } else if (isSun && investment.option === 'option2') {
            cellClass = 'text-red-400/30'
          }

          return (
            <button
              key={day}
              type="button"
              onClick={() => canClick && handleDateClick(dateStr)}
              className={`relative py-2 rounded-md text-xs transition-all ${cellClass} ${
                isToday ? 'ring-2 ring-white/70' : ''
              } ${canClick ? 'cursor-pointer hover:ring-2 hover:ring-[var(--color-accent)]' : 'cursor-default'}`}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* 지급 요청 확인 팝업 */}
      {selectedDate && (
        <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-xl p-5 space-y-3">
          <p className="text-sm text-white font-medium">지급 요청 확인</p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {selectedDate} · {formatKRW(investment.daily_payment)}
            {selectedDate === todayStr
              ? isBefore12PM() ? ' · 당일 송금' : ' · 익일 송금'
              : ' · 소급 요청'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmRequest}
              disabled={requesting}
              className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {requesting ? '요청 중...' : '지급 요청'}
            </button>
            <button
              onClick={() => setSelectedDate(null)}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm hover:text-white transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 지급 시작일 안내 */}
      <div className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-hover)] rounded-lg px-4 py-3">
        지급 시작일: <span className="text-white">{paymentStartDate.toLocaleDateString('ko-KR')}</span>
        {' '}(투자일로부터 7일 후)
        {investment.option === 'option2' && <span> · 일요일 제외</span>}
      </div>

      {/* 이번 달 요약 */}
      <div className="bg-[var(--color-bg-hover)] rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">이번 달 지급 가능일</span>
          <span className="text-white">{monthEligibleCount}일</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">이번 달 예정액</span>
          <span className="text-white">{formatKRW(monthTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">미지급일</span>
          <span className="text-red-400">{missedDates.filter((d) => {
            const date = new Date(d)
            return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth
          }).length}일</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">요청 완료</span>
          <span className="text-white">{monthPayments.length}건</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">송금 완료</span>
          <span className="text-green-400">{formatKRW(transferredTotal)}</span>
        </div>
      </div>

      {/* 상세 내역 */}
      {monthPayments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white">상세 내역</h4>
          <div className="space-y-1">
            {monthPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-bg-card)] text-xs"
              >
                <span className="text-[var(--color-text-secondary)]">{p.payment_date}</span>
                <span className="text-white">{formatKRW(p.amount)}</span>
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    p.status === 'transferred'
                      ? 'bg-green-500/20 text-green-400'
                      : p.status === 'confirmed'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {p.status === 'transferred' ? '완료' : p.status === 'confirmed' ? '확인' : '요청'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
