const { Client } = require('pg')
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

  // Extract database connection info from Supabase URL
  // Supabase URL format: https://project-ref.supabase.co
  // We need to extract the project ref and construct the connection string
  const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
  if (!urlMatch) {
    console.error('❌ Invalid Supabase URL format')
    console.error('   Expected format: https://project-ref.supabase.co')
    process.exit(1)
  }

  const projectRef = urlMatch[1]
  
  // Read the migration SQL file
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '001_initial_schema.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
  
  console.log('\n🔌 Connecting to Supabase database...')
  console.log(`📍 Project: ${projectRef}\n`)

  // Construct PostgreSQL connection string
  // Supabase connection format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  // We need the database password from the service role key or connection string
  // Actually, we can use the connection pooling URL from Supabase settings
  
  console.log('⚠️  To automatically create tables, we need your database password.')
  console.log('   You can find it in: Supabase Dashboard → Settings → Database')
  console.log('   Look for "Connection string" or "Connection pooling"\n')
  
  // Try to get password from environment or prompt
  const dbPassword = process.env.SUPABASE_DB_PASSWORD
  const dbHost = process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`
  const dbPort = process.env.SUPABASE_DB_PORT || '5432'
  const dbName = process.env.SUPABASE_DB_NAME || 'postgres'
  const dbUser = process.env.SUPABASE_DB_USER || 'postgres'

  if (!dbPassword) {
    console.log('📋 Alternative: Run the SQL manually using the setup script:')
    console.log('   npm run setup-db\n')
    console.log('═'.repeat(80))
    console.log('📋 COPY THE SQL BELOW AND RUN IT IN SUPABASE SQL EDITOR')
    console.log('═'.repeat(80))
    console.log('\n')
    console.log(migrationSQL)
    console.log('\n')
    console.log('═'.repeat(80))
    console.log('\n📍 Steps:')
    console.log('   1. Go to https://supabase.com/dashboard')
    console.log('   2. Select your project')
    console.log('   3. Click "SQL Editor" → "New query"')
    console.log('   4. Paste the SQL above and click "Run"\n')
    process.exit(0)
  }

  // Connect to database
  const client = new Client({
    host: dbHost,
    port: dbPort,
    database: dbName,
    user: dbUser,
    password: dbPassword,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database!\n')

    console.log('📄 Executing migration SQL...\n')
    
    // Execute the SQL
    await client.query(migrationSQL)
    
    console.log('✅ Migration executed successfully!')
    console.log('✅ All tables created!\n')

    // Verify tables exist
    console.log('🔍 Verifying tables...')
    const tables = ['advertisers', 'campaigns', 'publishers', 'impressions', 'clicks']
    
    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      )
      
      if (result.rows[0].exists) {
        console.log(`✅ Table '${table}' exists`)
      } else {
        console.log(`❌ Table '${table}' not found`)
      }
    }

    console.log('\n🎉 Database setup complete!')
    console.log('\n💡 Test your connection:')
    console.log('   Visit: http://localhost:3000/api/test-db\n')

  } catch (error) {
    console.error('\n❌ Error executing migration:', error.message)
    console.error('\n📋 Please run the SQL manually:')
    console.log('═'.repeat(80))
    console.log(migrationSQL)
    console.log('═'.repeat(80))
    console.log('\n📍 Steps:')
    console.log('   1. Go to https://supabase.com/dashboard')
    console.log('   2. Select your project')
    console.log('   3. Click "SQL Editor" → "New query"')
    console.log('   4. Paste the SQL above and click "Run"\n')
    process.exit(1)
  } finally {
    await client.end()
  }
}

setupDatabase().catch((err) => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})



