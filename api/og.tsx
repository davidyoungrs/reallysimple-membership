import { ImageResponse } from '@vercel/og';
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

    // Fetch user data
    const cards = await db.select({
      data: businessCards.data,
    })
    .from(businessCards)
    .where(eq(businessCards.slug, slug))
    .limit(1);

    if (cards.length === 0) {
      return new Response('Card not found', { status: 404 });
    }

    const cardData = cards[0].data as any;

    const backgroundType = cardData.backgroundType || 'solid';
    const themeColor = cardData.themeColor || '#2563eb';
    const gradientColor = cardData.gradientColor || '#000000';
    const textColor = cardData.textColor || '#ffffff';
    
    // Ensure avatar URL is absolute
    let avatarUrl = cardData.avatarUrl;
    if (avatarUrl && !avatarUrl.startsWith('http')) {
        const host = req.headers.get('host') || 'reallysimpleapps.com';
        const proto = host.includes('localhost') ? 'http' : 'https';
        avatarUrl = `${proto}://${host}${avatarUrl}`;
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: backgroundType === 'solid' ? themeColor : undefined,
            backgroundImage: backgroundType === 'gradient'
              ? `linear-gradient(135deg, ${themeColor}, ${gradientColor})` 
              : undefined,
            color: textColor,
            fontFamily: 'sans-serif',
          }}
        >
          {avatarUrl && cardData.showPhoto !== false && (
            <img
              src={avatarUrl}
              alt="Avatar"
              style={{
                width: 240,
                height: 240,
                borderRadius: cardData.photoStyle === 'circle' ? 120 : (cardData.photoStyle === 'rounded' ? 40 : 0),
                marginBottom: 40,
                objectFit: 'cover',
                boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              }}
            />
          )}
          
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {cardData.fullName || 'Really Simple Apps'}
          </div>
          
          {(cardData.jobTitle || cardData.company) && (
            <div
              style={{
                fontSize: 36,
                fontWeight: 500,
                opacity: 0.9,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {cardData.jobTitle}
              {cardData.jobTitle && cardData.company && <span style={{ margin: '0 12px', opacity: 0.6 }}>•</span>}
              {cardData.company}
            </div>
          )}
          
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              display: 'flex',
              alignItems: 'center',
              fontSize: 24,
              opacity: 0.6,
              fontWeight: 600,
            }}
          >
            reallysimpleapps.com
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('OG Image generation error:', e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
