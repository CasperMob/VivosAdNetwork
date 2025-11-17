/**
 * React Hook Example - More Control
 */

import React from 'react'
import { useAd } from '@vivosadnetwork/sdk'

function MyCustomAdComponent() {
  const { ad, loading, error, refetch } = useAd('technology', {
    apiBaseUrl: 'https://your-domain.com',
    publisherId: 'your-publisher-id',
    autoTrackImpressions: true,
    autoTrackClicks: true,
    onAdLoaded: (ad) => console.log('Ad loaded:', ad),
    onAdError: (error) => console.error('Ad error:', error),
  })

  if (loading) {
    return <div>Loading ad...</div>
  }

  if (error) {
    return (
      <div>
        <p>Error: {error.message}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    )
  }

  if (!ad) {
    return <div>No ad available</div>
  }

  return (
    <div className="custom-ad">
      {ad.image_url && (
        <img src={ad.image_url} alt={ad.title} />
      )}
      <h3>{ad.title}</h3>
      <p>{ad.message}</p>
      <a href={ad.target_url} target="_blank" rel="noopener noreferrer">
        Learn More
      </a>
    </div>
  )
}

export default MyCustomAdComponent

