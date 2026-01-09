"use client";

import React, { useEffect } from 'react';
import { useTrainer } from '@/hooks/useTrainer';
import { Card } from '@/components/poker/Card';
import { ReferenceChartModal } from './ReferenceChartModal';
import { Position, ActionType } from '@/types/poker';
import { RefreshCw, Play, Settings as SettingsIcon, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

// Helper to parse hand string "AKs" -> ["Ah", "Kh"] (randomized suits matching constraints)
function parseHandToCards(handStr: string): [string, string] {
    if (!handStr || handStr.length < 2) return ["??", "??"];

    const ranks = handStr.substring(0, 2);
    const type = handStr.length > 2 ? handStr[2] : ''; // 's', 'o', or empty (pairs)

    const suits = ['s', 'h', 'd', 'c'];
    const r1 = ranks[0];
    const r2 = ranks[1];

    let s1: string, s2: string;

    if (type === 's') {
        // Suited
        s1 = suits[Math.floor(Math.random() * 4)];
        s2 = s1;
    } else if (type === 'o') {
        // Offsuit
        s1 = suits[Math.floor(Math.random() * 4)];
        let remaining = suits.filter(s => s !== s1);
        s2 = remaining[Math.floor(Math.random() * 3)];
    } else {
        // Pair
        s1 = suits[Math.floor(Math.random() * 4)];
        let remaining = suits.filter(s => s !== s1);
        s2 = remaining[Math.floor(Math.random() * 3)];
    }

    return [`${r1}${s1}`, `${r2}${s2}`];
}

// Helper for safe frequency display (avoids Vercel build errors with ??)
const formatPct = (v?: number) => ((v ?? 0) * 100).toFixed(1);

export default function TrainingScreen() {
    const { loading, currentHand, feedback, stats, handleAction, nextHand } = useTrainer();
    const [cards, setCards] = React.useState<[string, string]>(["??", "??"]);
    const [showChart, setShowChart] = React.useState(false);

    // Key Bindings
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (feedback) {
                // Any key to continue if feedback is showing? 
                // Or just auto-timer. Let's use auto-timer mainly, but Space to skip.
                if (e.code === 'Space' || e.key === 'Enter') {
                    nextHand();
                }
                return;
            }

            const key = e.key.toLowerCase();
            // UTG-BTN: O=Open(Raise), F=Fold
            // SB: R=Raise, L=Limp(Call), F=Fold

            if (!currentHand) return;

            if (currentHand.position === 'RFI_SB') {
                if (key === 'r') handleAction('raise');
                else if (key === 'l' || key === 'c') handleAction('call'); // L usually limp, C call
                else if (key === 'f') handleAction('fold');
            } else {
                if (key === 'o' || key === 'r') handleAction('raise');
                else if (key === 'f') handleAction('fold');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentHand, feedback, handleAction, nextHand]);


    // Auto-advance removed as per user request
    /*
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => {
                nextHand();
            }, 1500); // 1.5s delay
            return () => clearTimeout(timer);
        }
    }, [feedback, nextHand]);
    */

    // Update visual cards when hand changes
    useEffect(() => {
        if (currentHand) {
            setCards(parseHandToCards(currentHand.hand.hand));
        }
    }, [currentHand]);

    if (loading) return <div className="flex h-screen items-center justify-center">Loading Data...</div>;

    if (!currentHand) return <div className="flex h-screen items-center justify-center">Initializing...</div>;

    const isSB = currentHand.position === 'RFI_SB';

    // Raise Size info
    const raiseSize = isSB ? '3.5bb' : '2.3bb';

    return (
        <div className="flex flex-col h-screen w-full bg-slate-900 text-white overflow-hidden">
            {/* Header */}
            <header className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700">
                <div className="flex gap-4 text-sm font-medium">
                    <div className="flex flex-col">
                        <span className="text-slate-400 text-xs uppercase">Position</span>
                        <span className="text-xl text-yellow-400">{currentHand.position.replace('RFI_', '')}</span>
                    </div>
                    <div className="w-px bg-slate-600 h-8 self-center mx-2"></div>
                    <div className="flex flex-col">
                        <span className="text-slate-400 text-xs uppercase">Stack</span>
                        <span>50bb</span>
                    </div>
                    <div className="flex flex-col ml-4">
                        <span className="text-slate-400 text-xs uppercase">Ante</span>
                        <span>Yes</span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setShowChart(true)}
                        className="p-2 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white transition-colors"
                        title="View Reference Chart"
                    >
                        <ImageIcon size={20} />
                    </button>
                    <div className="flex flex-col items-end">
                        <span className="text-slate-400 text-xs uppercase">Streak</span>
                        <span className={clsx(stats.streak > 2 ? "text-green-400" : "text-white")}>{stats.streak}</span>
                    </div>
                    <Link href="/settings" className="p-2 hover:bg-slate-700 rounded-full">
                        <SettingsIcon size={20} />
                    </Link>
                </div>
            </header>

            <ReferenceChartModal
                isOpen={showChart}
                onClose={() => setShowChart(false)}
                position={currentHand.position}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center relative p-4">

                {/* Pot / Size Info */}
                <div className="mb-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="text-slate-400 text-sm mb-1">Standard Open</div>
                    <div className="text-3xl font-bold text-white border-2 border-slate-600 px-6 py-2 rounded-xl bg-slate-800/50">
                        {raiseSize}
                    </div>
                </div>

                {/* Cards */}
                <div className="flex gap-4 mb-12">
                    <Card cardStr={cards[0]} size="xl" className="shadow-2xl" />
                    <Card cardStr={cards[1]} size="xl" className="shadow-2xl" />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 w-full max-w-md">
                    <button
                        onClick={() => handleAction('fold')}
                        className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xl border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        Fold <span className="text-xs font-normal opacity-50 block">(F)</span>
                    </button>

                    {isSB && (
                        <button
                            onClick={() => handleAction('call')}
                            className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xl border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
                        >
                            Limp <span className="text-xs font-normal opacity-50 block">(L)</span>
                        </button>
                    )}

                    <button
                        onClick={() => handleAction('raise')}
                        className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-xl border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
                    >
                        Raise <span className="text-xs font-normal opacity-50 block">(O/R)</span>
                    </button>
                </div>

                {/* Feedback Overlay */}
                {feedback && (
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in duration-200 cursor-pointer"
                        onClick={() => nextHand()}
                    >
                        <div className={clsx(
                            "bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center border-4",
                            feedback.result === 'correct' ? "border-green-500" : "border-red-500"
                        )}>
                            <div className={clsx(
                                "text-4xl font-black mb-2 uppercase",
                                feedback.result === 'correct' ? "text-green-600" : "text-red-600"
                            )}>
                                {feedback.result === 'correct' ? "Correct!" : "Mistake"}
                            </div>

                            <div className="text-slate-600 mb-4 font-medium">
                                <span className="block text-xs text-slate-400 mb-1">{currentHand.position} &bull; {currentHand.hand.hand}</span>
                                Your action: <span className="uppercase font-bold">{feedback.userAction === 'call' ? 'Limp' : feedback.userAction}</span>
                            </div>

                            {/* Helper for safe frequency display */}
                            <div className="space-y-2 bg-slate-100 p-4 rounded-xl text-slate-900">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-green-700">Raise</span>
                                    <span>{formatPct(feedback.frequencies?.raise)}%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-blue-700">Call (Limp)</span>
                                    <span>{formatPct(feedback.frequencies?.call)}%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-slate-700">Fold</span>
                                    <span>{formatPct(feedback.frequencies?.fold)}%</span>
                                </div>
                            </div>

                            {feedback.boundaryScore > 0.3 && (
                                <div className="mt-4 inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200">
                                    MIXED / BOUNDARY
                                </div>
                            )}

                            <div className="mt-6 text-xs text-slate-400">
                                Click anywhere or Press Space to continue
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
