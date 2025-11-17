/**
 * React Native ChatbotAd Example
 * 
 * This example shows how to integrate VivosAdNetwork SDK in React Native
 * with automatic device tracking
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { useChatbotAd } from '@vivosadnetwork/sdk';
import { trackAdImpression, trackAdClick } from '@vivosadnetwork/sdk';

// Make Platform and Dimensions globally available for SDK tracking
// This allows the SDK to detect device information
if (typeof global !== 'undefined') {
  (global as any).Platform = Platform;
  (global as any).Dimensions = Dimensions;
}

interface ChatbotAdProps {
  publisherId: string;
  keyword: string;
  host?: string;
  theme?: 'light' | 'dark';
}

export function ChatbotAdRN({
  publisherId,
  keyword,
  host,
  theme = 'dark',
}: ChatbotAdProps) {
  const { ad, isLoading, error } = useChatbotAd(keyword, publisherId, host);
  const impressionTracked = useRef(false);

  // Check if ad is relevant
  const isRelevant = Boolean(
    ad &&
      ad.matched_keyword &&
      (() => {
        const keywords = keyword.toLowerCase().split(',').map(k => k.trim());
        const matchedKeyword = ad.matched_keyword.toLowerCase().trim();
        return keywords.includes(matchedKeyword);
      })()
  );

  // Track impression when ad appears
  useEffect(() => {
    if (!ad || impressionTracked.current || !isRelevant) {
      return;
    }

    // Track impression after a short delay to ensure the ad is visible
    const timer = setTimeout(() => {
      impressionTracked.current = true;
      // The SDK will automatically detect React Native and send device info
      trackAdImpression(ad, publisherId, host);
    }, 500);

    return () => clearTimeout(timer);
  }, [ad, publisherId, host, isRelevant]);

  // Reset impression tracking when ad changes
  useEffect(() => {
    impressionTracked.current = false;
  }, [ad?.id]);

  if (isLoading || error || !ad || !isRelevant) {
    return null;
  }

  const handleClick = async () => {
    trackAdClick(ad, publisherId, host);
    const urlToOpen = ad.click_url || ad.target_url;
    
    // Open URL in external browser
    try {
      const supported = await Linking.canOpenURL(urlToOpen);
      if (supported) {
        await Linking.openURL(urlToOpen);
      }
    } catch (err) {
      console.error('Failed to open URL:', err);
    }
  };

  const colors = theme === 'light'
    ? {
        background: '#F5F5F5',
        border: '#D1D1D6',
        text: '#000000',
        textSecondary: '#3C3C43',
        badgeBackground: '#E5E5EA',
        badgeText: '#3C3C43',
        buttonBackground: '#007AFF',
        buttonText: '#FFFFFF',
      }
    : {
        background: '#2C2C2E',
        border: '#38383A',
        text: '#FFFFFF',
        textSecondary: '#E5E5EA',
        badgeBackground: '#1C1C1E',
        badgeText: '#8E8E93',
        buttonBackground: '#FFFFFF',
        buttonText: '#000000',
      };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Image and Title */}
        <View style={styles.headerRow}>
          {ad.image_url && (
            <View
              style={[
                styles.imageContainer,
                { backgroundColor: colors.badgeBackground },
              ]}
            >
              <Image
                source={{ uri: ad.image_url }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>
          )}

          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={2}
          >
            {ad.title}
          </Text>
        </View>

        {/* Message */}
        <Text
          style={[styles.message, { color: colors.textSecondary }]}
          numberOfLines={3}
        >
          {ad.message}
        </Text>

        {/* Button and Ad Badge Row */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleClick}
            style={[
              styles.button,
              { backgroundColor: colors.buttonBackground },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              Learn more
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.badge,
              { backgroundColor: colors.badgeBackground },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.badgeText }]}>
              Ad
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
  },
  mainContent: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageContainer: {
    width: 36,
    height: 36,
    borderRadius: 6,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    flex: 1,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

// ==========================================
// USAGE EXAMPLE
// ==========================================

/**
 * Example: Using in your React Native chatbot
 */
export function ChatbotScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Your chatbot messages */}
      
      {/* Ad integration */}
      <ChatbotAdRN
        publisherId="your-publisher-id"
        keyword="technology,ai,software"
        host="https://your-api.com"
        theme="dark"
      />
      
      {/* More messages */}
    </View>
  );
}

/**
 * Example: Using with custom rendering
 */
export function CustomAdScreen() {
  const { ad } = useChatbotAd(
    'technology',
    'your-publisher-id',
    'https://your-api.com'
  );

  if (!ad) return null;

  return (
    <View>
      <Text style={{ color: '#FFF' }}>{ad.title}</Text>
      <Text style={{ color: '#AAA' }}>{ad.message}</Text>
    </View>
  );
}

