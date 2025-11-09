import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

async function setupDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing environment variables!')
    console.error('Please set:')
    console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('🔌 Connecting to Supabase...')
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
  
  console.log('📄 Reading migration SQL...')
  console.log('🚀 Executing migration...\n')

  // Split the SQL into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  let successCount = 0
  let errorCount = 0

  for (const statement of statements) {
    if (statement.length === 0) continue
    
    try {
      // Execute each statement
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        // If exec_sql doesn't exist, try direct query
        // Note: Supabase JS client doesn't support raw SQL directly
        // We'll need to use a different approach
        console.log(`⚠️  Note: Some statements may need to be run manually in Supabase SQL Editor`)
        break
      }
      
      successCount++
    } catch (err: any) {
      // If RPC doesn't work, we'll provide instructions
      console.log(`⚠️  Cannot execute SQL directly. Please run the migration manually.`)
      break
    }
  }

  // Alternative: Use Supabase REST API to execute SQL
  console.log('\n📝 Attempting to create tables via Supabase API...\n')

  // Since Supabase JS client doesn't support raw SQL execution directly,
  // we'll create a script that uses the REST API
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceRoleKey,
      'Authorization': `Bearer ${supabaseServiceRoleKey}`
    },
    body: JSON.stringify({ sql: migrationSQL })
  })

  if (!response.ok) {
    console.log('⚠️  Direct SQL execution not available via API')
    console.log('\n📋 Please run the following SQL in your Supabase SQL Editor:\n')
    console.log('─'.repeat(80))
    console.log(migrationSQL)
    console.log('─'.repeat(80))
    console.log('\n📍 Steps:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the SQL above')
    console.log('4. Click "Run"')
    console.log('\n✅ After running the SQL, your tables will be created!')
    process.exit(0)
  }

  console.log('✅ Migration executed successfully!')
  console.log(`✅ Created ${successCount} database objects`)
  
  // Verify tables exist
  console.log('\n🔍 Verifying tables...')
  const tables = ['advertisers', 'campaigns', 'publishers', 'impressions', 'clicks']
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('count').limit(1)
    if (error && error.code === '42P01') {
      console.log(`❌ Table '${table}' not found`)
    } else {
      console.log(`✅ Table '${table}' exists`)
    }
  }
}

setupDatabase().catch(console.error)



