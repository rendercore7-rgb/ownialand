export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

export function formatUSD(amount: number): string {
  return '$' + new Intl.NumberFormat('en-US').format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0
}

export function isBefore12PM(): boolean {
  const now = new Date()
  return now.getHours() < 12
}

export function getPaymentDate(): string {
  const now = new Date()
  if (now.getHours() >= 12) {
    now.setDate(now.getDate() + 1)
  }
  return now.toISOString().split('T')[0]
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    requested: 'bg-yellow-500/20 text-yellow-400',
    confirmed: 'bg-blue-500/20 text-blue-400',
    transferred: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    active: 'bg-green-500/20 text-green-400',
    completed: 'bg-gray-500/20 text-gray-400',
    cancelled: 'bg-red-500/20 text-red-400',
    available: 'bg-green-500/20 text-green-400',
    reserved: 'bg-orange-500/20 text-orange-400',
    sold: 'bg-red-500/20 text-red-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
  }
  return colors[status] ?? 'bg-gray-500/20 text-gray-400'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    requested: '요청됨',
    confirmed: '확인됨',
    transferred: '송금완료',
    pending: '대기중',
    active: '진행중',
    completed: '완료',
    cancelled: '해지',
    available: '구매가능',
    reserved: '예약됨',
    sold: '판매완료',
    approved: '승인됨',
    rejected: '거절됨',
  }
  return labels[status] ?? status
}
