'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Folder } from 'lucide-react';
import Providers from '@/components/Providers';
import { camps } from '@/lib/sessionData';

function SessionLibraryContent() {
    return (
        <div dir="ltr" className="min-h-screen bg-black text-white font-sans p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-12 sm:mb-16">
                    <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Home</span>
                    </Link>
                </header>

                {/* Hero Section */}
                <div className="mb-12 md:mb-16 text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight">
                        Training <span className="text-[#d59928]">Sessions</span>
                    </h1>
                </div>

                {/* Folder View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {camps.filter(camp => camp.publicVisible !== false).map((group) => (
                        <Link
                            key={group.slug}
                            href={`/sessions/${group.slug}`}
                            className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#d59928]/50 transition-all duration-300 hover:-translate-y-1 text-left w-full block"
                        >
                            <div className="aspect-video relative overflow-hidden bg-[#1a1a1a]">
                                {group.image && (
                                    <Image
                                        src={group.image}
                                        alt={group.title}
                                        fill
                                        className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/50 to-[#050505]/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <Folder className="w-12 h-12 text-white/20 group-hover:text-[#d59928] transition-colors" />
                                </div>
                            </div>

                            <div className="p-6">
                                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-[#d59928] transition-colors">
                                    {group.title}
                                </h3>
                                <p className="text-white/60 text-sm mb-6 line-clamp-2 min-h-[40px]">
                                    {group.description}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex gap-4 text-xs text-white/40 font-mono">
                                        <span className="flex items-center gap-1.5">
                                            {group.sessions.length} Session{group.sessions.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <span className="flex items-center gap-2 text-sm text-[#d59928] font-medium group-hover:translate-x-1 transition-transform">
                                        Open Folder <ArrowRight className="w-4 h-4" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function SessionLibrary() {
    return <Providers><SessionLibraryContent /></Providers>;
}
