const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Try to load dotenv if available
try {
  require('dotenv').config({ path: '.env.local' })
} catch (e) {
  // dotenv not installed, that's OK
}

async function setupDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('\n❌ Missing environment variables!')
    console.error('\nPlease set in your .env.local file:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
    console.error('\n💡 You can find these in:')
    console.error('   Supabase Dashboard → Settings → API')
    process.exit(1)
  }

  console.log('\n🔌 Connecting to Supabase...')
  console.log(`📍 URL: ${supabaseUrl.substring(0, 30)}...\n`)

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Read the migration SQL file
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
  
  console.log('📄 Migration SQL loaded successfully!')
  console.log('\n⚠️  Note: Supabase JS client cannot execute raw SQL directly')
  console.log('📋 You need to run this SQL in the Supabase SQL Editor\n')
  
  console.log('═'.repeat(80))
  console.log('📋 COPY THE SQL BELOW AND RUN IT IN SUPABASE SQL EDITOR')
  console.log('═'.repeat(80))
  console.log('\n')
  console.log(migrationSQL)
  console.log('\n')
  console.log('═'.repeat(80))
  
  console.log('\n📍 Step-by-step instructions:')
  console.log('   1. Go to https://supabase.com/dashboard')
  console.log('   2. Select your project')
  console.log('   3. Click on "SQL Editor" in the left sidebar')
  console.log('   4. Click "New query" button')
  console.log('   5. Copy the SQL above (between the lines)')
  console.log('   6. Paste it into the SQL Editor')
  console.log('   7. Click "Run" button or press Ctrl+Enter (Cmd+Enter on Mac)')
  console.log('\n✅ After running the SQL, all tables will be created!')
  
  console.log('\n🔍 Verifying connection...')

  // Test connection by trying to query a table
  try {
    const { data, error } = await supabase.from('advertisers').select('count').limit(1)
    
    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.log('❌ Tables not found - please run the SQL migration above')
        console.log('   Error: ' + error.message)
      } else {
        console.log(`⚠️  Connection test: ${error.message}`)
      }
    } else {
      console.log('✅ Connection successful!')
      console.log('✅ Tables already exist - you\'re all set!')
    }
  } catch (err) {
    console.log('⚠️  Could not verify tables (this is OK if tables don\'t exist yet)')
    console.log('   Error: ' + err.message)
  }

  console.log('\n💡 After running the SQL, test your connection:')
  console.log('   Visit: http://localhost:3000/api/test-db')
  console.log('\n')
}

setupDatabase().catch((err) => {
  console.error('\n❌ Error:', err.message)
  console.error(err.stack)
  process.exit(1)
})

