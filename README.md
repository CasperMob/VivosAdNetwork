# Contextual Ad Network MVP

A full-stack contextual ad-network MVP built with Next.js (App Router), Supabase, OpenRouter, and TypeScript.

## Features

- **AI-Powered Advertiser Onboarding**: Chat-style UI that uses OpenRouter to help advertisers create campaigns
- **Real-Time Ad Auction**: Intelligent ad selection based on keywords, CPC bid, quality score, and relevance
- **Click Tracking**: Automatic budget deduction and publisher credit on ad clicks
- **Publisher Dashboard**: Full-featured dashboard for publishers with revenue tracking, integration instructions, and performance analytics
- **Advertiser Analytics**: Comprehensive analytics dashboard for advertisers to track campaign performance
- **Role-Based Access**: Separate dashboards for publishers, advertisers, and admins

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenRouter API (supports multiple AI models)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migration file to create the database schema:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
   - Execute the SQL

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini  # Optional: defaults to openai/gpt-4o-mini
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Optional: for OpenRouter tracking
```

You can find these values in your Supabase project settings:
- Project URL: Settings → API → Project URL
- Anon Key: Settings → API → Project API keys → anon/public
- Service Role Key: Settings → API → Project API keys → service_role (keep this secret!)

### 4. Run Database Migrations

After setting up Supabase, run all migrations in order:

1. `001_initial_schema.sql` - Base schema
2. `002_make_publisher_id_optional.sql` - Publisher fields
3. `003_auth_and_roles.sql` - Authentication and user roles
4. `004_fix_advertiser_id_nullable.sql` - Advertiser fixes
5. `005_waitlist.sql` - Waitlist feature
6. `006_add_impression_analytics.sql` - Analytics tracking
7. `007_add_publisher_role.sql` - Publisher role support
8. `009_reset_user_rls_policies.sql` - Reset and fix RLS policies for all roles

### 5. Create User Accounts

Create admin, advertiser, or publisher accounts using the setup scripts:

```bash
# Create an admin account
npm run setup-admin admin@example.com password123

# Create an advertiser account
npm run setup-advertiser advertiser@example.com password123

# Create a publisher account
npm run setup-publisher publisher@example.com password123 "Publisher Name"
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Publisher SDK

We provide an easy-to-use SDK for publishers to integrate ads into their applications.

### Quick Start

```bash
npm install @vivosadnetwork/sdk
```

```tsx
import { ChatbotAd } from '@vivosadnetwork/sdk'

<ChatbotAd
  publisherId="your-publisher-id"
  keyword="technology,ai"  // Multiple keywords supported!
/>
```

That's it! The SDK handles:
- ✅ Fetching ads based on keywords (supports comma-separated)
- ✅ Automatic impression tracking
- ✅ Automatic click tracking
- ✅ Device analytics collection
- ✅ Error handling

**See `IMPLEMENTATION_GUIDE.md` for complete documentation.**

## Usage

### User Roles & Dashboards

The platform supports three user roles, each with their own dashboard:

#### 1. **Advertisers** (`/analytics`)
- View campaign performance metrics (impressions, clicks, CTR, spend)
- Track device and audience analytics
- Create and edit campaigns
- Monitor budget usage

#### 2. **Publishers** (`/publisher`)
- View revenue and earnings
- Get integration instructions with API endpoints
- Track campaigns advertised on their platform
- Monitor placement performance
- View detailed statistics by keyword/placement

**See `PUBLISHER_DASHBOARD.md` for complete publisher documentation.**

#### 3. **Admins** (`/admin`)
- Manage all campaigns across the network
- Access admin debug tools at `/admin/publisher-debug`
- View system-wide analytics

### Advertiser Onboarding

1. Sign in at `/signin` with advertiser credentials
2. Navigate to `/onboard` to create your first campaign
3. Chat with the AI assistant to set up:
   - Campaign title
   - Ad message
   - Target URL
   - Keywords
   - CPC bid
   - Total budget
4. View analytics at `/analytics`

### Publisher Integration

1. Sign in at `/signin` with publisher credentials
2. View your dashboard at `/publisher`
3. Click "Show Integration" to get:
   - Your unique Publisher ID
   - API endpoint for fetching ads
   - Sample integration code
4. Integrate the API into your platform
5. Track earnings and performance in real-time

**Revenue Model**: Publishers earn 70% of CPC for each ad click.

## API Endpoints

### `POST /api/ai/onboard`
Handles OpenRouter conversation for advertiser onboarding.

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "I want to create an ad campaign" }
  ],
  "stream": false
}
```

### `POST /api/campaigns`
Creates a new campaign.

**Request Body:**
```json
{
  "advertiser_id": "uuid",
  "title": "Campaign Title",
  "message": "Ad message text",
  "image_url": "https://example.com/image.jpg",
  "target_url": "https://example.com",
  "keywords": ["keyword1", "keyword2"],
  "cpc_bid": 0.5,
  "budget_total": 100,
  "quality_score": 0.8
}
```

### `GET /api/ads?keyword=example&publisher_id=uuid`
Fetches an ad through the auction system.

**Response:**
```json
{
  "ad": {
    "id": "uuid",
    "title": "Ad Title",
    "message": "Ad message",
    "image_url": "https://example.com/image.jpg",
    "target_url": "https://example.com"
  }
}
```

### `POST /api/ads/:id/click`
Logs a click and processes payment.

**Request Body:**
```json
{
  "publisher_id": "uuid"
}
```

### `GET /api/publishers/analytics`
Fetches publisher analytics and revenue data (requires publisher authentication).

**Response:**
```json
{
  "publisher": {
    "id": "uuid",
    "name": "Publisher Name",
    "balance": 150.25
  },
  "totalImpressions": 1000,
  "totalClicks": 50,
  "totalEarnings": 150.25,
  "ctr": 5.0,
  "campaigns": [...],
  "placements": [...]
}
```

## Database Schema

- **advertisers**: Stores advertiser information
- **campaigns**: Stores ad campaigns with keywords, bids, and budgets
- **publishers**: Stores publisher information and balances
- **impressions**: Logs ad impressions
- **clicks**: Logs ad clicks

## Auction Algorithm

The system selects ads using the following scoring formula:

```
score = (cpc_bid * 0.7) + (quality_score * 0.2) + (relevance_score * 0.1)
```

- **CPC Bid** (70%): The advertiser's cost-per-click bid
- **Quality Score** (20%): Campaign quality metric (0-1)
- **Relevance Score** (10%): Keyword match relevance (0.8-1.0)

## Click Processing

When an ad is clicked:
1. Click is logged in the database
2. CPC bid is deducted from campaign budget
3. 70% of CPC bid is credited to publisher balance
4. Campaign status is updated to "completed" if budget is depleted

## License

MIT





