export type Position = 'RFI_UTG' | 'RFI_UTG+1' | 'RFI_LJ' | 'RFI_HJ' | 'RFI_CO' | 'RFI_BTN' | 'RFI_SB';

export type ActionType = 'raise' | 'call' | 'fold';

export interface ActionFrequencies {
  raise: number;
  call: number;
  fold: number;
}

export interface HandStrategy {
  [hand: string]: ActionFrequencies;
}

export interface Strategies {
  [position: string]: HandStrategy;
}

export interface StrategyMetaData {
  format: string;
  ante: boolean;
  stack_bb_label_seen: number;
  note: string;
  created_at?: string;
}

export interface StrategySizes {
  open_raise_bb: number;
  sb_raise_bb: number;
  all_in_label_seen_bb: number;
}

export interface StrategyData {
  meta: StrategyMetaData;
  sizes: StrategySizes;
  strategies: Strategies;
}

export interface HandData {
  hand: string; // e.g., "AA", "AKs"
  frequencies: ActionFrequencies;
  boundaryScore: number;
  bestAction: ActionType;
}

// For UI/State
export interface TrainingSessionSettings {
  enabledPositions: Position[];
  mode: 'boundary' | 'random' | 'review';
  questionCount: number | 'infinite';
}

export interface HandResult {
  id?: number; // IndexedDB ID
  timestamp: number;
  position: Position;
  hand: string;
  userAction: ActionType;
  isCorrect: boolean;
  boundaryScore: number;
}
