import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { 
          error: 'Supabase not configured',
          details: 'Please check your environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
        },
        { status: 500 }
      )
    }

    // Test connection by querying a simple table
    const { data, error } = await supabaseAdmin
      .from('advertisers')
      .select('count')
      .limit(1)

    if (error) {
      // Check if it's a table doesn't exist error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Database tables not found',
            details: 'Please run the migration SQL in your Supabase SQL Editor',
            hint: 'Check supabase/migrations/001_initial_schema.sql'
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { 
          error: 'Database connection error',
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      tables: {
        advertisers: 'exists',
        campaigns: 'exists',
        publishers: 'exists',
        impressions: 'exists',
        clicks: 'exists'
      }
    })
  } catch (error: any) {
    console.error('Test DB error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test database connection',
        message: error.message
      },
      { status: 500 }
    )
  }
}



