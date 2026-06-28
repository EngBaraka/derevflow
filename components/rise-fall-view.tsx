'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/custom/footer';
import { Header } from '@/components/custom/header';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useContractMarkers } from '@/hooks/use-contract-markers';
import { TradeControls } from './trade-controls';
import type {
  AuthState,
  DerivAccount,
  ActiveSymbol,
  ProposalInfo,
  BuyResult,
  DerivWS,
} from '@deriv/core';
import type { Direction, DurationSelectUnit, DurationOption } from '../lib/types';
import type { UseSmartChartsApiReturn } from '@/hooks/use-smartcharts-api';
import type { SmartChartChartData } from '@/hooks/use-smartchart-chart-data';
import type { OpenPosition } from '../lib/types';

const RiseFallChart = dynamic(() => import('./rise-fall-chart').then(m => m.RiseFallChart), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-md border border-border/50 dark:border-white/[0.08] bg-muted/30" />
  ),
});

export interface RiseFallViewProps {
  // Auth
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  onLogin: () => Promise<void>;
  onSignUp: () => Promise<void>;
  onLogout: () => void;
  onSwitchAccount: (accountId: string) => Promise<void>;

  // Connection / loading
  ws: DerivWS | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Market data
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;

  // Trade controls
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

  // Positions
  openPositions: OpenPosition[];
  sellContract: (contractId: number, bidPrice: string) => Promise<void>;
  sellingId: number | null;

  // Chart data (elevated to page so preview can inject frozen mocks)
  chartData: SmartChartChartData | undefined;
  getQuotes: UseSmartChartsApiReturn['getQuotes'];
  subscribeQuotes: UseSmartChartsApiReturn['subscribeQuotes'];
  unsubscribeQuotes: UseSmartChartsApiReturn['unsubscribeQuotes'];
  /** Passed to SmartChart. Set to false for a frozen preview. Defaults to true. */
  isLive?: boolean;
  /**
   * Unix epoch (seconds) to freeze the chart at. When set, SmartCharts renders
   * a static historical snapshot and never sets up a live subscription.
   */
  endEpoch?: number;

  // Branding (used by preview route; no-op in the real app)
  logoSrc?: string;
  appName?: string;
}

export function RiseFallView({
  authState,
  accounts,
  activeAccount,
  onLogin,
  onSignUp,
  onLogout,
  onSwitchAccount,
  ws,
  isConnected,
  isLoading,
  error,
  activeSymbol,
  selectSymbol,
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
  chartData,
  getQuotes,
  subscribeQuotes,
  unsubscribeQuotes,
  isLive,
  endEpoch,
  logoSrc,
  appName,
}: RiseFallViewProps) {
  const isMobile = useIsMobile();
  const contractMarkers = useContractMarkers(openPositions, activeSymbol?.underlying_symbol, isMobile);

  if (error) {
    return (
      <main className="flex flex-col bg-background items-center justify-center px-4 min-h-dvh">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-col bg-background max-lg:h-dvh lg:overflow-visible">
      <Header
        authState={authState}
        accounts={accounts}
        activeAccount={activeAccount}
        onLogin={onLogin}
        onSignUp={onSignUp}
        onLogout={onLogout}
        onSwitchAccount={onSwitchAccount}
        logoSrc={logoSrc}
        appName={appName}
        actions={<ThemeToggle />}
      />
      {/* Spacer to push content below fixed header — taller when authenticated (account bar visible) */}
      <div className={authState === 'authenticated' ? 'h-[76px] shrink-0' : 'h-[66px] shrink-0'} />

      {/*
       * Content area.
       * Mobile (< lg): flex-col, no outer scroll — the chart is pinned at 40 dvh
       *   (edge-to-edge, no horizontal padding) and the controls panel below it
       *   scrolls independently only when content exceeds the remaining space.
       * Desktop (≥ lg): reverts to natural block flow so the page can grow.
       */}
      <div className="flex w-full max-w-7xl mx-auto flex-col max-lg:px-0 max-lg:py-0 px-3 py-2 sm:px-4 sm:py-4 gap-2 sm:gap-3 max-lg:flex-1 max-lg:min-h-0 max-lg:overflow-hidden lg:flex-none lg:overflow-visible">
        <div className="max-lg:flex max-lg:flex-col max-lg:flex-1 max-lg:min-h-0 lg:grid lg:grid-cols-[1fr_400px] lg:gap-4">
          {/* Column 1: Chart */}
          <div className="max-lg:shrink-0 flex flex-col gap-2 max-lg:px-3 max-lg:pb-2 pt-2 lg:py-0">
            <div className="max-lg:h-[45dvh] lg:h-[min(33.6rem,66vh)] lg:min-h-[384px]">
              {chartData ? (
                <RiseFallChart
                  symbolKey="rise-fall-chart"
                  symbol={activeSymbol?.underlying_symbol}
                  isConnectionOpened={isConnected}
                  isMobile={isMobile}
                  chartData={chartData}
                  getQuotes={getQuotes}
                  subscribeQuotes={subscribeQuotes}
                  unsubscribeQuotes={unsubscribeQuotes}
                  onSymbolChange={selectSymbol}
                  isLive={isLive}
                  endEpoch={endEpoch}
                  contractsArray={contractMarkers}
                />
              ) : (
                <Skeleton className="h-full w-full rounded-md" />
              )}
            </div>
          </div>

          {/* Column 2: Trade controls in a Card */}
          <div className="max-lg:flex-1 max-lg:min-h-0 max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:px-3 max-lg:border-t max-lg:border-border max-lg:pt-3 max-lg:pb-28 lg:pt-0 flex flex-col gap-3">
            {isLoading ? (
              <Skeleton className="lg:h-[min(33.6rem,66vh)] lg:min-h-[384px] max-lg:h-48 w-full rounded-xl" />
            ) : (
              <Card className="lg:h-[min(33.6rem,66vh)] lg:min-h-[384px] lg:overflow-y-auto">
                <CardContent className="pt-4">
                  <TradeControls
                    direction={direction}
                    onDirectionChange={setDirection}
                    allowEquals={allowEquals}
                    onAllowEqualsChange={setAllowEquals}
                    isConnected={isConnected}
                    stake={stake}
                    onStakeChange={setStake}
                    duration={duration}
                    onDurationChange={setDuration}
                    durationOptions={durationOptions}
                    durationUnit={durationUnit}
                    onDurationUnitChange={setDurationUnit}
                    endDate={endDate}
                    onEndDateChange={setEndDate}
                    endTime={endTime}
                    onEndTimeChange={setEndTime}
                    ws={ws}
                    activeSymbol={activeSymbol}
                    proposal={proposal}
                    onBuy={buyContract}
                    isBuying={isBuying}
                    buyResult={buyResult}
                    buyError={buyError}
                    onClearBuyResult={clearBuyResult}
                    isAuthenticated={authState === 'authenticated'}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Fixed footer */}
      <div className="fixed bottom-0 left-0 right-0 py-2 text-center bg-background/80 backdrop-blur-sm">
        <Footer />
      </div>
    </main>
  );
}
