import { formatDisplayName } from '@/lib/names';
import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getDisplayName(name?: string | null): string {
    if (!name) return 'User';
    // If it's an email, extract the part before @
    if (name.includes('@')) {
        return name.split('@')[0];
    }
    // English only, at most three names.
    return formatDisplayName(name);
}
