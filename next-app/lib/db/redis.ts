import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Use singleton pattern to avoid multiple connections in dev hot-reload
const globalForRedis = global as unknown as { redis: Redis };

let redisInstance: Redis | null = null;

function getRedis(): Redis {
    if (!redisInstance) {
        redisInstance = new Redis({
            host: REDIS_HOST,
            port: REDIS_PORT,
            password: REDIS_PASSWORD,
            db: 1, // Using DB 1 (same as Express server)
            keyPrefix: 'web:', // Same prefix
            lazyConnect: true, // Don't connect immediately during build
            connectTimeout: 5000,
            commandTimeout: 3000,
            maxRetriesPerRequest: 2,
            retryStrategy: (times) => {
                return Math.min(times * 50, 2000);
            },
        });
        redisInstance.on('error', (err) => {
            console.error('[Redis] Connection Error:', err.message);
        });
    }
    return redisInstance;
}

// Proxy behaves exactly like the Redis client but defers instantiation and connection until method execution
const redisProxy = new Proxy({} as Redis, {
    get(target, prop) {
        const instance = getRedis();
        const value = Reflect.get(instance, prop);
        if (typeof value === 'function') {
            return value.bind(instance);
        }
        return value;
    }
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redisProxy;

export const redis = redisProxy;
export default redisProxy;
