import 'dotenv/config';
import { db } from './src/db/index.js';
import { eq } from 'drizzle-orm';
import { users } from './src/db/schema.js';

async function simulateLapse() {
    try {
        console.log('Finding a user to simulate lapse for...');
        // Find any user to test with, ideally one that has cards
        const allUsers = await db.select().from(users).limit(1);

        if (allUsers.length === 0) {
            console.log('No users found in database.');
            process.exit(1);
        }

        const testUser = allUsers[0];
        console.log(`Setting currentPeriodEnd to yesterday for user: ${testUser.clerkId}`);

        // Set date to 5 days ago to force starter/lapsed tier (bypassing 3-day grace period)
        const lapseDate = new Date();
        lapseDate.setDate(lapseDate.getDate() - 5);

        await db.update(users)
            .set({ currentPeriodEnd: lapseDate })
            .where(eq(users.clerkId, testUser.clerkId as string));

        console.log('✅ Success! The database now thinks this user\'s subscription has expired.');
        console.log('You can now click "Trigger Push Update" in the simulator.');
    } catch (error) {
        console.error('Error modifying database:', error);
    }
    process.exit(0);
}

simulateLapse();
