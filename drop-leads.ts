
import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function dropTable() {
    try {
        console.log('Dropping leads table...');
        await db.execute(sql`DROP TABLE IF EXISTS leads CASCADE;`);
        console.log('Leads table dropped.');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

dropTable();
