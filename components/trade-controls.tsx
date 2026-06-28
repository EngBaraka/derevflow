'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EndTimePicker } from '@/components/custom/end-time-picker';
import type { DerivWS, ActiveSymbol, ProposalInfo, BuyResult } from '@deriv/core';
import type { Direction, DurationSelectUnit, DurationOption } from '../lib/types';

interface TradeControlsProps {
  direction: Direction;
  onDirectionChange: (direction: Direction) => void;
  allowEquals: boolean;
  onAllowEqualsChange: (value: boolean) => void;
  isConnected: boolean;
  stake: string;
  onStakeChange: (value: string) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  durationOptions: DurationOption[];
  durationUnit: DurationSelectUnit;
  onDurationUnitChange: (unit: DurationSelectUnit) => void;
  endDate: Date | undefined;
  onEndDateChange: (date: Date | undefined) => void;
  endTime: string;
  onEndTimeChange: (time: string) => void;
  ws: DerivWS | null;
  activeSymbol: ActiveSymbol | null;
  proposal: ProposalInfo | null;

  onBuy: () => void;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  onClearBuyResult: () => void;
  /** Whether the user is authenticated — shows the View your positions link when true. */
  isAuthenticated?: boolean;
}

export function TradeControls({
  direction,
  onDirectionChange,
  allowEquals,
  onAllowEqualsChange,
  isConnected,
  stake,
  onStakeChange,
  duration,
  onDurationChange,
  durationOptions,
  durationUnit,
  onDurationUnitChange,
  endDate,
  onEndDateChange,
  endTime,
  onEndTimeChange,
  ws,
  activeSymbol,
  proposal,
  onBuy,
  isBuying,
  buyResult,
  buyError,
  onClearBuyResult,
  isAuthenticated,
}: TradeControlsProps) {
  useEffect(() => {
    if (buyError) {
      toast.error('Purchase Failed', { description: buyError });
      onClearBuyResult();
    }
  }, [buyError, onClearBuyResult]);

  useEffect(() => {
    if (buyResult) {
      toast.success('Contract Purchased', {
        description: `Buy price: ${buyResult.buyPrice.toFixed(2)} USD | Payout: ${buyResult.payout.toFixed(2)} USD | Balance: ${buyResult.balanceAfter.toFixed(2)} USD`,
      });
      onClearBuyResult();
    }
  }, [buyResult, onClearBuyResult]);

  const activeOption = durationOptions.find(o => o.unit === durationUnit);

  const endTimeOption = durationOptions.find(o => o.unit === 'end-time');
  const { endTimeMinDate, endTimeMaxDate } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      endTimeMinDate: today,
      endTimeMaxDate: endTimeOption
        ? new Date(today.getTime() + endTimeOption.max * 86400000)
        : new Date(today.getTime() + 365 * 86400000),
    };
  }, [endTimeOption]);

  return (
    <div className="w-full space-y-2 lg:max-w-[400px] lg:space-y-4">
      {/* Rise / Fall direction segmented control */}
      <ToggleGroup
        type="single"
        value={direction}
        onValueChange={(value) => {
          if (value === 'CALL' || value === 'PUT') onDirectionChange(value);
        }}
        className="w-full gap-0 rounded-full bg-muted p-1"
      >
        <ToggleGroupItem
          value="CALL"
          className="flex-1 rounded-full text-sm font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-green-600 data-[state=on]:font-bold data-[state=on]:shadow-sm hover:text-foreground"
        >
          Rise
        </ToggleGroupItem>
        <ToggleGroupItem
          value="PUT"
          className="flex-1 rounded-full text-sm font-medium text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-destructive data-[state=on]:font-bold data-[state=on]:shadow-sm hover:text-foreground"
        >
          Fall
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Allow equals */}
      <div className="flex items-center justify-between">
        <Label htmlFor="allow-equals" className="text-sm cursor-pointer">Allow equals</Label>
        <Switch
          id="allow-equals"
          checked={allowEquals}
          onCheckedChange={onAllowEqualsChange}
        />
      </div>

      {/* Stake */}
      <div className="space-y-1.5">
        <Label htmlFor="stake" className="text-xs text-muted-foreground">Stake</Label>
        <Input
          id="stake"
          type="number"
          value={stake}
          onChange={(e) => onStakeChange(e.target.value)}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
          }}
          min={0}
          step="0.01"
          labelRight="USD"
        />
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Duration</Label>
        <Select
          value={durationUnit}
          onValueChange={(v) => {
            const opt = durationOptions.find(o => o.unit === v);
            if (opt) onDurationUnitChange(opt.unit);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {durationOptions.map(opt => (
              <SelectItem key={opt.unit} value={opt.unit}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {durationUnit !== 'end-time' && (
          <Input
            type="number"
            value={duration}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) onDurationChange(val);
            }}
            min={activeOption?.min}
            max={activeOption?.max}
            step={1}
          />
        )}

        {durationUnit === 'end-time' && (
          <EndTimePicker
            ws={ws}
            isConnected={isConnected}
            activeSymbol={activeSymbol}
            endDate={endDate}
            onEndDateChange={onEndDateChange}
            endTime={endTime}
            onEndTimeChange={onEndTimeChange}
            minDate={endTimeMinDate}
            maxDate={endTimeMaxDate}
          />
        )}
      </div>

      {/* Buy button — inline on desktop, fixed above footer on mobile */}
      <div className="max-lg:fixed max-lg:bottom-[calc(env(safe-area-inset-bottom)+2.5rem)] max-lg:left-3 max-lg:right-3 lg:static">
        <Button
          className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
          size="lg"
          disabled={!isConnected || !proposal || isBuying}
          onClick={onBuy}
        >
          {isBuying ? (
            'Purchasing...'
          ) : (
            <span className="flex flex-col items-center leading-tight gap-0.5">
              <span>Buy</span>
              {proposal && (
                <span className="text-xs font-normal opacity-90">
                  Payout {proposal.payout.toFixed(2)} USD
                </span>
              )}
            </span>
          )}
        </Button>
      </div>

      {/* View your positions — shown when authenticated */}
      {isAuthenticated && (
        <Button
          asChild
          variant="ghost"
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          <Link href="/reports">View your positions →</Link>
        </Button>
      )}
    </div>
  );
}
