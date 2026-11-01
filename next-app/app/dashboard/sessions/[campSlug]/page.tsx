import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronRight, Play } from 'lucide-react';
import { camps } from '@/lib/sessionData';
import { PageHeader } from '@/components/dashboard/PageHeader';

export default async function CampSessionsPage(props: { params: Promise<{ campSlug: string }> }) {
    const params = await props.params;
    const camp = camps.find(c => c.slug === params.campSlug);

    if (!camp) {
        notFound();
    }

    return (
        <div className="font-sans text-white space-y-8 animate-fade-in pb-12">
            <PageHeader
                title={camp.title}
                subtitle={`${camp.sessions.length} sessions. ${camp.description}`}
            />

            <div className="max-w-7xl mx-auto">
                <h2 className="text-lg font-semibold text-[#F2F2F2] mb-4">Session Content</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {camp.sessions.map((session) => (
                        <Link
                            key={session.id}
                            href={`/dashboard/sessions/${camp.slug}/${session.slug}`}
                            className="group"
                        >
                            <div className="relative group rounded-3xl p-[1px] bg-white/10 overflow-hidden h-full">
                                <div className="bg-[#0f0f0f] rounded-[23px] relative overflow-hidden h-full flex flex-col">
                                    <div className="relative h-48 w-full overflow-hidden bg-[#1a1a1a]">
                                        {session.thumbnail && (
                                            <Image
                                                src={session.thumbnail}
                                                alt={session.title}
                                                fill
                                                className="object-cover opacity-50 group-hover:opacity-100 transition-[color,background-color,border-color,opacity,transform] duration-700 scale-100"
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/20 to-transparent flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-[color,background-color,border-color,opacity,transform] duration-500">
                                                <Play className="w-5 h-5 text-white/40 group-hover:text-[#E8C15A] transition-colors translate-x-0.5" />
                                            </div>
                                        </div>
                                        {session.tag && (
                                            <div className="absolute top-4 left-4">
                                                <span className="bg-black/80 backdrop-blur-sm border border-white/10 text-white/50 px-2 py-1 rounded text-[10px] font-semibold">
                                                    {session.tag}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative z-10 p-5 pt-4 mt-auto">
                                        <div className="mb-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[#E8C15A] font-mono text-xs font-semibold">SESSION {session.number}</span>
                                            </div>
                                            <h3 className="text-xl font-semibold text-white group-hover:text-[#E8C15A] transition-colors line-clamp-1">
                                                {session.title}
                                            </h3>
                                        </div>

                                        <p className="text-sm text-[#808080] line-clamp-2 mb-4">{session.description}</p>

                                        <div className="w-full relative overflow-hidden rounded-xl bg-[#161616] border border-white/5 group-hover:border-white/10 transition-[color,background-color,border-color,opacity,transform]">
                                            <div className="relative z-10 px-4 py-3 flex items-center justify-between">
                                                <span className="text-sm font-semibold text-white/90 group-hover:text-[#E8C15A] transition-colors">
                                                    Start Session
                                                </span>
                                                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#E8C15A] transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {camp.sessions.length === 0 && (
                        <div className="col-span-full bg-[#0f0f0f] border border-white/10 rounded-3xl p-12 text-center">
                            <p className="text-[#666]">No sessions available in this camp yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
