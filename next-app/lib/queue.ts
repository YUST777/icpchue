import { Queue } from 'bullmq';

// Next.js (Producer) doesn't need a worker, just the queue instance to add jobs.
// Use process.env for connection details.

const connection = {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
};

// Singleton pattern for queue to avoid creating too many connections in dev
const globalForQueue = global as unknown as { scraperQueue: Queue };

export const scraperQueue =
    globalForQueue.scraperQueue ||
    new Queue('scraper-queue', {
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

if (process.env.NODE_ENV !== 'production') globalForQueue.scraperQueue = scraperQueue;
