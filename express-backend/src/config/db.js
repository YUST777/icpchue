import pg from 'pg';
import dotenv from 'dotenv';

// Ensure env vars are loaded if this file is imported first
dotenv.config();

const { Pool } = pg;

// Initialize Postgres Database Connection (Synchronous)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL is missing in .env");
    // In serverless, we might not want to exit immediately if env vars strictly come from platform
    if (process.env.NODE_ENV !== 'production') process.exit(1);
}

// Global pool variable initialized immediately
export const pool = new Pool({
    connectionString: connectionString,
    ssl: true, // Simplified for Bun compatibility
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

console.log("✅ Database pool initialized");

// Initialize Redis
import Redis from 'ioredis';
export const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 50, 2000)
});

redis.on('error', (err) => console.error('Redis Client Error', err));
redis.on('connect', () => console.log('✅ Redis connected'));

// Verify database connectivity on startup (tables managed via migrations)
export const initDB = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('✓ Database connection verified');
    } catch (err) {
        console.error('❌ Database connection failed:', err);
    }
};
