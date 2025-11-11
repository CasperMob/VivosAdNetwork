'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

type Tab = 'users' | 'campaigns' | 'settings'

interface User {
  id: string
  email: string
  role: string
  created_at: string
  campaign_count?: number
}

interface Campaign {
  id: string
  title: string
  message?: string
  target_url?: string
  keywords?: string[]
  cpc_bid?: number
  budget: number
  budget_total?: number
  status: string
  user_email?: string
  created_at: string
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [users, setUsers] = useState<User[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'delete' | 'editCampaign' | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [campaignFormData, setCampaignFormData] = useState({
    title: '',
    message: '',
    target_url: '',
    keywords: '',
    cpc_bid: '',
    budget_total: '',
    status: 'active' as 'active' | 'paused' | 'completed',
  })
  const [settingsPassword, setSettingsPassword] = useState({ current: '', new: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/signin')
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      router.push('/onboard')
      return
    }

    setIsLoading(false)
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers()
    } else if (activeTab === 'campaigns') {
      loadCampaigns()
    }
  }, [activeTab])

  const loadUsers = async () => {
    const res = await fetch('/api/admin/users')
    if (!res.ok) {
      console.error('Error loading users')
      return
    }
    const data = await res.json()
    setUsers(data.users || [])
  }

  const loadCampaigns = async () => {
    try {
      const res = await fetch('/api/admin/campaigns')
      if (!res.ok) {
        const errorData = await res.json()
        console.error('Error loading campaigns:', errorData)
        setError(errorData.error || 'Failed to load campaigns')
        return
      }
      const data = await res.json()
      console.log('Loaded campaigns:', data.campaigns)
      setCampaigns(data.campaigns || [])
    } catch (err: any) {
      console.error('Error loading campaigns:', err)
      setError(err.message || 'Failed to load campaigns')
    }
  }

  const handleCreateUser = async () => {
    setError('')
    setSuccess('')

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create user')
        return
      }

      setSuccess('User created successfully')
      setIsDialogOpen(false)
      setFormData({ email: '', password: '' })
      loadUsers()
    } catch (err: any) {
      setError(err.message || 'Failed to create user')
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    setError('')
    setSuccess('')

    if (!formData.email && !formData.password) {
      setError('Please provide email or password to update')
      return
    }

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email || undefined,
          password: formData.password || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update user')
        return
      }

      setSuccess('User updated successfully')
      setIsDialogOpen(false)
      setSelectedUser(null)
      setFormData({ email: '', password: '' })
      loadUsers()
    } catch (err: any) {
      setError(err.message || 'Failed to update user')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const res = await fetch(`/api/admin/users?id=${selectedUser.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to delete user')
        return
      }

      setSuccess('User deleted successfully')
      setIsDialogOpen(false)
      setSelectedUser(null)
      loadUsers()
    } catch (err: any) {
      setError(err.message || 'Failed to delete user')
    }
  }

  const handleEditCampaign = async () => {
    if (!selectedCampaign) return

    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/campaigns/${selectedCampaign.id}`, {
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
        setError(data.error || 'Failed to update campaign')
        return
      }

      setSuccess('Campaign updated successfully')
      setIsDialogOpen(false)
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
      loadCampaigns()
    } catch (err: any) {
      setError(err.message || 'Failed to update campaign')
    }
  }

  const loadCampaignForEdit = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}`)
      if (!res.ok) {
        setError('Failed to load campaign details')
        return
      }
      const data = await res.json()
      const campaign = data.campaign
      
      setCampaignFormData({
        title: campaign.title || '',
        message: campaign.message || '',
        target_url: campaign.target_url || '',
        keywords: Array.isArray(campaign.keywords) ? campaign.keywords.join(', ') : '',
        cpc_bid: campaign.cpc_bid?.toString() || '',
        budget_total: campaign.budget_total?.toString() || '',
        status: campaign.status || 'active',
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load campaign')
    }
  }

  const handleUpdatePassword = async () => {
    setError('')
    setSuccess('')

    if (!settingsPassword.new || settingsPassword.new !== settingsPassword.confirm) {
      setError('Passwords do not match')
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Not authenticated')
        return
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: settingsPassword.new,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess('Password updated successfully')
      setSettingsPassword({ current: '', new: '', confirm: '' })
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0C29] via-[#1A1A2E] to-[#16213E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0C29] via-[#1A1A2E] to-[#16213E]">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-[#1A1A2E]/90 backdrop-blur-xl border-r border-gray-700/50 shadow-2xl">
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-1">
              Redefining Ads
            </h1>
            <p className="text-xs text-gray-500">Admin Dashboard</p>
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-[#6A5ACD] to-[#7B68EE] text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-300 hover:bg-[#2A2A3E] hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Users
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                activeTab === 'campaigns'
                  ? 'bg-gradient-to-r from-[#6A5ACD] to-[#7B68EE] text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-300 hover:bg-[#2A2A3E] hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-[#6A5ACD] to-[#7B68EE] text-white shadow-lg shadow-purple-500/30'
                  : 'text-gray-300 hover:bg-[#2A2A3E] hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </nav>
        </div>
        <div className="absolute bottom-6 left-6 right-6">
          <Button onClick={handleSignOut} variant="outline" className="w-full flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">Users</h2>
                <p className="text-gray-400 text-sm">Manage advertiser accounts</p>
              </div>
              <Button
                onClick={() => {
                  setDialogMode('create')
                  setIsDialogOpen(true)
                  setFormData({ email: '', password: '' })
                }}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Advertiser
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700/50">
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Email</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Role</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Created</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Campaigns</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400">
                            No users yet
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-800/50 hover:bg-[#2A2A3E]/30 transition-colors">
                          <td className="py-4 px-4 text-white font-medium">{user.email}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'admin' 
                                ? 'bg-purple-500/20 text-purple-300' 
                                : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4 text-gray-300">{user.campaign_count}</td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setFormData({ email: user.email, password: '' })
                                  setDialogMode('edit')
                                  setIsDialogOpen(true)
                                }}
                                className="flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setDialogMode('delete')
                                  setIsDialogOpen(true)
                                }}
                                className="flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">Campaigns</h2>
                <p className="text-gray-400 text-sm">View all advertiser campaigns</p>
              </div>
              <Button onClick={loadCampaigns} variant="outline" size="sm" className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700/50">
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Title</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Advertiser</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Budget</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Created</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="p-4 bg-gray-800/50 rounded-full">
                                <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              </div>
                              <p className="text-gray-400">No campaigns found</p>
                              <p className="text-gray-500 text-sm">Campaigns created by advertisers will appear here</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b border-gray-800/50 hover:bg-[#2A2A3E]/30 transition-colors">
                          <td className="py-4 px-4 text-white font-medium">{campaign.title}</td>
                          <td className="py-4 px-4 text-gray-300">{campaign.user_email || 'N/A'}</td>
                          <td className="py-4 px-4 text-gray-300 font-medium">${campaign.budget || 0}</td>
                          <td className="py-4 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              campaign.status === 'active' ? 'bg-green-500/20 text-green-300' :
                              campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {campaign.status || 'active'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-400">
                            {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                setSelectedCampaign(campaign)
                                await loadCampaignForEdit(campaign.id)
                                setDialogMode('editCampaign')
                                setIsDialogOpen(true)
                              }}
                              className="flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Button>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-1">Settings</h2>
              <p className="text-gray-400 text-sm">Manage your account settings</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={settingsPassword.new}
                      onChange={(e) => setSettingsPassword({ ...settingsPassword, new: e.target.value })}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      value={settingsPassword.confirm}
                      onChange={(e) => setSettingsPassword({ ...settingsPassword, confirm: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button onClick={handleUpdatePassword}>Update Password</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-900/30 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) {
          setError('')
          setSuccess('')
          setSelectedUser(null)
          setSelectedCampaign(null)
        }
      }}>
        <DialogContent>
          {dialogMode === 'create' && (
            <>
              <DialogHeader>
                <DialogTitle>Add Advertiser</DialogTitle>
                <DialogDescription>
                  Create a new advertiser account. They will be able to sign in with the email and password you provide.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="advertiser@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => setIsDialogOpen(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} className="flex-1">
                    Create User
                  </Button>
                </div>
              </div>
            </>
          )}

          {dialogMode === 'edit' && selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update email or password for {selectedUser.email}. Leave fields empty to keep current values.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="new@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Password (leave empty to keep current)
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => setIsDialogOpen(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleEditUser} className="flex-1">
                    Update User
                  </Button>
                </div>
              </div>
            </>
          )}

          {dialogMode === 'delete' && selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {selectedUser.email}? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3">
                <Button onClick={() => setIsDialogOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleDeleteUser} variant="destructive" className="flex-1">
                  Delete
                </Button>
              </div>
            </>
          )}

          {dialogMode === 'editCampaign' && selectedCampaign && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Campaign</DialogTitle>
                <DialogDescription>
                  Update campaign details for &quot;{selectedCampaign.title}&quot;
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title
                  </label>
                  <Input
                    type="text"
                    value={campaignFormData.title}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, title: e.target.value })}
                    placeholder="Campaign title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={campaignFormData.message}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, message: e.target.value })}
                    placeholder="Ad message"
                    className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target URL
                  </label>
                  <Input
                    type="url"
                    value={campaignFormData.target_url}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, target_url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Keywords (comma-separated)
                  </label>
                  <Input
                    type="text"
                    value={campaignFormData.keywords}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, keywords: e.target.value })}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CPC Bid ($)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={campaignFormData.cpc_bid}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, cpc_bid: e.target.value })}
                      placeholder="0.50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Total Budget ($)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={campaignFormData.budget_total}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, budget_total: e.target.value })}
                      placeholder="100.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={campaignFormData.status}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, status: e.target.value as 'active' | 'paused' | 'completed' })}
                    className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => setIsDialogOpen(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleEditCampaign} className="flex-1">
                    Update Campaign
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

