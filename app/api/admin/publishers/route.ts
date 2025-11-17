import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const createPublisherSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})

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

    // Get all publishers
    const { data: publishers, error: publishersError } = await supabaseAdmin
      .from('publishers')
      .select('*')
      .order('created_at', { ascending: false })

    if (publishersError) {
      return NextResponse.json({ error: publishersError.message }, { status: 400 })
    }

    // Get user accounts linked to publishers
    const publishersWithUsers = await Promise.all(
      (publishers || []).map(async (pub) => {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('publisher_id', pub.id)
          .single()

        const { data: authUser } = userData?.id 
          ? await supabaseAdmin.auth.admin.getUserById(userData.id)
          : { data: null }

        // Get impression and click counts
        const { count: impressionCount } = await supabaseAdmin
          .from('impressions')
          .select('*', { count: 'exact', head: true })
          .eq('publisher_id', pub.id)

        const { count: clickCount } = await supabaseAdmin
          .from('clicks')
          .select('*', { count: 'exact', head: true })
          .eq('publisher_id', pub.id)

        return {
          ...pub,
          email: authUser?.user?.email || null,
          user_id: userData?.id || null,
          impression_count: impressionCount || 0,
          click_count: clickCount || 0,
        }
      })
    )

    return NextResponse.json({ publishers: publishersWithUsers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const validatedData = createPublisherSchema.parse(body)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    // Create publisher record
    const { data: publisher, error: publisherError } = await supabaseAdmin
      .from('publishers')
      .insert({
        name: validatedData.name,
        api_key: crypto.randomUUID(),
        balance: 0,
      })
      .select()
      .single()

    if (publisherError || !publisher) {
      return NextResponse.json({ error: publisherError?.message || 'Failed to create publisher' }, { status: 400 })
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validatedData.email,
      password: validatedData.password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      // Rollback: delete the publisher
      await supabaseAdmin.from('publishers').delete().eq('id', publisher.id)
      return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 })
    }

    // Link user to publisher
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        role: 'publisher',
        publisher_id: publisher.id 
      })
      .eq('id', authData.user.id)

    if (updateError) {
      // Rollback: delete both
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      await supabaseAdmin.from('publishers').delete().eq('id', publisher.id)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      publisher: {
        ...publisher,
        email: authData.user.email,
        user_id: authData.user.id,
      }
    }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const publisherId = searchParams.get('id')

    if (!publisherId) {
      return NextResponse.json({ error: 'Publisher ID required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    // Get user linked to publisher
    const { data: userLink } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('publisher_id', publisherId)
      .single()

    // Delete auth user if exists
    if (userLink?.id) {
      await supabaseAdmin.auth.admin.deleteUser(userLink.id)
    }

    // Delete publisher (this will cascade to user via ON DELETE SET NULL)
    const { error: deleteError } = await supabaseAdmin
      .from('publishers')
      .delete()
      .eq('id', publisherId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Publisher deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

