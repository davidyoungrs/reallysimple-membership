import { config } from 'dotenv';
config();
import { db } from '../src/db/index.js';
import { businessCards } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function migrate() {
    const cardData = {
        fullName: 'Ashley Goodall',
        jobTitle: 'Marketing Consultant',
        company: 'Iraq Britain Business Council',
        bio: 'Office 333 China Works, Black Prince Road, Vauxhall London SW1 7SJ',
        avatarUrl: '', 
        logoUrl: 'https://reallysimpleapps.com/wp-content/uploads/2021/05/image-2.png',
        themeColor: 'blue',
        textColor: '#ffffff',
        gradientColor: '#1e3a8a',
        backgroundType: 'gradient',
        showPhoto: false,
        photoStyle: 'circle',
        avatarScale: 1,
        avatarPosition: { x: 0, y: 0 },
        font: 'Inter',
        phoneNumbers: [
            { id: '1', label: 'Office', number: '+44 207 222 7100' },
            { id: '2', label: 'Mobile', number: '+44 7788 565 730' }
        ],
        socialLinks: [
            { id: '1', platform: 'email', url: 'mailto:ashley.goodall@webuildiraq.org', label: 'Email' },
            { id: '2', platform: 'website', url: 'https://iraqbritainbusiness.org', label: 'Globe' },
            { id: '3', platform: 'facebook', url: 'https://www.facebook.com/IBBCLondon/', label: 'Facebook' },
            { id: '4', platform: 'twitter', url: 'https://twitter.com/IBBC_London', label: 'Twitter' },
            { id: '5', platform: 'linkedin', url: 'https://www.linkedin.com/company/5292941/', label: 'Linkedin' },
            { id: '6', platform: 'youtube', url: 'https://www.youtube.com/user/IBBCLondon', label: "Youtube" },
            { id: '7', platform: 'custom', url: 'https://reallysimpleapps.com/links-ibbc-AR-Ashley-Goodall', label: 'Arabic' },
            { id: '8', platform: 'custom', url: 'https://reallysimpleapps.com/links-ibbc-EN-Ashley-Goodall', label: 'English' },
        ],
        slug: 'links-ibbc-en-ashley-goodall',
        layoutMode: 'classic',
        stickyActionBar: true,
        embeds: [
            { id: '1', type: 'youtube', url: 'https://www.youtube.com/watch?v=9NUp2gcwDmQ', title: 'YouTube Video' }
        ],
        wallet: {
            backgroundColor: '#ffffff',
            foregroundColor: '#000000',
            labelColor: '#000000',
            logoText: 'IBBC',
            showLogoText: true
        }
    };

    try {
        // Find if exists
        const existing = await db.select().from(businessCards).where(eq(businessCards.slug, 'links-ibbc-en-ashley-goodall'));
        
        if (existing.length > 0) {
            console.log('Updating existing card...');
            await db.update(businessCards)
                .set({ data: cardData })
                .where(eq(businessCards.slug, 'links-ibbc-en-ashley-goodall'));
        } else {
            console.log('Inserting new card...');
            await db.insert(businessCards).values({
                slug: 'links-ibbc-en-ashley-goodall',
                data: cardData,
                userId: null
            });
        }
        
        console.log('Successfully migrated Ashley Goodall card!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
