import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function check() {
  const cards = await db.select().from(schema.businessCards).where(eq(schema.businessCards.slug, 'colin-a-findlay'));
  if (cards.length > 0) {
     const user = await db.select().from(schema.users).where(eq(schema.users.clerkId, cards[0].userId));
     console.log('USER TIER:', user[0]?.tier, 'STATUS:', user[0]?.subscriptionStatus, 'CLERK_ID', user[0]?.clerkId);
  } else {
     console.log('card not found');
  }
  process.exit(0);
}
check();
