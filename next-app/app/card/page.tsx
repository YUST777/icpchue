'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    IdCard,
    UploadCloud,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ShieldCheck,
    X,
    FileText,
    ArrowRight
} from 'lucide-react';

export default function CardUploadPage() {
    const [studentId, setStudentId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        if (selected.size > 5 * 1024 * 1024) {
            setError('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت).');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!validTypes.includes(selected.type.toLowerCase())) {
            setError('صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP.');
            return;
        }

        setError(null);
        setFile(selected);
        setPreviewUrl(URL.createObjectURL(selected));
    };

    const handleRemoveFile = () => {
        setFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const cleanSid = studentId.replace(/\D/g, '').trim();
        if (!cleanSid || cleanSid.length < 5 || cleanSid.length > 12) {
            setError('يرجى إدخال كود الطالب / الرقم الجامعي بشكل صحيح (مثال: 8251234).');
            return;
        }

        if (!file) {
            setError('يرجى اختيار أو التقاط صورة الكارنيه.');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('student_id', cleanSid);
            formData.append('card', file);

            const res = await fetch('/api/card', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'حدث خطأ أثناء الرفع. يرجى المحاولة مرة أخرى.');
                setLoading(false);
                return;
            }

            setSuccess(true);
            setLoading(false);
        } catch {
            setError('تعذر الاتصال بالسيرفر. يرجى التحقق من اتصالك بالإنترنت.');
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStudentId('');
        handleRemoveFile();
        setError(null);
        setSuccess(false);
    };

    return (
        <div className="min-h-screen bg-[#0D0D11] text-white flex flex-col justify-between selection:bg-[#E8C15A]/30 selection:text-[#E8C15A] relative overflow-hidden">
            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-[#E8C15A]/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[400px] bg-blue-500/5 rounded-full blur-[130px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group transition-opacity hover:opacity-90">
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-white/5 border border-white/10 p-1 flex items-center justify-center">
                        <Image
                            src="/images/horus-logo.png"
                            alt="ICPC HUE"
                            width={32}
                            height={32}
                            className="object-contain"
                            priority
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold tracking-tight text-sm text-white/95">ICPC HUE</span>
                        <span className="text-[11px] text-white/40 font-mono -mt-0.5">ID Verification Portal</span>
                    </div>
                </Link>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-white/60">
                    <ShieldCheck size={14} className="text-[#E8C15A]" />
                    <span>256-Bit Encrypted</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-md">
                    {success ? (
                        <div className="bg-[#16161C]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-5">
                                <CheckCircle2 size={36} />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight mb-2">تم رفع الكارنيه بنجاح!</h2>
                            <p className="text-sm text-white/60 leading-relaxed mb-6">
                                تم حفظ الصورة بأمان وتشفيرها داخل السحابة وربطها برقمك الجامعي ({studentId}).
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={resetForm}
                                    className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-all border border-white/10"
                                >
                                    رفع كارنيه آخر
                                </button>
                                <Link
                                    href="/"
                                    className="w-full py-3 px-4 rounded-xl bg-[#E8C15A] hover:bg-[#d4af4a] text-black font-semibold text-sm transition-all text-center flex items-center justify-center gap-2"
                                >
                                    <span>العودة للرئيسية</span>
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#16161C]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                            {/* Card Accent Top Bar */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E8C15A] to-transparent" />

                            <div className="mb-6 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#E8C15A]/10 border border-[#E8C15A]/20 text-[#E8C15A] mb-3">
                                    <IdCard size={24} />
                                </div>
                                <h1 className="text-xl font-bold tracking-tight text-white">توثيق كارنيه الطالب</h1>
                                <p className="text-xs text-white/50 mt-1.5">
                                    قم بإدخال كود الطالب الخاص بك ورفع صورة واضحة للكارنيه
                                </p>
                            </div>

                            {error && (
                                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Student ID Input */}
                                <div>
                                    <label className="block text-xs font-semibold text-white/80 mb-2">
                                        كود الطالب (Horus ID) <span className="text-[#E8C15A]">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            dir="ltr"
                                            placeholder="مثال: 8251234"
                                            value={studentId}
                                            onChange={(e) => setStudentId(e.target.value.replace(/[^0-9]/g, ''))}
                                            maxLength={10}
                                            required
                                            className="w-full px-4 py-3 bg-[#1A1A22] border border-white/10 rounded-xl text-white text-sm font-mono placeholder:text-white/30 focus:outline-none focus:border-[#E8C15A] focus:ring-1 focus:ring-[#E8C15A] transition-all"
                                        />
                                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-white/30">
                                            HUE
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-white/40 mt-1.5">
                                        الرقم الجامعي المطبوع على الكارنيه أو إشعار القيد.
                                    </p>
                                </div>

                                {/* Card Photo Upload Dropzone */}
                                <div>
                                    <label className="block text-xs font-semibold text-white/80 mb-2">
                                        صورة الكارنيه <span className="text-[#E8C15A]">*</span>
                                    </label>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/jpg"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="card-upload-input"
                                    />

                                    {!file ? (
                                        <label
                                            htmlFor="card-upload-input"
                                            className="cursor-pointer flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/15 hover:border-[#E8C15A]/60 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all group text-center"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-[#E8C15A]/10 text-white/60 group-hover:text-[#E8C15A] flex items-center justify-center mb-3 transition-colors">
                                                <UploadCloud size={24} />
                                            </div>
                                            <span className="text-xs font-medium text-white/90 group-hover:text-white">
                                                اضغط هنا لاختيار أو تصوير الكارنيه
                                            </span>
                                            <span className="text-[11px] text-white/40 mt-1">
                                                JPG, PNG, WebP (بحد أقصى 5 ميجابايت)
                                            </span>
                                        </label>
                                    ) : (
                                        <div className="relative border border-white/15 rounded-xl p-3 bg-white/[0.02] overflow-hidden">
                                            {previewUrl && (
                                                <div className="relative w-full h-44 rounded-lg overflow-hidden bg-black/40 mb-3 border border-white/10">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={previewUrl}
                                                        alt="Card preview"
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2 overflow-hidden text-white/70">
                                                    <FileText size={16} className="text-[#E8C15A] shrink-0" />
                                                    <span className="truncate font-mono">{file.name}</span>
                                                    <span className="text-white/40 shrink-0">
                                                        ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveFile}
                                                    className="p-1 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors shrink-0"
                                                    title="إلغاء الملف"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Security Notice */}
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5 text-[11px] text-white/50">
                                    <ShieldCheck size={16} className="text-[#E8C15A] shrink-0" />
                                    <span>يتم تخزين بياناتك بصورة مشفرة على Supabase Storage ولن تظهر للعامة.</span>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading || !file || !studentId}
                                    className="w-full py-3 px-4 rounded-xl bg-[#E8C15A] hover:bg-[#d4af4a] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-black font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#E8C15A]/10"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>جاري الرفع والتشفير...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>رفع وتوثيق الكارنيه</span>
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-4 text-center text-[11px] font-mono text-white/30">
                ICPC Horus University Community &bull; Secure Storage Bucket &bull; 2026
            </footer>
        </div>
    );
}
