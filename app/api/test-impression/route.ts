import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Test endpoint to diagnose impression tracking issues
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
  }

  try {
    // Check 1: Supabase Admin client exists
    diagnostics.checks.supabaseAdmin = {
      exists: !!supabaseAdmin,
      status: supabaseAdmin ? 'OK' : 'FAILED'
    }

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Supabase admin client not configured',
        diagnostics
      }, { status: 500 })
    }

    // Check 2: Can connect to database
    const { data: campaigns, error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('id, title, status, budget_remaining')
      .limit(1)

    diagnostics.checks.databaseConnection = {
      status: campaignsError ? 'FAILED' : 'OK',
      error: campaignsError?.message,
    }

    // Check 3: Check impressions table structure
    const { data: impressions, error: impressionsError } = await supabaseAdmin
      .from('impressions')
      .select('*')
      .limit(1)

    diagnostics.checks.impressionsTable = {
      status: impressionsError ? 'FAILED' : 'OK',
      error: impressionsError?.message,
      columns: impressions && impressions.length > 0 ? Object.keys(impressions[0]) : 'Unable to determine (no rows)',
    }

    // Check 4: Try to get an active campaign for testing
    const { data: activeCampaigns, error: activeCampaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('status', 'active')
      .gt('budget_remaining', 0)
      .limit(1)

    diagnostics.checks.activeCampaign = {
      status: activeCampaignsError ? 'FAILED' : (activeCampaigns && activeCampaigns.length > 0 ? 'OK' : 'NO_CAMPAIGNS'),
      error: activeCampaignsError?.message,
      found: activeCampaigns?.length || 0,
      campaign: activeCampaigns && activeCampaigns.length > 0 ? {
        id: activeCampaigns[0].id,
        title: activeCampaigns[0].title,
        status: activeCampaigns[0].status,
        budget_remaining: activeCampaigns[0].budget_remaining,
      } : null
    }

    // Check 5: Try to insert a test impression (if we have an active campaign)
    if (activeCampaigns && activeCampaigns.length > 0) {
      const testCampaignId = activeCampaigns[0].id
      
      const { data: testImpression, error: testImpressionError } = await supabaseAdmin
        .from('impressions')
        .insert({
          campaign_id: testCampaignId,
          publisher_id: null,
          keyword: 'test-diagnostic',
          device_os: 'Test OS',
          device_type: 'Test Device',
          user_agent: 'Diagnostic Test',
        })
        .select()

      diagnostics.checks.testImpressionInsert = {
        status: testImpressionError ? 'FAILED' : 'OK',
        error: testImpressionError?.message,
        errorCode: testImpressionError?.code,
        errorDetails: testImpressionError?.details,
        errorHint: testImpressionError?.hint,
        inserted: testImpression?.length || 0,
      }

      // Clean up: delete the test impression if it was created
      if (testImpression && testImpression.length > 0) {
        await supabaseAdmin
          .from('impressions')
          .delete()
          .eq('id', testImpression[0].id)
        
        diagnostics.checks.testImpressionInsert.cleaned_up = true
      }
    } else {
      diagnostics.checks.testImpressionInsert = {
        status: 'SKIPPED',
        reason: 'No active campaigns found'
      }
    }

    // Summary
    const allChecks = Object.values(diagnostics.checks)
    const failedChecks = allChecks.filter((check: any) => check.status === 'FAILED')
    
    return NextResponse.json({
      success: failedChecks.length === 0,
      summary: {
        total: allChecks.length,
        passed: allChecks.filter((check: any) => check.status === 'OK').length,
        failed: failedChecks.length,
        skipped: allChecks.filter((check: any) => check.status === 'SKIPPED').length,
      },
      diagnostics,
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      diagnostics,
    }, { status: 500 })
  }
}

