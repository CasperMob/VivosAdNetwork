import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
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

    const { data: campaigns, error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('id, title, budget_total, status, created_at, user_id')
      .order('created_at', { ascending: false })

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError)
      return NextResponse.json({ error: campaignsError.message }, { status: 400 })
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ campaigns: [] })
    }

    // Get user emails for campaigns
    const campaignsWithEmails = await Promise.all(
      campaigns.map(async (campaign) => {
        let userEmail = 'N/A'
        
        if (campaign.user_id) {
          try {
            const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(campaign.user_id)
            if (!userError && authUser?.user) {
              userEmail = authUser.user.email || 'N/A'
            }
          } catch (err) {
            console.error('Error fetching user email for campaign:', campaign.id, err)
          }
        }

        return {
          ...campaign,
          budget: campaign.budget_total,
          user_email: userEmail,
        }
      })
    )

    return NextResponse.json({ campaigns: campaignsWithEmails })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

