import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Helper function to parse User-Agent and extract device info
function parseUserAgent(userAgent: string | null): {
  device_os: string | null
  device_type: string | null
} {
  if (!userAgent) {
    return { device_os: null, device_type: null }
  }

  const ua = userAgent.toLowerCase()
  
  // Detect OS
  let deviceOs: string | null = null
  if (ua.includes('android')) {
    deviceOs = 'Android'
    // Try to extract Android version
    const androidVersion = ua.match(/android\s([\d.]+)/i)
    if (androidVersion) {
      deviceOs = `Android ${androidVersion[1]}`
    }
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    deviceOs = 'iOS'
    // Try to extract iOS version
    const iosVersion = ua.match(/os\s([\d_]+)/i)
    if (iosVersion) {
      deviceOs = `iOS ${iosVersion[1].replace(/_/g, '.')}`
    }
  } else if (ua.includes('windows')) {
    deviceOs = 'Windows'
  } else if (ua.includes('mac')) {
    deviceOs = 'macOS'
  } else if (ua.includes('linux')) {
    deviceOs = 'Linux'
  }

  // Detect device type
  let deviceType: string | null = null
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet'
  } else {
    deviceType = 'desktop'
  }

  return { device_os: deviceOs, device_type: deviceType }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    const { searchParams } = new URL(request.url)
    const publisherId = searchParams.get('publisher_id')
    const matchedKeyword = searchParams.get('keyword')

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    // Verify campaign exists and is active
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, budget_remaining')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Extract device info from User-Agent header
    const userAgent = request.headers.get('user-agent')
    const { device_os, device_type } = parseUserAgent(userAgent)

    // Log impression if campaign is active and has budget
    // publisher_id is included in the tracking URL from the ads API
    if (campaign.status === 'active' && campaign.budget_remaining > 0) {
      console.log('Attempting to insert impression:', {
        campaign_id: campaignId,
        publisher_id: publisherId,
        keyword: matchedKeyword,
        device_os,
        device_type,
      })

      // Insert into impressions table with analytics data
      const impressionPayload = {
        campaign_id: campaignId,
        publisher_id: publisherId || null, // NULL if no publisher_id provided
        keyword: matchedKeyword || null, // Original keyword column (from migration 002)
        matched_keyword: matchedKeyword || null, // New matched_keyword column (from migration 006)
        device_os: device_os,
        device_type: device_type,
        user_agent: userAgent,
      }

      console.log('Impression payload:', impressionPayload)

      const { data: impressionData, error: impressionError } = await supabaseAdmin
        .from('impressions')
        .insert(impressionPayload)
        .select()

      if (impressionError) {
        console.error('❌ ERROR inserting impression:', {
          error: impressionError,
          message: impressionError.message,
          code: impressionError.code,
          details: impressionError.details,
          hint: impressionError.hint,
          campaign_id: campaignId,
          publisher_id: publisherId,
          payload: impressionPayload,
        })
        
        // Return error response for debugging
        return NextResponse.json({
          success: false,
          error: 'Failed to log impression',
          details: {
            message: impressionError.message,
            code: impressionError.code,
            hint: impressionError.hint,
          }
        }, { status: 500 })
      } else {
        console.log('Impression logged successfully:', {
          impression_id: impressionData?.[0]?.id,
          campaign_id: campaignId,
          publisher_id: publisherId,
        })

        // Update the impressions count in the campaigns table
        // Fetch current count and increment
        const { data: currentCampaign } = await supabaseAdmin
          .from('campaigns')
          .select('impressions')
          .eq('id', campaignId)
          .single()

        if (currentCampaign) {
          const { error: updateError } = await supabaseAdmin
            .from('campaigns')
            .update({ impressions: (currentCampaign.impressions || 0) + 1 })
            .eq('id', campaignId)

          if (updateError) {
            console.error('Error updating campaign impressions count:', updateError)
          }
        }
      }
    }

    // Return a 1x1 transparent pixel for image tracking
    // Or return JSON for API tracking
    const acceptHeader = request.headers.get('accept') || ''
    
    if (acceptHeader.includes('image')) {
      // Return a 1x1 transparent PNG
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      )
      return new Response(pixel, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    // Return JSON response
    return NextResponse.json({
      success: true,
      campaign_id: campaignId,
    })
  } catch (error: any) {
    console.error('Error tracking impression:', error)
    // Still return success to avoid breaking the chatbot flow
    return NextResponse.json({
      success: true,
    })
  }
}

