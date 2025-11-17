// Tracking utilities for Vivos Ad Network SDK
import type { Ad } from './types';

/**
 * Device info interface for analytics
 */
interface DeviceInfo {
  device_os?: string;
  device_type?: string;
  app_version?: string;
  screen_width?: number;
  screen_height?: number;
  platform?: string;
}

/**
 * Detect if we're running in React Native
 */
function isReactNative(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative'
  );
}

/**
 * Try to import React Native Platform and Dimensions
 * This works automatically in React Native without manual setup
 */
async function getReactNativeModules(): Promise<{ Platform?: any; Dimensions?: any }> {
  try {
    // Try multiple methods to get Platform and Dimensions
    
    // Method 1: Try dynamic import (works in some bundlers)
    try {
      // @ts-ignore - react-native may not be available in web builds
      const RN = await import('react-native');
      if (RN.Platform && RN.Dimensions) {
        console.log('✅ [VivosSDK] Loaded React Native modules via import');
        return { Platform: RN.Platform, Dimensions: RN.Dimensions };
      }
    } catch (e) {
      // Import failed, try next method
    }

    // Method 2: Check global scope (for manual setup or older versions)
    const Platform = (global as any).Platform || (window as any)?.Platform;
    const Dimensions = (global as any).Dimensions || (window as any)?.Dimensions;
    
    if (Platform || Dimensions) {
      console.log('✅ [VivosSDK] Found React Native modules in global scope');
      return { Platform, Dimensions };
    }

    // Method 3: Try to require (for metro bundler)
    try {
      // @ts-ignore - require may not exist in all environments
      if (typeof require !== 'undefined') {
        const RN = require('react-native');
        if (RN.Platform && RN.Dimensions) {
          console.log('✅ [VivosSDK] Loaded React Native modules via require');
          return { Platform: RN.Platform, Dimensions: RN.Dimensions };
        }
      }
    } catch (e) {
      // Require failed
    }

    return {};
  } catch (error) {
    console.log('ℹ️ [VivosSDK] React Native modules not available (this is normal for web)');
    return {};
  }
}

/**
 * Collect device information for both web and React Native
 */
async function getDeviceInfo(): Promise<DeviceInfo> {
  const deviceInfo: DeviceInfo = {};

  if (isReactNative()) {
    // React Native environment
    console.log('🔍 [VivosSDK] Detected React Native environment');
    
    try {
      // Automatically get Platform and Dimensions
      const { Platform, Dimensions } = await getReactNativeModules();

      console.log('🔍 [VivosSDK] Platform available:', !!Platform);
      console.log('🔍 [VivosSDK] Dimensions available:', !!Dimensions);

      if (Platform) {
        deviceInfo.platform = 'react-native';
        deviceInfo.device_os = `${Platform.OS} ${Platform.Version || ''}`.trim();
        deviceInfo.device_type = Platform.isPad || Platform.isTV ? 'tablet' : 'mobile';
        
        console.log('✅ [VivosSDK] Collected device info:', {
          os: deviceInfo.device_os,
          type: deviceInfo.device_type,
        });
      } else {
        console.log('ℹ️ [VivosSDK] Platform not detected, using fallback');
        deviceInfo.platform = 'react-native';
        deviceInfo.device_type = 'mobile';
      }

      if (Dimensions) {
        const { width, height } = Dimensions.get('window');
        deviceInfo.screen_width = Math.round(width);
        deviceInfo.screen_height = Math.round(height);
        
        console.log('✅ [VivosSDK] Screen dimensions:', {
          width: deviceInfo.screen_width,
          height: deviceInfo.screen_height,
        });
      } else {
        console.log('ℹ️ [VivosSDK] Dimensions not detected');
      }
    } catch (error) {
      console.log('ℹ️ [VivosSDK] Using fallback device info:', error);
      // Use fallback
      deviceInfo.platform = 'react-native';
      deviceInfo.device_type = 'mobile';
    }
  } else if (typeof window !== 'undefined') {
    // Web environment
    deviceInfo.platform = 'web';
    deviceInfo.screen_width = window.screen.width;
    deviceInfo.screen_height = window.screen.height;

    // Detect device type from user agent
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceInfo.device_type = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceInfo.device_type = 'tablet';
    } else {
      deviceInfo.device_type = 'desktop';
    }

    // Detect OS from user agent
    if (ua.includes('android')) {
      deviceInfo.device_os = 'Android';
    } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      deviceInfo.device_os = 'iOS';
    } else if (ua.includes('windows')) {
      deviceInfo.device_os = 'Windows';
    } else if (ua.includes('mac')) {
      deviceInfo.device_os = 'macOS';
    } else if (ua.includes('linux')) {
      deviceInfo.device_os = 'Linux';
    }
  }

  return deviceInfo;
}

/**
 * Track ad impression with device analytics
 * Uses POST method to send additional device information
 */
export async function trackAdImpression(ad: Ad, publisherId: string, host?: string): Promise<void> {
  // Check if we're in a supported environment
  const canTrack = typeof window !== 'undefined' || isReactNative();
  if (!canTrack) return;

  try {
    // Must use impression_url from ad response
    if (!ad.impression_url) {
      return;
    }

    let trackingUrl: string = ad.impression_url;
    
    // If impression_url is relative, prepend host if provided
    if (!ad.impression_url.startsWith('http') && host) {
      trackingUrl = `${host}${ad.impression_url.startsWith('/') ? '' : '/'}${ad.impression_url}`;
    }

    // If host is provided and we're on WEB (not React Native), use proxy endpoint to avoid CORS
    // React Native doesn't have CORS issues, so direct fetch works fine
    if (host && typeof window !== 'undefined' && !isReactNative() && typeof window.location !== 'undefined') {
      const proxyUrl = new URL('/api/ads/impression', window.location.origin);
      proxyUrl.searchParams.set('url', trackingUrl);
      trackingUrl = proxyUrl.toString();
    }

    // Collect device information
    const deviceInfo = await getDeviceInfo();
    
    const payload = {
      keyword: ad.matched_keyword,
      ...deviceInfo,
    };
    
    console.log('📤 [VivosSDK] Tracking URL:', trackingUrl);
    console.log('📤 [VivosSDK] Sending impression with payload:', payload);
    
    // Send POST request with device analytics data
    fetch(trackingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(response => {
        console.log('✅ [VivosSDK] Impression tracked successfully:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('✅ [VivosSDK] Server response:', data);
      })
      .catch(error => {
        console.error('❌ [VivosSDK] Failed to track impression:', error);
      });
  } catch {
    // Silently fail tracking
  }
}

export function trackAdClick(ad: Ad, publisherId: string, host?: string): void {
  if (typeof window === 'undefined') return;

  try {
    // Must use click_url from ad response
    if (!ad.click_url) {
      return;
    }

    let trackingUrl: string = ad.click_url;
    
    // If host is provided and click_url is relative, use host
    if (host && ad.click_url.startsWith('/')) {
      trackingUrl = `${host}${ad.click_url}`;
    } else if (host && !ad.click_url.startsWith('http')) {
      // If click_url doesn't have protocol, prepend host
      trackingUrl = `${host}${ad.click_url.startsWith('/') ? '' : '/'}${ad.click_url}`;
    }

    // Note: Click tracking typically doesn't need proxy since it opens in new window
    // But if needed, we can add proxy support here too
    
    fetch(trackingUrl, {
      method: 'GET', // Click URLs are typically GET requests
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(() => {
      // Silently fail tracking
    });
  } catch {
    // Silently fail tracking
  }
}
