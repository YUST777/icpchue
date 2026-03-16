'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, ChevronRight } from 'lucide-react';

interface Sheet1WidgetProps {
    progress?: number;
}

export default function Sheet1Widget({ progress = 0 }: Sheet1WidgetProps) {
    return (
        <div className="space-y-4 h-full flex flex-col">

            {/* Card */}
            <div className="relative group rounded-3xl p-[1px] bg-gradient-to-b from-white/10 to-transparent overflow-hidden flex-1">
                <div className="bg-[#0f0f0f] rounded-[23px] relative overflow-hidden h-full flex flex-col">

                    {/* Image Container - Takes remaining height but leaves space for footer */}
                    <div className="relative flex-1 w-full min-h-[200px] group-hover:scale-105 transition-transform duration-700">
                        <Image
                            src="/images/sheet/sheet1.webp"
                            alt="Sheet #1"
                            fill
                            className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent"></div>
                    </div>

                    {/* Content Overlay */}
                    <div className="absolute top-0 left-0 p-6 z-10 w-full">
                        {/* Internal Header */}
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-[#E8C15A]" />
                            <h2 className="text-[10px] md:text-xs font-bold text-white/90 uppercase tracking-wider">Started Sheet</h2>
                        </div>
                    </div>

                    {/* Bottom Action Area */}
                    <div className="relative z-10 p-5 pt-0 mt-auto">
                        <div className="mb-4">
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-1">Sheet #1</h3>
                            <p className="text-gray-400 text-xs">26 Problems • C++ Basics</p>
                        </div>

                        <Link
                            href="/dashboard/sheets/sheet-1"
                            className="w-full relative overflow-hidden rounded-xl bg-[#161616] border border-white/5 hover:bg-[#1a1a1a] hover:border-white/10 transition-all group/btn block"
                        >
                            <div className="relative z-10 px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white group-hover/btn:text-[#E8C15A] transition-colors">
                                        {progress} / 26 Solved
                                    </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-500 group-hover/btn:text-[#E8C15A] transition-colors" />
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
