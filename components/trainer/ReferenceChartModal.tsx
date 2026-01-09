"use client";

import React, { useEffect, useState, useRef } from 'react';
import { db, ReferenceImage } from '@/lib/db';
import { Position } from '@/types/poker';
import { X, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface ReferenceChartModalProps {
    position: Position;
    isOpen: boolean;
    onClose: () => void;
}

export const ReferenceChartModal: React.FC<ReferenceChartModalProps> = ({ position, isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<ReferenceImage | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, position]);

    const loadData = async () => {
        setLoading(true);
        const img = await db.images.get(position);
        setImage(img || null);
        setLoading(false);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("Image too large. Max 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            const newImg: ReferenceImage = {
                id: position,
                dataUrl,
                updatedAt: Date.now()
            };
            await db.images.put(newImg);
            setImage(newImg);
        };
        reader.readAsDataURL(file);
    };

    const handleDelete = async () => {
        if (!confirm("Remove this chart?")) return;
        await db.images.delete(position);
        setImage(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-white">
            <div className="bg-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-slate-700">

                {/* Header */}
                <div className="p-4 bg-slate-800 flex justify-between items-center border-b border-slate-700">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <ImageIcon className="text-blue-400" />
                        <span>Reference Chart: <span className="text-yellow-400">{position.replace('RFI_', '')}</span></span>
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full">
                        <X />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-slate-950/50">
                    {loading ? (
                        <div>Loading...</div>
                    ) : image ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img src={image.dataUrl} alt="Strategy Chart" className="max-w-full max-h-full object-contain rounded shadow-lg" />
                        </div>
                    ) : (
                        <div className="text-center p-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-2xl w-full h-full flex flex-col items-center justify-center">
                            <ImageIcon size={48} className="mb-4 opacity-50" />
                            <p className="mb-4">No reference image uploaded for this position.</p>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-between">
                    <div className="flex gap-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium"
                        >
                            <Upload size={18} /> {image ? "Replace Image" : "Upload Image"}
                        </button>

                        {image && (
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-100 rounded font-medium"
                            >
                                <Trash2 size={18} /> Remove
                            </button>
                        )}
                    </div>

                    <button onClick={onClose} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded">
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};
