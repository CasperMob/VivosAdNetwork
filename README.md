# Contextual Ad Network MVP

A full-stack contextual ad-network MVP built with Next.js (App Router), Supabase, OpenAI, and TypeScript.

## Features

- **AI-Powered Advertiser Onboarding**: Chat-style UI that uses OpenAI to help advertisers create campaigns
- **Real-Time Ad Auction**: Intelligent ad selection based on keywords, CPC bid, quality score, and relevance
- **Click Tracking**: Automatic budget deduction and publisher credit on ad clicks
- **Publisher Dashboard**: Simple interface for publishers to fetch and display ads

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI API (gpt-4o-mini)

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

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

You can find these values in your Supabase project settings:
- Project URL: Settings → API → Project URL
- Anon Key: Settings → API → Project API keys → anon/public
- Service Role Key: Settings → API → Project API keys → service_role (keep this secret!)

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Advertiser Onboarding

1. Navigate to `/onboard`
2. Start a conversation with the AI assistant
3. The assistant will guide you through creating a campaign:
   - Campaign title
   - Ad message
   - Target URL
   - Keywords
   - CPC bid
   - Total budget
4. Review and save your campaign

### Publisher Dashboard

1. Navigate to `/publisher`
2. Enter your Publisher ID (you'll need to create a publisher in the database first)
3. Enter a keyword to fetch a relevant ad
4. The system will run an auction and return the highest-scoring ad
5. Click the ad link to track clicks and credit the publisher

## API Endpoints

### `POST /api/ai/onboard`
Handles OpenAI conversation for advertiser onboarding.

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


