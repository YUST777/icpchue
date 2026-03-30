import { query } from './lib/db/db';

async function main() {
    try {
        const users = await query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users'");
        console.log('Users columns:', users.rows.map((r: any) => r.column_name));
        
        const streaks = await query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_streaks'");
        console.log('User streaks columns:', streaks.rows.map((r: any) => r.column_name));
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

main();
