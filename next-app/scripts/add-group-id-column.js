const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Manually define curriculum to avoid TS compilation issues
const curriculum = [
    {
        id: 'level0',
        sheets: [
            { id: 'sheet-a', contestId: '219158', groupId: 'MWSDmqGsZm' },
            { id: 'sheet-b', contestId: '219432', groupId: 'MWSDmqGsZm' },
            { id: 'sheet-c', contestId: '219774', groupId: 'MWSDmqGsZm' },
            { id: 'sheet-d', contestId: '219856', groupId: 'MWSDmqGsZm' },
            { id: 'sheet-e', contestId: '223205', groupId: 'MWSDmqGsZm' },
            { id: 'sheet-f', contestId: '223338', groupId: 'MWSDmqGsZm' },
            { id: 'sheet-g', contestId: '223339', groupId: 'MWSDmqGsZm' },
            { id: 'sheet-h', contestId: '223206', groupId: 'MWSDmqGsZm' },
            { id: 'sheet-i', contestId: '223207', groupId: 'MWSDmqGsZm' },
            { id: 'sheet-j', contestId: '223340', groupId: 'MWSDmqGsZm' }
        ]
    },
    {
        id: 'level1',
        sheets: [
            { id: 'sheet-a', contestId: '372026', groupId: '3nQaj5GMG5' },
            { id: 'sheet-b', contestId: '373244', groupId: '3nQaj5GMG5' },
            { id: 'sheet-c', contestId: '374321', groupId: '3nQaj5GMG5' },
            { id: 'sheet-d', contestId: '376466', groupId: '3nQaj5GMG5' },
            { id: 'sheet-e', contestId: '377898', groupId: '3nQaj5GMG5' },
            { id: 'sheet-f', contestId: '219158', groupId: '3nQaj5GMG5' }, // Placeholder
            { id: 'sheet-g', contestId: '219158', groupId: '3nQaj5GMG5' }, // Placeholder
            { id: 'sheet-h', contestId: '219158', groupId: '3nQaj5GMG5' }  // Placeholder
        ]
    }
];

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        // 1. Add column if not exists
        await client.query(`
            ALTER TABLE curriculum_sheets 
            ADD COLUMN IF NOT EXISTS group_id VARCHAR(255);
        `);
        console.log('Added group_id column');

        // 2. Update each sheet
        for (const level of curriculum) {
            for (const sheet of level.sheets) {
                if (sheet.groupId) {
                    const result = await client.query(`
                        UPDATE curriculum_sheets
                        SET group_id = $1
                        WHERE slug = $2
                    `, [sheet.groupId, sheet.id]);

                    if (result.rowCount > 0) {
                        console.log(`Updated ${sheet.id} with group_id ${sheet.groupId}`);
                    } else {
                        console.warn(`Sheet ${sheet.id} not found in DB`);
                    }
                }
            }
        }

        console.log('Migration complete');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
