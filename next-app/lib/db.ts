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
            ssl: true, // Simplified for Bun compatibility
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            query_timeout: 15000, // Important to prevent "stuck in animation" if TCP drops
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
