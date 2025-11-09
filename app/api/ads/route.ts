import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keywordsParam = searchParams.get('keywords') || searchParams.get('keyword')
    const publisherKey = searchParams.get('publisher_key') || request.headers.get('x-publisher-key')

    if (!keywordsParam) {
      return NextResponse.json(
        { error: 'Keywords parameter is required (comma-separated or single keyword)' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    // Look up publisher by API key if provided
    let publisherId: string | null = null
    if (publisherKey) {
      const { data: publisher, error: publisherError } = await supabaseAdmin
        .from('publishers')
        .select('id')
        .eq('api_key', publisherKey)
        .single()

      if (publisherError || !publisher) {
        return NextResponse.json(
          { error: 'Invalid publisher API key' },
          { status: 401 }
        )
      }

      publisherId = publisher.id
    }

    // Parse keywords - support both comma-separated string and single keyword
    const keywords = keywordsParam
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0)

    if (keywords.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid keyword is required' },
        { status: 400 }
      )
    }

    // Fetch all active campaigns with remaining budget
    // We'll filter for keyword matches in JavaScript to support partial matching
    const { data: allCampaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .gt('budget_remaining', 0)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!allCampaigns || allCampaigns.length === 0) {
      return NextResponse.json({ ads: [] })
    }

    // Filter campaigns that match any of the provided keywords
    // Support partial matching: "car" matches "car", "cars", "car marketplace", etc.
    // Also check campaign title and message for broader matching
    const matchingCampaigns = allCampaigns.filter((campaign) => {
      if (!campaign.keywords || !Array.isArray(campaign.keywords)) {
        return false
      }

      const campaignKeywordsLower = campaign.keywords.map((k: string) => k.toLowerCase())
      const campaignTitleLower = (campaign.title || '').toLowerCase()
      const campaignMessageLower = (campaign.message || '').toLowerCase()
      
      // Check if any search keyword matches any campaign keyword (exact or partial)
      // OR if the keyword appears in the campaign title or message
      return keywords.some((searchKeyword) => {
        // Check campaign keywords
        const keywordMatch = campaignKeywordsLower.some((campaignKeyword: string) => {
          // Exact match
          if (campaignKeyword === searchKeyword) {
            return true
          }
          // Partial match: search keyword is contained in campaign keyword
          if (campaignKeyword.includes(searchKeyword)) {
            return true
          }
          // Partial match: campaign keyword is contained in search keyword
          if (searchKeyword.includes(campaignKeyword)) {
            return true
          }
          return false
        })

        if (keywordMatch) {
          return true
        }

        // Also check if keyword appears in title or message (broader matching)
        // This helps match "watches" with campaigns about "tissot" watches
        if (campaignTitleLower.includes(searchKeyword) || campaignMessageLower.includes(searchKeyword)) {
          return true
        }

        return false
      })
    })

    // Debug logging (remove in production if needed)
    if (matchingCampaigns.length === 0) {
      console.log('No matching campaigns found', {
        searchKeywords: keywords,
        totalCampaigns: allCampaigns.length,
        sampleCampaign: allCampaigns[0] ? {
          id: allCampaigns[0].id,
          title: allCampaigns[0].title,
          keywords: allCampaigns[0].keywords,
          status: allCampaigns[0].status,
          budget_remaining: allCampaigns[0].budget_remaining,
        } : null,
      })
      return NextResponse.json({ ads: [] })
    }

    // Sort by cpc_bid descending (highest bid first)
    matchingCampaigns.sort((a, b) => {
      const bidA = Number(a.cpc_bid) || 0
      const bidB = Number(b.cpc_bid) || 0
      return bidB - bidA
    })

    // Get base URL for tracking endpoints
    const baseUrl = request.nextUrl.origin

    // Format ads for response with tracking URLs
    const ads = matchingCampaigns.map((campaign) => {
      // Create tracking URLs with publisher_id if available
      const impressionUrl = publisherId 
        ? `${baseUrl}/api/ads/${campaign.id}/impression?publisher_id=${publisherId}`
        : `${baseUrl}/api/ads/${campaign.id}/impression`
      const clickUrl = publisherId
        ? `${baseUrl}/api/ads/${campaign.id}/click?publisher_id=${publisherId}`
        : `${baseUrl}/api/ads/${campaign.id}/click`

      return {
        id: campaign.id,
        title: campaign.title,
        message: campaign.message,
        image_url: campaign.image_url,
        target_url: campaign.target_url,
        cpc_bid: Number(campaign.cpc_bid),
        // Tracking URLs for chatbot integration
        impression_url: impressionUrl,
        click_url: clickUrl,
      }
    })

    return NextResponse.json({
      ads: ads,
    })
  } catch (error: any) {
    console.error('Error fetching ad:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ad' },
      { status: 500 }
    )
  }
}

