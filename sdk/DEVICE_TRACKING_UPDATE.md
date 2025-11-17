# Device Tracking Update - React Native/Expo

## Overview

The VivosAdNetwork SDK now properly collects and sends device information with ad impressions on React Native and Expo applications.

## What Was Missing

Previously, the React Native implementation (`tracking.native.ts`) was only sending a simple GET request without any device information:

```typescript
// OLD - No device info
fetch(trackingUrl, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
})
```

## What's Fixed

The SDK now collects comprehensive device information and sends it via POST request:

```typescript
// NEW - Full device info
const payload = {
  keyword: ad.matched_keyword,
  platform: 'react-native',
  device_os: 'iOS 17.0',
  device_type: 'mobile',
  screen_width: 393,
  screen_height: 852,
  app_name: 'hinduai',
  app_version: '1.0',
  website_url: 'expo://hinduai'
};

fetch(trackingUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})
```

## Device Information Collected

### Core Information

#### 1. Platform (`platform`)
- **Value**: `"react-native"`
- **Source**: Hardcoded constant
- **Purpose**: Identifies React Native apps vs web apps

#### 2. Device OS (`device_os`)
- **Value**: e.g., `"iOS 17.0"`, `"Android 13"`
- **Source**: `expo-device` → `osName` + `osVersion` (fallback: `Platform.OS` + `Platform.Version`)
- **Purpose**: Operating system and version identification

#### 3. Device Type (`device_type`)
- **Value**: `"mobile"`, `"tablet"`, `"desktop"`, or `"tv"`
- **Source**: `expo-device` → `deviceType` (fallback: `Platform.isPad` / `Platform.isTV`)
- **Purpose**: Device form factor classification

#### 4. Screen Width (`screen_width`)
- **Value**: e.g., `393` (pixels)
- **Source**: `Dimensions.get('window').width`
- **Purpose**: Screen size analytics

#### 5. Screen Height (`screen_height`)
- **Value**: e.g., `852` (pixels)
- **Source**: `Dimensions.get('window').height`
- **Purpose**: Screen size analytics

### Device Details (from expo-device)

#### 6. Device Brand (`device_brand`)
- **Value**: e.g., `"Apple"`, `"Google"`, `"Samsung"`
- **Source**: `expo-device` → `brand`
- **Purpose**: Device brand identification

#### 7. Device Manufacturer (`device_manufacturer`)
- **Value**: e.g., `"Apple"`, `"Samsung"`, `"Xiaomi"`
- **Source**: `expo-device` → `manufacturer`
- **Purpose**: Device manufacturer identification

#### 8. Device Model (`device_model`)
- **Value**: e.g., `"iPhone 14 Pro"`, `"Pixel 7"`, `"Galaxy S23"`
- **Source**: `expo-device` → `modelName`
- **Purpose**: Specific device model identification

### Application Information (from expo-application)

#### 9. App Name (`app_name`)
- **Value**: e.g., `"hinduai"`
- **Source**: `expo-application` → `applicationName` (fallback: `expo-constants`)
- **Purpose**: Publisher app identification

#### 10. App Version (`app_version`)
- **Value**: e.g., `"1.0"`
- **Source**: `expo-application` → `nativeApplicationVersion` (fallback: `expo-constants`)
- **Purpose**: App version tracking

#### 11. App Build (`app_build`)
- **Value**: e.g., `"5"`, `"123"`
- **Source**: `expo-application` → `nativeBuildVersion`
- **Purpose**: Build number for detailed version tracking

#### 12. Website URL (`website_url`)
- **Value**: e.g., `"app://com.pingponggames.hinduassistant"` or `"expo://hinduai"`
- **Source**: `expo-application` → `applicationId` (fallback: `expo-constants` slug)
- **Purpose**: App identifier (bundle ID for iOS, package name for Android)

#### 13. Keyword (`keyword`)
- **Value**: The matched keyword from the ad response
- **Source**: `ad.matched_keyword`
- **Purpose**: Track which keyword triggered the ad

