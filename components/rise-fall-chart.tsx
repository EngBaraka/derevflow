'use client';

import { SmartChartWrapper } from '@/components/custom/smart-chart';
import type { ContractMarker } from '@/lib/chart-markers';
import type { UseSmartChartsApiReturn } from '@/hooks/use-smartcharts-api';
import type { SmartChartChartData } from '@/hooks/use-smartchart-chart-data';

export interface RiseFallChartProps {
  symbolKey: string;
  symbol: string | undefined;
  isConnectionOpened: boolean;
  isMobile: boolean;
  chartData: SmartChartChartData | undefined;
  getQuotes: UseSmartChartsApiReturn['getQuotes'];
  subscribeQuotes: UseSmartChartsApiReturn['subscribeQuotes'];
  unsubscribeQuotes: UseSmartChartsApiReturn['unsubscribeQuotes'];
  onSymbolChange?: (symbol: string) => void;
  isLive?: boolean;
  endEpoch?: number;
  /** Contract markers rendered on the chart when trades are placed. */
  contractsArray?: ContractMarker[];
}

export function RiseFallChart(props: RiseFallChartProps) {
  return (
    <SmartChartWrapper
      chartId="rise-fall-chart"
      defaultGranularity={0}
      {...props}
    />
  );
}
