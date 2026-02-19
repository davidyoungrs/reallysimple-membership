import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { isNull, eq } from 'drizzle-orm';

async function migrate() {
    console.log('Starting grandfathering migration...');

    // Set tier to 'grandfathered' for all users who don't have a tier yet
    const result = await db.update(users)
        .set({ tier: 'grandfathered' } as any)
        .where(isNull(users.tier))
        .returning();

    console.log(`Successfully grandfathered ${result.length} users.`);
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
