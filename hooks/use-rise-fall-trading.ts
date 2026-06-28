'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useProposal, useBuy } from '@deriv/core';
import type {
  DerivWS,
  ActiveSymbol,
  Tick,
  ProposalInfo,
  ProposalParams,
  BuyResult,
} from '@deriv/core';
import { useBaseTrading } from '@/hooks/use-base-trading';
import type { UseBaseTradingParams } from '@/hooks/use-base-trading';
import type { Direction, DurationSelectUnit, DurationOption, OpenPosition, ClosedPosition } from '../lib/types';
import { getDurationOptions, computeEndTimeEpoch } from '@/lib/duration-utils';

const CONTRACT_TYPES = ['CALL', 'PUT'];

interface UseRiseFallTradingReturn {
  ws: DerivWS | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  currentTick: Tick | null;
  prices: number[];
  pipSize: number;
  direction: Direction;
  setDirection: (direction: Direction) => void;
  allowEquals: boolean;
  setAllowEquals: (value: boolean) => void;
  stake: string;
  setStake: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
  durationOptions: DurationOption[];
  durationUnit: DurationSelectUnit;
  setDurationUnit: (unit: DurationSelectUnit) => void;
  endDate: Date | undefined;
  setEndDate: (date: Date | undefined) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  proposal: ProposalInfo | null;
  buyContract: () => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;
  openPositions: OpenPosition[];
  closedPositions: ClosedPosition[];
  sellContract: (contractId: number, bidPrice: string) => Promise<void>;
  sellingId: number | null;
  sellError: string | null;
  clearSellError: () => void;
}

export type UseRiseFallTradingParams = Pick<UseBaseTradingParams, 'ws' | 'isConnected' | 'isExhausted' | 'isAuthenticated' | 'onAuthWSFailed'>;

export function useRiseFallTrading({ ws, isConnected, isExhausted, isAuthenticated, onAuthWSFailed }: UseRiseFallTradingParams): UseRiseFallTradingReturn {
  const {
    ws: tradingWs,
    isConnected: tradingIsConnected,
    isLoading,
    error,
    symbols,
    activeSymbol,
    selectSymbol,
    currentTick,
    prices,
    pipSize,
    contracts,
    openPositions,
    closedPositions,
    sellContract,
    sellingId,
    sellError,
    clearSellError,
  } = useBaseTrading({ ws, isConnected, isExhausted, isAuthenticated, onAuthWSFailed, contractTypes: CONTRACT_TYPES });

  const [direction, setDirection] = useState<Direction>('CALL');
  const [allowEquals, setAllowEquals] = useState<boolean>(false);
  const [stake, setStake] = useState<string>('10');
  const [duration, setDuration] = useState<number>(1);
  const [durationUnit, setDurationUnitRaw] = useState<DurationSelectUnit>('t');
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<string>('');
  const [durationOptionsSymbol, setDurationOptionsSymbol] = useState<string | null>(null);

  const durationOptions = useMemo(() => getDurationOptions(contracts), [contracts]);

  // Track durationUnit and activeSymbol in refs so the duration-options effect doesn't list them in deps
  const durationUnitRef = useRef(durationUnit);
  const activeSymbolKeyRef = useRef(activeSymbol?.underlying_symbol);

  useEffect(() => {
    durationUnitRef.current = durationUnit;
  }, [durationUnit]);

  useEffect(() => {
    activeSymbolKeyRef.current = activeSymbol?.underlying_symbol;
  }, [activeSymbol?.underlying_symbol]);

  /* eslint-disable react-hooks/set-state-in-effect -- reset duration/end-time state when contracts-derived options change */
  useEffect(() => {
    if (!durationOptions.length) return;
    setEndDate(undefined);
    setEndTime('');
    setDurationOptionsSymbol(activeSymbolKeyRef.current ?? null);
    const currentOpt = durationOptions.find(o => o.unit === durationUnitRef.current);
    if (!currentOpt) {
      const first = durationOptions[0];
      setDurationUnitRaw(first.unit);
      if (first.unit !== 'end-time') setDuration(first.min);
    } else if (currentOpt.unit !== 'end-time') {
      setDuration(prev => (prev < currentOpt.min || prev > currentOpt.max) ? currentOpt.min : prev);
    }
  }, [durationOptions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setDurationUnit = useCallback((unit: DurationSelectUnit) => {
    setDurationUnitRaw(unit);
    const opt = durationOptions.find(o => o.unit === unit);
    if (opt && unit !== 'end-time') setDuration(opt.min);
  }, [durationOptions]);

  const { buyContract: buyWithProposal, isBuying, buyResult, buyError, clearBuyResult } =
    useBuy(tradingWs, tradingIsConnected);

  const proposalParams: ProposalParams | null = useMemo(() => {
    if (isBuying || !activeSymbol || !durationOptions.length) return null;
    if (durationOptionsSymbol !== activeSymbol.underlying_symbol) return null;
    const stakeNum = parseFloat(stake);
    if (!stakeNum || stakeNum <= 0) return null;

    const base = {
      contractType: allowEquals ? `${direction}E` : direction,
      symbol: activeSymbol.underlying_symbol,
      amount: stakeNum,
      basis: 'stake' as const,
      currency: 'USD',
    };

    if (durationUnit === 'end-time') {
      const dateExpiry = computeEndTimeEpoch(endDate, endTime);
      if (!dateExpiry) return null;
      return { ...base, duration: 0, durationUnit: 'd', dateExpiry };
    }

    const opt = durationOptions.find(o => o.unit === durationUnit);
    if (!opt || duration < opt.min || duration > opt.max) return null;

    if (durationUnit === 'h') {
      return { ...base, duration: duration * 60, durationUnit: 'm' };
    }

    return { ...base, duration, durationUnit };
  }, [activeSymbol, direction, allowEquals, stake, duration, durationUnit, endDate, endTime, isBuying, durationOptions, durationOptionsSymbol]);

  const { proposal } = useProposal(tradingWs, tradingIsConnected, proposalParams);

  const buyContract = useCallback(async () => {
    if (proposal) await buyWithProposal(proposal);
  }, [proposal, buyWithProposal]);

  return {
    ws: tradingWs,
    isConnected: tradingIsConnected,
    isLoading,
    error,
    symbols,
    activeSymbol,
    selectSymbol,
    currentTick,
    prices,
    pipSize,
    direction,
    setDirection,
    allowEquals,
    setAllowEquals,
    stake,
    setStake,
    duration,
    setDuration,
    durationOptions,
    durationUnit,
    setDurationUnit,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    proposal,
    buyContract,
    isBuying,
    buyResult,
    buyError,
    clearBuyResult,
    openPositions,
    closedPositions,
    sellContract,
    sellingId,
    sellError,
    clearSellError,
  };
}
