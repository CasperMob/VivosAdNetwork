import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    // Check if impressions table allows NULL publisher_id
    // We'll test by trying to insert a test record

    // Try a test insert to check if NULL publisher_id is allowed
    const { data: testCampaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .limit(1)
      .single()

    if (testCampaigns) {
      // Try inserting a test impression with NULL publisher_id
      const { data: testImpression, error: testImpressionError } = await supabaseAdmin
        .from('impressions')
        .insert({
          campaign_id: testCampaigns.id,
          publisher_id: null,
          keyword: null,
        })
        .select()

      if (testImpressionError) {
        return NextResponse.json({
          error: 'Migration not applied',
          message: 'publisher_id and keyword must be nullable in impressions table',
          details: testImpressionError.message,
          hint: 'Run the migration: supabase/migrations/002_make_publisher_id_optional.sql',
          error_code: testImpressionError.code,
        }, { status: 500 })
      }

      // Clean up test impression
      if (testImpression && testImpression[0]) {
        await supabaseAdmin
          .from('impressions')
          .delete()
          .eq('id', testImpression[0].id)
      }
    }

    // Try a test insert for clicks
    if (testCampaigns) {
      const { data: testClick, error: testClickError } = await supabaseAdmin
        .from('clicks')
        .insert({
          campaign_id: testCampaigns.id,
          publisher_id: null,
        })
        .select()

      if (testClickError) {
        return NextResponse.json({
          error: 'Migration not applied',
          message: 'publisher_id must be nullable in clicks table',
          details: testClickError.message,
          hint: 'Run the migration: supabase/migrations/002_make_publisher_id_optional.sql',
          error_code: testClickError.code,
        }, { status: 500 })
      }

      // Clean up test click
      if (testClick && testClick[0]) {
        await supabaseAdmin
          .from('clicks')
          .delete()
          .eq('id', testClick[0].id)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema is correct - tracking should work!',
      migration_status: 'applied',
    })
  } catch (error: any) {
    console.error('Test tracking error:', error)
    return NextResponse.json({
      error: 'Failed to test tracking schema',
      message: error.message,
      hint: 'Make sure you have run both migrations: 001_initial_schema.sql and 002_make_publisher_id_optional.sql',
    }, { status: 500 })
  }
}

