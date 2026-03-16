import helmet from 'helmet';
import cors from 'cors';

// Bot/Crawler detection and blocking middleware
export const blockBots = (req, res, next) => {
    // Always allow OPTIONS preflight requests for CORS
    if (req.method === 'OPTIONS') {
        return next();
    }

    const userAgent = (req.get('user-agent') || '').toLowerCase();

    // List of known bot/crawler user agents (removed axios/fetch - those are used by browsers)
    const botPatterns = [
        'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
        'yandexbot', 'sogou', 'exabot', 'facebot', 'ia_archiver',
        'msnbot', 'ahrefsbot', 'semrushbot', 'dotbot', 'mj12bot',
        'moz.com', 'spider', 'crawler', 'scraper', 'crawl',
        'curl', 'wget', 'python-requests', 'scrapy', 'httpclient',
        'okhttp', 'go-http-client', 'java/', 'apache-httpclient',
        'postman', 'insomnia', 'httpie'
    ];

    // Check if user agent matches bot patterns
    const isBot = botPatterns.some(pattern => userAgent.includes(pattern));

    // Block bots from accessing API endpoints
    const isApiPath = req.path.startsWith('/api') &&
        !req.path.startsWith('/api/health') &&
        !req.path.startsWith('/api/get-ip') &&
        !req.path.startsWith('/api/auth'); // Allow auth endpoints

    // Allow localhost/127.0.0.1 for testing
    const isLocalhost = req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1';

    if (isBot && isApiPath && !isLocalhost) {
        const ip = req.ip || 'unknown';
        console.log(`🚫 BLOCKED BOT: ${userAgent} from IP: ${ip} attempting to access: ${req.path}`);

        return res.status(403).json({
            error: 'Access denied',
            message: 'Automated access is not allowed'
        });
    }

    next();
};

const appDomain = process.env.APP_DOMAIN || 'icpchue.com';

export const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", "data:", "blob:", "https://assets.leetcode.com", "https://userpic.codeforces.com", "https://*.d3c33hcgiwev3.cloudfront.net"],
            connectSrc: ["'self'", `https://${appDomain}`, `wss://${appDomain}`, "https://www.google.com"],
            frameSrc: ["'self'", "https://www.google.com"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

// Configure CORS
const envAllowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
export const corsConfig = cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const defaultOrigins = [
            `https://${appDomain}`,
            `https://www.${appDomain}`,
            'http://localhost:3000',
            'http://localhost:3001',
            'http://frontend:3000',
            'http://backend:3001'
        ];

        const allowedOrigins = [...new Set([...defaultOrigins, ...envAllowedOrigins])];

        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            console.log('🚫 BLOCKED CORS Origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-api-key', 'x-admin-key', 'x-admin-token', 'x-totp-code', 'user-agent'],
    credentials: true,
    optionsSuccessStatus: 200
});
