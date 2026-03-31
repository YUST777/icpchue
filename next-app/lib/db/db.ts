import pg from 'pg';
const { Pool } = pg;

// Database pool singleton
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
    if (!pool) {
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

        pool = new Pool({
            connectionString,
            ssl: true,
            max: 25, // Increased from 20 for higher concurrency
            min: 5,  // Keep 5 warm connections ready
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            statement_timeout: 15000, // Kill queries that take > 15s
            query_timeout: 15000,
        });

        // Prevent unhandled errors from crashing the process
        pool.on('error', (err) => {
            console.error('[DB Pool] Unexpected error on idle client:', err.message);
        });
    }
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
