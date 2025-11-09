import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const advertiserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = advertiserSchema.parse(body)

    // Check if Supabase is configured
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized')
      return NextResponse.json(
        { error: 'Database connection not configured. Please check your environment variables.' },
        { status: 500 }
      )
    }

    // Check if advertiser already exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('advertisers')
      .select('*')
      .eq('email', validatedData.email)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" which is OK
      console.error('Supabase fetch error:', fetchError)
      return NextResponse.json(
        { error: fetchError.message || 'Failed to check existing advertiser' },
        { status: 400 }
      )
    }

    if (existing) {
      return NextResponse.json({ advertiser: existing })
    }

    // Create new advertiser
    const { data, error } = await supabaseAdmin
      .from('advertisers')
      .insert(validatedData)
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
          error: error.message || 'Failed to create advertiser',
          details: error.details,
          hint: error.hint,
        },
        { status: 400 }
      )
    }

    if (!data) {
      console.error('No data returned from Supabase insert')
      return NextResponse.json(
        { error: 'Advertiser created but no data returned' },
        { status: 500 }
      )
    }

    return NextResponse.json({ advertiser: data }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating advertiser:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create advertiser' },
      { status: 500 }
    )
  }
}

