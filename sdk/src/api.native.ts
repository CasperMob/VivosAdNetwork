// API client for Vivos Ad Network SDK - React Native version
import type { Ad, FetchAdParams } from './types';

export async function fetchAd(params: FetchAdParams): Promise<Ad | null> {
  const { publisherId, keyword, host } = params;

  // Build URL for React Native
  let urlString: string;
  
  if (host) {
    // Use provided host
    const baseUrl = host.endsWith('/') ? host.slice(0, -1) : host;
    urlString = `${baseUrl}/api/ads?keyword=${encodeURIComponent(keyword)}&publisher_id=${encodeURIComponent(publisherId)}`;
  } else {
    // Use default API URL
    const DEFAULT_API_BASE_URL = 'https://api.vivosadnetwork.com';
    urlString = `${DEFAULT_API_BASE_URL}/api/ads?keyword=${encodeURIComponent(keyword)}&publisher_id=${encodeURIComponent(publisherId)}`;
  }

  console.log('🌐 [fetchAd] Ad request:', { keyword, publisherId, url: urlString });

  try {
    const response = await fetch(urlString, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If no ad is available, return null instead of throwing
      if (response.status === 404) {
        console.log('🌐 [fetchAd] Ad response: empty');
        return null;
      }
      throw new Error(`Failed to fetch ad: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('🌐 [fetchAd] Full server response:', data);
    
    // Handle new response format with ads array: { ads: [{...}], timestamp: "..." }
    let ad = null;
    if (data.ads && Array.isArray(data.ads) && data.ads.length > 0) {
      ad = data.ads[0]; // Return the first ad
    } else {
      // Handle legacy formats: { ad: {...} } or direct ad object
      ad = data.ad || data || null;
    }
    
    // Validate ad has matched_keyword - without it, we can't verify relevance
    if (ad && !ad.matched_keyword) {
      console.log('🌐 [fetchAd] Ad response: empty (no matched_keyword)');
      return null;
    }
    
    console.log('🌐 [fetchAd] Ad response:', ad ? { id: ad.id, matched_keyword: ad.matched_keyword } : 'empty');
    return ad;
  } catch (error) {
    console.error('🌐 [fetchAd] Error:', error);
    // Return null on error to allow the app to continue without ads
    return null;
  }
}

