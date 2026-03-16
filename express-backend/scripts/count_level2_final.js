import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('?')) dbUrl = dbUrl.split('?')[0];

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
    await client.connect();

    const stats = await client.query(`
        SELECT 
            count(*) as total,
            count(*) FILTER (WHERE (content->>'story') IS NOT NULL AND (content->>'story') ~ '[a-zA-Z0-9]') as with_story,
            count(*) FILTER (WHERE content->'testCases' IS NOT NULL AND jsonb_array_length(content->'testCases') > 0) as with_test_cases,
            count(*) FILTER (WHERE (content->>'story') ILIKE '%<iframe%') as with_iframe,
            count(*) FILTER (WHERE (content->>'inputSpec') IS NOT NULL AND length(content->>'inputSpec') > 5) as with_input_spec,
            count(*) FILTER (WHERE (content->>'outputSpec') IS NOT NULL AND length(content->>'outputSpec') > 5) as with_output_spec,
            count(*) FILTER (WHERE solution_video_url IS NOT NULL) as with_solution_video
        FROM curriculum_problems p
        JOIN curriculum_sheets s ON p.sheet_id = s.id
        JOIN curriculum_levels l ON s.level_id = l.id
        WHERE l.slug = 'level-2'
    `);

    console.log(JSON.stringify(stats.rows[0], null, 2));

    await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
