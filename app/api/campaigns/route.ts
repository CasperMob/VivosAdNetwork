import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const campaignSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  image_url: z.string().url().optional().nullable(),
  target_url: z.string().url(),
  keywords: z.array(z.string()).min(1),
  cpc_bid: z.number().positive(),
  budget_total: z.number().positive(),
  quality_score: z.number().min(0).max(1).optional().default(0.5),
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = campaignSchema.parse(body)

    // Set budget_remaining to budget_total initially
    const campaignData = {
      ...validatedData,
      user_id: user.id,
      budget_remaining: validatedData.budget_total,
      status: 'active' as const,
    }

    // Check if Supabase is configured
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized')
      return NextResponse.json(
        { error: 'Database connection not configured. Please check your environment variables.' },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .insert(campaignData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return NextResponse.json(
        { 
          error: error.message || 'Failed to create campaign',
          details: error.details,
          hint: error.hint,
        },
        { status: 400 }
      )
    }

    if (!data) {
      console.error('No data returned from Supabase insert')
      return NextResponse.json(
        { error: 'Campaign created but no data returned' },
        { status: 500 }
      )
    }

    return NextResponse.json({ campaign: data }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create campaign' },
      { status: 500 }
    )
  }
}

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
      .select('role')
      .eq('id', user.id)
      .single()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    let query = supabaseAdmin.from('campaigns').select('*')

    // If not admin, only show their own campaigns
    if (userData?.role !== 'admin') {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ campaigns: data })
  } catch (error: any) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

