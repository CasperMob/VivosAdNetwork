'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Campaign {
  id: string
  title: string
  message?: string
  target_url?: string
  impressions: number
  clicks: number
  earnings: number
  cpc_bid: number
}

interface Placement {
  keyword: string
  impressions: number
  clicks: number
  earnings: number
}

interface PublisherAnalytics {
  publisher: {
    id: string
    name: string
    balance: number
    created_at: string
  }
  totalImpressions: number
  totalClicks: number
  totalEarnings: number
  ctr: number
  campaigns: Campaign[]
  placements: Placement[]
}

export default function PublisherDashboard() {
  const [analytics, setAnalytics] = useState<PublisherAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<{
    email: string
    role: string
    publisher_id?: string
  } | null>(null)
  const [showIntegration, setShowIntegration] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/signin?redirect=/publisher')
      return
    }

    // Check if user is publisher and get profile info
    const { data: userData } = await supabase
      .from('users')
      .select('role, publisher_id')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'publisher') {
      router.push('/analytics')
      return
    }

    // Set user profile
    setUserProfile({
      email: user.email || 'N/A',
      role: userData.role,
      publisher_id: userData.publisher_id,
    })

    loadAnalytics()
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const loadAnalytics = async () => {
    try {
      const res = await fetch('/api/publishers/analytics')
      if (!res.ok) {
        console.error('Error loading analytics')
        return
      }
      const data = await res.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const highlightCode = (code: string) => {
    return code.split('\n').map((line, lineIndex) => {
      if (line.trim() === '') {
        return <div key={lineIndex} className="h-4"></div>
      }

      const parts: Array<{ text: string; className: string }> = []
      let i = 0
      let inString = false
      let stringChar = ''
      let buffer = ''

      const flushBuffer = (className: string = 'text-gray-300') => {
        if (buffer) {
          parts.push({ text: buffer, className })
          buffer = ''
        }
      }

      while (i < line.length) {
        const char = line[i]
        const nextChar = line[i + 1]

        // Handle comments
        if (!inString && char === '/' && nextChar === '/') {
          flushBuffer()
          parts.push({ text: line.substring(i), className: 'text-gray-500' })
          break
        }

        // Handle strings
        if ((char === '"' || char === "'" || char === '`') && (i === 0 || line[i - 1] !== '\\')) {
          if (inString && char === stringChar) {
            // End of string
            buffer += char
            flushBuffer('text-green-400')
            inString = false
            stringChar = ''
          } else if (!inString) {
            // Start of string
            flushBuffer()
            buffer = char
            inString = true
            stringChar = char
          } else {
            buffer += char
          }
          i++
          continue
        }

        if (inString) {
          buffer += char
          i++
          continue
        }

        // Check for keywords and functions at word boundaries
        const remaining = line.substring(i)
        const keywordMatch = remaining.match(/^\b(fetch|then|catch|console|log|method|headers|body|JSON|stringify|const|let|var|function|return|if|else|for|while|async|await|true|false|null|undefined)\b/)
        
        if (keywordMatch) {
          flushBuffer()
          const keyword = keywordMatch[0]
          const isFunction = ['fetch', 'then', 'catch', 'console', 'log', 'method', 'headers', 'body', 'JSON', 'stringify'].includes(keyword)
          const isKeyword = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'async', 'await'].includes(keyword)
          const isLiteral = ['true', 'false', 'null', 'undefined'].includes(keyword)
          
          parts.push({
            text: keyword,
            className: isFunction ? 'text-blue-400' : isKeyword ? 'text-purple-400' : isLiteral ? 'text-purple-300' : 'text-cyan-400'
          })
          i += keyword.length
          continue
        }

        // Check for numbers
        const numberMatch = remaining.match(/^\d+/)
        if (numberMatch) {
          flushBuffer()
          parts.push({ text: numberMatch[0], className: 'text-yellow-400' })
          i += numberMatch[0].length
          continue
        }

        // Regular character
        buffer += char
        i++
      }

      flushBuffer()

      return (
        <div key={lineIndex} className="whitespace-pre">
          {parts.length > 0 ? (
            parts.map((part, partIndex) => (
              <span key={partIndex} className={part.className}>
                {part.text}
              </span>
            ))
          ) : (
            <span className="text-gray-300">{line}</span>
          )}
        </div>
      )
    })
  }

  const apiEndpoint = analytics?.publisher?.id 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/ads?keyword=YOUR_KEYWORD&publisher_id=${analytics.publisher.id}`
    : ''

  const highlightEndpoint = (endpoint: string) => {
    try {
      const url = new URL(endpoint)
      const parts = []
      
      // Protocol
      parts.push(<span key="proto" className="text-purple-400">{url.protocol}</span>)
      
      // Host
      parts.push(<span key="host" className="text-green-400">{url.host}</span>)
      
      // Pathname
      parts.push(<span key="path" className="text-blue-400">{url.pathname}</span>)
      
      // Query string
      if (url.search) {
        const searchParams = url.search.substring(1).split('&')
        parts.push(<span key="qmark" className="text-gray-500">?</span>)
        searchParams.forEach((param, idx) => {
          const [key, value] = param.split('=')
          parts.push(
            <span key={`param-${idx}`}>
              {idx > 0 && <span className="text-gray-500">&</span>}
              <span className="text-cyan-400">{key}</span>
              <span className="text-gray-500">=</span>
              <span className="text-yellow-400">{decodeURIComponent(value || '')}</span>
            </span>
          )
        })
      }
      
      return <>{parts}</>
    } catch {
      // Fallback if URL parsing fails
      return <span className="text-blue-400">{endpoint}</span>
    }
  }

  const integrationCode = analytics?.publisher?.id 
    ? `// Fetch an ad from the Vivos Ad Network
fetch('${apiEndpoint.replace('YOUR_KEYWORD', '\${keyword}')}')
  .then(res => res.json())
  .then(data => {
    const ad = data.ad;
    // Display the ad in your application
    console.log(ad);
  });

// Track impression
fetch('/api/ads/\${ad.id}/impression', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    publisher_id: '${analytics.publisher.id}',
    matched_keyword: keyword 
  })
});

