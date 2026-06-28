'use client';

import { cn } from '@/lib/utils';
import type { Tick, ActiveSymbol } from '../lib/types';

interface CurrentPriceDisplayProps {
  tick: Tick | null;
  prices: number[];
  activeSymbol: ActiveSymbol | null;
  pipSize: number;
}

export function CurrentPriceDisplay({
  tick,
  prices,
  activeSymbol,
  pipSize,
}: CurrentPriceDisplayProps) {
  if (!tick || !activeSymbol) {
    return (
      <div className="text-center py-6">
        <div className="text-2xl font-mono text-muted-foreground">---</div>
      </div>
    );
  }

  const priceStr = tick.quote.toFixed(pipSize);
  const prev = prices.length >= 2 ? prices[prices.length - 2] : null;
  const curr = prices.length >= 1 ? prices[prices.length - 1] : null;
  const isUp = prev !== null && curr !== null && curr > prev;
  const isDown = prev !== null && curr !== null && curr < prev;

  return (
    <div className="text-center py-6">
      <p className="text-xs text-muted-foreground mb-2">{activeSymbol.underlying_symbol_name}</p>
      <div className="flex items-center justify-center gap-3">
        <span className="text-4xl font-mono font-bold tracking-wide text-foreground">
          {priceStr}
        </span>
        {(isUp || isDown) && (
          <span
            className={cn(
              'text-2xl font-bold leading-none',
              isUp ? 'text-green-500' : 'text-destructive'
            )}
          >
            {isUp ? '▲' : '▼'}
          </span>
        )}
      </div>
    </div>
  );
}
