// Scraping functions for LeetCode and Codeforces profiles
export const extractUsername = (url, platform) => {
    if (!url || !url.trim()) return null;
    const input = url.trim();

    // If input doesn't contain slashes or dots, assume it's a username
    if (!input.includes('/') && !input.includes('.') && !input.includes(' ')) {
        return input;
    }

    try {
        // If it doesn't start with http, prepend it to try parsing as URL
        const urlToParse = input.startsWith('http') ? input : `https://${input}`;
        const urlObj = new URL(urlToParse);
        const pathParts = urlObj.pathname.split('/').filter(p => p);

        if (platform === 'leetcode') {
            // Matches: leetcode.com/u/username, leetcode.com/username, leetcode.com/username/
            const leetcodeRegex = /leetcode\.com\/(?:u\/)?([^\/]+)\/?$/i;
            const match = urlToParse.match(leetcodeRegex);
            if (match && match[1]) return match[1];

            // Fallback to path parts if regex fails but domain matches
            if (urlToParse.includes('leetcode.com')) {
                const parts = urlObj.pathname.split('/').filter(p => p && p !== 'u');
                return parts[parts.length - 1] || null;
            }
        } else if (platform === 'codeforces') {
            // Matches: codeforces.com/profile/username, codeforces.com/submissions/username
            // codeforces.com/username (if supported)
            const cfRegex = /codeforces\.com\/(?:profile\/|submissions\/|people\/)?([^\/]+)\/?$/i;
            const match = urlToParse.match(cfRegex);
            if (match && match[1]) return match[1];

            // Fallback
            if (urlToParse.includes('codeforces.com')) {
                const parts = urlObj.pathname.split('/').filter(p => p && !['profile', 'submissions', 'people', 'contest'].includes(p));
                return parts[parts.length - 1] || null;
            }
        }
    } catch (e) {
        console.error(`Error extracting username from ${url}:`, e);
        // If URL parsing fails but it looks like a username (logic handled above), return it.
        // The top check handles simple cases. If complex URL fails, return null.
        return null;
    }
    return null;
};

// Validate and limit string length
export const validateLength = (str, maxLength, fieldName) => {
    if (!str || str.length === 0) return { valid: false, error: `${fieldName} is required` };
    if (str.length > maxLength) return { valid: false, error: `${fieldName} exceeds maximum length of ${maxLength} characters` };
    return { valid: true };
};
