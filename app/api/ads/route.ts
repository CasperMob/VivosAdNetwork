import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keywordsParam = searchParams.get('keywords') || searchParams.get('keyword')
    const publisherKey = searchParams.get('publisher_key') || request.headers.get('x-publisher-key')
    const nocache = searchParams.get('nocache') || searchParams.get('refresh') // Force refresh cache

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

    // Fetch ALL campaigns from database in real-time (no filtering at query level)
    // We'll filter for active status, budget, and keyword matches in JavaScript
    const { data: allCampaignsRaw, error } = await supabaseAdmin
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

    // Debug: Log ALL campaigns fetched from database (before filtering)
    console.log('ALL campaigns fetched from database (raw):', {
      total: allCampaignsRaw?.length || 0,
      campaigns: allCampaignsRaw?.map(c => ({
        id: c.id,
        title: c.title,
        keywords: c.keywords,
        status: c.status,
        budget_remaining: c.budget_remaining,
      })) || [],
    })

    // Filter for active campaigns with budget in JavaScript
    // This ensures we see ALL campaigns and can debug why some are excluded
    const allCampaigns = (allCampaignsRaw || []).filter((campaign) => {
      const isActive = campaign.status === 'active'
      const hasBudget = Number(campaign.budget_remaining) > 0
      
      if (!isActive || !hasBudget) {
        console.log('Campaign excluded from query:', {
          id: campaign.id,
          title: campaign.title,
          status: campaign.status,
          budget_remaining: campaign.budget_remaining,
          reason: !isActive ? 'not active' : 'no budget',
        })
        return false
      }
      return true
    })

    // Debug: Log filtered campaigns
    console.log('Active campaigns with budget (after filtering):', {
      total: allCampaigns.length,
      searchKeywords: keywords,
      campaigns: allCampaigns.map(c => ({
        id: c.id,
        title: c.title,
        keywords: c.keywords,
        status: c.status,
        budget_remaining: c.budget_remaining,
      })),
    })

    if (!allCampaigns || allCampaigns.length === 0) {
      console.log('No active campaigns with budget found in database')
      return NextResponse.json({ ads: [] })
    }

    // Filter campaigns that match any of the provided keywords
    // Support partial matching: "car" matches "car", "cars", "car marketplace", etc.
    // Also check campaign title and message for broader matching
    const matchingCampaigns = allCampaigns.filter((campaign) => {
      // Handle case where keywords might be null or not an array
      if (!campaign.keywords) {
        // If no keywords, still check title and message
        const campaignTitleLower = (campaign.title || '').toLowerCase()
        const campaignMessageLower = (campaign.message || '').toLowerCase()
        return keywords.some((searchKeyword) => {
          return campaignTitleLower.includes(searchKeyword) || campaignMessageLower.includes(searchKeyword)
        })
      }

      if (!Array.isArray(campaign.keywords)) {
        // If keywords is a string, convert to array
        const keywordsStr = String(campaign.keywords).toLowerCase()
        const campaignTitleLower = (campaign.title || '').toLowerCase()
        const campaignMessageLower = (campaign.message || '').toLowerCase()
        return keywords.some((searchKeyword) => {
          return keywordsStr.includes(searchKeyword) || 
                 campaignTitleLower.includes(searchKeyword) || 
                 campaignMessageLower.includes(searchKeyword)
        })
      }

      const campaignKeywordsLower = campaign.keywords.map((k: string) => String(k).toLowerCase())
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
        // or "zara" with "Zara" in the title
        if (campaignTitleLower.includes(searchKeyword) || campaignMessageLower.includes(searchKeyword)) {
          return true
        }

        return false
      })
    })

    // Debug: Log matching results
    console.log('Matching campaigns:', {
      searchKeywords: keywords,
      totalCampaigns: allCampaigns.length,
      matchingCount: matchingCampaigns.length,
      matchedCampaigns: matchingCampaigns.map(c => ({
        id: c.id,
        title: c.title,
        keywords: c.keywords,
      })),
    })

    if (matchingCampaigns.length === 0) {
      console.log('No matching campaigns found after filtering', {
        searchKeywords: keywords,
        totalCampaigns: allCampaigns.length,
        allCampaignTitles: allCampaigns.map(c => c.title),
        allCampaignKeywords: allCampaigns.map(c => c.keywords),
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

    const response = NextResponse.json({
      ads: ads,
      timestamp: new Date().toISOString(), // Include timestamp to help with cache busting
    })

    // Set cache control headers to prevent caching
    // Use aggressive no-cache headers
    const cacheControl = nocache 
      ? 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0'
      : 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    
    response.headers.set('Cache-Control', cacheControl)
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Last-Modified', new Date().toUTCString())

    return response
  } catch (error: any) {
    console.error('Error fetching ad:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ad' },
      { status: 500 }
    )
  }
}

