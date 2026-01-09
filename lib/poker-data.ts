import { StrategyData, HandData, Position, ActionType, ActionFrequencies } from '@/types/poker';

export const POSITIONS: Position[] = [
    'RFI_UTG', 'RFI_UTG+1', 'RFI_LJ', 'RFI_HJ', 'RFI_CO', 'RFI_BTN', 'RFI_SB'
];

let cachedStrategy: StrategyData | null = null;

export async function loadStrategyData(): Promise<StrategyData> {
    if (cachedStrategy) return cachedStrategy;

    try {
        const res = await fetch('/data/rfi_9max_ante_stack50_RFI_UTG_to_SB_actions.json');
        if (!res.ok) throw new Error('Failed to load strategy data: ' + res.statusText);
        const data = await res.json();
        cachedStrategy = data;
        return data;
    } catch (error) {
        console.error('Error loading strategy:', error);
        throw error;
    }
}

export function calculateBoundaryScore(freqs: ActionFrequencies): number {
    const maxFreq = Math.max(freqs.raise, freqs.call, freqs.fold);
    // Round to avoid floating point precision issues causing tiny discrepancies
    return 1 - maxFreq;
}

export function getBestAction(freqs: ActionFrequencies): ActionType {
    const { raise, call, fold } = freqs;
    if (raise >= call && raise >= fold) return 'raise';
    if (call >= raise && call >= fold) return 'call';
    return 'fold';
}

export function getHandData(strategy: StrategyData, position: Position, hand: string): HandData | null {
    const posStrategy = strategy.strategies[position];
    if (!posStrategy) return null;
    const freqs = posStrategy[hand];
    if (!freqs) return null;

    return {
        hand,
        frequencies: freqs,
        boundaryScore: calculateBoundaryScore(freqs),
        bestAction: getBestAction(freqs),
    };
}

export function getAllHandsForPosition(strategy: StrategyData, position: Position): HandData[] {
    const posStrategy = strategy.strategies[position];
    if (!posStrategy) return [];

    return Object.entries(posStrategy).map(([hand, freqs]) => ({
        hand,
        frequencies: freqs,
        boundaryScore: calculateBoundaryScore(freqs),
        bestAction: getBestAction(freqs),
    }));
}
