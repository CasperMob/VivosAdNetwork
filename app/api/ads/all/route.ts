import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const publisherKey = searchParams.get('publisher_key') || request.headers.get('x-publisher-key')
    const statusFilter = searchParams.get('status') // Optional: 'active', 'paused', 'completed', or 'all'
    const nocache = searchParams.get('nocache') || searchParams.get('refresh') // Force refresh cache

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

    // Fetch all campaigns from database
    let query = supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply status filter if provided (default to 'active' only)
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    } else if (!statusFilter) {
      // Default: only active campaigns
      query = query.eq('status', 'active')
    }

    const { data: campaigns, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ 
        ads: [],
        total: 0
      })
    }

    // Filter campaigns with budget (if status filter is 'active' or not specified)
    const filteredCampaigns = campaigns.filter((campaign) => {
      // If filtering by active status, also check budget
      if (!statusFilter || statusFilter === 'active') {
        return Number(campaign.budget_remaining) > 0
      }
      // For other statuses, return all
      return true
    })

    // Sort by cpc_bid descending (highest bid first)
    filteredCampaigns.sort((a, b) => {
      const bidA = Number(a.cpc_bid) || 0
      const bidB = Number(b.cpc_bid) || 0
      return bidB - bidA
    })

    // Get base URL for tracking endpoints
    const baseUrl = request.nextUrl.origin

    // Format ads for response with tracking URLs
    const ads = filteredCampaigns.map((campaign) => {
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
        budget_total: Number(campaign.budget_total),
        budget_remaining: Number(campaign.budget_remaining),
        status: campaign.status,
        keywords: campaign.keywords,
        // Tracking URLs for chatbot integration
        impression_url: impressionUrl,
        click_url: clickUrl,
      }
    })

    const response = NextResponse.json({
      ads: ads,
      total: ads.length,
      status_filter: statusFilter || 'active',
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
    console.error('Error fetching all ads:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ads' },
      { status: 500 }
    )
  }
}

