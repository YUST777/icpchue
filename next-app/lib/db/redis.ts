import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Hostnames that only resolve inside docker-compose and will NEVER resolve on
// Vercel/serverless. If REDIS_HOST is one of these (or unset on Vercel), Redis
// is effectively unavailable — so we fast-fail every command instead of letting
// ioredis spend seconds on connect timeouts + retries on every request, which
// would make cache/rate-limit calls hang and cascade into slow/failed routes.
const DOCKER_ONLY_HOSTS = new Set(['redis', 'localhost', '127.0.0.1', '']);
const IS_SERVERLESS = !!process.env.VERCEL;
const REDIS_DISABLED = IS_SERVERLESS && DOCKER_ONLY_HOSTS.has(REDIS_HOST);

// Singleton to avoid multiple connections in dev hot-reload
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
            // Don't retry forever against a dead host — give up quickly so the
            // caller's catch/fallback runs without long hangs.
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            retryStrategy: (times) => {
                if (times > 3) return null; // stop retrying
                return Math.min(times * 50, 500);
            },
        });
        redisInstance.on('error', (err) => {
            console.error('[Redis] Connection Error:', err.message);
        });
    }
    return redisInstance;
}

// A stub that behaves like a Redis client but instantly rejects/no-ops, used
// when Redis is disabled (e.g. only a docker hostname is configured on Vercel).
// Callers (cache, rate-limit) already catch errors and fall back gracefully.
const DISABLED_ERROR = new Error('REDIS_DISABLED');
function makeDisabledRedis(): Redis {
    const noop = () => Promise.reject(DISABLED_ERROR);
    const handler: ProxyHandler<Record<string, unknown>> = {
        get(_t, prop) {
            if (prop === 'status') return 'end';
            if (prop === 'on' || prop === 'off' || prop === 'once') return () => disabledProxy;
            if (prop === 'multi') {
                // Return a chainable stub whose exec() rejects.
                const chain: Record<string, unknown> = {};
                const chainProxy: Record<string, unknown> = new Proxy(chain, {
                    get(_c, p) {
                        if (p === 'exec') return () => Promise.reject(DISABLED_ERROR);
                        return () => chainProxy;
                    }
                });
                return () => chainProxy;
            }
            // Any command (get/set/del/incr/expire/ttl/...) fast-fails.
            return noop;
        }
    };
    const disabledProxy = new Proxy({}, handler) as unknown as Redis;
    return disabledProxy;
}

let disabledInstance: Redis | null = null;
function getDisabledRedis(): Redis {
    if (!disabledInstance) disabledInstance = makeDisabledRedis();
    return disabledInstance;
}

// Proxy defers instantiation/connection until a method is actually used.
const redisProxy = new Proxy({} as Redis, {
    get(target, prop) {
        const instance = REDIS_DISABLED ? getDisabledRedis() : getRedis();
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
