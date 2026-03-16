'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu, Share2,
    User, X, ArrowUpRight,
    ChevronRight, Languages
} from 'lucide-react';
import {
    SiFacebook, SiInstagram, SiX,
    SiTelegram, SiTiktok
} from 'react-icons/si';
import { FaLinkedin } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { translations } from '@/lib/translations';

const socialLinks = [
    { name: 'Facebook', url: 'https://www.facebook.com/icpchue/', icon: SiFacebook, color: '#1877F2' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/icpchue/', icon: FaLinkedin, color: '#0A66C2' },
    { name: 'Instagram', url: 'https://www.instagram.com/icpchue/', icon: SiInstagram, color: '#E4405F' },
    { name: 'X (Twitter)', url: 'https://x.com/ICPCHUE', icon: SiX, color: '#FFFFFF' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@icpchue', icon: SiTiktok, color: '#00F2EA' },
    { name: 'Telegram', url: 'https://t.me/ICPCHUE', icon: SiTelegram, color: '#26A5E4' },
];

/**
 * NAVBAR COMPONENT
 */
export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [socialOpen, setSocialOpen] = useState(false);

    const { language, toggleLanguage } = useLanguage();
    const { isAuthenticated, loading } = useAuth();

    const isAr = language === 'ar';
    const t = translations[language].nav;

    useEffect(() => {
        if (socialOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
    }, [socialOpen]);

    // Handle Login Click - if user is not authenticated, redirect to login page is handled by Link wrapper or router
    // But here we just use Link component for navigation.

    const iconProps = {
        size: 20,
        strokeWidth: 1.5,
        className: "transition-all duration-300"
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 w-full px-4 pt-4 md:px-6 md:pt-6 font-sans antialiased">
            <div className="mx-auto max-w-7xl">
                <div className={`relative backdrop-blur-3xl bg-black/40 border border-white/10 rounded-[24px] shadow-2xl transition-all duration-500 ${open ? 'rounded-b-none' : ''}`}>
                    <div className="flex items-center justify-between px-5 py-3 md:px-8 md:py-4">

                        {/* Logo Section */}
                        <Link href="/" className="flex items-center gap-4 shrink-0 group cursor-pointer">
                            <div className="relative w-10 h-10 drop-shadow-sm flex items-center justify-center">
                                <Image
                                    src="/icons/icpchue.svg"
                                    alt="ICPC HUE Logo"
                                    width={40}
                                    height={40}
                                    className="w-10 h-10"
                                    style={{ filter: 'drop-shadow(0 0 8px rgba(232, 193, 90, 0.3))' }}
                                />
                            </div>
                            <div className="flex flex-col justify-center h-10">
                                <span className="text-white font-black text-xl leading-none tracking-tight group-hover:text-[#E8C15A] transition-colors">ICPC HUE</span>
                                <span className={`text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] leading-none mt-1.5 ${isAr ? 'text-right' : 'text-left'}`}>University of Hue</span>
                            </div>
                        </Link>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center gap-6" dir={isAr ? 'rtl' : 'ltr'}>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleLanguage}
                                    className="group relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white/70 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                                >
                                    <Languages {...iconProps} className="text-[#E8C15A]" />
                                    <span className="text-sm font-bold tracking-wide">{t.switchLang}</span>
                                </button>

                                <button
                                    onClick={() => setSocialOpen(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white/80 hover:text-white hover:bg-white/10 transition-all border border-white/5 hover:border-white/20"
                                >
                                    <Share2 {...iconProps} size={18} />
                                    <span>{t.socials}</span>
                                </button>

                                <div className="w-px h-8 bg-white/10 mx-3" />

                                {loading ? (
                                    <div className="bg-white/10 animate-pulse px-8 py-3 rounded-2xl w-[120px] h-[48px]" />
                                ) : isAuthenticated ? (
                                    <Link href="/dashboard" className="flex items-center gap-2 bg-[#E8C15A] hover:bg-white hover:text-black text-black px-6 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl shadow-[#E8C15A]/10">
                                        <User {...iconProps} size={18} strokeWidth={2} />
                                        <span>{t.profile}</span>
                                    </Link>
                                ) : (
                                    <Link
                                        href="/login"
                                        className="group flex items-center gap-2 bg-[#E8C15A] hover:bg-white text-black px-8 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl shadow-[#E8C15A]/10"
                                    >
                                        <span>{t.login}</span>
                                        <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <div className="flex md:hidden items-center">
                            <button
                                onClick={() => setOpen(!open)}
                                className={`p-3 rounded-2xl transition-all duration-300 ${open ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={open ? 'close' : 'open'}
                                        initial={{ opacity: 0, rotate: -45 }}
                                        animate={{ opacity: 1, rotate: 0 }}
                                        exit={{ opacity: 0, rotate: 45 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {open ? <X size={24} /> : <Menu size={24} />}
                                    </motion.div>
                                </AnimatePresence>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu (Animated Dropdown) */}
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="md:hidden border-t border-white/5 overflow-hidden bg-black/40 backdrop-blur-xl"
                            >
                                <div className="px-5 py-8 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => { toggleLanguage(); setOpen(false); }}
                                            className="flex flex-col items-center justify-center gap-3 p-6 rounded-[24px] bg-white/5 border border-white/5 text-white/80 active:bg-[#E8C15A]/10 active:border-[#E8C15A]/30 transition-all"
                                        >
                                            <Languages size={24} className="text-[#E8C15A]" />
                                            <span className="font-bold text-xs uppercase tracking-widest">{t.switchLang}</span>
                                        </button>
                                        <button
                                            onClick={() => { setSocialOpen(true); setOpen(false); }}
                                            className="flex flex-col items-center justify-center gap-3 p-6 rounded-[24px] bg-white/5 border border-white/5 text-white/80 active:bg-[#E8C15A]/10 active:border-[#E8C15A]/30 transition-all"
                                        >
                                            <Share2 size={24} className="text-[#E8C15A]" />
                                            <span className="font-bold text-xs uppercase tracking-widest">{t.socialMedia}</span>
                                        </button>
                                    </div>

                                    {loading ? (
                                        <div className="w-full h-[68px] bg-white/10 animate-pulse rounded-[24px]" />
                                    ) : isAuthenticated ? (
                                        <Link
                                            href="/dashboard"
                                            className="w-full flex items-center justify-center gap-3 bg-[#E8C15A] text-black p-5 rounded-[24px] font-black uppercase tracking-tighter text-lg"
                                        >
                                            <User size={20} strokeWidth={2.5} />
                                            {t.profile}
                                        </Link>
                                    ) : (
                                        <Link
                                            href="/login"
                                            className="w-full flex items-center justify-center gap-3 bg-[#E8C15A] text-black p-5 rounded-[24px] font-black uppercase tracking-tighter text-lg"
                                        >
                                            <User size={20} strokeWidth={2.5} />
                                            {t.login}
                                        </Link>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Side Hub Overlay */}
            <AnimatePresence>
                {socialOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSocialOpen(false)}
                        />
                        <motion.div
                            className={`fixed right-0 top-0 h-full w-[85vw] md:w-[30vw] bg-[#080808] z-[101] border-l border-white/5 shadow-[0_0_100px_rgba(0,0,0,1)] p-8 flex flex-col`}
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 35, stiffness: 400 }}
                            dir={isAr ? 'rtl' : 'ltr'}
                        >
                            <div className="flex items-center justify-between mb-12">
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{t.connect}</h3>
                                    <p className="text-sm text-white/40 font-medium">{t.tagline}</p>
                                </div>
                                <button
                                    onClick={() => setSocialOpen(false)}
                                    className="p-4 rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {socialLinks.map((social, index) => {
                                    const Icon = social.icon;
                                    return (
                                        <motion.a
                                            key={social.name}
                                            href={social.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="group flex items-center justify-between p-5 rounded-[24px] bg-white/[0.02] border border-white/5 hover:border-[#E8C15A]/40 hover:bg-[#E8C15A]/5 transition-all"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div
                                                    className="p-3.5 rounded-2xl bg-white/5 group-hover:bg-[#E8C15A] transition-all duration-500"
                                                    style={{ color: social.color }}
                                                >
                                                    <Icon size={24} className="group-hover:text-black group-hover:scale-110 transition-transform" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-white text-lg tracking-tight leading-none group-hover:text-[#E8C15A] transition-colors">{social.name}</h4>
                                                    <p className="text-xs text-white/30 font-bold mt-1.5 uppercase tracking-widest">{social.name === 'X (Twitter)' ? '@ICPCHUE' : 'ICPC HUE'}</p>
                                                </div>
                                            </div>
                                            <div className="p-2 rounded-full opacity-0 group-hover:opacity-100 group-hover:bg-white/10 transition-all -translate-x-4 group-hover:translate-x-0">
                                                {isAr ? <ChevronRight size={20} className="rotate-180" /> : <ChevronRight size={20} />}
                                            </div>
                                        </motion.a>
                                    );
                                })}
                            </div>

                            <div className="mt-10 pt-10 border-t border-white/5 flex flex-col items-center gap-4">
                                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest text-center">
                                    © 2026 Innovation Hub · ICPC Regionals
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </header>
    );
}
