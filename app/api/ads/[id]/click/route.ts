import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

async function handleClick(
  request: NextRequest,
  campaignId: string,
  publisherId?: string | null
) {
  if (!supabaseAdmin) {
    throw new Error('Database connection not configured')
  }

  // Fetch the campaign to get CPC bid and target URL
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('campaigns')
    .select('cpc_bid, budget_remaining, target_url')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) {
    throw new Error('Campaign not found')
  }

  const cpcBid = Number(campaign.cpc_bid)
  const budgetRemaining = Number(campaign.budget_remaining)
  const targetUrl = campaign.target_url || 'https://example.com'

  // Check if there's enough budget
  if (budgetRemaining < cpcBid) {
    throw new Error('Insufficient budget')
  }

  try {

    // Start a transaction-like operation
    // 1. Log the click (publisher_id is optional - allows tracking for chatbot owners)
    const { data: clickData, error: clickError } = await supabaseAdmin
      .from('clicks')
      .insert({
        campaign_id: campaignId,
        publisher_id: publisherId || null, // NULL for chatbot owners without publisher account
      })
      .select()

    if (clickError) {
      console.error('Error inserting click:', {
        error: clickError,
        message: clickError.message,
        code: clickError.code,
        details: clickError.details,
        hint: clickError.hint,
        campaign_id: campaignId,
        publisher_id: publisherId,
      })
      // Continue even if click logging fails, but log the error
    } else {
      console.log('Click logged successfully:', {
        click_id: clickData?.[0]?.id,
        campaign_id: campaignId,
        publisher_id: publisherId,
      })
    }

    // 2. Deduct CPC bid from campaign budget
    const newBudgetRemaining = budgetRemaining - cpcBid
    const { error: budgetError } = await supabaseAdmin
      .from('campaigns')
      .update({ budget_remaining: newBudgetRemaining })
      .eq('id', campaignId)

    if (budgetError) {
      console.error('Error updating budget:', budgetError)
      throw new Error('Failed to update budget')
    }

    // 3. Credit 70% of CPC bid to publisher (only if publisher_id is provided)
    let publisherCredit = 0
    let newPublisherBalance = 0

    if (publisherId) {
      publisherCredit = cpcBid * 0.7

      // Get current publisher balance
      const { data: publisher, error: publisherFetchError } = await supabaseAdmin
        .from('publishers')
        .select('balance')
        .eq('id', publisherId)
        .single()

      if (publisherFetchError) {
        console.error('Error fetching publisher:', publisherFetchError)
        // Continue even if publisher fetch fails
      } else if (publisher) {
        newPublisherBalance = Number(publisher.balance) + publisherCredit

        const { error: balanceError } = await supabaseAdmin
          .from('publishers')
          .update({ balance: newPublisherBalance })
          .eq('id', publisherId)

        if (balanceError) {
          console.error('Error updating publisher balance:', balanceError)
          // Continue even if balance update fails
        }
      }
    }

    // Update campaign status if budget is depleted
    if (newBudgetRemaining <= 0) {
      await supabaseAdmin
        .from('campaigns')
        .update({ status: 'completed' })
        .eq('id', campaignId)
    }

    return {
      success: true,
      campaign_budget_remaining: newBudgetRemaining,
      publisher_credit: publisherCredit,
      publisher_balance: newPublisherBalance,
      target_url: targetUrl,
    }
  } catch (error: any) {
    console.error('Error processing click:', error)
    throw error
  }
}

// Handle GET requests (from tracking URLs)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    const { searchParams } = new URL(request.url)
    const publisherId = searchParams.get('publisher_id')

    if (!supabaseAdmin) {
      return NextResponse.redirect('https://example.com', 302)
    }

    // publisher_id is included in the tracking URL from the ads API
    const result = await handleClick(request, campaignId, publisherId || null)
    
    // Redirect to target URL
    return NextResponse.redirect(result.target_url, 302)
  } catch (error: any) {
    console.error('Error processing click (GET):', error)
    // Redirect to a fallback URL even on error
    return NextResponse.redirect('https://example.com', 302)
  }
}

// Handle POST requests (from API)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    const body = await request.json().catch(() => ({}))
    const { publisher_id } = body

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    const result = await handleClick(request, campaignId, publisher_id)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error processing click (POST):', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process click' },
      { status: 500 }
    )
  }
}

