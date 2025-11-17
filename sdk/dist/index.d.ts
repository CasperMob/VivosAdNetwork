import * as react from 'react';
import { ReactNode } from 'react';

interface Ad {
    id: string;
    title: string;
    message: string;
    target_url: string;
    image_url?: string;
    advertiser?: string;
    impression_url?: string;
    click_url?: string;
    matched_keyword?: string;
    cpc_bid?: number;
}
type AdFormat = 'standard' | 'small';
type AdTheme = 'light' | 'dark';
interface ChatbotAdProps {
    publisherId: string;
    keyword: string;
    host?: string;
    format?: AdFormat;
    theme?: AdTheme;
    renderAd?: (ad: Ad, onClick: () => void) => ReactNode;
    className?: string;
}
interface UseChatbotAdResult {
    ad: Ad | null;
    adAsText: string | null;
    adAsMarkdown: string | null;
    isLoading: boolean;
    error: Error | null;
}
interface FetchAdParams {
    publisherId: string;
    keyword: string;
    host?: string;
}

declare function fetchAd(params: FetchAdParams): Promise<Ad | null>;

declare function useChatbotAd(keyword: string, publisherId: string, host?: string): UseChatbotAdResult;

/**
 * Track ad impression with device analytics
 * Uses POST method to send additional device information
 */
declare function trackAdImpression(ad: Ad, publisherId: string, host?: string): Promise<void>;
declare function trackAdClick(ad: Ad, publisherId: string, host?: string): void;

declare function ChatbotAd({ publisherId, keyword, host, format, theme, renderAd, className }: ChatbotAdProps): react.JSX.Element | null;

export { type Ad, type AdFormat, type AdTheme, ChatbotAd, type ChatbotAdProps, type FetchAdParams, type UseChatbotAdResult, fetchAd, trackAdClick, trackAdImpression, useChatbotAd };
