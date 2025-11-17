// API client for Vivos Ad Network SDK
import type { Ad, FetchAdParams } from './types';

const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_VIVOS_API_URL || 'https://api.vivosadnetwork.com';

export async function fetchAd(params: FetchAdParams): Promise<Ad | null> {
  const { publisherId, keyword, host } = params;

  // If host is provided, use the Next.js proxy endpoint to avoid CORS issues
  // Otherwise, use the default API URL
  let urlString: string;
  
  if (host && typeof window !== 'undefined') {
    // Use Next.js proxy endpoint (same origin, no CORS)
    const proxyUrl = new URL('/api/ads', window.location.origin);
    proxyUrl.searchParams.set('keyword', keyword);
    proxyUrl.searchParams.set('publisher_id', publisherId);
    urlString = proxyUrl.toString();
  } else if (host) {
    // Server-side or no window: use host directly (may have CORS issues, but proxy should handle it)
    const url = new URL('/api/ads', host);
    url.searchParams.set('keyword', keyword);
    url.searchParams.set('publisher_id', publisherId);
    urlString = url.toString();
  } else {
    // Use default API URL directly
    const url = new URL('/api/ads', DEFAULT_API_BASE_URL);
    url.searchParams.set('keyword', keyword);
    url.searchParams.set('publisher_id', publisherId);
    urlString = url.toString();
  }

  console.log('🌐 [fetchAd] Ad request:', { keyword, publisherId });

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
    // Return null on error to allow the app to continue without ads
    return null;
  }
}
