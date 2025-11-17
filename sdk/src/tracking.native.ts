// Tracking utilities for Vivos Ad Network SDK - React Native version
import { Platform, Dimensions } from 'react-native';
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
  app_name?: string;
  website_url?: string;
  device_brand?: string;
  device_manufacturer?: string;
  device_model?: string;
  app_build?: string;
}

/**
 * Dynamically import Expo packages
 */
async function getExpoModules() {
  try {
    const [Application, Device, Constants] = await Promise.all([
      import('expo-application').then(m => m.default || m).catch(() => null),
      import('expo-device').then(m => m.default || m).catch(() => null),
      import('expo-constants').then(m => m.default || m).catch(() => null),
    ]);
    
    return { Application, Device, Constants };
  } catch {
    return { Application: null, Device: null, Constants: null };
  }
}

/**
 * Collect device information for React Native using Expo packages
 */
async function getDeviceInfo(): Promise<DeviceInfo> {
  const deviceInfo: DeviceInfo = {
    platform: 'react-native',
  };

  try {
    // Get screen dimensions first (always available)
    const { width, height } = Dimensions.get('window');
    deviceInfo.screen_width = Math.round(width);
    deviceInfo.screen_height = Math.round(height);

    // Try to get Expo modules
    const { Application, Device, Constants } = await getExpoModules();

    // Get device information from expo-device
    if (Device) {
      console.log('📱 [VivosSDK Native] Using expo-device for device info');
      
      // Device OS and version
      if (Device.osName && Device.osVersion) {
        deviceInfo.device_os = `${Device.osName} ${Device.osVersion}`;
      } else {
        deviceInfo.device_os = `${Platform.OS} ${Platform.Version || ''}`.trim();
      }

      // Device type
      if (Device.deviceType !== undefined) {
        // Map expo-device DeviceType enum to readable strings
        const deviceTypeMap: Record<number, string> = {
          0: 'unknown',
          1: 'mobile',
          2: 'tablet',
          3: 'desktop',
          4: 'tv',
        };
        deviceInfo.device_type = deviceTypeMap[Device.deviceType] || 'mobile';
      } else if (Platform.OS === 'ios') {
        // @ts-ignore - isPad exists on iOS
        deviceInfo.device_type = Platform.isPad ? 'tablet' : 'mobile';
      } else if (Platform.OS === 'android') {
        // @ts-ignore - isTV exists on Android
        deviceInfo.device_type = Platform.isTV ? 'tv' : 'mobile';
      } else {
        deviceInfo.device_type = 'mobile';
      }

      // Device brand, manufacturer, and model
      if (Device.brand) {
        deviceInfo.device_brand = Device.brand;
      }
      if (Device.manufacturer) {
        deviceInfo.device_manufacturer = Device.manufacturer;
      }
      if (Device.modelName) {
        deviceInfo.device_model = Device.modelName;
      }
    } else {
      console.log('📱 [VivosSDK Native] expo-device not available, using Platform API');
      
      // Fallback to Platform API
      deviceInfo.device_os = `${Platform.OS} ${Platform.Version || ''}`.trim();
      
      if (Platform.OS === 'ios') {
        // @ts-ignore - isPad exists on iOS
        deviceInfo.device_type = Platform.isPad ? 'tablet' : 'mobile';
      } else if (Platform.OS === 'android') {
        // @ts-ignore - isTV exists on Android
        deviceInfo.device_type = Platform.isTV ? 'tv' : 'mobile';
      } else {
        deviceInfo.device_type = 'mobile';
      }
    }

    // Get application information from expo-application
    if (Application) {
      console.log('📱 [VivosSDK Native] Using expo-application for app info');
      
      // App name
      if (Application.applicationName) {
        deviceInfo.app_name = Application.applicationName;
      }

      // App version
      if (Application.nativeApplicationVersion) {
        deviceInfo.app_version = Application.nativeApplicationVersion;
      }

      // App build number
      if (Application.nativeBuildVersion) {
        deviceInfo.app_build = Application.nativeBuildVersion;
      }

      // App ID as website URL for non-web apps
      if (Application.applicationId) {
        deviceInfo.website_url = `app://${Application.applicationId}`;
      }
    }

    // Fallback to expo-constants if expo-application didn't provide all info
    if (Constants && (!deviceInfo.app_name || !deviceInfo.app_version)) {
      console.log('📱 [VivosSDK Native] Using expo-constants as fallback for app info');
      
      if (!deviceInfo.app_name) {
        if (Constants.expoConfig?.name) {
          deviceInfo.app_name = Constants.expoConfig.name;
        } else if (Constants.manifest?.name) {
          deviceInfo.app_name = Constants.manifest.name;
        }
      }

      if (!deviceInfo.app_version) {
        if (Constants.expoConfig?.version) {
          deviceInfo.app_version = Constants.expoConfig.version;
        } else if (Constants.manifest?.version) {
          deviceInfo.app_version = Constants.manifest.version;
        }
      }

      // Use expo slug if we don't have app ID
      if (!deviceInfo.website_url) {
        if (Constants.expoConfig?.slug) {
          deviceInfo.website_url = `expo://${Constants.expoConfig.slug}`;
        } else if (Constants.manifest?.slug) {
          deviceInfo.website_url = `expo://${Constants.manifest.slug}`;
        }
      }
    }

    console.log('📊 [VivosSDK Native] Collected device info:', deviceInfo);
  } catch (error) {
    console.warn('📊 [VivosSDK Native] Error collecting device info:', error);
  }

  return deviceInfo;
}

export async function trackAdImpression(ad: Ad, publisherId: string, host?: string): Promise<void> {
  try {
    // Must use impression_url from ad response
    if (!ad.impression_url) {
      return;
    }

    let trackingUrl: string = ad.impression_url;
    
    // If impression_url is relative, prepend host if provided
    if (!ad.impression_url.startsWith('http') && host) {
      const baseHost = host.endsWith('/') ? host.slice(0, -1) : host;
      trackingUrl = `${baseHost}${ad.impression_url.startsWith('/') ? '' : '/'}${ad.impression_url}`;
    }

    // Collect device information
    const deviceInfo = await getDeviceInfo();
    
    const payload = {
      keyword: ad.matched_keyword,
      ...deviceInfo,
    };
    
    console.log('📤 [VivosSDK Native] Tracking URL:', trackingUrl);
    console.log('📤 [VivosSDK Native] Sending impression with payload:', payload);
    
    // Send POST request with device analytics data
    const response = await fetch(trackingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ [VivosSDK Native] Impression tracked successfully:', data);
    } else {
      console.warn('⚠️ [VivosSDK Native] Impression tracking failed:', response.status);
    }
  } catch (error) {
    console.error('❌ [VivosSDK Native] Failed to track impression:', error);
    // Silently fail tracking
  }
}

export function trackAdClick(ad: Ad, publisherId: string, host?: string): void {
  try {
    // Must use click_url from ad response
    if (!ad.click_url) {
      return;
    }

    let trackingUrl: string = ad.click_url;
    
    // If host is provided and click_url is relative, use host
    if (host && ad.click_url.startsWith('/')) {
      const baseHost = host.endsWith('/') ? host.slice(0, -1) : host;
      trackingUrl = `${baseHost}${ad.click_url}`;
    } else if (host && !ad.click_url.startsWith('http')) {
      // If click_url doesn't have protocol, prepend host
      const baseHost = host.endsWith('/') ? host.slice(0, -1) : host;
      trackingUrl = `${baseHost}${ad.click_url.startsWith('/') ? '' : '/'}${ad.click_url}`;
    }
    
    fetch(trackingUrl, {
      method: 'GET',
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

