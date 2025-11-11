import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const updateCampaignSchema = z.object({
  title: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  target_url: z.string().url().optional(),
  keywords: z.array(z.string()).min(1).optional(),
  cpc_bid: z.number().positive().optional(),
  budget_total: z.number().positive().optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
}).partial()

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const campaignId = params.id
    const body = await request.json()
    const validatedData = updateCampaignSchema.parse(body)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    // First, verify the campaign belongs to this user (unless admin)
    const { data: campaign, error: fetchError } = await supabaseAdmin
      .from('campaigns')
      .select('user_id, budget_total, budget_remaining')
      .eq('id', campaignId)
      .single()

    if (fetchError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // If not admin, ensure user owns this campaign
    if (userData.role !== 'admin' && campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own campaigns' }, { status: 403 })
    }

    // Build update object
    const updatePayload: any = { ...validatedData }

    // If budget_total is updated, calculate new budget_remaining proportionally
    if (validatedData.budget_total !== undefined) {
      const oldBudgetTotal = Number(campaign.budget_total)
      const oldBudgetRemaining = Number(campaign.budget_remaining)
      const newBudgetTotal = Number(validatedData.budget_total)

      // Calculate the proportion of budget remaining
      const spentAmount = oldBudgetTotal - oldBudgetRemaining
      const newBudgetRemaining = newBudgetTotal - spentAmount

      updatePayload.budget_remaining = Math.max(0, newBudgetRemaining) // Ensure it doesn't go below 0
    }

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update(updatePayload)
      .eq('id', campaignId)
      .select()
      .single()

    if (error) {
      console.error('Supabase error updating campaign:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ campaign: data }, { status: 200 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating campaign:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const campaignId = params.id

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (error) {
      console.error('Supabase error fetching campaign:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // If not admin, ensure user owns this campaign
    if (userData.role !== 'admin' && campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only view your own campaigns' }, { status: 403 })
    }

    return NextResponse.json({ campaign }, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

