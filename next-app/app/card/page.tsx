'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    UploadCloud,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    FileText,
    ArrowLeft
} from 'lucide-react';

// Downscale + re-encode in the browser so phone photos (often 4-10MB) fit
// under Vercel's 4.5MB request limit. Falls back to the original file if the
// browser can't decode it (e.g. HEIC on desktop Chrome).
async function compressImage(file: File, maxDim = 2000, quality = 0.85): Promise<File> {
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
        const w = Math.round(bitmap.width * scale);
        const h = Math.round(bitmap.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();
        const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
        if (!blob) return file;
        return new File([blob], 'national-id.jpg', { type: 'image/jpeg' });
    } catch {
        return file;
    }
}

export default function CardUploadPage() {
    const [studentId, setStudentId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [processing, setProcessing] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        if (selected.type && !selected.type.toLowerCase().startsWith('image/')) {
            setError('يرجى اختيار صورة فقط (JPG أو PNG أو WebP).');
            return;
        }

        setError(null);
        setProcessing(true);
        const compressed = await compressImage(selected);
        setProcessing(false);

        if (compressed.size > 4 * 1024 * 1024) {
            setError('حجم الصورة كبير جداً. يرجى التقاط صورة أصغر أو بصيغة JPG.');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!validTypes.includes(compressed.type.toLowerCase())) {
            setError('صيغة الصورة غير مدعومة. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP.');
            return;
        }

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(compressed);
        setPreviewUrl(URL.createObjectURL(compressed));
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
            setError('يرجى إدخال الرقم الجامعي بشكل صحيح (مثال: 8251234).');
            return;
        }

        if (!file) {
            setError('يرجى اختيار أو التقاط صورة البطاقة الشخصية.');
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
        <div dir="rtl" className="min-h-screen bg-[#0D0D11] text-white flex flex-col justify-between selection:bg-[#E8C15A]/30 selection:text-[#E8C15A] relative overflow-hidden font-sans">
            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-white/[0.02] rounded-full blur-[150px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group transition-opacity hover:opacity-90">
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-white/5 border border-white/10 p-1 flex items-center justify-center">
                        <Image
                            src="/icpchue-logo.webp"
                            alt="ICPC HUE"
                            width={32}
                            height={32}
                            className="object-contain"
                            priority
                        />
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="font-bold tracking-tight text-sm text-white/95">مجتمع حورس للبرمجة (ICPC HUE)</span>
                        <span className="text-[11px] text-white/40 -mt-0.5">منظومة توثيق الطلاب</span>
                    </div>
                </Link>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
                <div className="w-full max-w-3xl">
                    {success ? (
                        <div className="bg-[#16161C]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-12 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-w-lg mx-auto">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-5">
                                <CheckCircle2 size={36} />
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight mb-2">تم رفع البطاقة الشخصية بنجاح!</h2>
                            <p className="text-sm text-white/60 leading-relaxed mb-6">
                                تم حفظ الصورة بأمان وربطها برقمك الجامعي (<span dir="ltr" className="font-mono text-white">{studentId}</span>).
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={resetForm}
                                    className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-all border border-white/10"
                                >
                                    رفع بطاقة أخرى
                                </button>
                                <Link
                                    href="/"
                                    className="flex-1 py-3 px-4 rounded-xl bg-[#E8C15A] hover:bg-[#d4af4a] text-black font-semibold text-sm transition-all text-center flex items-center justify-center gap-2"
                                >
                                    <span>العودة للرئيسية</span>
                                    <ArrowLeft size={16} />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#16161C]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-9 shadow-2xl relative overflow-hidden">
                            <div className="mb-7 text-right border-b border-white/5 pb-5">
                                <h1 className="text-2xl font-bold tracking-tight text-white">توثيق البطاقة الشخصية</h1>
                                <p className="text-xs sm:text-sm text-white/50 mt-1">
                                    قم بإدخال الرقم الجامعي الخاص بك ورفع صورة واضحة للبطاقة الشخصية (الوجه الأمامي)
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 leading-relaxed text-right">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Student ID Input */}
                                <div className="text-right">
                                    <label className="block text-xs sm:text-sm font-semibold text-white/80 mb-2">
                                        الرقم الجامعي / كود الطالب <span className="text-[#E8C15A]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        dir="ltr"
                                        placeholder="مثال: 8251234"
                                        value={studentId}
                                        onChange={(e) => setStudentId(e.target.value.replace(/[^0-9]/g, ''))}
                                        maxLength={10}
                                        required
                                        className="w-full px-4 py-3 bg-[#1A1A22] border border-white/10 rounded-xl text-white text-sm font-mono placeholder:text-white/30 focus:outline-none focus:border-[#E8C15A] focus:ring-1 focus:ring-[#E8C15A] transition-all text-right"
                                    />
                                    <p className="text-[11px] text-white/40 mt-1.5">
                                        الرقم الجامعي المطبوع على الكارنيه أو إشعار القيد.
                                    </p>
                                </div>

                                {/* Wide 2-Column Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                                    {/* Column 1: Example Guide */}
                                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between text-right">
                                        <div>
                                            <div className="flex items-center justify-between mb-2.5">
                                                <span className="text-xs font-medium text-white/80">
                                                    شكل البطاقة المطلوبة (الوجه الأمامي):
                                                </span>
                                                <span className="text-[10px] text-[#E8C15A] font-medium px-2 py-0.5 rounded bg-[#E8C15A]/10 border border-[#E8C15A]/20">
                                                    مثال توضيحي
                                                </span>
                                            </div>
                                            <div className="relative w-full h-44 rounded-lg overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center p-2">
                                                <Image
                                                    src="/images/egyptian-id-example.png"
                                                    alt="مثال البطاقة الشخصية المصرية"
                                                    width={600}
                                                    height={375}
                                                    className="w-full h-full object-contain"
                                                    priority
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-white/40 mt-3 text-center leading-relaxed">
                                            تأكد من وضوح الصورة وظهور الرقم القومي والاسم بالكامل دون انعكاس إضاءة.
                                        </p>
                                    </div>

                                    {/* Column 2: Upload Dropzone */}
                                    <div className="flex flex-col justify-between text-right">
                                        <div className="h-full flex flex-col">
                                            <label className="block text-xs sm:text-sm font-semibold text-white/80 mb-2">
                                                صورة البطاقة الشخصية <span className="text-[#E8C15A]">*</span>
                                            </label>

                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="card-upload-input"
                                            />

                                            {!file ? (
                                                <label
                                                    htmlFor="card-upload-input"
                                                    className="cursor-pointer flex-1 min-h-[176px] flex flex-col items-center justify-center p-5 border-2 border-dashed border-white/15 hover:border-[#E8C15A]/60 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all group text-center"
                                                >
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-[#E8C15A]/10 text-white/60 group-hover:text-[#E8C15A] flex items-center justify-center mb-3 transition-colors">
                                                        <UploadCloud size={24} />
                                                    </div>
                                                    <span className="text-xs sm:text-sm font-medium text-white/90 group-hover:text-white">
                                                        {processing ? 'جاري تجهيز الصورة...' : 'اضغط هنا لاختيار أو تصوير البطاقة'}
                                                    </span>
                                                    <span className="text-[11px] text-white/40 mt-1">
                                                        JPG أو PNG أو WebP
                                                    </span>
                                                </label>
                                            ) : (
                                                <div className="flex-1 flex flex-col justify-between border border-white/15 rounded-xl p-3 bg-white/[0.02] overflow-hidden">
                                                    {previewUrl && (
                                                        <div className="relative w-full h-36 rounded-lg overflow-hidden bg-black/40 mb-2 border border-white/10">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={previewUrl}
                                                                alt="معاينة البطاقة الشخصية"
                                                                className="w-full h-full object-contain"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between text-xs pt-1">
                                                        <div className="flex items-center gap-2 overflow-hidden text-white/70">
                                                            <FileText size={16} className="text-[#E8C15A] shrink-0" />
                                                            <span className="truncate font-mono" dir="ltr">{file.name}</span>
                                                            <span className="text-white/40 shrink-0 font-mono" dir="ltr">
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
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading || processing || !file || !studentId}
                                    className="w-full py-3.5 px-5 rounded-xl bg-[#E8C15A] hover:bg-[#d4af4a] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-black font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#E8C15A]/10 mt-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>جاري الرفع...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>رفع وتوثيق البطاقة الشخصية</span>
                                            <ArrowLeft size={16} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
