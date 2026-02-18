
import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function checkSchema() {
    try {
        console.log('Checking leads table schema...');
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'leads';
        `);
        console.log(result.rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

checkSchema();
