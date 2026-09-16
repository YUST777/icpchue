export function getEmbedUrl(videoIdOrUrl: string): string {
    if (!videoIdOrUrl) return '';
    const trimmed = videoIdOrUrl.trim();

    // YouTube URLs (youtu.be, youtube.com/watch, youtube.com/embed)
    const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) {
        return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
    }

    // Direct 11-char YouTube ID
    if (/^[\w-]{11}$/.test(trimmed)) {
        return `https://www.youtube-nocookie.com/embed/${trimmed}`;
    }

    // Google Drive URL with /file/d/ID/...
    const matchD = trimmed.match(/\/file\/d\/([^\/]+)/);
    if (matchD) {
        return `https://drive.google.com/file/d/${matchD[1]}/preview`;
    }

    // Google Drive ?id=ID
    const matchId = trimmed.match(/[?&]id=([^&]+)/);
    if (matchId) {
        return `https://drive.google.com/file/d/${matchId[1]}/preview`;
    }

    // Direct Google Drive ID
    if (trimmed.length >= 25 && !trimmed.includes('/')) {
        return `https://drive.google.com/file/d/${trimmed}/preview`;
    }

    return trimmed;
}

export function getDirectWatchUrl(videoIdOrUrl: string): { url: string; platform: 'YouTube' | 'Drive' } {
    if (!videoIdOrUrl) return { url: '', platform: 'Drive' };
    const trimmed = videoIdOrUrl.trim();

    const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) {
        return { url: `https://youtu.be/${ytMatch[1]}`, platform: 'YouTube' };
    }
    if (/^[\w-]{11}$/.test(trimmed)) {
        return { url: `https://youtu.be/${trimmed}`, platform: 'YouTube' };
    }

    const driveMatch = trimmed.match(/\/file\/d\/([^\/]+)/);
    const driveId = driveMatch ? driveMatch[1] : trimmed;
    return { url: `https://drive.google.com/file/d/${driveId}/view?usp=sharing`, platform: 'Drive' };
}
