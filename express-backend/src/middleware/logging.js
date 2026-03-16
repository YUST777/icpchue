import { pool } from '../config/db.js';

// Access logging for sensitive operations
export const logAccess = (req, res, next) => {
    const userAgent = req.get('user-agent') || 'unknown';
    const ip = req.ip || 'unknown';
    const method = req.method;
    const path = req.path;

    console.log(`[ACCESS] ${method} ${path} - IP: ${ip} - UA: ${userAgent}`);
    next();
};

// Website analytics tracking middleware (skip API endpoints)
export const analyticsMiddleware = (req, res, next) => {
    // Skip tracking for API endpoints, static files, and bots
    if (req.path.startsWith('/api') ||
        req.path.startsWith('/_') ||
        req.path.startsWith('/static') ||
        req.path.includes('favicon') ||
        req.method !== 'GET') {
        return next();
    }

    // Allow request to proceed immediately - log asynchronously
    // Using setImmediate to detach logging from response time
    setImmediate(async () => {
        try {
            const ip = req.ip || req.connection.remoteAddress || '0.0.0.0';
            const userAgent = req.get('user-agent') || 'unknown';
            const path = req.path;

            // Skip logging if User-Agent indicates a bot (simple check, heavier check done in blockBots)
            if (/bot|crawl|spider|google|baidu|bing/i.test(userAgent)) {
                return;
            }

            // Determine device type
            let deviceType = 'desktop';
            if (/mobile|android|iphone|ipod/i.test(userAgent)) {
                deviceType = 'mobile';
            } else if (/tablet|ipad/i.test(userAgent)) {
                deviceType = 'tablet';
            }

            // Determine browser
            let browser = 'other';
            if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) {
                browser = 'chrome';
            } else if (/firefox/i.test(userAgent)) {
                browser = 'firefox';
            } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
                browser = 'safari';
            } else if (/edg/i.test(userAgent)) {
                browser = 'edge';
            }

            // Determine OS
            let os = 'other';
            if (/windows/i.test(userAgent)) {
                os = 'windows';
            } else if (/mac/i.test(userAgent)) {
                os = 'mac';
            } else if (/linux/i.test(userAgent)) {
                os = 'linux';
            } else if (/android/i.test(userAgent)) {
                os = 'android';
            } else if (/ios|iphone|ipad/i.test(userAgent)) {
                os = 'ios';
            }

            // Check if user is logged in
            let userId = null;
            let sessionId = null;

            // Extract session ID if present (e.g., from cookie or header)
            // For now we just log anonymous view
            // If we had session middleware, we'd use req.sessionID

            // Insert into views table if it exists (analytics table)
            // Note: We use the 'views' table which you might need to create if not exists
            // Fallback to console if table doesn't match schema or logic
            // Ideally we should have a 'page_views' table
            // Currently logging to console until analytics schema is confirmed standard
            // console.log(`[ANALYTICS] Page View: ${path} [${deviceType}/${browser}/${os}]`);

            // If you have a specific table for this:
            /*
            await pool.query(
                'INSERT INTO page_views (path, ip_address, user_agent, device_type, browser, os) VALUES ($1, $2, $3, $4, $5, $6)',
                [path, ip, userAgent, deviceType, browser, os]
            );
            */

        } catch (error) {
            // Silently fail analytics logging - don't break the app
            console.error('Analytics logging error:', error.message);
        }
    });

    next();
};

