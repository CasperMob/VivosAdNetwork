# Changelog

## [1.0.1] - 2024-11-15

### 🎉 Major Improvement: Automatic React Native Device Tracking

**No more manual setup required!** The SDK now automatically detects and collects device information in React Native without any configuration.

### Added
- **Automatic React Native module detection** - SDK uses three fallback methods:
  1. Dynamic import (`import('react-native')`)
  2. Global scope check
  3. Metro bundler require (`require('react-native')`)
- **Comprehensive logging** - Detailed logs show exactly what's happening
- **Better error handling** - Graceful fallbacks if modules aren't available

### Changed
- **BREAKING (but better!)**: React Native users no longer need to expose Platform/Dimensions to global scope
- **Simplified setup**: Just `npm install` and use - zero configuration needed
- Updated documentation to reflect automatic setup

### Before (v1.0.0)
```typescript
// ❌ Required manual setup
import { Platform, Dimensions } from 'react-native';
(global as any).Platform = Platform;
(global as any).Dimensions = Dimensions;

// Then use SDK
import { useChatbotAd } from '@vivosadnetwork/sdk';
```

### After (v1.0.1)
```typescript
// ✅ Just use it!
import { useChatbotAd } from '@vivosadnetwork/sdk';

// Device tracking works automatically!
```

### Technical Details
- Added `getReactNativeModules()` function with multiple detection strategies
- Added `@ts-ignore` directives for cross-platform compatibility
- Made react-native an optional dependency
- Enhanced logging with emoji indicators for better debugging

### Migration Guide
If you were using v1.0.0 with manual Platform/Dimensions setup:
1. Remove the global setup code (it still works, but no longer needed)
2. Update to v1.0.1: `npm install @vivosadnetwork/sdk@latest`
3. Rebuild your app: `npx react-native start --reset-cache && npx react-native run-ios`

### Bug Fixes
- Fixed TypeScript build errors with dynamic imports
- Improved cross-platform module resolution

---

## [1.0.0] - 2024-11-14

### Added
- Initial release
- Web platform support with automatic device detection
- React Native support (required manual setup)
- ChatbotAd component with light/dark themes
- useChatbotAd hook
- Automatic impression and click tracking
- Device analytics (OS, type, screen size)
- Analytics dashboard integration

