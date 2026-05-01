import { db } from '../src/db/index.js';
import { businessCards } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return new Response('Missing slug', { status: 400 });
    }

    // Fetch the original index.html
    const host = req.headers.get('host') || process.env.VERCEL_URL || 'reallysimpleapps.com';
    const proto = host.includes('localhost') ? 'http' : 'https';
    
    // Fetch the raw index.html to modify it
    const htmlRes = await fetch(`${proto}://${host}/index.html`);
    if (!htmlRes.ok) {
        return new Response('Failed to load base HTML', { status: 500 });
    }
    let html = await htmlRes.text();

    // Fetch user data for meta tags
    const cards = await db.select({
      data: businessCards.data,
    })
    .from(businessCards)
    .where(eq(businessCards.slug, slug))
    .limit(1);

    if (cards.length > 0) {
        const cardData = cards[0].data as any;
        const title = cardData.fullName ? `${cardData.fullName} - Really Simple Apps` : 'Really Simple Apps';
        // HTML encode the bio for attribute usage
        const rawBio = cardData.bio || 'Digital Business Card';
        const description = rawBio.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const ogImage = `${proto}://${host}/api/og?slug=${slug}`;

        // Inject Meta Tags
        const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${proto}://${host}/card/${slug}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />
        `;
        
        // Remove existing <title>
        html = html.replace(/<title>.*?<\/title>/g, '');
        html = html.replace('</head>', `${metaTags}\n</head>`);
    }

    return new Response(html, {
        headers: {
            'content-type': 'text/html;charset=UTF-8',
            'cache-control': 'public, s-maxage=60, stale-while-revalidate=300', 
        },
    });

  } catch (e: any) {
    console.error('Render HTML error:', e);
    // In case of a hard error, fallback to redirecting or returning a simple HTML error.
    // It's safer to just return a basic redirect to the SPA if something fails badly.
    return new Response(`Error rendering card`, { status: 500 });
  }
}
