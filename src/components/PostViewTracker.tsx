'use client';

import { useEffect } from 'react';

type PostViewTrackerProps = {
  slug: string;
};

export function PostViewTracker({ slug }: PostViewTrackerProps) {
  useEffect(() => {
    if (!slug) {
      return;
    }

    const storageKey = `interno:viewed:${slug}`;
    const hasRecorded = typeof window !== 'undefined' && window.sessionStorage.getItem(storageKey);

    if (hasRecorded) {
      return;
    }

    const controller = new AbortController();

    const sendView = async () => {
      try {
        const response = await fetch('/api/post-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
          signal: controller.signal,
          keepalive: true,
        });

        const payload = await response.json().catch(() => null);

        if (response.ok) {
          if (payload?.viewCount != null && typeof window !== 'undefined') {
            window.sessionStorage.setItem(storageKey, '1');
          }

          if (payload?.warning && process.env.NODE_ENV === 'development') {
            console.warn('[PostViewTracker]', payload.warning);
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('[PostViewTracker] View tracking failed:', payload?.error || response.statusText);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('View tracking failed:', error);
        }
      }
    };

    void sendView();

    return () => {
      controller.abort();
    };
  }, [slug]);

  return null;
}
