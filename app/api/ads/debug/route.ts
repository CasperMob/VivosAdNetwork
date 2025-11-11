import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    // Fetch ALL campaigns from database (no filtering)
    const { data: allCampaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Return all campaigns with detailed info
    return NextResponse.json({
      total: allCampaigns?.length || 0,
      campaigns: allCampaigns?.map((campaign) => ({
        id: campaign.id,
        title: campaign.title,
        message: campaign.message,
        keywords: campaign.keywords,
        keywords_type: Array.isArray(campaign.keywords) ? 'array' : typeof campaign.keywords,
        keywords_string: Array.isArray(campaign.keywords) 
          ? campaign.keywords.join(', ') 
          : String(campaign.keywords),
        status: campaign.status,
        budget_total: campaign.budget_total,
        budget_remaining: campaign.budget_remaining,
        cpc_bid: campaign.cpc_bid,
        target_url: campaign.target_url,
        image_url: campaign.image_url,
        created_at: campaign.created_at,
        // Check if it would be included in ads API
        would_be_included: campaign.status === 'active' && Number(campaign.budget_remaining) > 0,
        exclusion_reason: campaign.status !== 'active' 
          ? `Status is '${campaign.status}' (needs 'active')` 
          : Number(campaign.budget_remaining) <= 0 
            ? `Budget remaining is ${campaign.budget_remaining} (needs > 0)`
            : 'Would be included',
      })) || [],
    })
  } catch (error: any) {
    console.error('Error fetching all campaigns:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}


