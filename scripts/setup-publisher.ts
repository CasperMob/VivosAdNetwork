import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupPublisher() {
  const args = process.argv.slice(2)
  
  if (args.length < 3) {
    console.log('Usage: npm run setup-publisher <email> <password> <publisher_name>')
    console.log('Example: npm run setup-publisher publisher@example.com password123 "Example Publisher"')
    process.exit(1)
  }

  const [email, password, publisherName] = args

  console.log('🚀 Setting up publisher account...\n')

  try {
    // 1. Create publisher record first
    console.log('1️⃣  Creating publisher record...')
    const { data: publisher, error: publisherError } = await supabase
      .from('publishers')
      .insert({
        name: publisherName,
        api_key: crypto.randomUUID(), // Generate a unique API key
        balance: 0
      })
      .select()
      .single()

    if (publisherError) {
      console.error('❌ Error creating publisher:', publisherError)
      process.exit(1)
    }

    console.log('✅ Publisher created:', publisher.name, '(ID:', publisher.id, ')')

    // 2. Create auth user
    console.log('\n2️⃣  Creating auth user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      console.error('❌ Error creating auth user:', authError)
      // Clean up publisher if auth creation fails
      await supabase.from('publishers').delete().eq('id', publisher.id)
      process.exit(1)
    }

    console.log('✅ Auth user created:', authData.user.email)

    // 3. Update user role to publisher and link to publisher record
    console.log('\n3️⃣  Setting user role to publisher...')
    const { error: roleError } = await supabase
      .from('users')
      .update({ 
        role: 'publisher',
        publisher_id: publisher.id
      })
      .eq('id', authData.user.id)

    if (roleError) {
      console.error('❌ Error updating user role:', roleError)
      // Clean up
      await supabase.auth.admin.deleteUser(authData.user.id)
      await supabase.from('publishers').delete().eq('id', publisher.id)
      process.exit(1)
    }

    console.log('✅ User role set to publisher')

    console.log('\n🎉 Success! Publisher account created:')
    console.log('   Email:', email)
    console.log('   Publisher Name:', publisherName)
    console.log('   Publisher ID:', publisher.id)
    console.log('   API Key:', publisher.api_key)
    console.log('\n📝 The user can now sign in at /signin and will be redirected to the publisher dashboard.')
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

setupPublisher()

