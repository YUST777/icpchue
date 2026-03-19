'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import { SiFacebook, SiTelegram } from 'react-icons/si';
import { FaLinkedin } from 'react-icons/fa';

export default function Footer() {
    const { language } = useLanguage();
    const t = translations[language].footer;

    return (
        <footer className="border-t border-white/10 bg-black pt-16 pb-8">
            <div className="mx-auto max-w-7xl px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-2 md:col-span-1 text-center md:text-left">
                        <h3 className="text-white font-bold text-lg mb-4">ICPC HUE</h3>
                        <p className="text-white/60 text-sm leading-relaxed mb-6">
                            The premier competitive programming community at Horus University.
                        </p>
                        {/* Social Links */}
                        <div className="flex justify-center md:justify-start gap-6">
                            <a href="https://www.facebook.com/icpchue/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-[#1877F2] transition-colors"><SiFacebook size={20} /></a>
                            <a href="https://www.linkedin.com/in/icpchue/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-[#0A66C2] transition-colors"><FaLinkedin size={20} /></a>
                            <a href="https://t.me/ICPCHUE" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-[#26A5E4] transition-colors"><SiTelegram size={20} /></a>
                        </div>
                    </div>

                    <div className="text-center md:text-left">
                        <h4 className="text-white font-bold mb-4">Platform</h4>
                        <ul className="space-y-2 text-sm text-white/60">
                            <li><Link href="/" className="hover:text-[#E8C15A] transition-colors">Home</Link></li>
                            <li><Link href="/sessions" className="hover:text-[#E8C15A] transition-colors">Sessions</Link></li>
                            <li><Link href="/login" className="hover:text-[#E8C15A] transition-colors">Login</Link></li>
                        </ul>
                    </div>

                    <div className="text-center md:text-left">
                        <h4 className="text-white font-bold mb-4">Resources</h4>
                        <ul className="space-y-2 text-sm text-white/60">
                            <li><Link href="/devlog" className="hover:text-[#E8C15A] transition-colors">Development Log</Link></li>
                            <li><Link href="/apply" className="hover:text-[#E8C15A] transition-colors">Apply Now</Link></li>
                            <li><Link href="/sitemap.xml" className="hover:text-[#E8C15A] transition-colors">Sitemap</Link></li>
                        </ul>
                    </div>

                    <div className="text-center md:text-left">
                        <h4 className="text-white font-bold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-white/60">
                            <li><Link href="/security.txt" className="hover:text-[#E8C15A] transition-colors">Security</Link></li>
                            <li><Link href="/privacy" className="hover:text-[#E8C15A] transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-[#E8C15A] transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-xs">
                    <p>© 2026 {t.copyright}</p>
                    <p className="text-center md:text-right max-w-md">
                        This is a student-led competitive programming community at Horus University, Egypt.
                        ICPC HUE is not affiliated with, endorsed by, or the official global ICPC organization (icpc.global).
                    </p>
                </div>
            </div>
        </footer>
    );
}
