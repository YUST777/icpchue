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
import { translations } from '@/lib/utils/translations';
import { Skeleton } from '@/components/ui/Skeleton';

const socialLinks = [
    { name: 'Facebook', url: 'https://www.facebook.com/icpchue/', icon: SiFacebook },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/icpchue/', icon: FaLinkedin },
    { name: 'Instagram', url: 'https://www.instagram.com/icpchue/', icon: SiInstagram },
    { name: 'X (Twitter)', url: 'https://x.com/ICPCHUE', icon: SiX },
    { name: 'TikTok', url: 'https://www.tiktok.com/@icpchue', icon: SiTiktok },
    { name: 'Telegram', url: 'https://t.me/ICPCHUE', icon: SiTelegram },
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
        if (!socialOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setSocialOpen(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [socialOpen]);

    // Handle Login Click - if user is not authenticated, redirect to login page is handled by Link wrapper or router
    // But here we just use Link component for navigation.

    const iconProps = {
        size: 20,
        strokeWidth: 1.5,
        className: "transition-colors duration-150"
    };

    return (
        <header className="fixed inset-x-0 top-0 z-50 w-full px-4 pt-4 md:px-6 md:pt-6 font-sans antialiased">
            <div className="mx-auto max-w-7xl">
                <div className={`relative rounded-2xl border border-white/10 bg-[#0f1012]/95 shadow-[0_8px_24px_rgba(0,0,0,0.24)] backdrop-blur-md ${open ? 'rounded-b-none' : ''}`}>
                    <div className="flex items-center justify-between px-5 py-3 md:px-8 md:py-4">

                        {/* Logo Section */}
                        <Link href="/" className="flex items-center gap-4 shrink-0 group cursor-pointer">
                            <div className="relative flex h-10 w-10 items-center justify-center">
                                <Image
                                    src="/icons/icpchue.svg"
                                    alt="ICPC HUE Logo"
                                    width={40}
                                    height={40}
                                    className="w-10 h-10"
                                />
                            </div>
                            <div className="flex flex-col justify-center h-10">
                                <span className="text-white text-lg font-semibold leading-none tracking-tight group-hover:text-[#E8C15A] transition-colors">ICPC HUE</span>
                                <span className={`mt-1.5 text-[10px] text-white/45 font-medium tracking-[0.16em] leading-none ${isAr ? 'text-right' : 'text-left'}`}>Horus University</span>
                            </div>
                        </Link>

                        {/* Desktop Actions */}
                        <div className="hidden md:flex items-center gap-6" dir={isAr ? 'rtl' : 'ltr'}>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleLanguage}
                                    className="group relative flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-white/70 transition-colors hover:bg-white/5 hover:text-white hover:border-white/10"
                                >
                                    <Languages {...iconProps} className="text-[#E8C15A]" />
                                    <span className="text-sm font-bold tracking-wide">{t.switchLang}</span>
                                </button>

                                <button
                                    onClick={() => setSocialOpen(true)}
                                    className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
                                >
                                    <Share2 {...iconProps} size={18} />
                                    <span>{t.socials}</span>
                                </button>

                                <div className="w-px h-8 bg-white/10 mx-3" />

                                {loading ? (
                                    <Skeleton className="w-[120px] h-[48px] rounded-2xl" />
                                ) : isAuthenticated ? (
                                    <Link href="/dashboard" className="flex items-center gap-2 rounded-lg bg-[#E8C15A] px-5 py-2.5 text-black text-sm font-semibold transition-colors hover:bg-[#F0CE76]">
                                        <User {...iconProps} size={18} strokeWidth={2} />
                                        <span>{t.profile}</span>
                                    </Link>
                                ) : (
                                    <Link
                                        href="/login"
                                        className="group flex items-center gap-2 rounded-lg bg-[#E8C15A] px-5 py-2.5 text-black text-sm font-semibold transition-colors hover:bg-[#F0CE76]"
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
                                    aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
                                    aria-expanded={open}
                                    aria-controls="mobile-navigation-menu"
                                className={`rounded-lg p-2.5 transition-colors ${open ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
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
                                id="mobile-navigation-menu"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="md:hidden overflow-hidden border-t border-white/10 bg-[#0f1012]"
                            >
                                <div className="space-y-4 px-5 py-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => { toggleLanguage(); setOpen(false); }}
                                            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 p-5 text-white/80 transition-colors active:bg-[#E8C15A]/10 active:border-[#E8C15A]/30"
                                        >
                                            <Languages size={24} className="text-[#E8C15A]" />
                                            <span className="text-xs font-medium">{t.switchLang}</span>
                                        </button>
                                        <button
                                            onClick={() => { setSocialOpen(true); setOpen(false); }}
                                            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 p-5 text-white/80 transition-colors active:bg-[#E8C15A]/10 active:border-[#E8C15A]/30"
                                        >
                                            <Share2 size={24} className="text-[#E8C15A]" />
                                            <span className="text-xs font-medium">{t.socialMedia}</span>
                                        </button>
                                    </div>

                                    {loading ? (
                                        <Skeleton className="w-full h-[68px] rounded-[24px]" />
                                    ) : isAuthenticated ? (
                                        <Link
                                            href="/dashboard"
                                            className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#E8C15A] p-4 text-black text-base font-semibold"
                                        >
                                            <User size={20} strokeWidth={2.5} />
                                            {t.profile}
                                        </Link>
                                    ) : (
                                        <Link
                                            href="/login"
                                            className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#E8C15A] p-4 text-black text-base font-semibold"
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

            {/* Social links drawer */}
            <AnimatePresence>
                {socialOpen && (
                    <>
                        <motion.button
                            type="button"
                            aria-label="Close social links"
                            className="fixed inset-0 z-[100] cursor-default bg-black/65"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSocialOpen(false)}
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="social-drawer-title"
                            className="fixed right-0 top-0 z-[101] flex h-[100dvh] w-full max-w-[420px] flex-col border-l border-white/10 bg-[#111214] p-5 sm:p-7"
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            dir={isAr ? 'rtl' : 'ltr'}
                        >
                            <div className="mb-8 flex items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <h3 id="social-drawer-title" className="text-2xl font-medium tracking-tight text-white">{t.connect}</h3>
                                    <p className="text-sm leading-6 text-white/50">{t.tagline}</p>
                                </div>
                                <button
                                    onClick={() => setSocialOpen(false)}
                                    aria-label="Close social links"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
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
                                            transition={{ delay: index * 0.025, duration: 0.16 }}
                                            className="group flex min-h-16 items-center justify-between rounded-[10px] border border-white/10 px-4 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white/[0.05] text-white/65 transition-colors group-hover:text-[#E8C15A]">
                                                    <Icon size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium leading-5 text-white transition-colors group-hover:text-[#E8C15A]">{social.name}</h4>
                                                    <p className="mt-0.5 text-xs text-white/45">{social.name === 'X (Twitter)' ? '@ICPCHUE' : 'ICPC HUE'}</p>
                                                </div>
                                            </div>
                                            <div className="text-white/35 transition-colors group-hover:text-white/70">
                                                {isAr ? <ChevronRight size={18} className="rotate-180" /> : <ChevronRight size={18} />}
                                            </div>
                                        </motion.a>
                                    );
                                })}
                            </div>

                            <div className="mt-6 border-t border-white/10 pt-5 text-center">
                                <p className="text-xs text-white/40">
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
