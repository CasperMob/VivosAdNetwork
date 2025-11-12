'use client'

import { useState, useEffect } from 'react'

const API_HOST = 'https://vivos-ad-network.vercel.app'

export default function PublisherPage() {
  const [keyword, setKeyword] = useState('')
  const [publisherId, setPublisherId] = useState('')
  const [publisherName, setPublisherName] = useState('')
  const [ad, setAd] = useState<any>(null)
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [apiEndpoint, setApiEndpoint] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)
  const [showResponse, setShowResponse] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [creatingPublisher, setCreatingPublisher] = useState(false)
  const [publishers, setPublishers] = useState<any[]>([])

  useEffect(() => {
    fetchPublishers()
  }, [])

  const fetchPublishers = async () => {
    try {
      const response = await fetch('/api/publishers')
      const data = await response.json()
      if (data.publishers) {
        setPublishers(data.publishers)
      }
    } catch (err) {
      console.error('Error fetching publishers:', err)
    }
  }

  const createPublisher = async () => {
    if (!publisherName.trim()) {
      setError('Please enter a publisher name')
      return
    }

    setCreatingPublisher(true)
    setError('')

    try {
      const response = await fetch('/api/publishers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: publisherName }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create publisher')
      }

      const data = await response.json()
      setPublisherId(data.publisher.id)
      setPublisherName('')
      await fetchPublishers()
      alert(`Publisher created! ID: ${data.publisher.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreatingPublisher(false)
    }
  }

  const fetchAd = async () => {
    if (!keyword || !publisherId) {
      setError('Please enter both keyword and publisher ID')
      return
    }

    setLoading(true)
    setError('')
    setAd(null)
    setApiResponse(null)
    setApiEndpoint('')
    setShowResponse(false)
    
    const endpoint = `/api/ads?keyword=${encodeURIComponent(keyword)}&publisher_id=${encodeURIComponent(publisherId)}`
    setApiEndpoint(endpoint)

    try {
      const response = await fetch(endpoint)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch ad')
      }

      // Store full response and ad
      setApiResponse(data)
      setAd(data.ad || (data.ads && data.ads[0]) || null)
      setShowResponse(true)
    } catch (err: any) {
      setError(err.message)
      setApiResponse(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClick = async (adId: string) => {
    try {
      const response = await fetch(`/api/ads/${adId}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publisher_id: publisherId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to log click')
      }

      const data = await response.json()
      alert(`Click logged! Publisher credited: $${data.publisher_credit.toFixed(2)}`)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const copyToClipboard = async () => {
    if (!apiEndpoint) return
    
    const fullUrl = `${API_HOST}${apiEndpoint}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const copySnippet = async (code: string, snippetId: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedSnippet(snippetId)
      setTimeout(() => setCopiedSnippet(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const highlightJSON = (json: string): string => {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="text-cyan-400">$1</span>:')
      .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="text-green-400">$1</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-yellow-400">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="text-purple-400">$1</span>')
      .replace(/(\{|\})/g, '<span class="text-gray-400">$1</span>')
      .replace(/(\[|\])/g, '<span class="text-blue-400">$1</span>')
      .replace(/(,)/g, '<span class="text-gray-500">$1</span>')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0C29] via-[#1A1A2E] to-[#16213E] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Publisher Dashboard</h1>
          <p className="text-gray-400">Create publishers and fetch contextual ads</p>
        </div>

        <div className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Create Publisher</h2>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Publisher Name
              </label>
              <input
                type="text"
                value={publisherName}
                onChange={(e) => setPublisherName(e.target.value)}
                placeholder="Enter publisher name"
                className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={createPublisher}
              disabled={creatingPublisher}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-green-500/20"
            >
              {creatingPublisher ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Publisher'
              )}
            </button>
          </div>
          {publishers.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-300 mb-2">Existing Publishers:</h3>
              <select
                value={publisherId}
                onChange={(e) => setPublisherId(e.target.value)}
                className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="" className="bg-[#1A1A2E]">Select a publisher</option>
                {publishers.map((pub) => (
                  <option key={pub.id} value={pub.id} className="bg-[#1A1A2E]">
                    {pub.name} (Balance: ${pub.balance?.toFixed(2) || '0.00'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Fetch Ad</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Keyword
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Enter keyword"
                className="w-full px-4 py-3 bg-[#0F0C29]/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={fetchAd}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-[#6A5ACD] to-[#7B68EE] text-white font-semibold rounded-lg hover:from-[#5A4ABD] hover:to-[#6B58DE] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                'Fetch Ad'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {ad && (
          <div className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Ad Result</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg text-white">{ad.title}</h3>
                <p className="text-gray-300 mt-2">{ad.message}</p>
                {ad.image_url && (
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="mt-4 max-w-md rounded-lg border border-purple-500/30"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <a
                  href={ad.click_url || ad.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleClick(ad.id)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg shadow-green-500/20"
                >
                  Visit Ad (Click to track)
                </a>
              </div>
            </div>
          </div>
        )}

        {apiEndpoint && (
          <div className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">API Endpoint</h2>
            <div className="space-y-2">
              <p className="text-sm text-gray-400 mb-2">Endpoint called to fetch the ad:</p>
              <div 
                onClick={copyToClipboard}
                className="bg-[#0F0C29]/80 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-blue-500/50 transition-all group relative"
              >
                <code className="text-sm font-mono break-all flex items-center gap-2 flex-wrap">
                  <span className="text-purple-400 font-semibold">GET</span>
                  <span className="text-blue-400">https://</span>
                  <span className="text-green-400">vivos-ad-network.vercel.app</span>
                  <span className="text-yellow-400">{apiEndpoint.split('?')[0]}</span>
                  {apiEndpoint.includes('?') && (
                    <>
                      <span className="text-gray-500">?</span>
                      {apiEndpoint.split('?')[1].split('&').map((param, idx) => {
                        const [key, value] = param.split('=')
                        return (
                          <span key={idx}>
                            {idx > 0 && <span className="text-gray-500">&</span>}
                            <span className="text-cyan-400">{key}</span>
                            <span className="text-gray-500">=</span>
                            <span className="text-orange-400">{decodeURIComponent(value || '')}</span>
                          </span>
                        )
                      })}
                    </>
                  )}
                  {copied ? (
                    <span className="text-green-400 text-xs font-semibold flex items-center gap-1 ml-auto">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </span>
                  ) : (
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </code>
                <div className="absolute top-2 right-2 text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                  Click to copy
                </div>
              </div>
            </div>
          </div>
        )}

        {apiResponse && (
          <div className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">API Response</h2>
              <button
                onClick={() => setShowResponse(!showResponse)}
                className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-all text-sm font-medium"
              >
                {showResponse ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Hide
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Show
                  </span>
                )}
              </button>
            </div>
            {showResponse && (
              <div className="mt-4">
                <div 
                  onClick={() => {
                    const code = JSON.stringify(apiResponse, null, 2)
                    copySnippet(code, 'apiResponse')
                  }}
                  className="bg-[#0F0C29]/80 border border-gray-700 rounded-lg p-4 overflow-x-auto cursor-pointer hover:border-purple-500/50 transition-all group relative"
                >
                  <pre className="text-sm font-mono">
                    <code dangerouslySetInnerHTML={{
                      __html: highlightJSON(JSON.stringify(apiResponse, null, 2))
                    }} />
                  </pre>
                  {copiedSnippet === 'apiResponse' ? (
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
            )}
          </div>
        )}

        {false && ad && publisherId && (
          <div className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-green-500/30 rounded-2xl shadow-2xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">SDK Integration</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Integrate the Vivos Ad Network SDK into your publisher project:
              </p>
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">1. Install the SDK</h3>
                  <div 
                    onClick={() => copySnippet('npm install @vivos-ad-network/sdk', 'install')}
                    className="bg-[#0F0C29]/80 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-green-500/50 transition-all group relative"
                  >
                    <code className="text-sm text-green-300 font-mono flex items-center gap-2">
                      <span className="text-green-400">npm</span> <span className="text-blue-400">install</span> <span className="text-purple-400">@vivos-ad-network/sdk</span>
                      {copiedSnippet === 'install' ? (
                        <span className="text-green-400 text-xs font-semibold flex items-center gap-1 ml-auto">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </span>
                      ) : (
                        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </code>
                    <div className="absolute top-2 right-2 text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                      Click to copy
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">2. Use in your React component</h3>
                  <div 
                    onClick={() => {
                      const code = `import { useAd } from '@vivos-ad-network/sdk'

function MyComponent() {
  const { ad, loading, error } = useAd({
    publisherId: '${publisherId}',
    keywords: ['${keyword}']
  })

  if (loading) return <div>Loading ad...</div>
  if (error) return <div>Error: {error}</div>
  if (!ad) return null

  return (
    <div>
      <h3>{ad.title}</h3>
      <p>{ad.message}</p>
      {ad.image_url && (
        <img src={ad.image_url} alt={ad.title} />
      )}
      <a href={ad.target_url} target="_blank">
        Visit Ad
      </a>
    </div>
  )
}`
                      copySnippet(code, 'useAd')
                    }}
                    className="bg-[#0F0C29]/80 border border-gray-700 rounded-lg p-4 overflow-x-auto cursor-pointer hover:border-green-500/50 transition-all group relative"
                  >
                    <pre className="text-xs font-mono">
                      <code className="text-gray-300">
                        <span className="text-purple-400">import</span> <span className="text-yellow-400">{'{'}</span> <span className="text-blue-400">useAd</span> <span className="text-yellow-400">{'}'}</span> <span className="text-purple-400">from</span> <span className="text-green-400">&apos;@vivos-ad-network/sdk&apos;</span>{'\n\n'}
                        <span className="text-purple-400">function</span> <span className="text-blue-400">MyComponent</span><span className="text-pink-400">()</span> <span className="text-yellow-400">{'{'}</span>{'\n'}
                        {'  '}<span className="text-purple-400">const</span> <span className="text-yellow-400">{'{'}</span> <span className="text-gray-300">ad, loading, error</span> <span className="text-yellow-400">{'}'}</span> <span className="text-purple-400">=</span> <span className="text-blue-400">useAd</span><span className="text-pink-400">(</span><span className="text-yellow-400">{'{'}</span>{'\n'}
                        {'    '}<span className="text-gray-300">publisherId:</span> <span className="text-green-400">&apos;{'{'}publisherId{'}'}&apos;</span>,{'\n'}
                        {'    '}<span className="text-gray-300">keywords:</span> <span className="text-yellow-400">[</span><span className="text-green-400">&apos;{'{'}keyword{'}'}&apos;</span><span className="text-yellow-400">]</span>{'\n'}
                        {'  '}<span className="text-yellow-400">{'}'}</span><span className="text-pink-400">)</span>{'\n\n'}
                        {'  '}<span className="text-purple-400">if</span> <span className="text-pink-400">(</span><span className="text-gray-300">loading</span><span className="text-pink-400">)</span> <span className="text-purple-400">return</span> <span className="text-yellow-400">&lt;</span><span className="text-blue-400">div</span><span className="text-yellow-400">&gt;</span><span className="text-gray-300">Loading ad...</span><span className="text-yellow-400">&lt;/</span><span className="text-blue-400">div</span><span className="text-yellow-400">&gt;</span>{'\n'}
                        {'  '}<span className="text-purple-400">if</span> <span className="text-pink-400">(</span><span className="text-gray-300">error</span><span className="text-pink-400">)</span> <span className="text-purple-400">return</span> <span className="text-yellow-400">&lt;</span><span className="text-blue-400">div</span><span className="text-yellow-400">&gt;</span><span className="text-gray-300">Error: </span><span className="text-yellow-400">{'{'}</span><span className="text-gray-300">error</span><span className="text-yellow-400">{'}'}</span><span className="text-yellow-400">&lt;/</span><span className="text-blue-400">div</span><span className="text-yellow-400">&gt;</span>{'\n'}
                        {'  '}<span className="text-purple-400">if</span> <span className="text-pink-400">(!</span><span className="text-gray-300">ad</span><span className="text-pink-400">)</span> <span className="text-purple-400">return</span> <span className="text-purple-400">null</span>{'\n\n'}
                        {'  '}<span className="text-purple-400">return</span> <span className="text-pink-400">(</span>{'\n'}
                        {'    '}<span className="text-yellow-400">&lt;</span><span className="text-blue-400">div</span><span className="text-yellow-400">&gt;</span>{'\n'}
                        {'      '}<span className="text-yellow-400">&lt;</span><span className="text-blue-400">h3</span><span className="text-yellow-400">&gt;{'{'}</span><span className="text-gray-300">ad.title</span><span className="text-yellow-400">{'}'}</span><span className="text-yellow-400">&lt;/</span><span className="text-blue-400">h3</span><span className="text-yellow-400">&gt;</span>{'\n'}
                        {'      '}<span className="text-yellow-400">&lt;</span><span className="text-blue-400">p</span><span className="text-yellow-400">&gt;{'{'}</span><span className="text-gray-300">ad.message</span><span className="text-yellow-400">{'}'}</span><span className="text-yellow-400">&lt;/</span><span className="text-blue-400">p</span><span className="text-yellow-400">&gt;</span>{'\n'}
                        {'      '}<span className="text-purple-400">if</span> <span className="text-pink-400">(</span><span className="text-gray-300">ad.image_url</span><span className="text-pink-400">)</span> <span className="text-pink-400">(</span>{'\n'}
                        {'        '}<span className="text-yellow-400">&lt;</span><span className="text-blue-400">img</span> <span className="text-gray-300">src=</span><span className="text-yellow-400">{'{'}</span><span className="text-gray-300">ad.image_url</span><span className="text-yellow-400">{'}'}</span> <span className="text-gray-300">alt=</span><span className="text-green-400">&quot;{'{'}&quot;</span><span className="text-gray-300">ad.title</span><span className="text-green-400">&quot;{'{'}&quot;</span> <span className="text-yellow-400">/&gt;</span>{'\n'}
                        {'      '}<span className="text-pink-400">)</span>{'\n'}
                        {'      '}<span className="text-yellow-400">&lt;</span><span className="text-blue-400">a</span> <span className="text-gray-300">href=</span><span className="text-yellow-400">{'{'}</span><span className="text-gray-300">ad.target_url</span><span className="text-yellow-400">{'}'}</span> <span className="text-gray-300">target=</span><span className="text-green-400">&quot;_blank&quot;</span><span className="text-yellow-400">&gt;</span>{'\n'}
                        {'        '}<span className="text-gray-300">Visit Ad</span>{'\n'}
                        {'      '}<span className="text-yellow-400">&lt;/</span><span className="text-blue-400">a</span><span className="text-yellow-400">&gt;</span>{'\n'}
                        {'    '}<span className="text-yellow-400">&lt;/</span><span className="text-blue-400">div</span><span className="text-yellow-400">&gt;</span>{'\n'}
                        {'  '}<span className="text-pink-400">)</span>{'\n'}
                        <span className="text-yellow-400">{'}'}</span>
                      </code>
                    </pre>
                    {copiedSnippet === 'useAd' ? (
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

                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">3. Or use the AdBanner component</h3>
                  <div 
                    onClick={() => {
                      const code = `import { AdBanner } from '@vivos-ad-network/sdk'

function MyPage() {
  return (
    <AdBanner
      publisherId="${publisherId}"
      keywords={['${keyword}']}
    />
  )
}`
                      copySnippet(code, 'adBanner')
                    }}
                    className="bg-[#0F0C29]/80 border border-gray-700 rounded-lg p-4 overflow-x-auto cursor-pointer hover:border-green-500/50 transition-all group relative"
                  >
                    <pre className="text-xs font-mono">
                      <code className="text-gray-300">
                        <span className="text-purple-400">import</span> <span className="text-yellow-400">{'{'}</span> <span className="text-blue-400">AdBanner</span> <span className="text-yellow-400">{'}'}</span> <span className="text-purple-400">from</span> <span className="text-green-400">&apos;@vivos-ad-network/sdk&apos;</span>{'\n\n'}
                        <span className="text-purple-400">function</span> <span className="text-blue-400">MyPage</span><span className="text-pink-400">()</span> <span className="text-yellow-400">{'{'}</span>{'\n'}
                        {'  '}<span className="text-purple-400">return</span> <span className="text-pink-400">(</span>{'\n'}
                        {'    '}<span className="text-yellow-400">&lt;</span><span className="text-blue-400">AdBanner</span>{'\n'}
                        {'      '}<span className="text-gray-300">publisherId=</span><span className="text-green-400">&quot;{'{'}publisherId{'}'}&quot;</span>{'\n'}
                        {'      '}<span className="text-gray-300">keywords=</span><span className="text-yellow-400">{'['}</span><span className="text-green-400">&apos;{'{'}keyword{'}'}&apos;</span><span className="text-yellow-400">{']'}</span>{'\n'}
                        {'    '}<span className="text-yellow-400">/&gt;</span>{'\n'}
                        {'  '}<span className="text-pink-400">)</span>{'\n'}
                        <span className="text-yellow-400">{'}'}</span>
                      </code>
                    </pre>
                    {copiedSnippet === 'adBanner' ? (
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
              </div>
            </div>
          </div>
        )}

        {!ad && !loading && !error && (
          <div className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl p-6 text-center text-gray-400">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p>Select a publisher and enter a keyword to fetch an ad</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

