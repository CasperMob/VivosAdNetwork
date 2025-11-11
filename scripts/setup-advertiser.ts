import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

async function setupAdvertiser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const advertiserEmail = process.env.ADVERTISER_EMAIL || process.env.NEXT_PUBLIC_ADVERTISER_EMAIL
  const advertiserPassword = process.env.ADVERTISER_PASSWORD || process.env.NEXT_PUBLIC_ADVERTISER_PASSWORD

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing Supabase environment variables!')
    console.error('Please set in your .env.local file:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
    process.exit(1)
  }

  if (!advertiserEmail || !advertiserPassword) {
    console.error('❌ Missing advertiser credentials!')
    console.error('Please set in your .env.local file:')
    console.error('  ADVERTISER_EMAIL=advertiser@example.com')
    console.error('  ADVERTISER_PASSWORD=your_secure_password')
    console.error('\nOr use:')
    console.error('  NEXT_PUBLIC_ADVERTISER_EMAIL=advertiser@example.com')
    console.error('  NEXT_PUBLIC_ADVERTISER_PASSWORD=your_secure_password')
    process.exit(1)
  }

  console.log('🔌 Connecting to Supabase...')
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Check if advertiser user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingAdvertiser = existingUsers?.users?.find((u) => u.email === advertiserEmail)

    if (existingAdvertiser) {
      // Check and update role to advertiser
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', existingAdvertiser.id)
        .single()

      if (userData?.role !== 'advertiser') {
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'advertiser' })
          .eq('id', existingAdvertiser.id)

        if (updateError) {
          console.error('❌ Error updating user role:', updateError.message)
          process.exit(1)
        }
        console.log('✅ User role updated to advertiser')
      } else {
        console.log('✅ Advertiser user already exists')
      }

      console.log(`   Email: ${advertiserEmail}`)
      console.log(`   User ID: ${existingAdvertiser.id}`)
      console.log(`   Role: advertiser`)
      return
    }

    // Create advertiser user
    console.log('👤 Creating advertiser user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: advertiserEmail,
      password: advertiserPassword,
      email_confirm: true,
    })

    if (authError) {
      console.error('❌ Error creating user:', authError.message)
      process.exit(1)
    }

    if (!authData.user) {
      console.error('❌ User created but no user data returned')
      process.exit(1)
    }

    // Update role to advertiser (should already be set by trigger, but explicit is better)
    const { error: roleError } = await supabase
      .from('users')
      .update({ role: 'advertiser' })
      .eq('id', authData.user.id)

    if (roleError) {
      console.error('❌ Error setting advertiser role:', roleError.message)
      process.exit(1)
    }

    console.log('✅ Advertiser user created successfully!')
    console.log(`   Email: ${advertiserEmail}`)
    console.log(`   User ID: ${authData.user.id}`)
    console.log(`   Role: advertiser`)
    console.log('\n📝 You can now sign in at /signin')
    console.log('   After signing in, you\'ll be redirected to /onboard to create your first campaign')
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  }
}

setupAdvertiser()

