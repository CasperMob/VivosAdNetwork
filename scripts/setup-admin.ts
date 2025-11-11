import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

async function setupAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing Supabase environment variables!')
    console.error('Please set in your .env.local file:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
    process.exit(1)
  }

  if (!adminEmail || !adminPassword) {
    console.error('❌ Missing admin credentials!')
    console.error('Please set in your .env.local file:')
    console.error('  ADMIN_EMAIL=admin@example.com')
    console.error('  ADMIN_PASSWORD=your_secure_password')
    console.error('\nOr use:')
    console.error('  NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com')
    console.error('  NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password')
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
    // Check if admin user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingAdmin = existingUsers?.users?.find((u) => u.email === adminEmail)

    if (existingAdmin) {
      // Update role to admin
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', existingAdmin.id)

      if (updateError) {
        console.error('❌ Error updating user role:', updateError.message)
        process.exit(1)
      }

      console.log('✅ Admin user already exists and role updated to admin')
      console.log(`   Email: ${adminEmail}`)
      console.log(`   User ID: ${existingAdmin.id}`)
      return
    }

    // Create admin user
    console.log('👤 Creating admin user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
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

    // Update role to admin
    const { error: roleError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', authData.user.id)

    if (roleError) {
      console.error('❌ Error setting admin role:', roleError.message)
      process.exit(1)
    }

    console.log('✅ Admin user created successfully!')
    console.log(`   Email: ${adminEmail}`)
    console.log(`   User ID: ${authData.user.id}`)
    console.log('\n📝 You can now sign in at /signin')
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  }
}

setupAdmin()

