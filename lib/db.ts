import Dexie, { Table } from 'dexie';
import { ActionType, Position } from '@/types/poker';

export interface Attempt {
    id?: number;
    timestamp: number;
    position: Position;
    hand: string;
    userAction: ActionType;
    isCorrect: boolean;
    boundaryScore: number;
}

export interface SRSItem {
    id: string; // "Position_Hand" e.g., "RFI_UTG_AA"
    position: Position;
    hand: string;
    nextReviewTime: number;
    streak: number; // consecutive correct answers
    easinessFactor: number; // for advanced SRS, default 2.5
    interval: number; // in milliseconds
}

export interface UserSettings {
    id: number; // Singleton 1
    enabledPositions: Position[];
    mode: 'boundary' | 'random' | 'review';
    questionCount: number | 'infinite'; // stored as string "infinite" or number
    theme: 'dark' | 'light';
}

export interface ReferenceImage {
    id: string; // "RFI_UTG"
    dataUrl: string; // Base64 string of the image
    updatedAt: number;
}

export class PokerTrainerDB extends Dexie {
    attempts!: Table<Attempt>;
    srsQueue!: Table<SRSItem>;
    settings!: Table<UserSettings>;
    images!: Table<ReferenceImage>;

    constructor() {
        super('PokerRFITrainerDB');
        this.version(1).stores({
            attempts: '++id, timestamp, position, hand, isCorrect, boundaryScore',
            srsQueue: 'id, nextReviewTime, [position+hand]',
            settings: 'id'
        });
        this.version(2).stores({
            images: 'id'
        });
    }
}

export const db = new PokerTrainerDB();

// Helper to init settings if not exists
export async function initSettings() {
    // FORCE RESET for debugging/fixing the "Stuck on BTN" issue
    // In production we would check for existence, but for now we want to ensure
    // the user gets the correct settings effectively immediately.
    await db.settings.put({
        id: 1,
        enabledPositions: ['RFI_UTG', 'RFI_UTG+1', 'RFI_LJ', 'RFI_HJ', 'RFI_CO', 'RFI_BTN', 'RFI_SB'],
        mode: 'boundary',
        questionCount: 'infinite',
        theme: 'dark'
    });
}

export async function addAttempt(attempt: Omit<Attempt, 'id'>) {
    return await db.attempts.add(attempt);
}

export async function getAttempts(limit = 100) {
    return await db.attempts.orderBy('timestamp').reverse().limit(limit).toArray();
}

// SRS Logic helpers
export async function getDueReviews(now = Date.now()): Promise<SRSItem[]> {
    return await db.srsQueue.where('nextReviewTime').belowOrEqual(now).toArray();
}

export async function updateSRSItem(item: SRSItem, isCorrect: boolean) {
    // Simple Leitner-ish or Sm-2
    // If correct: increase interval. If wrong: reset interval.
    const ONE_DAY = 24 * 60 * 60 * 1000;

    let newStreak = isCorrect ? item.streak + 1 : 0;
    let newInterval = item.interval;

    if (!isCorrect) {
        newInterval = 60 * 1000; // Review in 1 min (effectively "soon" in next session or end of this one)
    } else {
        if (newStreak === 1) newInterval = 10 * 60 * 1000; // 10 mins
        else if (newStreak === 2) newInterval = ONE_DAY;
        else newInterval = item.interval * 2; // Double interval
    }

    await db.srsQueue.put({
        ...item,
        streak: newStreak,
        interval: newInterval,
        nextReviewTime: Date.now() + newInterval
    });
}
