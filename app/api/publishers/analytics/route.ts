import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const { data: userData } = await supabase
      .from('users')
      .select('role, publisher_id')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'publisher') {
      return NextResponse.json({ error: 'Not authorized as publisher' }, { status: 403 })
    }

    if (!userData.publisher_id) {
      return NextResponse.json({ error: 'No publisher ID associated with user' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    // Get publisher data
    const { data: publisher, error: publisherError } = await supabaseAdmin
      .from('publishers')
      .select('*')
      .eq('id', userData.publisher_id)
      .single()

    if (publisherError) {
      console.error('Error fetching publisher:', publisherError)
      return NextResponse.json({ error: publisherError.message }, { status: 400 })
    }

    // Get impressions for this publisher
    const { data: impressions, error: impressionsError } = await supabaseAdmin
      .from('impressions')
      .select('*, campaigns!inner(*)')
      .eq('publisher_id', userData.publisher_id)
      .order('created_at', { ascending: false })

    if (impressionsError) {
      console.error('Error fetching impressions:', impressionsError)
      return NextResponse.json({ error: impressionsError.message }, { status: 400 })
    }

    // Get clicks for this publisher
    const { data: clicks, error: clicksError } = await supabaseAdmin
      .from('clicks')
      .select('*, campaigns!inner(*)')
      .eq('publisher_id', userData.publisher_id)
      .order('created_at', { ascending: false })

    if (clicksError) {
      console.error('Error fetching clicks:', clicksError)
      return NextResponse.json({ error: clicksError.message }, { status: 400 })
    }

    // Calculate analytics
    const totalImpressions = impressions?.length || 0
    const totalClicks = clicks?.length || 0
    const totalEarnings = publisher.balance || 0

    // Get unique campaigns advertised on this publisher
    const campaignMap = new Map()
    
    impressions?.forEach(imp => {
      if (imp.campaigns) {
        const campaign = imp.campaigns
        if (!campaignMap.has(campaign.id)) {
          campaignMap.set(campaign.id, {
            ...campaign,
            impressions: 0,
            clicks: 0,
            earnings: 0,
          })
        }
        campaignMap.get(campaign.id).impressions++
      }
    })

    clicks?.forEach(click => {
      if (click.campaigns) {
        const campaign = click.campaigns
        if (campaignMap.has(campaign.id)) {
          campaignMap.get(campaign.id).clicks++
          // Calculate earnings from clicks (publisher gets a share of CPC)
          // Assuming publisher gets 70% of CPC
          const publisherShare = campaign.cpc_bid * 0.7
          campaignMap.get(campaign.id).earnings += publisherShare
        }
      }
    })

    const campaigns = Array.from(campaignMap.values())

    // Get placement statistics (group by matched_keyword)
    const placementStats: { [key: string]: { impressions: number; clicks: number; earnings: number } } = {}
    
    impressions?.forEach(imp => {
      const placement = imp.matched_keyword || 'Unknown'
      if (!placementStats[placement]) {
        placementStats[placement] = { impressions: 0, clicks: 0, earnings: 0 }
      }
      placementStats[placement].impressions++
    })

    clicks?.forEach(click => {
      const impression = impressions?.find(imp => imp.campaign_id === click.campaign_id)
      const placement = impression?.matched_keyword || 'Unknown'
      if (placementStats[placement]) {
        placementStats[placement].clicks++
        // Find campaign to calculate earnings
        const campaign = campaigns.find(c => c.id === click.campaign_id)
        if (campaign) {
          placementStats[placement].earnings += campaign.cpc_bid * 0.7
        }
      }
    })

    const placements = Object.entries(placementStats).map(([keyword, stats]) => ({
      keyword,
      ...stats,
    }))

    return NextResponse.json({
      publisher,
      totalImpressions,
      totalClicks,
      totalEarnings,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      campaigns,
      placements,
      recentImpressions: impressions?.slice(0, 10) || [],
      recentClicks: clicks?.slice(0, 10) || [],
    })
  } catch (error: any) {
    console.error('Error fetching publisher analytics:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch publisher analytics' },
      { status: 500 }
    )
  }
}

