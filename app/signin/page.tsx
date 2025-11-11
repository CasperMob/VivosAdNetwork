'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [isWaitlistLoading, setIsWaitlistLoading] = useState(false)
  const [waitlistError, setWaitlistError] = useState('')
  const [waitlistSuccess, setWaitlistSuccess] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Get user role
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()

        const userRole = userData?.role || 'advertiser'

        // Redirect based on role
        if (userRole === 'admin') {
          router.push('/admin')
        } else {
          // Check if advertiser has campaigns
          const { data: campaigns } = await supabase
            .from('campaigns')
            .select('id')
            .eq('user_id', data.user.id)
            .limit(1)

          if (campaigns && campaigns.length > 0) {
            router.push('/analytics')
          } else {
            router.push('/onboard')
          }
        }
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in')
      setIsLoading(false)
    }
  }

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsWaitlistLoading(true)
    setWaitlistError('')
    setWaitlistSuccess('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        setWaitlistError(data.error || 'Failed to join waitlist')
        setIsWaitlistLoading(false)
        return
      }

      setWaitlistSuccess(data.message || 'Successfully joined the waitlist!')
      setWaitlistEmail('')
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setWaitlistSuccess('')
      }, 5000)
    } catch (err: any) {
      setWaitlistError(err.message || 'An error occurred')
    } finally {
      setIsWaitlistLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0C29] via-[#1A1A2E] to-[#16213E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Redefining Ads</h1>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        {/* Sign-in Form */}
        <div
          className="relative rounded-2xl p-8 bg-[#1A1A2E]/80 backdrop-blur-xl border-2 border-transparent bg-clip-padding shadow-2xl"
          style={{
            background: 'linear-gradient(#1A1A2E80, #1A1A2E80) padding-box, linear-gradient(135deg, #9333EA, #3B82F6) border-box',
            border: '2px solid transparent',
          }}
        >
          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-[#6A5ACD] to-[#7B68EE] text-white font-semibold rounded-lg hover:from-[#5A4ABD] hover:to-[#6B58DE] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/20"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Waitlist Section */}
        <div className="mt-8">
          <div
            className="relative rounded-2xl p-6 bg-[#1A1A2E]/60 backdrop-blur-xl border border-purple-500/30 shadow-xl"
            style={{
              background: 'linear-gradient(#1A1A2E60, #1A1A2E60) padding-box, linear-gradient(135deg, rgba(147, 51, 234, 0.3), rgba(59, 130, 246, 0.3)) border-box',
              border: '1px solid transparent',
            }}
          >
            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold text-white mb-1">Join the Waitlist</h2>
              <p className="text-sm text-gray-400">
                Be the first to know when we launch new features
              </p>
            </div>

            <form onSubmit={handleWaitlistSubmit} className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <svg 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="email"
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 bg-[#0F0C29]/50 border border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isWaitlistLoading || !waitlistEmail.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/30 flex items-center gap-2 whitespace-nowrap"
                >
                  {isWaitlistLoading ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      Join
                    </>
                  )}
                </button>
              </div>

              {waitlistError && (
                <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm">
                  {waitlistError}
                </div>
              )}

              {waitlistSuccess && (
                <div className="bg-green-900/30 border border-green-500/50 text-green-200 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {waitlistSuccess}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Only authorized users can access this platform
        </p>
      </div>
    </div>
  )
}

