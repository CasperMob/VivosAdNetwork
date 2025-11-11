export interface Advertiser {
  id: string
  name: string
  email: string
  created_at: string
}

export interface Campaign {
  id: string
  advertiser_id: string
  title: string
  message: string
  image_url: string | null
  target_url: string
  keywords: string[]
  cpc_bid: number
  budget_total: number
  budget_remaining: number
  quality_score: number
  status: 'active' | 'paused' | 'completed'
  created_at: string
  updated_at: string
}

export interface Publisher {
  id: string
  name: string
  api_key: string
  balance: number
  created_at: string
}

export interface Impression {
  id: string
  campaign_id: string
  publisher_id: string
  keyword: string
  created_at: string
}

export interface Click {
  id: string
  campaign_id: string
  publisher_id: string
  created_at: string
}





