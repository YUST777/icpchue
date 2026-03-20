import Link from "next/link";
import Image from "next/image";

interface HeaderLogoProps {
    navigationBaseUrl: string;
}

export function HeaderLogo({ navigationBaseUrl }: HeaderLogoProps) {
    return (
        <Link
            href={navigationBaseUrl}
            className="relative flex items-center group shrink-0 transition-transform active:scale-90 select-none -ml-1"
            title="Back to sheet"
        >
            <div className="opacity-100 transition-opacity flex items-center justify-center w-10">
                <Image
                    src="/icons/icpchue.svg"
                    alt="ICPCHUE"
                    width={32}
                    height={32}
                    className="h-8 w-auto object-contain"
                />
            </div>
            {/* Tooltip Popout */}
            <div className="absolute left-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 shadow-xl border-[#E8C15A]/20">
                    <span className="text-xs text-[#E8C15A] font-bold whitespace-nowrap">
                        ICPCHUE CURRICULUM
                    </span>
                </div>
            </div>
        </Link>
    );
}
