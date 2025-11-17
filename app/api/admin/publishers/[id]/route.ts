import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const updatePublisherSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
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
    const validatedData = updatePublisherSchema.parse(body)

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    const publisherId = params.id

    // Update publisher name if provided
    if (validatedData.name) {
      const { error: updateError } = await supabaseAdmin
        .from('publishers')
        .update({ name: validatedData.name })
        .eq('id', publisherId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
      }
    }

    // Get user linked to publisher
    const { data: userLink } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('publisher_id', publisherId)
      .single()

    if (userLink?.id) {
      // Update email if provided
      if (validatedData.email) {
        const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
          userLink.id,
          { email: validatedData.email }
        )

        if (emailError) {
          return NextResponse.json({ error: emailError.message }, { status: 400 })
        }
      }

      // Update password if provided
      if (validatedData.password) {
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          userLink.id,
          { password: validatedData.password }
        )

        if (passwordError) {
          return NextResponse.json({ error: passwordError.message }, { status: 400 })
        }
      }
    }

    // Get updated publisher
    const { data: updatedPublisher } = await supabaseAdmin
      .from('publishers')
      .select('*')
      .eq('id', publisherId)
      .single()

    const { data: authUser } = userLink?.id
      ? await supabaseAdmin.auth.admin.getUserById(userLink.id)
      : { data: null }

    return NextResponse.json({
      publisher: {
        ...updatedPublisher,
        email: authUser?.user?.email || null,
        user_id: userLink?.id || null,
      }
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

