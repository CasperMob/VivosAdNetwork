'use client'

import { useState } from 'react'

interface CampaignData {
  title?: string
  message?: string
  keywords?: string[]
  target_url?: string
  image_url?: string | null
  cpc_bid?: number
  budget_total?: number
}

type OnboardingStep = 'url' | 'extracting' | 'edit_info' | 'bid_budget' | 'review' | 'saving'

export default function OnboardPage() {
  const [step, setStep] = useState<OnboardingStep>('url')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [keywordsInput, setKeywordsInput] = useState('')
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null)
  const [editableTitle, setEditableTitle] = useState('')
  const [editableMessage, setEditableMessage] = useState('')
  const [editableKeywords, setEditableKeywords] = useState('')
  const [editableTargetUrl, setEditableTargetUrl] = useState('')
  const [editableImageUrl, setEditableImageUrl] = useState('')
  const [cpcBid, setCpcBid] = useState('')
  const [budget, setBudget] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [advertiserEmail, setAdvertiserEmail] = useState('')
  const [advertiserName, setAdvertiserName] = useState('')

  const handleExtractWebsite = async () => {
    if (!websiteUrl.trim()) {
      setError('Please enter a website URL')
      return
    }

    // Validate URL - add https:// if not present
    let urlToUse = websiteUrl.trim()
    if (!urlToUse.startsWith('http://') && !urlToUse.startsWith('https://')) {
      urlToUse = 'https://' + urlToUse
    }

    try {
      new URL(urlToUse)
    } catch {
      setError('Please enter a valid URL (e.g., example.com or https://example.com)')
      return
    }

    setIsLoading(true)
    setError('')
    setStep('extracting')

    try {
      const response = await fetch('/api/ai/extract-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToUse }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to extract website information')
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        setCampaignData(data.data)
        // Set editable fields with extracted data
        setEditableTitle(data.data.title || '')
        setEditableMessage(data.data.message || '')
        setEditableKeywords(Array.isArray(data.data.keywords) 
          ? data.data.keywords.join(', ') 
          : data.data.keywords || '')
        setEditableTargetUrl(data.data.target_url || urlToUse)
        setEditableImageUrl(data.data.image_url || '')
        setStep('edit_info')
      } else {
        throw new Error('Failed to extract website information')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract website information')
      setStep('url')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueFromEdit = () => {
    // Update campaign data with edited values
    setCampaignData((prev) => ({
      ...prev,
      title: editableTitle,
      message: editableMessage,
      keywords: editableKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0),
      target_url: editableTargetUrl,
      image_url: editableImageUrl.trim() || null,
    }))
    setStep('bid_budget')
  }

  const handleSubmitBidBudget = () => {
    const bid = parseFloat(cpcBid)
    const budgetTotal = parseFloat(budget)

    if (isNaN(bid) || bid <= 0) {
      setError('Please enter a valid CPC bid (must be greater than 0)')
      return
    }

    if (isNaN(budgetTotal) || budgetTotal <= 0) {
      setError('Please enter a valid budget (must be greater than 0)')
      return
    }

    setCampaignData((prev) => ({
      ...prev,
      cpc_bid: bid,
      budget_total: budgetTotal,
    }))
    setStep('review')
    setError('')
  }

  const handleSaveCampaign = async () => {
    if (!advertiserEmail.trim() || !advertiserName.trim()) {
      setError('Please enter your name and email')
      return
    }

    if (!campaignData) {
      setError('Campaign data is missing')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')
    setStep('saving')

    try {
      // First, get or create advertiser
      const advertiserRes = await fetch('/api/advertisers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: advertiserEmail,
          name: advertiserName,
        }),
      })

      if (!advertiserRes.ok) {
        const data = await advertiserRes.json()
        throw new Error(data.error || 'Failed to create advertiser')
      }

      const advertiserData = await advertiserRes.json()
      const advertiserId = advertiserData.advertiser?.id

      if (!advertiserId) {
        throw new Error('Failed to get advertiser ID')
      }

      // Create campaign
      const campaignRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          title: campaignData.title || 'Untitled Campaign',
          message: campaignData.message || '',
          image_url: campaignData.image_url || null,
          target_url: campaignData.target_url || websiteUrl,
          keywords: campaignData.keywords || [],
          cpc_bid: campaignData.cpc_bid || 0.1,
          budget_total: campaignData.budget_total || 100,
          quality_score: 0.5,
        }),
      })

      if (!campaignRes.ok) {
        const data = await campaignRes.json()
        console.error('Campaign creation error:', data)
        throw new Error(data.error || 'Failed to create campaign')
      }

      const result = await campaignRes.json()
      
      if (!result.campaign || !result.campaign.id) {
        throw new Error('Campaign created but no ID returned')
      }

      setSuccess(`Campaign created successfully! Campaign ID: ${result.campaign.id}`)
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setStep('url')
        setWebsiteUrl('')
        setKeywordsInput('')
        setCampaignData(null)
        setEditableTitle('')
        setEditableMessage('')
        setEditableKeywords('')
        setEditableTargetUrl('')
        setEditableImageUrl('')
        setCpcBid('')
        setBudget('')
        setAdvertiserEmail('')
        setAdvertiserName('')
        setSuccess('')
      }, 3000)
    } catch (err: any) {
      console.error('Error saving campaign:', err)
      setError(err.message || 'Failed to save campaign. Please check your Supabase configuration.')
      setStep('review')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0C29] via-[#1A1A2E] to-[#16213E] p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-white">Advertiser Onboarding</h1>

        {/* Step 1: URL Input */}
        {step === 'url' && (
          <div className="relative rounded-2xl p-8 bg-[#1A1A2E] border-2 border-transparent bg-clip-padding"
               style={{
                 background: 'linear-gradient(#1A1A2E, #1A1A2E) padding-box, linear-gradient(135deg, #9333EA, #3B82F6) border-box',
                 border: '2px solid transparent'
               }}>
            <h2 className="text-2xl font-semibold mb-4 text-white">Your landing page URL</h2>
            <p className="text-gray-400 mb-6">
              We'll analyze your website and automatically extract relevant information for your ad campaign.
            </p>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your landing page URL
                </label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="e.g., google.com"
                    className="w-full pl-12 pr-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleExtractWebsite()}
                  />
                </div>
              </div>
              <div>
              </div>
              <button
                onClick={handleExtractWebsite}
                disabled={isLoading || !websiteUrl.trim()}
                className="w-full px-6 py-4 bg-gradient-to-r from-[#6A5ACD] to-[#7B68EE] text-white font-semibold rounded-lg hover:from-[#5A4ABD] hover:to-[#6B58DE] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-purple-500/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Try It Out
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Extracting */}
        {step === 'extracting' && (
          <div className="relative rounded-2xl p-8 bg-[#1A1A2E] border-2 border-transparent bg-clip-padding text-center"
               style={{
                 background: 'linear-gradient(#1A1A2E, #1A1A2E) padding-box, linear-gradient(135deg, #9333EA, #3B82F6) border-box',
                 border: '2px solid transparent'
               }}>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold mb-2 text-white">Analyzing Your Website</h2>
            <p className="text-gray-400">This may take a few moments...</p>
          </div>
        )}

        {/* Step 3: Edit Information */}
        {step === 'edit_info' && (
          <div className="relative rounded-2xl p-8 bg-[#1A1A2E] border-2 border-transparent bg-clip-padding"
               style={{
                 background: 'linear-gradient(#1A1A2E, #1A1A2E) padding-box, linear-gradient(135deg, #9333EA, #3B82F6) border-box',
                 border: '2px solid transparent'
               }}>
            <h2 className="text-2xl font-semibold mb-4 text-white">Review & Edit Information</h2>
            <p className="text-gray-400 mb-6">
              Review the extracted information and make any necessary edits before proceeding.
            </p>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ad Message
                </label>
                <textarea
                  value={editableMessage}
                  onChange={(e) => setEditableMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Keywords <span className="text-gray-500">(comma-separated)</span>
                </label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <input
                    type="text"
                    value={editableKeywords}
                    onChange={(e) => setEditableKeywords(e.target.value)}
                    placeholder="keyword1, keyword2, keyword3"
                    className="w-full pl-12 pr-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target URL
                </label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <input
                    type="text"
                    value={editableTargetUrl}
                    onChange={(e) => setEditableTargetUrl(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ad Image/Logo URL
                </label>
                <div className="space-y-3">
                  {editableImageUrl && (
                    <div className="flex items-center justify-center p-4 bg-[#0F0C29]/30 border border-gray-700 rounded-lg">
                      <img
                        src={editableImageUrl}
                        alt="Campaign logo"
                        className="max-h-32 max-w-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="relative">
                    <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="url"
                      value={editableImageUrl}
                      onChange={(e) => setEditableImageUrl(e.target.value)}
                      placeholder="https://example.com/logo.png (or leave empty)"
                      className="w-full pl-12 pr-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    We've automatically detected a logo from your website. You can replace it with a different image URL or leave it empty.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('url')
                    setError('')
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleContinueFromEdit}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#6A5ACD] to-[#7B68EE] text-white font-semibold rounded-lg hover:from-[#5A4ABD] hover:to-[#6B58DE] transition-all duration-200 shadow-lg shadow-purple-500/20"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Bid and Budget */}
        {step === 'bid_budget' && campaignData && (
          <div className="relative rounded-2xl p-8 bg-[#1A1A2E] border-2 border-transparent bg-clip-padding"
               style={{
                 background: 'linear-gradient(#1A1A2E, #1A1A2E) padding-box, linear-gradient(135deg, #9333EA, #3B82F6) border-box',
                 border: '2px solid transparent'
               }}>
            <h2 className="text-2xl font-semibold mb-4 text-white">Set Your Bid & Budget</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CPC Bid (Cost Per Click) - USD
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={cpcBid}
                  onChange={(e) => setCpcBid(e.target.value)}
                  placeholder="0.50"
                  className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-2">How much you're willing to pay per click</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Total Budget - USD
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="100.00"
                  className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-2">Total amount you want to spend on this campaign</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('edit_info')
                    setError('')
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitBidBudget}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#6A5ACD] to-[#7B68EE] text-white font-semibold rounded-lg hover:from-[#5A4ABD] hover:to-[#6B58DE] transition-all duration-200 shadow-lg shadow-purple-500/20"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 'review' && campaignData && (
          <div className="relative rounded-2xl p-8 bg-[#1A1A2E] border-2 border-transparent bg-clip-padding"
               style={{
                 background: 'linear-gradient(#1A1A2E, #1A1A2E) padding-box, linear-gradient(135deg, #9333EA, #3B82F6) border-box',
                 border: '2px solid transparent'
               }}>
            <h2 className="text-2xl font-semibold mb-4 text-white">Review & Save</h2>
            <div className="bg-[#0F0C29]/50 border border-gray-700 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-lg mb-4 text-white">Campaign Summary</h3>
              {campaignData.image_url && (
                <div className="mb-4 flex items-center justify-center p-4 bg-[#0F0C29]/30 border border-gray-700 rounded-lg">
                  <img
                    src={campaignData.image_url}
                    alt="Campaign logo"
                    className="max-h-32 max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
              <div className="space-y-2 text-sm text-gray-300">
                <p><strong className="text-white">Title:</strong> {campaignData.title}</p>
                <p><strong className="text-white">Message:</strong> {campaignData.message}</p>
                <p><strong className="text-white">Keywords:</strong> {campaignData.keywords?.join(', ')}</p>
                <p><strong className="text-white">Target URL:</strong> {campaignData.target_url}</p>
                {campaignData.image_url && (
                  <p><strong className="text-white">Image URL:</strong> {campaignData.image_url}</p>
                )}
                <p><strong className="text-white">CPC Bid:</strong> ${campaignData.cpc_bid?.toFixed(2)}</p>
                <p><strong className="text-white">Total Budget:</strong> ${campaignData.budget_total?.toFixed(2)}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={advertiserName}
                  onChange={(e) => setAdvertiserName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Email
                </label>
                <input
                  type="email"
                  value={advertiserEmail}
                  onChange={(e) => setAdvertiserEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('bid_budget')
                    setError('')
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveCampaign}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-semibold rounded-lg hover:from-[#059669] hover:to-[#047857] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-green-500/20"
                >
                  {isLoading ? 'Saving...' : 'Save Campaign'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Saving */}
        {step === 'saving' && (
          <div className="relative rounded-2xl p-8 bg-[#1A1A2E] border-2 border-transparent bg-clip-padding text-center"
               style={{
                 background: 'linear-gradient(#1A1A2E, #1A1A2E) padding-box, linear-gradient(135deg, #9333EA, #3B82F6) border-box',
                 border: '2px solid transparent'
               }}>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold mb-2 text-white">Saving Campaign</h2>
            <p className="text-gray-400">Please wait...</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-4 bg-green-900/30 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg">
            <p className="font-semibold">Success!</p>
            <p>{success}</p>
          </div>
        )}
      </div>
    </div>
  )
}
