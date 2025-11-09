'use client'

import { useState, useEffect } from 'react'

export default function PublisherPage() {
  const [keyword, setKeyword] = useState('')
  const [publisherId, setPublisherId] = useState('')
  const [publisherName, setPublisherName] = useState('')
  const [ad, setAd] = useState<any>(null)
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

    try {
      const response = await fetch(
        `/api/ads?keyword=${encodeURIComponent(keyword)}&publisher_id=${encodeURIComponent(publisherId)}`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch ad')
      }

      const data = await response.json()
      setAd(data.ad)
    } catch (err: any) {
      setError(err.message)
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Publisher Dashboard</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create Publisher</h2>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Publisher Name
              </label>
              <input
                type="text"
                value={publisherName}
                onChange={(e) => setPublisherName(e.target.value)}
                placeholder="Enter publisher name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={createPublisher}
              disabled={creatingPublisher}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {creatingPublisher ? 'Creating...' : 'Create Publisher'}
            </button>
          </div>
          {publishers.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Existing Publishers:</h3>
              <select
                value={publisherId}
                onChange={(e) => setPublisherId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a publisher</option>
                {publishers.map((pub) => (
                  <option key={pub.id} value={pub.id}>
                    {pub.name} (Balance: ${pub.balance?.toFixed(2) || '0.00'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Fetch Ad</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keyword
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Enter keyword"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchAd}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Loading...' : 'Fetch Ad'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {ad && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Ad Result</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{ad.title}</h3>
                <p className="text-gray-700 mt-2">{ad.message}</p>
                {ad.image_url && (
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="mt-4 max-w-md rounded-lg"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <a
                  href={ad.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleClick(ad.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Visit Ad (Click to track)
                </a>
              </div>
            </div>
          </div>
        )}

        {!ad && !loading && !error && (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            Select a publisher and enter a keyword to fetch an ad
          </div>
        )}
      </div>
    </div>
  )
}

