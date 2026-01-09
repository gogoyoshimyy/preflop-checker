import { Position, HandData, StrategyData, TrainingSessionSettings } from '@/types/poker';
import { db, getDueReviews } from '@/lib/db';
import { getAllHandsForPosition, getHandData, POSITIONS } from '@/lib/poker-data';

export async function selectNextHand(
    strategy: StrategyData,
    settings: TrainingSessionSettings
): Promise<{ position: Position; hand: HandData } | null> {
    const { mode, enabledPositions } = settings;
    const activePositions = enabledPositions.length > 0 ? enabledPositions : POSITIONS;

    // 1. SRS Check (High Priority)
    // Even in Boundary mode, we might want to intersperse SRS re-reviews.
    // User spec: "20% SRS, 70% Boundary, 10% Random"

    const rand = Math.random();
    const dueReviews = await getDueReviews();
    const relevantReviews = dueReviews.filter(r => activePositions.includes(r.position));

    if (relevantReviews.length > 0 && rand < 0.2) {
        // Pick from SRS
        const item = relevantReviews[Math.floor(Math.random() * relevantReviews.length)];
        const handData = getHandData(strategy, item.position, item.hand);
        if (handData) return { position: item.position, hand: handData };
    }

    // 2. Boundary (70% chance or if mode is strictly boundary)
    // User spec says "Default distribution: 70% Boundary, 20% SRS, 10% Random".
    // So if not SRS, we check Boundary vs Random.
    // Probability left = 0.8. Boundary share = 0.7. So 0.7/0.8 = 0.875 chance of Boundary given not SRS.

    const isBoundary = rand < 0.9; // Combined logic: (0 ~ 0.2 SRS) (0.2 ~ 0.9 Boundary) (0.9 ~ 1.0 Random)
    // Note: if SRS was empty, we just fall through.

    if (isBoundary || mode === 'boundary') {
        // Get all hands from enabled positions
        let candidates: { pos: Position; data: HandData }[] = [];
        for (const pos of activePositions) {
            const hands = getAllHandsForPosition(strategy, pos);
            // Filter for "boundary-ish"
            // User definition: boundaryScore = 1 - maxFreq.
            // "Boundary" means high boundary score (close to 0.5 split, score ~0.5). 
            // If maxFreq is 1.0 (trivial), score is 0. 
            // We want hands with score > ?
            // Let's take top 30% of hands by boundary score.
            hands.forEach(h => candidates.push({ pos, data: h }));
        }

        candidates.sort((a, b) => b.data.boundaryScore - a.data.boundaryScore);

        // Take top 200 or top 20%
        const sliceSize = Math.max(20, Math.floor(candidates.length * 0.2));
        const topCandidates = candidates.slice(0, sliceSize);

        if (topCandidates.length > 0) {
            const pick = topCandidates[Math.floor(Math.random() * topCandidates.length)];
            return { position: pick.pos, hand: pick.data };
        }
    }

    // 3. Random (Fallback)
    const pos = activePositions[Math.floor(Math.random() * activePositions.length)];
    const hands = getAllHandsForPosition(strategy, pos);

    // Try to avoid purely trivial hands (100% fold 72o) unless truly random?
    // Let's just pick fully random for the "Random" bucket.
    if (hands.length === 0) return null;
    const hand = hands[Math.floor(Math.random() * hands.length)];
    return { position: pos, hand };
}
