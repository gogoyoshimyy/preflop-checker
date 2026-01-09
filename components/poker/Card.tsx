import clsx from 'clsx';
import React from 'react';

type Suit = 's' | 'h' | 'd' | 'c';
type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

interface CardProps {
    cardStr?: string; // e.g. "Ah", "Td"
    rank?: Rank;
    suit?: Suit;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const suitSymbols: Record<Suit, string> = {
    s: '♠',
    h: '♥',
    d: '♦',
    c: '♣',
};

const suitColors: Record<Suit, string> = {
    s: 'text-slate-900', // Black
    h: 'text-red-600',   // Red
    d: 'text-blue-600',  // Blue
    c: 'text-green-600', // Green
};

export const Card: React.FC<CardProps> = ({ cardStr, rank, suit, className, size = 'lg' }) => {
    let r = rank;
    let s = suit;

    if (cardStr && cardStr.length === 2) {
        r = cardStr[0] as Rank;
        s = cardStr[1].toLowerCase() as Suit;
    }

    if (!r || !s) return null;

    const baseClasses = "flex flex-col items-center justify-center bg-white border-2 rounded-lg shadow-md font-bold select-none";
    const sizeClasses = {
        sm: "w-10 h-14 text-sm border-gray-300",
        md: "w-16 h-24 text-xl border-gray-300",
        lg: "w-24 h-36 text-4xl border-gray-400",
        xl: "w-32 h-48 text-6xl border-gray-400",
    };

    return (
        <div className={clsx(baseClasses, sizeClasses[size], className)}>
            <span className={clsx("leading-none", suitColors[s])}>
                {r}
                <span className="block text-[0.6em]">{suitSymbols[s]}</span>
            </span>
        </div>
    );
};
