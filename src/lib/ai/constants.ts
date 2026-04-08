export const AI_CONFIG = {
  DEFAULT_MODEL: 'gpt-4o-mini' as const,
  COMPLEX_MODEL: 'gpt-4o' as const,
  MAX_CITIZENS_PER_TICK: 15,
  MAX_MEMORIES_PER_CITIZEN: 50,
  MEMORY_CONTEXT_LIMIT: 10,
  CITIZEN_INITIAL_WALLET_MIN: 500,
  CITIZEN_INITIAL_WALLET_MAX: 50000,
  ACTION_PROBABILITY: {
    conservative: 0.3,
    balanced: 0.5,
    aggressive: 0.7,
    speculative: 0.9,
  },
} as const

export const CITIZEN_PROFESSIONS = [
  // 테크 & 개발
  '테크 창업가',
  'AI 엔지니어',
  '게임 개발자',
  '데이터 사이언티스트',
  '블록체인 개발자',
  '사이버 보안 전문가',
  '로보틱스 엔지니어',
  'VR/AR 디자이너',

  // 크리에이티브 & 미디어
  '디지털 아티스트',
  '콘텐츠 크리에이터',
  '음악 프로듀서',
  '패션 디자이너',
  '영화 감독',
  'UX 디자이너',
  '웹툰 작가',
  '사진작가',

  // 금융 & 투자
  '크립토 트레이더',
  '스타트업 투자자',
  'NFT 컬렉터',
  '핀테크 기획자',
  '벤처 캐피탈리스트',
  '퀀트 분석가',

  // 부동산 & 건축
  '부동산 중개인',
  '도시 설계사',
  '가상 건축가',
  '인테리어 디자이너',
  '스마트시티 컨설턴트',

  // 요식 & 라이프스타일
  '카페 사장',
  '요리 연구가',
  '소믈리에',
  '피트니스 트레이너',
  '요가 강사',
  '플로리스트',

  // 교육 & 연구
  '대학 교수',
  '에듀테크 기획자',
  '언어학자',
  '심리 상담사',
  '과학 저널리스트',

  // 의료 & 바이오
  '의사',
  '바이오테크 연구원',
  '한의사',
  '약사',

  // 법률 & 법조계
  '변호사',
  '판사',
  '검사',
  '법무사',
  '세무사',

  // 경영 & 컨설팅
  '경영 컨설턴트',
  '브랜드 전략가',

  // 공무원 & 공공
  '행정 공무원',
  '외교관',
  '소방관',
  '경찰관',
  '환경 운동가',
  '사회적 기업가',
  'NGO 활동가',
  '도시 농부',

  // 학생
  '대학생',
  '대학원생',
  '유학생',
  '고등학생',

  // 생활 & 기타
  '전업주부',
  '프리랜서',
  '구직자',
  '은퇴자',

  // 엔터테인먼트 & 스포츠
  '프로게이머',
  'DJ',
  '스탠드업 코미디언',
  'e스포츠 해설가',
  '댄서',

  // 유통 & 커머스
  '이커머스 운영자',
  '물류 테크 창업가',
  '빈티지 큐레이터',
  '수제 맥주 양조가',
] as const

export const CITIZEN_AVATARS = [
  '👨‍💻', '👩‍🎨', '🧑‍💼', '👨‍🍳', '👩‍🔬',
  '🧑‍🎤', '👨‍🏫', '👩‍⚕️', '🧑‍🚀', '👨‍🎓',
  '👩‍💻', '🧑‍🎨', '👨‍🔧', '👩‍🌾', '🧑‍🍳',
  '👨‍⚖️', '👩‍🏭', '🧑‍🔬', '👨‍🚒', '👩‍✈️',
  '🧑‍🎓', '👨‍🎤', '👩‍🍳', '🧑‍⚕️', '👨‍🌾',
] as const

export const CITY_LORE = `OWNIA LAND는 미래 도시를 시뮬레이션하는 디지털 메타폴리스입니다.
5개 구역으로 나뉘어 있으며 각 구역은 고유한 특성을 가집니다:

- Central Crystal (중심가): 도시의 심장부. 최고급 상업지구. 셀당 $3,599. 총 700셀.
- Skyline Penthouse (스카이라인): 고층 주거 및 프리미엄 오피스. 셀당 $1,499. 총 3,500셀.
- Neon Crossroad (네온가): 엔터테인먼트와 나이트라이프의 중심. 셀당 $759. 총 7,800셀.
- Riverside Block (리버사이드): 강변 주거단지와 공원. 셀당 $399. 총 12,000셀.
- Startup Alley (스타트업 거리): 신생 기업과 크리에이터의 허브. 셀당 $199. 총 26,000셀.

시민들은 이 도시에서 땅을 사고팔며, 사업을 열고, 커뮤니티를 형성합니다.`

export const EVENT_TYPE_LABELS: Record<string, string> = {
  land_purchase: '토지 매입',
  land_sale: '토지 매각',
  comment: '시장 코멘트',
  business_open: '사업 개업',
  social: '소셜 활동',
  market_analysis: '시장 분석',
}

export const MOOD_LABELS: Record<string, string> = {
  excited: '흥분',
  optimistic: '낙관적',
  neutral: '보통',
  cautious: '신중',
  worried: '우려',
}

export const MOOD_COLORS: Record<string, string> = {
  excited: 'bg-green-500/20 text-green-400',
  optimistic: 'bg-emerald-500/20 text-emerald-400',
  neutral: 'bg-gray-500/20 text-gray-400',
  cautious: 'bg-yellow-500/20 text-yellow-400',
  worried: 'bg-red-500/20 text-red-400',
}

export const INVESTMENT_STYLE_LABELS: Record<string, string> = {
  conservative: '보수적',
  balanced: '균형적',
  aggressive: '공격적',
  speculative: '투기적',
}
