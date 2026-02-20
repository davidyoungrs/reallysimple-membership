import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';

/**
 * Script to list all users and their tiers.
 * Usage: npx tsx scripts/list-users.ts
 */

async function listUsers() {
    console.log('Fetching users...');

    try {
        const allUsers = await db.select({
            email: users.email,
            tier: users.tier,
            clerkId: users.clerkId
        }).from(users);

        if (allUsers.length === 0) {
            console.log('No users found in the database.');
        } else {
            console.log('\nExisting Users:');
            console.table(allUsers);
        }
        process.exit(0);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        process.exit(1);
    }
}

listUsers();
