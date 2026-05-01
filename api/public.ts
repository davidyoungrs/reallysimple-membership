import { db } from '../src/db/index.js';
import { systemSettings, businessCards } from '../src/db/schema.js';
import { inArray, eq } from 'drizzle-orm';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import React from 'react';
import { ImageResponse } from '@vercel/og';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const resource = req.query.resource as string;

    if (resource === 'status') {
        return await handleSystemStatus(req, res);
    } else if (resource === 'og') {
        return await handleOgImage(req, res);
    } else if (resource === 'render-card') {
        return await handleRenderCard(req, res);
    } else {
        return res.status(400).json({ error: 'Invalid resource' });
    }
}

async function handleSystemStatus(req: VercelRequest, res: VercelResponse) {
    try {
        let settings: any[] = [];
        try {
            settings = await db.select()
                .from(systemSettings)
                .where(inArray(systemSettings.key, ['maintenance_mode', 'disable_registrations']));
        } catch (dbError) {
            console.error('Database query for status failed:', dbError);
        }

        const status = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value === 'true';
            return acc;
        }, {
            maintenance_mode: false,
            disable_registrations: false
        } as Record<string, boolean>);

        return res.status(200).json(status);
    } catch (error: any) {
        console.error('System Status API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error?.message });
    }
}

async function handleOgImage(req: VercelRequest, res: VercelResponse) {
    try {
        const slug = req.query.slug as string;
        if (!slug) return res.status(400).send('Missing slug');

        const cards = await db.select({ data: businessCards.data })
            .from(businessCards)
            .where(eq(businessCards.slug, slug))
            .limit(1);

        if (cards.length === 0) return res.status(404).send('Card not found');

        const cardData = cards[0].data as any;
        const backgroundType = cardData.backgroundType || 'solid';
        const themeColor = cardData.themeColor || '#2563eb';
        const gradientColor = cardData.gradientColor || '#000000';
        const textColor = cardData.textColor || '#ffffff';
        
        let avatarUrl = cardData.avatarUrl;
        if (avatarUrl && !avatarUrl.startsWith('http')) {
            const host = req.headers.host || 'reallysimpleapps.com';
            const proto = host.includes('localhost') ? 'http' : 'https';
            avatarUrl = `${proto}://${host}${avatarUrl}`;
        }

        const imageRes = new ImageResponse(
            React.createElement(
                'div',
                {
                    style: {
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
                    }
                },
                avatarUrl && cardData.showPhoto !== false ? React.createElement('img', {
                    src: avatarUrl,
                    alt: "Avatar",
                    style: {
                        width: 240,
                        height: 240,
                        borderRadius: cardData.photoStyle === 'circle' ? 120 : (cardData.photoStyle === 'rounded' ? 40 : 0),
                        marginBottom: 40,
                        objectFit: 'cover',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    }
                }) : null,
                React.createElement('div', {
                    style: {
                        fontSize: 64,
                        fontWeight: 800,
                        marginBottom: 16,
                        textAlign: 'center',
                    }
                }, cardData.fullName || 'Really Simple Apps'),
                (cardData.jobTitle || cardData.company) ? React.createElement('div', {
                    style: {
                        fontSize: 36,
                        fontWeight: 500,
                        opacity: 0.9,
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }
                }, 
                    cardData.jobTitle || '', 
                    (cardData.jobTitle && cardData.company) ? React.createElement('span', { style: { margin: '0 12px', opacity: 0.6 } }, '•') : '',
                    cardData.company || ''
                ) : null,
                React.createElement('div', {
                    style: {
                        position: 'absolute',
                        bottom: 40,
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 24,
                        opacity: 0.6,
                        fontWeight: 600,
                    }
                }, 'reallysimpleapps.com')
            ),
            { width: 1200, height: 630 }
        );

        const arrayBuffer = await imageRes.arrayBuffer();
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(Buffer.from(arrayBuffer));
    } catch (e: any) {
        console.error('OG Error:', e);
        return res.status(500).send('Failed to generate image');
    }
}

async function handleRenderCard(req: VercelRequest, res: VercelResponse) {
    try {
        const slug = req.query.slug as string;
        if (!slug) return res.status(400).send('Missing slug');

        const host = req.headers.host || process.env.VERCEL_URL || 'reallysimpleapps.com';
        const proto = host.includes('localhost') ? 'http' : 'https';
        
        const fetch = globalThis.fetch; 
        const htmlRes = await fetch(`${proto}://${host}/index.html`, { cache: 'no-store' });
        if (!htmlRes.ok) return res.status(500).send('Failed to load base HTML');
        let html = await htmlRes.text();

        const cards = await db.select({ data: businessCards.data })
            .from(businessCards).where(eq(businessCards.slug, slug)).limit(1);

        if (cards.length > 0) {
            const cardData = cards[0].data as any;
            const title = cardData.fullName ? `${cardData.fullName} - Really Simple Apps` : 'Really Simple Apps';
            const rawBio = cardData.bio || 'Digital Business Card';
            const description = rawBio.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const ogImage = `${proto}://${host}/api/public?resource=og&slug=${slug}`;

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
    <meta name="twitter:image" content="${ogImage}" />`;
            
            html = html.replace(/<title>.*?<\/title>/g, '');
            html = html.replace('</head>', `${metaTags}\n</head>`);
        }

        res.setHeader('Content-Type', 'text/html;charset=UTF-8');
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        return res.send(html);
    } catch (e: any) {
        console.error('Render error:', e);
        return res.status(500).send('Error rendering card');
    }
}
