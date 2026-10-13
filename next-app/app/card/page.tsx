import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

export default function CardUploadPage() {
    return (
        <div dir="rtl" className="min-h-screen bg-[#0D0D11] text-white flex flex-col justify-center items-center px-4 py-10 selection:bg-[#E8C15A]/30 selection:text-[#E8C15A] relative overflow-hidden font-sans">
            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-white/[0.02] rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-md bg-[#16161C]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-2xl bg-[#E8C15A]/10 border border-[#E8C15A]/20 text-[#E8C15A] mx-auto flex items-center justify-center mb-5">
                    <CheckCircle2 size={36} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-2">تم إغلاق باب التوثيق</h1>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
                    شكراً لكم، تم اكتمال العدد المطلوب وإغلاق استقبال البطاقات الشخصية بنجاح.
                </p>
                <Link
                    href="/"
                    className="w-full py-3.5 px-4 rounded-xl bg-[#E8C15A] hover:bg-[#d4af4a] text-black font-semibold text-sm transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-[#E8C15A]/10"
                >
                    <span>العودة للرئيسية</span>
                    <ArrowLeft size={16} />
                </Link>
            </div>
        </div>
    );
}
