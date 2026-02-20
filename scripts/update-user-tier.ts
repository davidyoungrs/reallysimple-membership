import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Script to manually update a user's tier.
 * Usage: npx tsx scripts/update-user-tier.ts <email> <tier>
 * Example: npx tsx scripts/update-user-tier.ts user@example.com business
 */

async function updateTier() {
    const args = process.argv.slice(2);
    const email = args[0];
    const tier = args[1] || 'business';

    if (!email) {
        console.error('Usage: npx tsx scripts/update-user-tier.ts <email> <tier>');
        process.exit(1);
    }

    const availableTiers = ['starter', 'pro', 'pro_plus', 'business', 'grandfathered'];
    if (!availableTiers.includes(tier)) {
        console.error(`Invalid tier. Available tiers: ${availableTiers.join(', ')}`);
        process.exit(1);
    }

    console.log(`Updating user ${email} to tier: ${tier}...`);

    try {
        const result = await db.update(users)
            .set({ tier: tier as any })
            .where(eq(users.email, email))
            .returning();

        if (result.length === 0) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        console.log(`Successfully updated user ${email} to ${tier}.`);
        process.exit(0);
    } catch (error) {
        console.error('Failed to update user tier:', error);
        process.exit(1);
    }
}

updateTier();
