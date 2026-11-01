'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Folder } from 'lucide-react';
import Providers from '@/components/core/Providers';
import { camps } from '@/lib/sessionData';

function SessionLibraryContent() {
    return (
        <div dir="ltr" className="min-h-screen bg-[#0B0B0C] text-white font-sans px-5 py-6 sm:px-8 sm:py-10">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <header className="mb-12 flex items-center justify-between sm:mb-16">
                    <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Home</span>
                    </Link>
                </header>

                {/* Hero Section */}
                <div className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
                    <h1 className="mb-5 text-4xl font-medium tracking-tight sm:text-6xl">
                        Training <span className="text-[#E8C15A]">Sessions</span>
                    </h1>
                </div>

                {/* Folder View */}
                <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {camps.filter(camp => camp.publicVisible !== false).map((group) => (
                        <Link
                            key={group.slug}
                            href={`/sessions/${group.slug}`}
                            className="group relative block w-full overflow-hidden rounded-[14px] border border-white/10 bg-[#16181b] text-left transition-colors hover:border-[#E8C15A]/50"
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
                                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                    <Folder className="h-12 w-12 text-white/25 transition-colors group-hover:text-[#E8C15A]" />
                                </div>
                            </div>

                            <div className="p-5 sm:p-6">
                                <h3 className="mb-3 text-xl font-medium text-white transition-colors group-hover:text-[#E8C15A]">
                                    {group.title}
                                </h3>
                                <p className="mb-6 min-h-[40px] line-clamp-2 text-sm leading-6 text-white/60">
                                    {group.description}
                                </p>
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex gap-4 text-xs text-white/40 font-mono">
                                        <span className="flex items-center gap-1.5">
                                            {group.sessions.length} Session{group.sessions.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <span className="flex items-center gap-2 text-sm font-medium text-[#E8C15A] transition-colors group-hover:text-[#F0CE76]">
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
