// React hooks for Vivos Ad Network SDK - React Native version
import { useState, useEffect } from 'react';
import { fetchAd } from './api.native';
import type { UseChatbotAdResult, Ad } from './types';

export function useChatbotAd(keyword: string, publisherId: string, host?: string): UseChatbotAdResult {
  const [ad, setAd] = useState<Ad | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!publisherId || !keyword) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchAd({ publisherId, keyword, host })
      .then((fetchedAd) => {
        setAd(fetchedAd);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to fetch ad'));
        setIsLoading(false);
      });
  }, [keyword, publisherId, host]);

  const adAsText = ad ? `${ad.title}\n${ad.message}\n${ad.target_url}` : null;
  const adAsMarkdown = ad ? `**${ad.title}**\n\n${ad.message}\n\n[Learn more](${ad.target_url})` : null;

  return {
    ad,
    adAsText,
    adAsMarkdown,
    isLoading,
    error,
  };
}

