
import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function checkSchema() {
    try {
        console.log('Checking leads table schema...');
        const leadsResult = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'leads';
        `);
        console.log('Leads:', leadsResult.rows);

        console.log('Checking system_settings table schema...');
        const settingsResult = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'system_settings';
        `);
        console.log('System Settings:', settingsResult.rows);
    } catch (e) {
        console.error('Error checking schema:', e);
    }
    process.exit(0);
}

checkSchema();
