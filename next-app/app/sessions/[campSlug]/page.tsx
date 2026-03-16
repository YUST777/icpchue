import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Play, FileText } from 'lucide-react';
import Providers from '@/components/Providers';
import { camps } from '@/lib/sessionData';

async function CampSessionsContent({ params }: { params: Promise<{ campSlug: string }> }) {
    const { campSlug } = await params;
    const camp = camps.find(c => c.slug === campSlug);

    if (!camp) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-12 sm:mb-16">
                    <Link href="/sessions" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Sessions</span>
                    </Link>
                </header>

                {/* Hero Section */}
                <div className="mb-12 md:mb-16 text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight">
                        <span className="text-[#d59928]">{camp.title}</span> Sessions
                    </h1>
                    <p className="text-white/60 text-lg">
                        {camp.description}
                    </p>
                </div>

                {/* Sessions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {camp.sessions.map((session) => (
                        <Link
                            key={session.id}
                            href={`/sessions/${camp.slug}/${session.number}`}
                            className="group relative bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#d59928]/50 transition-all duration-300 hover:-translate-y-1 block"
                        >
                            <div className="aspect-video relative overflow-hidden bg-[#1a1a1a]">
                                {/* Thumbnail */}
                                {session.thumbnail && (
                                    <Image
                                        src={session.thumbnail}
                                        alt={session.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none"
                                    />
                                )}
                                {/* Fallback pattern if no image */}
                                {!session.thumbnail && (
                                    <div className="absolute inset-0 bg-[#111] opacity-60"></div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/50 to-[#050505]/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <Play className="w-12 h-12 text-white/20 group-hover:text-[#d59928] transition-colors" />
                                </div>
                                <div className="absolute top-4 left-4 z-10">
                                    <span className="px-3 py-1 bg-[#d59928] text-black font-bold text-xs rounded-full uppercase tracking-wider shadow-lg">
                                        Session {session.number}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6">
                                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-[#d59928] transition-colors">
                                    {session.title}
                                </h3>
                                <p className="text-white/60 text-sm mb-6 line-clamp-2 min-h-[40px]">
                                    {session.desc || session.description}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <div className="flex gap-4 text-xs text-white/40 font-mono">
                                        <span className="flex items-center gap-1.5">
                                            <Play className="w-3 h-3" /> Video
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <FileText className="w-3 h-3" /> PDF/Notes
                                        </span>
                                    </div>
                                    <span className="flex items-center gap-2 text-sm text-[#d59928] font-medium group-hover:translate-x-1 transition-transform">
                                        Start Learning <ArrowRight className="w-4 h-4" />
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

export default function CampSessionsPage(props: { params: Promise<{ campSlug: string }> }) {
    return <Providers><CampSessionsContent params={props.params} /></Providers>;
}
