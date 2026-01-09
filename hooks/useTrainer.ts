import { useState, useEffect, useCallback, useRef } from 'react';
import { StrategyData, HandData, Position, ActionType, TrainingSessionSettings, HandResult } from '@/types/poker';
import { loadStrategyData } from '@/lib/poker-data';
import { selectNextHand } from '@/lib/hand-selector';
import { db, addAttempt, updateSRSItem, initSettings, SRSItem } from '@/lib/db';

export type FeedbackType = {
    result: 'correct' | 'incorrect';
    correctAction: ActionType;
    userAction: ActionType;
    frequencies: any;
    boundaryScore: number;
};

export function useTrainer() {
    const [strategy, setStrategy] = useState<StrategyData | null>(null);
    const [loading, setLoading] = useState(true);

    const [currentHand, setCurrentHand] = useState<{ position: Position, hand: HandData } | null>(null);
    const [feedback, setFeedback] = useState<FeedbackType | null>(null);
    const [stats, setStats] = useState({ streak: 0, total: 0, correct: 0 });

    // Settings - normally load from DB, here minimal default for now
    const [settings, setSettings] = useState<TrainingSessionSettings>({
        enabledPositions: [], // empty = all
        mode: 'boundary',
        questionCount: 'infinite'
    });

    // Load Strategy & Settings on mount
    useEffect(() => {
        async function init() {
            await initSettings();
            const s = await loadStrategyData();
            setStrategy(s);

            const savedSettings = await db.settings.get(1);
            if (savedSettings) {
                setSettings({
                    ...savedSettings,
                    questionCount: savedSettings.questionCount as number | 'infinite'
                });
            }
            setLoading(false);
        }
        init();
    }, []);

    // Next Hand Loop
    const nextHand = useCallback(async () => {
        if (!strategy) return;
        setFeedback(null);
        const selection = await selectNextHand(strategy, settings);
        setCurrentHand(selection);
    }, [strategy, settings]);

    // Start first hand when strategy loads
    useEffect(() => {
        if (!currentHand && strategy) {
            nextHand();
        }
    }, [strategy, currentHand, nextHand]);

    const handleAction = async (action: ActionType) => {
        if (!currentHand || feedback) return;

        const { hand, position } = currentHand;
        const { bestAction, frequencies, boundaryScore } = hand;

        // Logic: Correct if action == bestAction (most frequent)
        const isCorrect = action === bestAction;

        // Update State
        setFeedback({
            result: isCorrect ? 'correct' : 'incorrect',
            correctAction: bestAction,
            userAction: action,
            frequencies,
            boundaryScore
        });

        setStats(prev => ({
            streak: isCorrect ? prev.streak + 1 : 0,
            total: prev.total + 1,
            correct: prev.correct + (isCorrect ? 1 : 0)
        }));

        // Persist Result
        await addAttempt({
            timestamp: Date.now(),
            position,
            hand: hand.hand,
            userAction: action,
            isCorrect,
            boundaryScore
        });

        // Update SRS
        // Find or create SRS item
        const srsId = `${position}_${hand.hand}`; // Need consistent ID
        let srsItem = await db.srsQueue.get(srsId);

        if (!srsItem) {
            // New item to track
            srsItem = {
                id: srsId,
                position,
                hand: hand.hand,
                nextReviewTime: 0, // Set by update function
                streak: 0,
                easinessFactor: 2.5,
                interval: 0
            };
        }

        await updateSRSItem(srsItem, isCorrect);

        // Auto advance timer is handled by UI component usually, 
        // but we provide the function to call loop.
    };

    return {
        loading,
        currentHand,
        feedback,
        stats,
        handleAction,
        nextHand,
        settings,
        setSettings
    };
}
