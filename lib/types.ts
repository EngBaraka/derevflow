export type {
  ActiveSymbol,
  Tick,
  TicksHistoryResponse,
  ContractsForResponse,
  ContractInfo,
  DurationLimits,
  ProposalResponse,
  ProposalInfo,
  BuyResponse,
  BuyResult,
} from '@deriv/core';

export type { OpenPosition } from '@/hooks/use-open-positions';
export type { ClosedPosition } from '@/hooks/use-closed-positions';

export type Direction = 'CALL' | 'PUT';

export type PositionFilter = 'open' | 'closed' | 'all';

export type { DurationSelectUnit, DurationOption } from '@/lib/duration-utils';