## Implementation Details

### Dynamic Import of Expo Packages

The SDK uses dynamic imports to avoid hard dependencies:

```typescript
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
```

**Why this approach?**
- Works in both Expo and bare React Native projects
- Doesn't break if any package is not installed
- Gracefully degrades to collecting only basic info
- Loads all three packages in parallel for better performance

### Package Usage Priority

The SDK uses a fallback hierarchy:

1. **expo-device** for device information (OS, type, brand, model)
   - Fallback: `Platform.OS`, `Platform.isPad`, `Platform.isTV`

2. **expo-application** for app information (name, version, build, ID)
   - Fallback: `expo-constants` → `expoConfig` or `manifest`

3. **expo-constants** as final fallback for app metadata
   - Only used if `expo-application` doesn't provide the info

### Fallback Behavior

The SDK gracefully handles missing packages:

**If ALL Expo packages are unavailable:**
- ✅ Platform info (React Native)
- ✅ Device OS and version (from `Platform.OS` and `Platform.Version`)
- ✅ Device type (from `Platform.isPad` or `Platform.isTV`)
- ✅ Screen dimensions (from `Dimensions.get('window')`)
- ❌ Device brand, manufacturer, model
- ❌ App name, version, build, ID

**If only `expo-device` is available:**
- ✅ Enhanced device OS and type detection
- ✅ Device brand, manufacturer, model
- ❌ App-specific information

**If only `expo-application` is available:**
- ✅ App name, version, build, ID
- ❌ Enhanced device information

**If only `expo-constants` is available:**
- ✅ Basic app name and version
- ❌ Enhanced device and app information

## Example Console Output

When an ad impression is tracked, you'll see:

```
📱 [VivosSDK Native] Using expo-device for device info
📱 [VivosSDK Native] Using expo-application for app info
📊 [VivosSDK Native] Collected device info: {
  platform: 'react-native',
  device_os: 'iOS 17.0',
  device_type: 'mobile',
  screen_width: 393,
  screen_height: 852,
  device_brand: 'Apple',
  device_manufacturer: 'Apple',
  device_model: 'iPhone 14 Pro',
  app_name: 'Hindu AI Assistant',
  app_version: '1.0',
  app_build: '5',
  website_url: 'app://com.pingponggames.hinduassistant'
}

📤 [VivosSDK Native] Tracking URL: https://api.vivosadnetwork.com/api/track/impression/abc123
📤 [VivosSDK Native] Sending impression with payload: {
  keyword: 'technology',
  platform: 'react-native',
  device_os: 'iOS 17.0',
  device_type: 'mobile',
  screen_width: 393,
  screen_height: 852,
  device_brand: 'Apple',
  device_manufacturer: 'Apple',
  device_model: 'iPhone 14 Pro',
  app_name: 'Hindu AI Assistant',
  app_version: '1.0',
  app_build: '5',
  website_url: 'app://com.pingponggames.hinduassistant'
}

✅ [VivosSDK Native] Impression tracked successfully: { success: true }
```

## Testing

### 1. Verify Device Info is Collected

Run your app and trigger an ad impression. Check the console for:

```
📊 [VivosSDK Native] Collected device info: { ... }
```

### 2. Verify Data is Sent

Check for successful tracking:

```
✅ [VivosSDK Native] Impression tracked successfully
```

### 3. Test on Different Platforms

**iOS Example:**
```javascript
{
  device_os: 'iOS 17.0',
  device_type: 'mobile',  // or 'tablet' for iPad
  device_brand: 'Apple',
  device_manufacturer: 'Apple',
  device_model: 'iPhone 14 Pro',
  app_name: 'Hindu AI Assistant',
  app_version: '1.0',
  app_build: '5',
  website_url: 'app://com.pingponggames.hinduassistant'
}
```

