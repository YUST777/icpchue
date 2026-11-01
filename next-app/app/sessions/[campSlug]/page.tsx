import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Play, FileText } from 'lucide-react';
import Providers from '@/components/core/Providers';
import { camps } from '@/lib/sessionData';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ campSlug: string }> }): Promise<Metadata> {
    const { campSlug } = await params;
    const camp = camps.find(c => c.slug === campSlug);

    if (!camp) return { title: 'Camp Not Found' };

    return {
        title: camp.title,
        description: camp.description,
        alternates: {
            canonical: `https://icpchue.com/sessions/${campSlug}`,
        },
        openGraph: {
            title: `${camp.title} | ICPC HUE`,
            description: camp.description,
            images: [camp.image],
        }
    };
}

async function CampSessionsContent({ params }: { params: Promise<{ campSlug: string }> }) {
    const { campSlug } = await params;
    const camp = camps.find(c => c.slug === campSlug);

    if (!camp) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-[#0B0B0C] text-white font-sans px-5 py-6 sm:px-8 sm:py-10">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <header className="mb-12 flex items-center justify-between sm:mb-16">
                    <Link href="/sessions" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Sessions</span>
                    </Link>
                </header>

                {/* Hero Section */}
                <div className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
                    <h1 className="mb-5 text-4xl font-medium tracking-tight sm:text-6xl">
                        <span className="text-[#E8C15A]">{camp.title}</span> Sessions
                    </h1>
                    <p className="text-white/60 text-lg">
                        {camp.description}
                    </p>
                </div>

                {/* Sessions Grid */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {camp.sessions.map((session) => (
                        <Link
                            key={session.id}
                            href={`/sessions/${camp.slug}/${session.slug}`}
                            className="group relative block overflow-hidden rounded-[14px] border border-white/10 bg-[#16181b] transition-colors hover:border-[#E8C15A]/50"
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

                                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                    <Play className="h-12 w-12 text-white/25 transition-colors group-hover:text-[#E8C15A]" />
                                </div>
                                <div className="absolute top-4 left-4 z-10">
                                    <span className="rounded-[8px] border border-[#E8C15A]/40 bg-[#E8C15A]/15 px-3 py-1 text-xs font-medium text-[#F0CE76]">
                                        Session {session.number}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5 sm:p-6">
                                <h3 className="mb-3 text-xl font-medium text-white transition-colors group-hover:text-[#E8C15A]">
                                    {session.title}
                                </h3>
                                <p className="mb-6 min-h-[40px] line-clamp-2 text-sm leading-6 text-white/60">
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
                                    <span className="flex items-center gap-2 text-sm font-medium text-[#E8C15A] transition-colors group-hover:text-[#F0CE76]">
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
