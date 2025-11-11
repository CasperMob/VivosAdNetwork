'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
  keywords?: string[]
  impressions: number
  clicks: number
  spend: number
  budget_total: number
  budget_remaining: number
  cpc_bid: number
  status: string
  created_at: string
}

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalImpressions, setTotalImpressions] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)
  const [totalSpend, setTotalSpend] = useState(0)
  const [totalCTR, setTotalCTR] = useState(0)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [campaignFormData, setCampaignFormData] = useState({
    title: '',
    message: '',
    target_url: '',
    keywords: '',
    cpc_bid: '',
    budget_total: '',
    status: 'active' as 'active' | 'paused' | 'completed',
  })
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [userProfile, setUserProfile] = useState<{
    email: string
    role: string
    created_at?: string
  } | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/signin?redirect=/analytics')
      return
    }

    // Check if user is advertiser and get profile info
    const { data: userData } = await supabase
      .from('users')
      .select('role, created_at')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'advertiser') {
      router.push('/admin')
      return
    }

    // Set user profile
    setUserProfile({
      email: user.email || 'N/A',
      role: userData.role,
      created_at: userData.created_at,
    })

    loadCampaigns()
  }

  const loadCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns')
      if (!res.ok) {
        console.error('Error loading campaigns')
        return
      }
      const data = await res.json()
      const campaignsData = data.campaigns || []
      setCampaigns(campaignsData)

      // Calculate totals
      const impressions = campaignsData.reduce((sum: number, c: Campaign) => sum + (c.impressions || 0), 0)
      const clicks = campaignsData.reduce((sum: number, c: Campaign) => sum + (c.clicks || 0), 0)
      const spend = campaignsData.reduce((sum: number, c: Campaign) => sum + (c.spend || 0), 0)
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0

      setTotalImpressions(impressions)
      setTotalClicks(clicks)
      setTotalSpend(spend)
      setTotalCTR(ctr)
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
  }

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setCampaignFormData({
      title: campaign.title || '',
      message: campaign.message || '',
      target_url: campaign.target_url || '',
      keywords: Array.isArray(campaign.keywords) ? campaign.keywords.join(', ') : '',
      cpc_bid: campaign.cpc_bid?.toString() || '',
      budget_total: campaign.budget_total?.toString() || '',
      status: (campaign.status as 'active' | 'paused' | 'completed') || 'active',
    })
    setEditError('')
    setEditSuccess('')
    setIsEditDialogOpen(true)
  }

  const handleSaveCampaign = async () => {
    if (!selectedCampaign) return

    setEditError('')
    setEditSuccess('')

    try {
      const res = await fetch(`/api/campaigns/${selectedCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: campaignFormData.title || undefined,
          message: campaignFormData.message || undefined,
          target_url: campaignFormData.target_url || undefined,
          keywords: campaignFormData.keywords ? campaignFormData.keywords.split(',').map(k => k.trim()).filter(k => k) : undefined,
          cpc_bid: campaignFormData.cpc_bid ? parseFloat(campaignFormData.cpc_bid) : undefined,
          budget_total: campaignFormData.budget_total ? parseFloat(campaignFormData.budget_total) : undefined,
          status: campaignFormData.status,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setEditError(data.error || 'Failed to update campaign')
        return
      }

      setEditSuccess('Campaign updated successfully')
      setIsEditDialogOpen(false)
      setSelectedCampaign(null)
      setCampaignFormData({
        title: '',
        message: '',
        target_url: '',
        keywords: '',
        cpc_bid: '',
        budget_total: '',
        status: 'active',
      })
      // Reload campaigns to show updated data
      loadCampaigns()
    } catch (err: any) {
      setEditError(err.message || 'Failed to update campaign')
    }
  }

  const chartData = campaigns.map((campaign) => ({
    name: campaign.title.length > 15 ? campaign.title.substring(0, 15) + '...' : campaign.title,
    impressions: campaign.impressions || 0,
    clicks: campaign.clicks || 0,
    spend: campaign.spend || 0,
    ctr: campaign.impressions > 0 ? ((campaign.clicks || 0) / campaign.impressions) * 100 : 0,
  }))

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
            <h1 className="text-4xl font-bold text-white mb-2">Campaign Analytics</h1>
            <p className="text-gray-400">Track your campaign performance</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/onboard')} className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Campaign
            </Button>
            <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        {userProfile && (
          <Card className="mb-8 border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-semibold text-white">{userProfile.email}</h3>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium uppercase">
                      {userProfile.role}
                    </span>
                  </div>
                  {userProfile.created_at && (
                    <p className="text-sm text-gray-400">
                      Member since {new Date(userProfile.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">Total Campaigns</div>
                  <div className="text-2xl font-bold text-white">{campaigns.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
              <div className="text-3xl font-bold text-white">{totalImpressions.toLocaleString()}</div>
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
              <div className="text-3xl font-bold text-white">{totalClicks.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-400">CTR</CardTitle>
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalCTR.toFixed(2)}%</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-400">Total Spend</CardTitle>
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">${totalSpend.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Impressions & Clicks</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 || chartData.every(d => d.impressions === 0 && d.clicks === 0) ? (
                <div className="h-[300px] flex items-center justify-center flex-col gap-3">
                  <div className="p-4 bg-gray-800/50 rounded-full">
                    <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-400">No data available yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="impressionsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9333EA" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#7B68EE" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9CA3AF" 
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      axisLine={{ stroke: '#374151' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF" 
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      axisLine={{ stroke: '#374151' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A1A2E',
                        border: '1px solid #6A5ACD',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                      }}
                      labelStyle={{ color: '#E5E7EB', fontWeight: 600 }}
                      itemStyle={{ color: '#E5E7EB' }}
                      cursor={{ fill: 'rgba(106, 90, 205, 0.1)' }}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#E5E7EB', paddingTop: '20px' }}
                      iconType="square"
                    />
                    <Bar 
                      dataKey="impressions" 
                      fill="url(#impressionsGradient)" 
                      name="Impressions"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar 
                      dataKey="clicks" 
                      fill="url(#clicksGradient)" 
                      name="Clicks"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spend by Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 || chartData.every(d => d.spend === 0) ? (
                <div className="h-[300px] flex items-center justify-center flex-col gap-3">
                  <div className="p-4 bg-gray-800/50 rounded-full">
                    <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-400">No spending data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#34D399" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9CA3AF" 
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      axisLine={{ stroke: '#374151' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF" 
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      axisLine={{ stroke: '#374151' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A1A2E',
                        border: '1px solid #10B981',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                      }}
                      labelStyle={{ color: '#E5E7EB', fontWeight: 600 }}
                      itemStyle={{ color: '#E5E7EB' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spend']}
                      cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                    />
                    <Bar 
                      dataKey="spend" 
                      fill="url(#spendGradient)" 
                      name="Spend"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700/50">
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Title</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Impressions</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Clicks</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">CTR</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Spend</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Budget</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-gray-800/50 rounded-full">
                            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <p className="text-gray-400">No campaigns yet.</p>
                          <Button onClick={() => router.push('/onboard')} size="sm">
                            Create Your First Campaign
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((campaign) => {
                      const ctr = campaign.impressions > 0 ? ((campaign.clicks || 0) / campaign.impressions) * 100 : 0
                      return (
                        <tr key={campaign.id} className="border-b border-gray-800/50 hover:bg-[#2A2A3E]/30 transition-colors">
                          <td className="py-4 px-4 text-white font-medium">{campaign.title}</td>
                          <td className="py-4 px-4 text-gray-300">{campaign.impressions || 0}</td>
                          <td className="py-4 px-4 text-gray-300">{campaign.clicks || 0}</td>
                          <td className="py-4 px-4 text-gray-300 font-medium">{ctr.toFixed(2)}%</td>
                          <td className="py-4 px-4 text-gray-300 font-medium">${(campaign.spend || 0).toFixed(2)}</td>
                          <td className="py-4 px-4 text-gray-300">
                            <span className="font-medium">${(campaign.budget_remaining || 0).toFixed(2)}</span>
                            <span className="text-gray-500"> / ${(campaign.budget_total || 0).toFixed(2)}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              campaign.status === 'active' ? 'bg-green-500/20 text-green-300' :
                              campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {campaign.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              onClick={() => handleEditCampaign(campaign)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Campaign Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
              <DialogDescription>Update your campaign details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {editError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 text-sm">
                  {editSuccess}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <Input
                  value={campaignFormData.title}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, title: e.target.value })}
                  placeholder="Campaign title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea
                  value={campaignFormData.message}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, message: e.target.value })}
                  placeholder="Ad message"
                  className="flex min-h-[80px] w-full rounded-lg border border-gray-600 bg-[#0F0C29]/50 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Target URL</label>
                <Input
                  value={campaignFormData.target_url}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, target_url: e.target.value })}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Keywords (comma-separated)</label>
                <Input
                  value={campaignFormData.keywords}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, keywords: e.target.value })}
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">CPC Bid ($)</label>
                  <Input
                    value={campaignFormData.cpc_bid}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, cpc_bid: e.target.value })}
                    placeholder="0.50"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Total Budget ($)</label>
                  <Input
                    value={campaignFormData.budget_total}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, budget_total: e.target.value })}
                    placeholder="1000"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={campaignFormData.status}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, status: e.target.value as 'active' | 'paused' | 'completed' })}
                  className="flex h-10 w-full rounded-lg border border-gray-600 bg-[#0F0C29]/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveCampaign} className="flex-1">
                  Save Changes
                </Button>
                <Button onClick={() => setIsEditDialogOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

