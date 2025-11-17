// Type definitions for Vivos Ad Network SDK
import type { ReactNode } from 'react';

export interface Ad {
  id: string;
  title: string;
  message: string;
  target_url: string;
  image_url?: string;
  advertiser?: string;
  impression_url?: string; // URL to track impressions
  click_url?: string; // URL to track clicks
  matched_keyword?: string; // The keyword that matched this ad
  cpc_bid?: number; // Cost per click bid
}

export type AdFormat = 'standard' | 'small';
export type AdTheme = 'light' | 'dark';

export interface ChatbotAdProps {
  publisherId: string;
  keyword: string;
  host?: string; // Optional host URL (e.g., 'http://localhost:3001')
  format?: AdFormat; // Ad display format: 'standard' (default) or 'small'
  theme?: AdTheme; // Theme: 'light' or 'dark' (default: 'dark')
  renderAd?: (ad: Ad, onClick: () => void) => ReactNode;
  className?: string;
}

export interface UseChatbotAdResult {
  ad: Ad | null;
  adAsText: string | null;
  adAsMarkdown: string | null;
  isLoading: boolean;
  error: Error | null;
}

export interface FetchAdParams {
  publisherId: string;
  keyword: string;
  host?: string; // Optional host URL (e.g., 'http://localhost:3001')
}
