# Deployment Guide - Vercel

This guide will walk you through deploying your Advertiser Onboard application to Vercel.

## Prerequisites

1. A GitHub, GitLab, or Bitbucket account
2. Your code pushed to a repository
3. A Vercel account (free tier works fine)
4. Your Supabase project set up
5. Your OpenAI API key

## Step 1: Prepare Your Repository

1. Make sure your code is committed and pushed to your Git repository:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. Ensure you have a `.gitignore` file that excludes `.env.local`:
   ```
   .env.local
   .env*.local
   node_modules
   .next
   ```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**: Visit [vercel.com](https://vercel.com) and sign in (or create an account)

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Import your Git repository (GitHub, GitLab, or Bitbucket)
   - Select your repository

3. **Configure Project**:
   - **Framework Preset**: Vercel should auto-detect "Next.js"
   - **Root Directory**: Leave as `./` (unless your Next.js app is in a subdirectory)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Add Environment Variables**:
   Click "Environment Variables" and add the following:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   ```
   
   **Important**: 
   - Make sure to add these for **Production**, **Preview**, and **Development** environments
   - Never commit these values to your repository!

5. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete (usually 2-3 minutes)
   - Your app will be live at `https://your-project-name.vercel.app`

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Set up and deploy? Yes
   - Override settings? No (unless you need custom settings)

4. **Add Environment Variables**:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add OPENAI_API_KEY
   ```
   
   For each variable, select:
   - **Production**: Yes
   - **Preview**: Yes
   - **Development**: Yes

5. **Redeploy with Environment Variables**:
   ```bash
   vercel --prod
   ```

## Step 3: Verify Deployment

1. **Check Build Logs**:
   - Go to your project dashboard on Vercel
   - Click on the latest deployment
   - Check the build logs for any errors

2. **Test Your Application**:
   - Visit your deployed URL: `https://your-project-name.vercel.app`
   - Test the onboarding flow: `/onboard`
   - Test the ads API: `/api/ads?keywords=test&publisher_key=your_key`

3. **Check Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Verify all variables are set correctly

## Step 4: Custom Domain (Optional)

1. **Add Domain**:
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **SSL Certificate**:
   - Vercel automatically provisions SSL certificates
   - Your site will be available over HTTPS

## Step 5: Database Migration

**Important**: Make sure you've run both database migrations in your Supabase project:

1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/001_initial_schema.sql`
3. Run `supabase/migrations/002_make_publisher_id_optional.sql`

## Environment Variables Reference

Here's what each environment variable is for:

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Dashboard → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret!) | Supabase Dashboard → Settings → API → service_role key |
| `OPENAI_API_KEY` | Your OpenAI API key | [platform.openai.com](https://platform.openai.com/api-keys) |

## Troubleshooting

### Build Fails

1. **Check Build Logs**: Look for specific error messages
2. **Common Issues**:
   - Missing environment variables
   - TypeScript errors
   - Missing dependencies in `package.json`

### API Routes Not Working

1. **Check Environment Variables**: Make sure all are set in Vercel
2. **Check Supabase Connection**: Verify your Supabase URL and keys are correct
3. **Check API Logs**: Go to Vercel Dashboard → Functions → View logs

### Database Connection Issues

1. **Verify Supabase Settings**: Check your Supabase project is active
2. **Check Service Role Key**: Make sure it's the correct key (not anon key)
3. **Verify Migrations**: Ensure both migrations have been run

### CORS Issues

- Vercel automatically handles CORS for Next.js API routes
- If you have issues, check your Supabase RLS (Row Level Security) policies

## Continuous Deployment

Vercel automatically deploys when you push to your main branch:

1. Push to `main` → Production deployment
2. Push to other branches → Preview deployment
3. Pull requests → Preview deployment with unique URL

## Monitoring

1. **Analytics**: Vercel provides built-in analytics (may require upgrade)
2. **Logs**: View function logs in Vercel Dashboard
3. **Performance**: Check deployment performance metrics

## Next Steps

After deployment:

1. Test all features on the live site
2. Set up monitoring/analytics
3. Configure custom domain (if needed)
4. Set up staging environment (optional)
5. Configure webhooks (if needed)

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

