'use client';

import React from 'react';
import { X, PlayCircle, CheckCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface DashboardTutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DashboardTutorialModal({ isOpen, onClose }: DashboardTutorialModalProps) {
    const handleClose = () => {
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end pr-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Card - Right positioned, smaller */}
                    <motion.div
                        initial={{ opacity: 0, x: 50, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 50, scale: 0.95 }}
                        className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#d59928]/10 flex items-center justify-center flex-shrink-0">
                                    <PlayCircle className="text-[#d59928]" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">
                                        Welcome to Your Dashboard
                                    </h2>
                                    <p className="text-white/60 text-sm">
                                        Quick guide on navigating and using your training dashboard.
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-xs font-mono border border-white/5">
                                            2 min
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="text-white/40 hover:text-white transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Video Content */}
                        <div className="relative aspect-video bg-black">
                            <iframe
                                width="100%"
                                height="100%"
                                src="https://www.youtube.com/embed/tH--wuGCMuM?autoplay=1"
                                title="Dashboard Tutorial"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0"
                            ></iframe>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-[#0a0a0a] flex justify-end">
                            <button
                                onClick={handleClose}
                                className="px-6 py-2.5 bg-[#d59928] hover:bg-[#c08820] text-black font-medium rounded-xl transition-all flex items-center gap-2"
                            >
                                Got it!
                                <CheckCircle size={18} />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
