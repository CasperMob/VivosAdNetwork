import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const waitlistSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = waitlistSchema.parse(body)

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    // Check if email already exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('waitlist')
      .select('email')
      .eq('email', validatedData.email)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: fetchError.message || 'Failed to check existing email' },
        { status: 400 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { 
          success: true,
          message: 'You\'re already on the waitlist!',
          already_exists: true
        },
        { status: 200 }
      )
    }

    // Add to waitlist
    const { data, error } = await supabaseAdmin
      .from('waitlist')
      .insert({ email: validatedData.email })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to join waitlist' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist!',
      data: data,
    }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to join waitlist' },
      { status: 500 }
    )
  }
}

