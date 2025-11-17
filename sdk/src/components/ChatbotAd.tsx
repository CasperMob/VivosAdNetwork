// ChatbotAd component for Vivos Ad Network SDK
'use client';

import { useEffect, useRef } from 'react';
import { useChatbotAd } from '../hooks';
import { trackAdImpression, trackAdClick } from '../tracking';
import type { ChatbotAdProps } from '../types';

export function ChatbotAd({ publisherId, keyword, host, format = 'standard', theme = 'dark', renderAd, className }: ChatbotAdProps) {
  const { ad, isLoading, error } = useChatbotAd(keyword, publisherId, host);
  const adRef = useRef<HTMLDivElement>(null);
  const impressionTracked = useRef(false);

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
    backgroundHover: '#E5E5E5',
    border: '#D1D1D6',
    borderHover: '#C7C7CC',
    text: '#000000',
    textSecondary: '#3C3C43',
    badgeBackground: '#E5E5EA',
    badgeText: '#3C3C43',
    buttonBackground: '#007AFF',
    buttonText: '#FFFFFF',
    buttonHover: '#0051D5',
  } : {
    background: '#2C2C2E',
    backgroundHover: '#343436',
    border: '#38383A',
    borderHover: '#48484A',
    text: '#FFFFFF',
    textSecondary: '#E5E5EA',
    badgeBackground: '#1C1C1E',
    badgeText: '#8E8E93',
    buttonBackground: '#FFFFFF',
    buttonText: '#000000',
    buttonHover: '#F5F5F5',
  };

  // Track impression when ad becomes visible in viewport
  useEffect(() => {
    if (!ad || !adRef.current || impressionTracked.current || !isRelevant) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressionTracked.current) {
            impressionTracked.current = true;
            trackAdImpression(ad, publisherId, host);
            // Disconnect observer after tracking to avoid multiple impressions
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.5, // Track when at least 50% of the ad is visible
        rootMargin: '0px',
      }
    );

    observer.observe(adRef.current);

    // Cleanup observer on unmount
    return () => {
      observer.disconnect();
    };
  }, [ad, publisherId, host, isRelevant]);

  // Reset impression tracking when ad changes
  useEffect(() => {
    impressionTracked.current = false;
  }, [ad?.id]);

  if (isLoading) {
    return null;
  }

  if (error) {
    return null;
  }

  // Only show ad if it exists and is relevant (empty response should not render)
  if (!ad || !isRelevant) {
    return null;
  }

  const handleClick = () => {
    trackAdClick(ad, publisherId, host);
    // Open click_url if available, otherwise fallback to target_url
    const urlToOpen = ad.click_url || ad.target_url;
    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };

  if (renderAd) {
    return <>{renderAd(ad, handleClick)}</>;
  }

  // Extract domain from target_url for advertiser display
  const getDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const advertiserDomain = ad.advertiser || getDomain(ad.target_url);

  // Render small format
  if (format === 'small') {
    return (
      <div
        ref={adRef}
        className={className}
        style={{
          padding: '10px 12px',
          margin: '8px 0',
          backgroundColor: colors.background,
          borderRadius: '10px',
          border: `1px solid ${colors.border}`,
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }}
        onClick={handleClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.backgroundHover;
          e.currentTarget.style.borderColor = colors.borderHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.background;
          e.currentTarget.style.borderColor = colors.border;
        }}
      >
        <div style={{
          position: 'relative',
        }}>
          {/* Ad Label in top right */}
          <span style={{ 
            position: 'absolute',
            top: 0,
            right: 0,
            fontSize: '10px', 
            color: colors.badgeText, 
            backgroundColor: colors.badgeBackground,
            padding: '3px 6px',
            borderRadius: '8px',
            fontWeight: '500',
            letterSpacing: '0.2px',
            flexShrink: 0,
          }}>
            Ad
          </span>

          {/* Title and Message */}
          <div style={{ 
            paddingRight: '50px', // Space for the Ad badge
          }}>
            {/* Title */}
            <strong style={{ 
              fontSize: '13px', 
              color: colors.text, 
              fontWeight: '600',
              lineHeight: '1.4',
              display: 'block',
              marginBottom: '4px',
            }}>
              {ad.title}
            </strong>

            {/* Message */}
            <span style={{ 
              fontSize: '13px', 
              color: colors.textSecondary, 
              lineHeight: '1.4',
              display: 'block',
            }}>
              {ad.message}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Standard format rendering matching the design
  return (
    <div
      ref={adRef}
      className={className}
      style={{
        padding: '12px',
        margin: '8px 0',
        backgroundColor: colors.background,
        borderRadius: '10px',
        border: `1px solid ${colors.border}`,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.backgroundHover;
        e.currentTarget.style.borderColor = colors.borderHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.background;
        e.currentTarget.style.borderColor = colors.border;
      }}
    >
      <div style={{
        position: 'relative',
      }}>
        {/* Main Content: Title/Message on left, Button on right */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px',
        }}>
          {/* Left side: Image, Title, Message */}
          <div style={{
            flex: 1,
            minWidth: 0,
          }}>
            {/* Image and Title row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
            }}>
              {/* Small Image */}
              {ad.image_url && (
                <div style={{ 
                  flexShrink: 0,
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: colors.badgeBackground,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      // Hide image container if it fails to load
                      e.currentTarget.parentElement!.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              {/* Title */}
              <strong style={{ 
                fontSize: '14px', 
                color: colors.text, 
                fontWeight: '600',
                lineHeight: '1.3',
                flex: 1,
                minWidth: 0,
              }}>
                {ad.title}
              </strong>
            </div>

            {/* Message */}
            <div>
              <span style={{ 
                fontSize: '13px', 
                color: colors.textSecondary, 
                lineHeight: '1.4',
                display: 'block',
              }}>
                {ad.message}
              </span>
            </div>
          </div>

          {/* Right side: Button */}
          <div style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
          }}>
            <a
              href={ad.click_url || ad.target_url}
              onClick={(e) => {
                e.preventDefault();
                handleClick();
              }}
              style={{
                display: 'inline-block',
                padding: '8px 20px',
                backgroundColor: colors.buttonBackground,
                color: colors.buttonText,
                border: 'none',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                lineHeight: '1.2',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.buttonHover;
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.buttonBackground;
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Learn more
            </a>
          </div>
        </div>

        {/* Bottom: Ad badge on right */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <span style={{ 
            fontSize: '10px', 
            color: colors.badgeText, 
            backgroundColor: colors.badgeBackground,
            padding: '3px 6px',
            borderRadius: '8px',
            fontWeight: '500',
            letterSpacing: '0.2px',
            flexShrink: 0,
          }}>
            Ad
          </span>
        </div>
      </div>
    </div>
  );
}
