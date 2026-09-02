import { Queue } from 'bullmq';

// Next.js (Producer) doesn't need a worker, just the queue instance to add jobs.
// Use process.env for connection details.

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

// Singleton pattern for queue to avoid creating too many connections in dev
const globalForQueue = globalThis as unknown as { __scraperQueue?: Queue };

function getScraperQueue(): Queue {
    if (globalForQueue.__scraperQueue) return globalForQueue.__scraperQueue;

    const q = new Queue('scraper-queue', {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: true, // Keep memory/redis clean
            removeOnFail: 100 // Keep last 100 failed jobs for inspection
        },
    });

    globalForQueue.__scraperQueue = q;
    return q;
}

export const scraperQueue = new Proxy({} as Queue, {
    get(_target, prop) {
        const instance = getScraperQueue();
        const value = Reflect.get(instance, prop);
        if (typeof value === 'function') {
            return value.bind(instance);
        }
        return value;
    }
});