// Track click
fetch('/api/ads/\${ad.id}/click', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    publisher_id: '${analytics.publisher.id}' 
  })
});`
    : ''

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0C29] via-[#1A1A2E] to-[#16213E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0C29] via-[#1A1A2E] to-[#16213E] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Publisher Dashboard</h1>
            <p className="text-gray-400">Track your ad revenue and performance</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowIntegration(!showIntegration)} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              {showIntegration ? 'Hide' : 'Show'} Integration
            </Button>
            <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Integration Instructions */}
        {showIntegration && analytics?.publisher && (
          <Card className="mb-8 border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Integration Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Your Publisher ID</h3>
                <div 
                  onClick={() => copyToClipboard(analytics.publisher.id, 'publisher-id')}
                  className="bg-[#0F0C29]/80 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-green-500/50 transition-all group relative"
                >
                  <code className="text-sm font-mono text-green-400 break-all">
                    {analytics.publisher.id}
                  </code>
                  {copied === 'publisher-id' ? (
                    <span className="absolute top-2 right-2 text-green-400 text-xs font-semibold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </span>
                  ) : (
                    <span className="absolute top-2 right-2 text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                      Click to copy
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">API Endpoint</h3>
                <div 
                  onClick={() => copyToClipboard(apiEndpoint, 'api-endpoint')}
                  className="bg-[#0F0C29]/80 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-green-500/50 transition-all group relative"
                >
                  <code className="text-sm font-mono break-all">
                    {highlightEndpoint(apiEndpoint)}
                  </code>
                  {copied === 'api-endpoint' ? (
                    <span className="absolute top-2 right-2 text-green-400 text-xs font-semibold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </span>
                  ) : (
                    <span className="absolute top-2 right-2 text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                      Click to copy
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Integration Code Example</h3>
                <div 
                  onClick={() => copyToClipboard(integrationCode, 'integration-code')}
                  className="bg-[#0F0C29]/80 border border-gray-700 rounded-lg p-4 overflow-x-auto cursor-pointer hover:border-green-500/50 transition-all group relative"
                >
                  <pre className="text-xs font-mono">
                    {highlightCode(integrationCode)}
                  </pre>
                  {copied === 'integration-code' ? (
                    <div className="absolute top-2 right-2 text-green-400 text-xs font-semibold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 text-xs text-gray-500 group-hover:text-gray-400 transition-colors flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Click to copy
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Card */}
        {userProfile && analytics?.publisher && (
          <Card className="mb-8 border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-semibold text-white">{analytics.publisher.name}</h3>
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium uppercase">
                      {userProfile.role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{userProfile.email}</p>
                  {analytics.publisher.created_at && (
                    <p className="text-sm text-gray-400">
                      Publisher since {new Date(analytics.publisher.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">Total Campaigns</div>
                  <div className="text-2xl font-bold text-white">{analytics.campaigns.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Cards */}
        {analytics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-400">Total Earnings</CardTitle>
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">${analytics.totalEarnings.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-400">Total Impressions</CardTitle>
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{analytics.totalImpressions.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-400">Total Clicks</CardTitle>
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{analytics.totalClicks.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-400">CTR</CardTitle>
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white">{analytics.ctr.toFixed(2)}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Placement Performance */}
              {analytics.placements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Placement Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.placements}>
                        <defs>
                          <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#34D399" stopOpacity={0.4} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis dataKey="keyword" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                        <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(value) => `$${value.toFixed(2)}`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1A1A2E',
                            border: '1px solid #10B981',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
                        />
                        <Bar dataKey="earnings" fill="url(#earningsGradient)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Campaign Distribution */}
              {analytics.campaigns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Campaign</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.campaigns}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ title, percent }) => `${title.substring(0, 15)}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="earnings"
                        >
                          {analytics.campaigns.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#10B981', '#3B82F6', '#9333EA', '#F59E0B', '#EF4444'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1A1A2E',
                            border: '1px solid #6A5ACD',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Campaigns Table */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Campaigns on Your Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700/50">
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Campaign</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Impressions</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Clicks</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">CTR</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Earnings</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">CPC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.campaigns.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="p-4 bg-gray-800/50 rounded-full">
                                <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              </div>
                              <p className="text-gray-400">No campaigns yet. Start integrating the ad network to see campaigns here.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        analytics.campaigns.map((campaign) => {
                          const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0
                          return (
                            <tr key={campaign.id} className="border-b border-gray-800/50 hover:bg-[#2A2A3E]/30 transition-colors">
                              <td className="py-4 px-4 text-white font-medium">{campaign.title}</td>
                              <td className="py-4 px-4 text-gray-300">{campaign.impressions}</td>
                              <td className="py-4 px-4 text-gray-300">{campaign.clicks}</td>
                              <td className="py-4 px-4 text-gray-300 font-medium">{ctr.toFixed(2)}%</td>
                              <td className="py-4 px-4 text-green-300 font-bold">${campaign.earnings.toFixed(2)}</td>
                              <td className="py-4 px-4 text-gray-300">${campaign.cpc_bid.toFixed(2)}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Placements Table */}
            {analytics.placements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Placement Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700/50">
                          <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Keyword/Placement</th>
                          <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Impressions</th>
                          <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Clicks</th>
                          <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">CTR</th>
                          <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Earnings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.placements.map((placement, idx) => {
                          const ctr = placement.impressions > 0 ? (placement.clicks / placement.impressions) * 100 : 0
                          return (
                            <tr key={idx} className="border-b border-gray-800/50 hover:bg-[#2A2A3E]/30 transition-colors">
                              <td className="py-4 px-4 text-white font-medium">{placement.keyword}</td>
                              <td className="py-4 px-4 text-gray-300">{placement.impressions}</td>
                              <td className="py-4 px-4 text-gray-300">{placement.clicks}</td>
                              <td className="py-4 px-4 text-gray-300 font-medium">{ctr.toFixed(2)}%</td>
                              <td className="py-4 px-4 text-green-300 font-bold">${placement.earnings.toFixed(2)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
