import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const updateCampaignSchema = z.object({
  title: z.string().min(1).optional(),
  message: z.string().optional(),
  target_url: z.string().url().optional(),
  keywords: z.array(z.string()).optional(),
  cpc_bid: z.number().positive().optional(),
  budget_total: z.number().positive().optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
})

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

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateCampaignSchema.parse(body)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    const campaignId = params.id

    // Build update object
    const updateData: any = {}
    if (validatedData.title !== undefined) updateData.title = validatedData.title
    if (validatedData.message !== undefined) updateData.message = validatedData.message
    if (validatedData.target_url !== undefined) updateData.target_url = validatedData.target_url
    if (validatedData.keywords !== undefined) updateData.keywords = validatedData.keywords
    if (validatedData.cpc_bid !== undefined) updateData.cpc_bid = validatedData.cpc_bid
    if (validatedData.status !== undefined) updateData.status = validatedData.status

    // If budget_total is updated, also update budget_remaining proportionally
    if (validatedData.budget_total !== undefined) {
      // Get current campaign to calculate proportion
      const { data: currentCampaign } = await supabaseAdmin
        .from('campaigns')
        .select('budget_total, budget_remaining')
        .eq('id', campaignId)
        .single()

      if (currentCampaign && currentCampaign.budget_total > 0) {
        const ratio = currentCampaign.budget_remaining / currentCampaign.budget_total
        updateData.budget_total = validatedData.budget_total
        updateData.budget_remaining = validatedData.budget_total * ratio
      } else {
        updateData.budget_total = validatedData.budget_total
        updateData.budget_remaining = validatedData.budget_total
      }
    }

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ campaign: data })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
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

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ campaign })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

