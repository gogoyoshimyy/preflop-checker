"use client";

import React, { useEffect, useState } from 'react';
import { db, UserSettings, Attempt, SRSItem } from '@/lib/db';
import { Position } from '@/types/poker';
import { POSITIONS } from '@/lib/poker-data';
import Link from 'next/link';
import { ArrowLeft, Trash2, Download, Upload } from 'lucide-react';
import clsx from 'clsx';

export default function SettingsPage() {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [history, setHistory] = useState<Attempt[]>([]);
    const [stats, setStats] = useState<{ correct: number, total: number }>({ correct: 0, total: 0 });

    const [srsCount, setSrsCount] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const s = await db.settings.get(1);
        if (s) setSettings(s);

        const h = await db.attempts.orderBy('timestamp').reverse().limit(100).toArray();
        setHistory(h);

        // Simple total stats
        const totalCount = await db.attempts.count(); // might be heavy if huge, but fine for local
        // For correct count we need a query or just iterate. Dexie doesn't have simple 'count where' efficient without index
        // We already have index on isCorrect? No.
        // Let's just use the loaded 100 for "Recent Stats" or skip global stats for now for speed.
        // Actually, let's just count all for now, assuming < 10k items.
        const all = await db.attempts.toArray();
        const correct = all.filter(a => a.isCorrect).length;
        setStats({ correct, total: all.length });

        const srs = await db.srsQueue.count();
        setSrsCount(srs);
    }

    const togglePosition = async (pos: Position) => {
        if (!settings) return;
        const current = settings.enabledPositions;
        const newPos = current.includes(pos)
            ? current.filter(p => p !== pos)
            : [...current, pos];

        // Ensure at least one is enabled? Or allow none (which breaks trainer)?
        // Better allow none but show warning in trainer.

        const newSettings = { ...settings, enabledPositions: newPos };
        setSettings(newSettings);
        await db.settings.put(newSettings);
    };

    const setMode = async (mode: 'boundary' | 'random' | 'review') => {
        if (!settings) return;
        const newSettings = { ...settings, mode };
        setSettings(newSettings);
        await db.settings.put(newSettings);
    };

    const clearHistory = async () => {
        if (!confirm("Are you sure? This deletes all history and SRS data.")) return;
        await db.attempts.clear();
        await db.srsQueue.clear();
        loadData();
    };

    const exportData = async () => {
        const exportObj = {
            settings: await db.settings.toArray(),
            attempts: await db.attempts.toArray(),
            srsQueue: await db.srsQueue.toArray(),
        };
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `poker-trainer-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    if (!settings) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
            <header className="mb-8 flex items-center gap-4">
                <Link href="/" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700">
                    <ArrowLeft />
                </Link>
                <h1 className="text-2xl font-bold">Settings & History</h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">

                {/* Settings Column */}
                <section className="space-y-8">
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-lg">
                        <h2 className="text-xl font-bold mb-4 text-yellow-400">Positions</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {POSITIONS.map(pos => (
                                <label key={pos} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={settings.enabledPositions.includes(pos)}
                                        onChange={() => togglePosition(pos)}
                                        className="w-5 h-5 accent-yellow-400 rounded"
                                    />
                                    <span>{pos.replace('RFI_', '')}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-2xl shadow-lg">
                        <h2 className="text-xl font-bold mb-4 text-purple-400">Training Mode</h2>
                        <div className="flex flex-col gap-3">
                            {[
                                { id: 'boundary', label: 'Boundary Focused (Default)', desc: 'Prioritizes hard/mixed hands.' },
                                { id: 'random', label: 'Random', desc: 'Completely random selection.' },
                                { id: 'review', label: 'Review Only', desc: 'Only SRS items due for review.' }
                            ].map(m => (
                                <label key={m.id} className={clsx(
                                    "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                    settings.mode === m.id ? "border-purple-500 bg-purple-500/10" : "border-slate-700 hover:border-slate-600"
                                )}>
                                    <input
                                        type="radio"
                                        name="mode"
                                        checked={settings.mode === m.id}
                                        onChange={() => setMode(m.id as any)}
                                        className="w-5 h-5 accent-purple-500"
                                    />
                                    <div>
                                        <div className="font-bold">{m.label}</div>
                                        <div className="text-xs text-slate-400">{m.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-2xl shadow-lg space-y-4">
                        <h2 className="text-xl font-bold mb-4 text-blue-400">Data Management</h2>
                        <div className="flex gap-4">
                            <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded hover:bg-slate-600">
                                <Download size={16} /> Export Backup
                            </button>
                            <button onClick={clearHistory} className="flex items-center gap-2 px-4 py-2 bg-red-900/50 text-red-200 rounded hover:bg-red-900">
                                <Trash2 size={16} /> Reset All Data
                            </button>
                        </div>
                    </div>
                </section>

                {/* History Column */}
                <section className="space-y-8">
                    <div className="bg-slate-800 p-6 rounded-2xl shadow-lg">
                        <h2 className="text-xl font-bold mb-4 text-green-400">Performance</h2>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-slate-700/50 p-4 rounded-xl text-center">
                                <div className="text-3xl font-bold">{stats.total}</div>
                                <div className="text-xs text-slate-400 uppercase">Hands Played</div>
                            </div>
                            <div className="bg-slate-700/50 p-4 rounded-xl text-center">
                                <div className={clsx("text-3xl font-bold", (stats.correct / stats.total) > 0.9 ? "text-green-400" : "text-yellow-400")}>
                                    {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
                                </div>
                                <div className="text-xs text-slate-400 uppercase">Accuracy</div>
                            </div>
                            <div className="bg-slate-700/50 p-4 rounded-xl text-center col-span-2">
                                <div className="text-xl font-bold">{srsCount}</div>
                                <div className="text-xs text-slate-400 uppercase">Items in SRS Queue</div>
                            </div>
                        </div>

                        <h3 className="font-bold mb-2 text-slate-300">Recent History</h3>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {history.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border-l-4"
                                    style={{ borderColor: item.isCorrect ? '#22c55e' : '#ef4444' }}>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-yellow-500 w-8">{item.hand}</span>
                                        <span className="text-xs text-slate-400">{item.position.replace('RFI_', '')}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={clsx("uppercase text-xs font-bold", item.isCorrect ? "text-green-400" : "text-red-400")}>
                                            {item.userAction === 'call' ? 'LIMP' : item.userAction}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {history.length === 0 && <div className="text-center text-slate-500 py-4">No history yet</div>}
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
