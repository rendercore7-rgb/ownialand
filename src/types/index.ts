export type LandGrade = 'central_crystal' | 'skyline' | 'neon' | 'riverside' | 'startup'
export type LandStatus = 'available' | 'reserved' | 'sold'
export type InvestmentStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
export type PaymentRequestStatus = 'requested' | 'confirmed' | 'transferred'
export type InvestmentOption = 'option1' | 'option2'
export type UserRole = 'investor' | 'admin' | 'sales'
export type SalesTeam = 'team1' | 'team2'

export interface Profile {
  id: string
  full_name: string
  phone: string
  email: string
  role: UserRole
  is_admin: boolean
  sales_team: SalesTeam | null
  is_team_leader: boolean
  created_at: string
  updated_at: string
}

export interface Investment {
  id: string
  user_id: string
  amount: number
  option: InvestmentOption
  daily_payment: number
  contract_days: number
  bank_name: string
  account_number: string
  account_holder: string
  status: InvestmentStatus
  start_date: string | null
  payment_start_date: string | null
  end_date: string | null
  signed_at: string | null
  signature_data: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface PaymentRequest {
  id: string
  investment_id: string
  user_id: string
  request_date: string
  payment_date: string
  amount: number
  is_same_day: boolean
  status: PaymentRequestStatus
  confirmed_at: string | null
  transferred_at: string | null
  created_at: string
  investments?: Investment
  profiles?: Profile
}

export interface Land {
  id: string
  grid_x: number
  grid_y: number
  grade: LandGrade
  owner_id: string | null
  price: number
  status: LandStatus
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface LandTransaction {
  id: string
  land_id: string
  buyer_id: string
  price: number
  grade: LandGrade
  payment_method: string
  status: string
  created_at: string
  lands?: Land
  profiles?: Profile
}

export type ConsultationType = 'call' | 'meeting' | 'online' | 'referral' | 'other'

export interface SalesJournal {
  id: string
  user_id: string
  journal_date: string
  content: string
  consultation_count: number
  consultation_type: ConsultationType | null
  created_at: string
  updated_at: string
}

export interface SalesRecord {
  id: string
  sales_user_id: string
  investor_user_id: string | null
  amount: number
  description: string
  created_at: string
  profiles?: Profile
}
