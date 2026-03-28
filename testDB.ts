import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { env } from 'process';
import { db } from './src/db/index.js';
import { businessCards, users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
async function test() {
   try {
       const res = await db.select({ 
           tier: users.tier, 
           status: users.subscriptionStatus,
           clerkId: users.clerkId
       }).from(businessCards)
       .leftJoin(users, eq(businessCards.userId, users.clerkId))
       .where(eq(businessCards.slug, 'colin-a-findlay'))
       .limit(1);
       console.log('USER TIER DB RESULT:', res);
       process.exit(0);
   } catch(e) {
       console.error(e);
       process.exit(1);
   }
}
test();
