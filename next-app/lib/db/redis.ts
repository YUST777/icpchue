import Redis from 'ioredis';

// Use same config as server/lib/redis.js
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
const REDIS_HOST = process.env.REDIS_HOST || (isBuild ? 'localhost' : 'redis');
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Use singleton pattern to avoid multiple connections in dev hot-reload
const globalForRedis = global as unknown as { redis: Redis };

export const redis =
    globalForRedis.redis ||
    new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        db: 1, // Using DB 1 (same as Express server)
        keyPrefix: 'web:', // Same prefix
        lazyConnect: isBuild, // Don't connect immediately during build
        retryStrategy: (times) => {
            // During build, don't keep retrying
            if (isBuild) return null;
            return Math.min(times * 50, 2000);
        },
    });

// Prevent unhandled error events from crashing the process
redis.on('error', (err) => {
    if (!isBuild) {
        console.error('[Redis] Connection Error:', err.message);
    }
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
