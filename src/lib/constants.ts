import { type LandGrade } from '@/types'

export const LAND_GRADES: Record<LandGrade, {
  label: string
  price: number
  supply: number
  color: string
  bgColor: string
}> = {
  central_crystal: {
    label: 'Central Crystal',
    price: 3599,
    supply: 700,
    color: '#f59e0b',
    bgColor: 'bg-amber-500/20',
  },
  skyline: {
    label: 'Skyline Penthouse',
    price: 1499,
    supply: 3500,
    color: '#8b5cf6',
    bgColor: 'bg-violet-500/20',
  },
  neon: {
    label: 'Neon Crossroad',
    price: 759,
    supply: 7800,
    color: '#ec4899',
    bgColor: 'bg-pink-500/20',
  },
  riverside: {
    label: 'Riverside Block',
    price: 399,
    supply: 12000,
    color: '#06b6d4',
    bgColor: 'bg-cyan-500/20',
  },
  startup: {
    label: 'Startup Alley',
    price: 199,
    supply: 26000,
    color: '#22c55e',
    bgColor: 'bg-green-500/20',
  },
}

export const CELL_SIZE_PYEONG = 98

export const INVESTMENT_AMOUNTS = [5_000_000, 10_000_000, 30_000_000] as const

export const INVESTMENT_OPTIONS = {
  option1: {
    label: '옵션 1 — 매일 이자 지급 (1년)',
    description: '매일 이자 지급, 1년 계약. 종료 시 현금 50% + Riverside Block 10셀 지급',
    contractDays: 365,
    getDailyPayment: (amount: number) => {
      const base = 30_000
      const ratio = amount / 10_000_000
      return Math.round(base * ratio)
    },
  },
  option2: {
    label: '옵션 2 — 원금+이자 100일 분할 (일요일 제외)',
    description: '원금과 이자를 매일 100일 지급 (일요일 제외). 100일 후 계약 종료',
    contractDays: 100,
    getDailyPayment: (amount: number) => {
      const base = 154_000
      const ratio = amount / 10_000_000
      return Math.round(base * ratio)
    },
  },
} as const

export const COMPANY_INFO = {
  name: '주식회사 렌더코아에이아이',
  representative: 'AN JAE HYUN',
  businessNumber: '527-88-03631',
}

export const COMMISSION_RATES = {
  base: 0.30,
  tier1: { threshold: 50_000, bonus: 0.05 },
  tier2: { threshold: 100_000, bonus: 0.10 },
}
