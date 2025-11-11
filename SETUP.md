# Quick Setup Guide

## Prerequisites

1. Node.js 18+ installed
2. A Supabase account (free tier works)
3. An OpenAI API key

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (takes ~2 minutes)
3. Go to SQL Editor in your Supabase dashboard
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste and run it in the SQL Editor
6. Verify tables were created by checking the Table Editor

### 3. Get Supabase Credentials

1. In Supabase dashboard, go to Settings → API
2. Copy the following:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon/public key** (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role key** (SUPABASE_SERVICE_ROLE_KEY) - Keep this secret!

### 4. Get OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key

### 5. Create Environment File

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OPENAI_API_KEY=sk-your-openai-key-here
```

### 6. Run the Development Server

```bash
npm run dev
```

### 7. Test the Application

1. Open [http://localhost:3000](http://localhost:3000)
2. Click "Advertiser Onboarding"
3. Start a conversation to create a campaign
4. Go to "Publisher Dashboard" to test fetching ads

## Testing the Flow

### Create a Campaign

1. Navigate to `/onboard`
2. Chat with the AI assistant:
   - "I want to create an ad campaign"
   - "My product is a fitness app"
   - "I want to target keywords: fitness, workout, health"
   - "My budget is $100"
   - "My CPC bid is $0.50"
   - "My target URL is https://example.com"
3. Review and save the campaign

### Test Ad Fetching

1. Navigate to `/publisher`
2. Create a new publisher (or select existing)
3. Enter a keyword that matches your campaign
4. Click "Fetch Ad" to see the auction in action
5. Click the ad link to test click tracking

## Troubleshooting

### Database Connection Issues

- Verify your Supabase credentials are correct
- Check that the migration was run successfully
- Ensure your Supabase project is active

### OpenAI API Issues

- Verify your API key is correct
- Check your OpenAI account has credits
- Ensure the API key has proper permissions

### Ad Not Found

- Make sure you have active campaigns with matching keywords
- Check that campaigns have remaining budget
- Verify campaign status is "active"





