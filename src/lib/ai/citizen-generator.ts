import { supabaseAdmin } from '@/lib/supabase/admin'
import { type AiCitizen } from '@/types/city'
import { jsonCompletion } from './llm'
import {
  AI_CONFIG,
  CITIZEN_PROFESSIONS,
  CITIZEN_AVATARS,
  CITY_LORE,
} from './constants'

interface GeneratedCitizen {
  name: string
  age: number
  profession: string
  personality: string
  backstory: string
  investment_style: string
  interests: string[]
  wallet_balance: number
  mood: string
}

export async function generateCitizens(count: number): Promise<AiCitizen[]> {
  const clampedCount = Math.min(10, Math.max(1, count))

  // 기존 시민 이름 조회 — 중복 방지
  const { data: existing } = await supabaseAdmin
    .from('ai_citizens')
    .select('name')
  const existingNames = (existing ?? []).map((r) => r.name)
  const existingNamesStr = existingNames.length > 0
    ? `\n\n⚠️ 아래 이름은 이미 사용 중이므로 절대 사용하지 마세요:\n${existingNames.join(', ')}`
    : ''

  const professionsList = CITIZEN_PROFESSIONS.join(', ')

  const result = await jsonCompletion<{ citizens: GeneratedCitizen[] }>(
    [
      {
        role: 'system',
        content: `당신은 가상 도시 OWNIA LAND의 시민 캐릭터 생성기입니다.
${CITY_LORE}

OWNIA LAND는 전 세계에서 사람들이 모여드는 글로벌 가상 도시입니다.
다양하고 개성 있는 시민 캐릭터를 생성하세요. 각 시민은 고유한 배경과 투자 성향을 가져야 합니다.

🌍 이름은 다양한 국적으로 생성하세요:
- 한국: 김하늘, 박도현, 이서진
- 일본: Yuki Tanaka, Haruto Sato
- 중국: Li Wei, Zhang Mei
- 태국: Somchai, Ploy Kittisak
- 미국/유럽: Alex Chen, Maria Santos, James Miller
- 기타 국가도 자유롭게 포함

각 시민의 이름은 반드시 고유해야 합니다. 같은 이름을 두 번 사용하지 마세요.
${existingNamesStr}

직업은 다음 중에서 선택하되, 독창적으로 변형 가능: ${professionsList}

반드시 JSON 형식으로 응답하세요:
{
  "citizens": [
    {
      "name": "고유한 이름 (다양한 국적)",
      "age": 20-55 사이 정수,
      "profession": "직업",
      "personality": "1-2문장 성격 요약",
      "backstory": "3-4문장 배경 스토리. 이 도시에 온 이유와 목표 포함",
      "investment_style": "conservative | balanced | aggressive | speculative 중 하나",
      "interests": ["관심사1", "관심사2", "관심사3"],
      "wallet_balance": ${AI_CONFIG.CITIZEN_INITIAL_WALLET_MIN}-${AI_CONFIG.CITIZEN_INITIAL_WALLET_MAX} 사이 숫자,
      "mood": "excited | optimistic | neutral | cautious | worried 중 하나"
    }
  ]
}`,
      },
      {
        role: 'user',
        content: `${clampedCount}명의 새로운 OWNIA LAND 시민을 생성해주세요. 각 시민의 이름, 국적, 직업, 성격, 투자 성향이 최대한 다양해야 합니다. 기존 시민과 이름이 겹치면 안 됩니다.`,
      },
    ],
    { model: AI_CONFIG.COMPLEX_MODEL, maxTokens: 3000 }
  )

  // LLM이 중복 이름을 생성했을 경우 필터링
  const existingSet = new Set(existingNames.map((n) => n.toLowerCase()))
  const seenNames = new Set<string>()
  const uniqueCitizens = result.citizens.filter((c) => {
    const lower = c.name.toLowerCase()
    if (existingSet.has(lower) || seenNames.has(lower)) return false
    seenNames.add(lower)
    return true
  }).slice(0, clampedCount)

  if (uniqueCitizens.length === 0) {
    throw new Error('생성된 시민 이름이 모두 기존 시민과 중복됩니다. 다시 시도해주세요.')
  }

  const citizens = uniqueCitizens

  const validStyles = ['conservative', 'balanced', 'aggressive', 'speculative']
  const validMoods = ['excited', 'optimistic', 'neutral', 'cautious', 'worried']

  const rows = citizens.map((c, i) => {
    const rawBalance = Number(c.wallet_balance) || 0
    const clampedBalance = rawBalance < AI_CONFIG.CITIZEN_INITIAL_WALLET_MIN || rawBalance > AI_CONFIG.CITIZEN_INITIAL_WALLET_MAX
      ? Math.floor(Math.random() * (AI_CONFIG.CITIZEN_INITIAL_WALLET_MAX - AI_CONFIG.CITIZEN_INITIAL_WALLET_MIN)) + AI_CONFIG.CITIZEN_INITIAL_WALLET_MIN
      : rawBalance

    return {
      name: c.name,
      avatar_emoji: CITIZEN_AVATARS[i % CITIZEN_AVATARS.length],
      age: Math.min(55, Math.max(20, Number(c.age) || 30)),
      profession: c.profession,
      personality: c.personality,
      backstory: c.backstory,
      investment_style: validStyles.includes(c.investment_style) ? c.investment_style : 'balanced',
      interests: Array.isArray(c.interests) ? c.interests.slice(0, 5) : [],
      wallet_balance: clampedBalance,
      land_holdings: [],  // 초기 토지 없음 — 시뮬레이션 틱에서만 획득
      mood: validMoods.includes(c.mood) ? c.mood : 'neutral',
      status: 'active',
    }
  })

  const { data, error } = await supabaseAdmin
    .from('ai_citizens')
    .insert(rows)
    .select()

  if (error) {
    throw new Error(`Failed to insert citizens: ${error.message}`)
  }

  return (data ?? []) as AiCitizen[]
}