**Android Example:**
```javascript
{
  device_os: 'Android 13',
  device_type: 'mobile',  // or 'tv' for Android TV
  device_brand: 'Google',
  device_manufacturer: 'Google',
  device_model: 'Pixel 7 Pro',
  app_name: 'Hindu AI Assistant',
  app_version: '1.0',
  app_build: '5',
  website_url: 'app://com.pingponggames.hinduassistant'
}
```

### 4. Verify All Fields

Check that all expected fields are present:
- ✅ `platform`: Should be `'react-native'`
- ✅ `device_os`: Should include OS name and version
- ✅ `device_type`: Should be `'mobile'`, `'tablet'`, or `'tv'`
- ✅ `screen_width` & `screen_height`: Should match your device
- ✅ `device_brand`: Device brand (e.g., 'Apple', 'Samsung')
- ✅ `device_manufacturer`: Manufacturer name
- ✅ `device_model`: Specific device model
- ✅ `app_name`: Your app's display name
- ✅ `app_version`: Version from your `app.json`
- ✅ `app_build`: Build number from your app config
- ✅ `website_url`: Bundle ID (iOS) or package name (Android)

## Privacy & Compliance

### What We Collect
- Device specifications (OS, type, screen size)
- App information (name, version, identifier)
- Platform type
- Matched keyword

### What We DON'T Collect
- ❌ Personal information (name, email, phone)
- ❌ User identifiers (IDFA, AAID, device ID)
- ❌ Location data
- ❌ User behavior outside ad interactions
- ❌ Cookies or persistent identifiers

### GDPR & Privacy Compliance
- All data is anonymous and aggregate
- No cross-app tracking
- No personal data collection
- Used solely for ad analytics and optimization

## Files Changed

### `/sdk/src/tracking.native.ts`
- Added `DeviceInfo` interface
- Added `getExpoConstants()` function for dynamic imports
- Added `getDeviceInfo()` function to collect device data
- Updated `trackAdImpression()` to be async and send POST with device info
- Added comprehensive logging for debugging

### `/sdk/package.json`
- Added `expo-constants` to `peerDependenciesMeta` as optional

### `/sdk/REACT_NATIVE_EXPO_SETUP.md`
- Added "Device Information Collected" section
- Added "Verifying Device Tracking" section
- Added troubleshooting for device tracking issues

## Migration Guide

If you were previously using the SDK, **no changes are required**. The device tracking is automatic and backward compatible.

### Before
```typescript
import { ChatbotAd } from '@vivosadnetwork/sdk';

<ChatbotAd publisherId="..." keyword="..." />
```

### After
```typescript
// Exactly the same!
import { ChatbotAd } from '@vivosadnetwork/sdk';

<ChatbotAd publisherId="..." keyword="..." />
```

Device tracking happens automatically in the background.

## Dependencies

### Required
- `react-native` - For Platform and Dimensions APIs

### Optional (Recommended for Expo)
- `expo-device` - For enhanced device information (brand, manufacturer, model)
- `expo-application` - For app information (name, version, build, bundle ID)
- `expo-constants` - Fallback for app metadata

### Installation

```bash
# Install all recommended packages for full device tracking
npm install expo-device expo-application expo-constants

# Or install individually
npm install expo-device      # For device brand, model, etc.
npm install expo-application # For app name, version, build
npm install expo-constants   # Fallback app info
```

**Note:** The SDK will work without any of these packages, but will collect less detailed information.

## Future Enhancements

Potential future additions:
- Network type (WiFi/Cellular) - requires `@react-native-community/netinfo`
- Battery level - requires `expo-battery`
- Locale/language - available via `Platform.constants`
- Timezone - via JavaScript Date API

These are not currently implemented to minimize dependencies and maintain privacy.

## Summary

✅ **Device tracking now works on React Native/Expo**
✅ **Comprehensive device information collected**
✅ **Automatic and zero-configuration**
✅ **Privacy-friendly (no PII)**
✅ **Graceful degradation without expo-constants**
✅ **Detailed logging for debugging**

The SDK now provides the same level of analytics on React Native as it does on web!

