import pg from 'pg';
const { Pool } = pg;

// Persist the pool across hot serverless invocations. On Vercel each warm
// function reuses the module scope, but using globalThis guards against
// duplicate pools if the module is evaluated more than once.
const globalForPg = globalThis as unknown as { __pgPool?: pg.Pool };

// On Vercel (serverless), many short-lived function instances run concurrently.
// A large per-instance pool (min: 5) multiplies across instances and exhausts
// the database connection limit, causing intermittent 500s. Keep it tiny and
// rely on Supabase's transaction pooler (port 6543) for the DATABASE_URL.
const IS_SERVERLESS = !!process.env.VERCEL;

export function getPool(): pg.Pool {
    if (globalForPg.__pgPool) return globalForPg.__pgPool;

    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is not set');
    }

    // Fix for Supabase Transaction Pooler + Local Dev
    // The ?sslmode=require conflicts with ssl: { rejectUnauthorized: false }
    if (connectionString.includes('sslmode=require')) {
        connectionString = connectionString.replace('?sslmode=require', '');
        connectionString = connectionString.replace('&sslmode=require', '');
    }

    const pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        },
        // Serverless: tiny pool per instance (the DB-side pooler does the real
        // pooling). Long-running server: a larger warm pool is fine.
        max: IS_SERVERLESS ? 1 : 25,
        min: 0,
        idleTimeoutMillis: IS_SERVERLESS ? 10000 : 30000,
        connectionTimeoutMillis: 10000,
        statement_timeout: 15000, // Kill queries that take > 15s
        query_timeout: 15000,
    });

    // Prevent unhandled errors from crashing the process
    pool.on('error', (err) => {
        console.error('[DB Pool] Unexpected error on idle client:', err.message);
    });

    globalForPg.__pgPool = pool;
    return pool;
}

export async function query(text: string, params?: unknown[]) {
    const pool = getPool();
    return pool.query(text, params);
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
