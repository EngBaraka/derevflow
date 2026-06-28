'use client';

import { useMemo } from 'react';
import type { OpenPosition } from '@/hooks/use-open-positions';
import { calculateContractMarkers, type ContractMarker } from '@/lib/chart-markers';

/**
 * Hook that computes chart contract markers from open positions.
 * These markers are passed to SmartCharts via the `contracts_array` prop
 * to render entry spots, start-time lines, and direction arrows on the chart
 * when trades are placed.
 *
 * @param positions    - Array of currently open positions from useOpenPositions hook
 * @param activeSymbol - The underlying symbol string of the currently active chart
 * @param isMobile     - Controls contractMarkerLeftPadding (10 on mobile, 100 on desktop)
 * @returns Array of ContractMarker objects for SmartCharts
 */
export function useContractMarkers(
  positions: OpenPosition[],
  activeSymbol: string | undefined,
  isMobile = false
): ContractMarker[] {
  return useMemo(
    () => calculateContractMarkers(positions, activeSymbol, isMobile),
    [positions, activeSymbol, isMobile]
  );
}
