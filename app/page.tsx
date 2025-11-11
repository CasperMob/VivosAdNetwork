import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is authenticated, redirect to their dashboard
  if (user) {
    // Get user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = userData?.role || 'advertiser'

    if (userRole === 'admin') {
      redirect('/admin')
    } else {
      // Check if advertiser has campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (campaigns && campaigns.length > 0) {
        redirect('/analytics')
      } else {
        redirect('/onboard')
      }
    }
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0C29] via-[#1A1A2E] to-[#16213E] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
            Redefining Ads
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-2xl mx-auto">
            The future of contextual advertising is here
          </p>
          <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
            AI-powered ad network that connects advertisers with the right audience at the right time
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/signin"
              className="px-8 py-4 bg-gradient-to-r from-[#6A5ACD] to-[#7B68EE] text-white font-semibold rounded-lg hover:from-[#5A4ABD] hover:to-[#6B58DE] transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 flex items-center gap-2 text-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="relative rounded-2xl p-6 bg-[#1A1A2E]/60 backdrop-blur-xl border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
            <div className="p-3 bg-purple-500/20 rounded-lg w-fit mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">AI-Powered</h3>
            <p className="text-gray-400">
              Intelligent campaign creation and optimization powered by advanced AI
            </p>
          </div>

          <div className="relative rounded-2xl p-6 bg-[#1A1A2E]/60 backdrop-blur-xl border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
            <div className="p-3 bg-blue-500/20 rounded-lg w-fit mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Real-Time Analytics</h3>
            <p className="text-gray-400">
              Track performance with detailed metrics and insights in real-time
            </p>
          </div>

          <div className="relative rounded-2xl p-6 bg-[#1A1A2E]/60 backdrop-blur-xl border border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:scale-105">
            <div className="p-3 bg-green-500/20 rounded-lg w-fit mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Cost-Effective</h3>
            <p className="text-gray-400">
              Pay only for results with transparent CPC bidding and budget control
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="text-center p-4 rounded-xl bg-[#1A1A2E]/40 backdrop-blur-sm">
            <div className="text-3xl font-bold text-white mb-1">AI</div>
            <div className="text-sm text-gray-400">Powered</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-[#1A1A2E]/40 backdrop-blur-sm">
            <div className="text-3xl font-bold text-white mb-1">24/7</div>
            <div className="text-sm text-gray-400">Available</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-[#1A1A2E]/40 backdrop-blur-sm">
            <div className="text-3xl font-bold text-white mb-1">Real</div>
            <div className="text-sm text-gray-400">Time</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-[#1A1A2E]/40 backdrop-blur-sm">
            <div className="text-3xl font-bold text-white mb-1">Secure</div>
            <div className="text-sm text-gray-400">Platform</div>
          </div>
        </div>
      </div>
    </div>
  )
}