// Handle POST requests for richer analytics data
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    const { searchParams } = new URL(request.url)
    const publisherId = searchParams.get('publisher_id')
    
    // Get analytics data from request body
    const body = await request.json().catch(() => ({}))
    const {
      keyword: matchedKeyword,
      device_os,
      device_type,
      app_version,
      screen_width,
      screen_height,
      ...metadata
    } = body

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    // Verify campaign exists and is active
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, status, budget_remaining')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Extract device info from User-Agent if not provided
    const userAgent = request.headers.get('user-agent')
    const parsedUA = parseUserAgent(userAgent)
    const finalDeviceOs = device_os || parsedUA.device_os
    const finalDeviceType = device_type || parsedUA.device_type

    // Log impression if campaign is active and has budget
    if (campaign.status === 'active' && campaign.budget_remaining > 0) {
      console.log('Attempting to insert impression (POST):', {
        campaign_id: campaignId,
        publisher_id: publisherId,
        keyword: matchedKeyword,
        device_os: finalDeviceOs,
        device_type: finalDeviceType,
      })

      // Insert into impressions table with full analytics data
      const impressionPayload = {
        campaign_id: campaignId,
        publisher_id: publisherId || null,
        keyword: matchedKeyword || null, // Original keyword column (from migration 002)
        matched_keyword: matchedKeyword || null, // New matched_keyword column (from migration 006)
        device_os: finalDeviceOs,
        device_type: finalDeviceType,
        user_agent: userAgent,
        app_version: app_version || null,
        screen_width: screen_width || null,
        screen_height: screen_height || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      }

      console.log('Impression payload (POST):', impressionPayload)

      const { data: impressionData, error: impressionError } = await supabaseAdmin
        .from('impressions')
        .insert(impressionPayload)
        .select()

      if (impressionError) {
        console.error('❌ ERROR inserting impression (POST):', {
          error: impressionError,
          message: impressionError.message,
          code: impressionError.code,
          details: impressionError.details,
          hint: impressionError.hint,
          campaign_id: campaignId,
          publisher_id: publisherId,
          payload: impressionPayload,
        })
        
        // Return error response for debugging
        return NextResponse.json({
          success: false,
          error: 'Failed to log impression',
          details: {
            message: impressionError.message,
            code: impressionError.code,
            hint: impressionError.hint,
          }
        }, { status: 500 })
      } else {
        console.log('Impression logged successfully with analytics:', {
          impression_id: impressionData?.[0]?.id,
          campaign_id: campaignId,
          publisher_id: publisherId,
          device_os: finalDeviceOs,
          device_type: finalDeviceType,
          matched_keyword: matchedKeyword,
        })

        // Update the impressions count in the campaigns table
        const { data: currentCampaign } = await supabaseAdmin
          .from('campaigns')
          .select('impressions')
          .eq('id', campaignId)
          .single()

        if (currentCampaign) {
          const { error: updateError } = await supabaseAdmin
            .from('campaigns')
            .update({ impressions: (currentCampaign.impressions || 0) + 1 })
            .eq('id', campaignId)

          if (updateError) {
            console.error('Error updating campaign impressions count:', updateError)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      campaign_id: campaignId,
    })
  } catch (error: any) {
    console.error('Error tracking impression (POST):', error)
    return NextResponse.json({
      success: true,
    })
  }
}

