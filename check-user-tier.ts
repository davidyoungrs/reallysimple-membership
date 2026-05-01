import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';

async function run() {
    const allUsers = await db.select({
        email: users.email,
        tier: users.tier,
        status: users.subscriptionStatus,
        end: users.currentPeriodEnd
    }).from(users);
    console.log(JSON.stringify(allUsers, null, 2));
    process.exit(0);
}
run();
