// ChatbotAd component for Vivos Ad Network SDK - React Native version
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking } from 'react-native';
import { useChatbotAd } from '../hooks';
import { trackAdImpression, trackAdClick } from '../tracking';
import type { ChatbotAdProps } from '../types';

export function ChatbotAd({ publisherId, keyword, host, format = 'standard', theme = 'dark' }: Omit<ChatbotAdProps, 'renderAd' | 'className'>) {
  const { ad, isLoading, error } = useChatbotAd(keyword, publisherId, host);
  const impressionTracked = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  // Only show ad if it's relevant (has matched_keyword that matches one of the sent keywords)
  const isRelevant = Boolean(
    ad && 
    ad.matched_keyword && 
    (() => {
      // Split comma-separated keywords and check if matched_keyword is in the list
      const keywords = keyword.toLowerCase().split(',').map(k => k.trim());
      const matchedKeyword = ad.matched_keyword.toLowerCase().trim();
      return keywords.includes(matchedKeyword);
    })()
  );

  // Theme colors
  const colors = theme === 'light' ? {
    background: '#F5F5F5',
    border: '#D1D1D6',
    text: '#000000',
    textSecondary: '#3C3C43',
    badgeBackground: '#E5E5EA',
    badgeText: '#3C3C43',
    buttonBackground: '#007AFF',
    buttonText: '#FFFFFF',
  } : {
    background: '#2C2C2E',
    border: '#38383A',
    text: '#FFFFFF',
    textSecondary: '#E5E5EA',
    badgeBackground: '#1C1C1E',
    badgeText: '#8E8E93',
    buttonBackground: '#FFFFFF',
    buttonText: '#000000',
  };

  // Track impression when ad becomes visible
  useEffect(() => {
    if (ad && isVisible && !impressionTracked.current && isRelevant) {
      impressionTracked.current = true;
      console.log('📍 [ChatbotAd.native] Tracking impression for ad:', ad.id);
      trackAdImpression(ad, publisherId, host);
    }
  }, [ad, isVisible, publisherId, host, isRelevant]);

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
    try {
      await Linking.openURL(urlToOpen);
    } catch (err) {
      console.error('Failed to open URL:', err);
    }
  };

  const handleLayout = () => {
    setIsVisible(true);
  };

  // Extract domain from target_url for advertiser display
  const getDomain = (url: string): string => {
    try {
      const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
      return match ? match[1] : url;
    } catch {
      return url;
    }
  };

  const advertiserDomain = ad.advertiser || getDomain(ad.target_url);

  const styles = StyleSheet.create({
    container: {
      padding: format === 'small' ? 10 : 12,
      marginVertical: 8,
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    leftContent: {
      flex: 1,
      minWidth: 0,
    },
    imageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    adImage: {
      width: 36,
      height: 36,
      borderRadius: 6,
      backgroundColor: colors.badgeBackground,
    },
    title: {
      fontSize: format === 'small' ? 13 : 14,
      color: colors.text,
      fontWeight: '600',
      lineHeight: format === 'small' ? 18 : 19,
      flex: 1,
    },
    message: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    button: {
      paddingVertical: 8,
      paddingHorizontal: 20,
      backgroundColor: colors.buttonBackground,
      borderRadius: 20,
    },
    buttonText: {
      color: colors.buttonText,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    badge: {
      fontSize: 10,
      color: colors.badgeText,
      backgroundColor: colors.badgeBackground,
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: 8,
      fontWeight: '500',
      overflow: 'hidden',
    },
    smallFormat: {
      position: 'relative',
    },
    smallBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      fontSize: 10,
      color: colors.badgeText,
      backgroundColor: colors.badgeBackground,
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderRadius: 8,
      fontWeight: '500',
    },
    smallContent: {
      paddingRight: 50,
    },
  });

  // Render small format
  if (format === 'small') {
    return (
      <TouchableOpacity 
        style={styles.container} 
        onPress={handleClick}
        onLayout={handleLayout}
        activeOpacity={0.7}
      >
        <View style={styles.smallFormat}>
          <Text style={styles.smallBadge}>Ad</Text>
          <View style={styles.smallContent}>
            <Text style={styles.title}>{ad.title}</Text>
            <Text style={styles.message}>{ad.message}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Standard format
  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={styles.contentRow}>
        <View style={styles.leftContent}>
          <View style={styles.imageRow}>
            {ad.image_url && (
              <Image
                source={{ uri: ad.image_url }}
                style={styles.adImage}
                resizeMode="cover"
              />
            )}
            <Text style={styles.title} numberOfLines={2}>
              {ad.title}
            </Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {ad.message}
          </Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleClick} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Learn more</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.badge}>Ad</Text>
      </View>
    </View>
  );
}

