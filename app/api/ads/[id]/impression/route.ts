import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    const { searchParams } = new URL(request.url)
    const publisherId = searchParams.get('publisher_id')

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

    // Log impression if campaign is active and has budget
    // publisher_id is included in the tracking URL from the ads API
    if (campaign.status === 'active' && campaign.budget_remaining > 0) {
      const { data: impressionData, error: impressionError } = await supabaseAdmin
        .from('impressions')
        .insert({
          campaign_id: campaignId,
          publisher_id: publisherId || null, // NULL if no publisher_id provided
          keyword: null, // NULL for chatbot tracking
        })
        .select()

      if (impressionError) {
        console.error('Error inserting impression:', {
          error: impressionError,
          message: impressionError.message,
          code: impressionError.code,
          details: impressionError.details,
          hint: impressionError.hint,
          campaign_id: campaignId,
          publisher_id: publisherId,
        })
        // Still return success to avoid breaking the chatbot flow
        // but log the error for debugging
      } else {
        console.log('Impression logged successfully:', {
          impression_id: impressionData?.[0]?.id,
          campaign_id: campaignId,
          publisher_id: publisherId,
        })
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

