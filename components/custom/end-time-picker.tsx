'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DerivWS, ActiveSymbol } from '@deriv/core';
import { parseTradingDays, getEarlyCloseDates, getCloseTimeForDate } from '@/lib/duration-utils';
import type { TradingSymbolData } from '@/lib/duration-utils';

interface TradingTimesResponse {
  trading_times: {
    markets: Array<{
      submarkets: Array<{
        symbols: TradingSymbolData[];
      }>;
    }>;
  };
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTimeGMT(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period} GMT`;
}

function roundUpToNext5MinGMT(): string {
  const now = new Date();
  const totalMins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const rounded = Math.min(Math.floor(totalMins / 5) * 5 + 5, 23 * 60 + 55);
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
}

// Module-level cache: date string → symbol data map
const tradingTimesCache = new Map<string, Map<string, TradingSymbolData>>();

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface EndTimePickerProps {
  ws: DerivWS | null;
  isConnected: boolean;
  activeSymbol: ActiveSymbol | null;
  endDate: Date | undefined;
  onEndDateChange: (date: Date | undefined) => void;
  endTime: string;
  onEndTimeChange: (time: string) => void;
  minDate: Date;
  maxDate: Date;
}

export function EndTimePicker({
  ws,
  isConnected,
  activeSymbol,
  endDate,
  onEndDateChange,
  endTime,
  onEndTimeChange,
  minDate,
  maxDate,
}: EndTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => new Date());
  const [symbolData, setSymbolData] = useState<TradingSymbolData | null>(null);
  const fetchingRef = useRef<Set<string>>(new Set());

  const fetchTradingTimes = useCallback(
    async (date: Date): Promise<TradingSymbolData | null> => {
      if (!ws || !isConnected || !activeSymbol) return null;
      const dateKey = formatDateKey(date);
      const symbolKey = activeSymbol.underlying_symbol;

      const cached = tradingTimesCache.get(dateKey);
      if (cached) return cached.get(symbolKey) ?? null;

      const fetchKey = `${dateKey}-${symbolKey}`;
      if (fetchingRef.current.has(fetchKey)) return null;
      fetchingRef.current.add(fetchKey);

      try {
        const response = await ws.send<TradingTimesResponse>({ trading_times: dateKey });
        fetchingRef.current.delete(fetchKey);

        const symbolMap = new Map<string, TradingSymbolData>();
        for (const market of response.trading_times?.markets ?? []) {
          for (const submarket of market.submarkets ?? []) {
            for (const sym of submarket.symbols ?? []) {
              symbolMap.set(sym.underlying_symbol, sym);
            }
          }
        }
        tradingTimesCache.set(dateKey, symbolMap);
        return symbolMap.get(symbolKey) ?? null;
      } catch {
        fetchingRef.current.delete(fetchKey);
        return null;
      }
    },
    [ws, isConnected, activeSymbol]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const firstOfMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
    void fetchTradingTimes(firstOfMonth).then(data => {
      if (!cancelled && data) setSymbolData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, displayMonth, fetchTradingTimes]);

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      onEndDateChange(date);
      if (!date || !activeSymbol) return;

      if (isSameDay(date, new Date())) {
        onEndTimeChange(roundUpToNext5MinGMT());
        void fetchTradingTimes(date).then(data => {
          if (data) setSymbolData(data);
        });
      } else {
        onEndTimeChange('');
        void fetchTradingTimes(date).then(data => {
          if (!data) return;
          setSymbolData(data);
          const closeTime = getCloseTimeForDate(data, date);
          if (closeTime) onEndTimeChange(closeTime);
        });
      }
    },
    [onEndDateChange, fetchTradingTimes, activeSymbol, onEndTimeChange]
  );

  const disabledWeekdays = useMemo(
    () => (symbolData ? parseTradingDays(symbolData.trading_days) : []),
    [symbolData]
  );

  const earlyCloseDates = useMemo(
    () => (symbolData ? getEarlyCloseDates(symbolData.events, displayMonth) : []),
    [symbolData, displayMonth]
  );

  const nowGMT = useMemo(() => {
    const now = new Date();
    return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- endDate in deps intentionally refreshes when selection changes
  }, [endDate]);
  const isFutureDate = useMemo(
    () => endDate !== undefined && !isSameDay(endDate, new Date()),
    [endDate]
  );

  const isDisabled = useCallback(
    (date: Date) => {
      if (date < minDate || date > maxDate) return true;
      if (disabledWeekdays.includes(date.getDay())) return true;
      return false;
    },
    [minDate, maxDate, disabledWeekdays]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {endDate && endTime
            ? `${format(endDate, 'MMM d, yyyy')} ${formatTimeGMT(endTime)}`
            : endDate
              ? format(endDate, 'MMM d, yyyy')
              : 'Select date & time'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={endDate}
          onSelect={handleDateSelect}
          disabled={isDisabled}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          modifiers={{ earlyClose: earlyCloseDates }}
          modifiersClassNames={{
            earlyClose:
              'after:content-[""] after:block after:mx-auto after:mt-0.5 after:h-1 after:w-1 after:rounded-full after:bg-orange-400',
          }}
        />
        <div className="border-t border-border p-3 space-y-1.5">
          <Label htmlFor="end-time" className="text-xs text-muted-foreground">
            Time
          </Label>
          <Input
            id="end-time"
            type="time"
            value={endTime}
            onChange={e => {
              const newTime = e.target.value;
              if (!isFutureDate && endDate && newTime < nowGMT) {
                onEndTimeChange(roundUpToNext5MinGMT());
              } else {
                onEndTimeChange(newTime);
              }
            }}
            readOnly={isFutureDate}
            disabled={isFutureDate}
            className={isFutureDate ? 'bg-muted text-muted-foreground cursor-default' : ''}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
