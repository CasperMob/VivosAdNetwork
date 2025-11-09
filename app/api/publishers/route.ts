import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const publisherSchema = z.object({
  name: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = publisherSchema.parse(body)

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    // Generate a unique API key
    const apiKey = `pub_${randomBytes(32).toString('hex')}`

    const { data, error } = await supabaseAdmin
      .from('publishers')
      .insert({
        name: validatedData.name,
        api_key: apiKey,
        balance: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ publisher: data }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating publisher:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create publisher' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('publishers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ publishers: data })
  } catch (error: any) {
    console.error('Error fetching publishers:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch publishers' },
      { status: 500 }
    )
  }
}

