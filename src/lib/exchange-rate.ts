const FALLBACK_RATE = 1350
const CACHE_KEY = 'usd_krw_rate'
const CACHE_DURATION = 1000 * 60 * 60 // 1시간

interface CachedRate {
  rate: number
  timestamp: number
}

export async function getUSDtoKRW(): Promise<number> {
  // 브라우저 캐시 확인
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed: CachedRate = JSON.parse(cached)
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          return parsed.rate
        }
      }
    } catch {
      // 캐시 읽기 실패 무시
    }
  }

  try {
    const res = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()

    if (data.result === 'success' && data.rates?.KRW) {
      const rate = Math.round(data.rates.KRW)

      if (typeof window !== 'undefined') {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, timestamp: Date.now() }))
      }

      return rate
    }
  } catch {
    // API 실패 시 폴백
  }

  return FALLBACK_RATE
}
