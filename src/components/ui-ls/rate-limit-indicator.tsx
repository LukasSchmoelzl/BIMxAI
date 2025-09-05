'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetTime: string;
}

export function RateLimitIndicator() {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<number>(0);

  useEffect(() => {
    // Listen for rate limit headers from API responses
    const handleRateLimit = (event: CustomEvent) => {
      const { remaining, limit, resetTime } = event.detail;
      setRateLimitInfo({ remaining, limit, resetTime });
    };

    window.addEventListener('ratelimit-update' as any, handleRateLimit);
    return () => window.removeEventListener('ratelimit-update' as any, handleRateLimit);
  }, []);

  useEffect(() => {
    if (!rateLimitInfo?.resetTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const reset = new Date(rateLimitInfo.resetTime).getTime();
      const diff = Math.max(0, reset - now);
      setTimeUntilReset(Math.ceil(diff / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [rateLimitInfo?.resetTime]);

  if (!rateLimitInfo || rateLimitInfo.remaining > 3) return null;

  const percentage = (rateLimitInfo.remaining / rateLimitInfo.limit) * 100;
  const isLow = rateLimitInfo.remaining <= 3;
  const isExhausted = rateLimitInfo.remaining === 0;

  return (
    <Card 
      className={cn(
        "fixed bottom-5 right-5 min-w-[250px] z-50 animate-in slide-in-from-right duration-300"
      )}
      style={{
        backgroundColor: 'var(--rate-limit-bg)',
        border: '1px solid var(--rate-limit-border)',
        borderRadius: 'var(--rate-limit-border-radius)',
        padding: 'var(--rate-limit-padding)',
        color: 'var(--rate-limit-text)',
      }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span>⚡</span>
          <span>
            {isExhausted ? 'Limit erreicht' : 'Anfragen-Limit'}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          {isExhausted ? (
            <p>Bitte warte {timeUntilReset} Sekunden</p>
          ) : (
            <p>Noch {rateLimitInfo.remaining} von {rateLimitInfo.limit} Anfragen</p>
          )}
        </div>

        <Progress 
          value={percentage} 
          className="h-1"
          style={{
            backgroundColor: 'var(--progress-bg)',
          }}
        />
      </CardContent>
    </Card>
  );
} 