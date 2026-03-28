import 'dotenv/config';
import { db } from './src/db/index.js';
import { walletPushRegistrations } from './src/db/schema.js';

async function checkRegistrations() {
    try {
        console.log('Querying wallet_push_registrations...');
        const registrations = await db.select().from(walletPushRegistrations);
        console.log(`Found ${registrations.length} registrations:`);
        console.log(JSON.stringify(registrations, null, 2));
    } catch (error) {
        console.error('Error querying database:', error);
    }
    process.exit(0);
}

checkRegistrations();
