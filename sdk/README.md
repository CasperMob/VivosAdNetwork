# @vivosadnetwork/sdk

Official SDK for integrating VivosAdNetwork ads into your chatbot application.

**✨ Now supports both Web and React Native with automatic device tracking!**

## Platform Support

- ✅ **Web** (React, Next.js, Vite, etc.)
- ✅ **React Native** (iOS & Android)
- ✅ **Expo** (fully supported!)
- 📊 **Automatic device tracking** - no setup required!
- 🔒 **Privacy-friendly** (no personal data collected)
- 🚀 **Zero configuration** for React Native/Expo

**React Native?** Just `npm install` and use it - see the [React Native Guide](./REACT_NATIVE.md) for details.

## Installation

### From npm (production)

```bash
npm install @vivosadnetwork/sdk
```

### Additional Packages for Enhanced Tracking (Expo)

For comprehensive device tracking in Expo projects, install these optional packages:

```bash
npm install expo-device expo-application
```

These packages provide:
- **expo-device**: Device brand, manufacturer, model, enhanced OS detection
- **expo-application**: App name, version, build number, bundle ID

### Local Development

To use the SDK locally from another project during development, see [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for detailed instructions.

#### For React Native / Expo (Recommended)

For React Native and Expo projects, use a local file dependency:

```bash
# In your project's package.json, add:
"dependencies": {
  "@vivosadnetwork/sdk": "file:./path/to/sdk"
}

# Then run:
npm install
```

This works because the SDK automatically uses source files for React Native (configured via the `react-native` field in package.json), enabling Metro bundler to properly resolve platform-specific files (`.native.tsx`).

#### For Web Projects

```bash
# In SDK directory
npm run build && npm link

# In your project
npm link @vivosadnetwork/sdk
```

## Quick Start

```tsx
import { ChatbotAd } from '@vivosadnetwork/sdk'

<ChatbotAd
  publisherId="your-publisher-id"
  keyword="technology,ai"  // Multiple keywords supported!
  theme="dark"             // Optional: 'light' or 'dark' (default: 'dark')
/>
```

**That's it!** The SDK handles everything automatically:
- ✅ Fetches relevant ads
- ✅ Tracks impressions & clicks with device analytics
- ✅ Displays ads beautifully
- ✅ Works on web and React Native
- ✅ Supports light & dark themes

## Documentation

**See the main [IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md) for complete documentation.**

The guide includes:
- Chatbot integration
- Custom rendering
- API reference
- Analytics & tracking
- Troubleshooting

## Features

- ✅ Pre-configured API base URL (no setup needed)
- ✅ Support for multiple comma-separated keywords
- ✅ Automatic impression & click tracking
- ✅ Device analytics collection
- ✅ Light & dark theme support
- ✅ TypeScript support
- ✅ Simple hooks for custom implementations
- ✅ Text and Markdown formatting for chatbot responses

## License

MIT
