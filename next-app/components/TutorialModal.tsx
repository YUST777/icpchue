'use client';

import React from 'react';
import { X, PlayCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
    const handleClose = () => {
        onClose();
    };



    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#d59928]/10 flex items-center justify-center flex-shrink-0">
                                    <PlayCircle className="text-[#d59928]" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">
                                        Welcome to ICPC HUE
                                    </h2>
                                    <p className="text-white/60 text-sm">
                                        Quick guide to accessing your account and training materials.
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
                                src="https://www.youtube.com/embed/mhcmiVfol90?autoplay=1"
                                title="Login Tutorial"
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
                                I understand
                                <CheckCircle size={18} />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
