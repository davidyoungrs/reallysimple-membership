import type { VercelRequest, VercelResponse } from '@vercel/node';

import jwt from 'jsonwebtoken';
import { db } from '../src/db/index.js';
import { businessCards } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

// Environment variables
const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Handle escaped newlines

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (!ISSUER_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
        console.error("Missing Google Wallet credentials");
        return res.status(500).json({ error: 'Missing server configuration (Google Wallet)' });
    }

    const slug = (req.query.slug as string) || (req.body?.slug as string);

    if (!slug) {
        return res.status(400).json({ error: 'Missing slug' });
    }

    try {
        console.log(`Generating Google Wallet pass for slug: ${slug}`);

        let cardData;
        try {
            // 1. Fetch Card Data
            // uses 'businessCards' table, not 'cards'
            cardData = await db.select().from(businessCards).where(eq(businessCards.slug, slug)).limit(1);
        } catch (dbError: any) {
            console.error('Database error fetching card:', dbError);
            return res.status(500).json({ error: 'Database connection failed', details: dbError.message });
        }

        if (!cardData || cardData.length === 0) {
            console.error(`Card not found for slug: ${slug}`);
            return res.status(404).json({ error: 'Card not found' });
        }

        const record = cardData[0];
        const card = record.data as any; // Cast JSONB data to any or specific type if available

        const classId = `${ISSUER_ID}.contact-tree-standard-v2`; // Bumped to v2 to force new class definition
        const objectId = `${ISSUER_ID}.${slug}-${Date.now()}`; // Unique object ID

        const toAbsoluteUrl = (url: string) => {
            if (!url) return '';
            if (url.startsWith('http')) return url;
            // FORCE PRODUCTION URL: Vercel Preview URLs are often private (401), causing Google to fail.
            const baseUrl = 'https://reallysimple-new.vercel.app';
            return new URL(url, baseUrl).toString();
        };

        const logoUrl = toAbsoluteUrl(card.logo_url || '/icon.png');
        console.log(`Debug Info: Logo URL=${logoUrl}`);

        console.log(`Debug Info: IssuerID=${ISSUER_ID}, ServiceAccount=${SERVICE_ACCOUNT_EMAIL?.substring(0, 5)}...`);
        console.log(`Debug Info: PrivateKey Length=${PRIVATE_KEY?.length}`);
        console.log(`Debug Info: jwt type=${typeof jwt}`);
        console.log(`Debug Info: jwt.sign type=${typeof jwt?.sign}`);

        if (!jwt || !jwt.sign) {
            console.error('CRITICAL: jsonwebtoken library not loaded correctly or missing .sign method');
            throw new Error('Internal Server Error: JWT library issue');
        }

        const title = (card.company || 'Digital Card').substring(0, 50); // Google limit


        const headerValue = (card.first_name + ' ' + card.last_name).substring(0, 50);
        const subheaderValue = (card.job_title || 'Digital Business Card').substring(0, 50);

        const newPass = {
            iss: SERVICE_ACCOUNT_EMAIL,
            aud: 'google',
            typ: 'savetowallet',
            iat: Math.floor(Date.now() / 1000),
            // origins: [], // Removed to avoid potential mismatches
            payload: {
                genericObjects: [
                    {
                        id: objectId,
                        classId: classId,
                        genericType: 'GENERIC_TYPE_UNSPECIFIED',
                        hexBackgroundColor: card.color_primary || '#4f46e5',
                        logo: {
                            sourceUri: {
                                uri: logoUrl,
                            },
                            contentDescription: {
                                defaultValue: {
                                    language: 'en-US',
                                    value: 'LOGO',
                                },
                            },
                        },
                        cardTitle: {
                            defaultValue: {
                                language: 'en-US',
                                value: title,
                            },
                        },
                        header: {
                            defaultValue: {
                                language: 'en-US',
                                value: headerValue,
                            },
                        },
                        subheader: {
                            defaultValue: {
                                language: 'en-US',
                                value: subheaderValue,
                            },
                        },
                        textModulesData: [
                            {
                                header: 'Phone',
                                body: card.phone_numbers ? String(card.phone_numbers[0]?.value || '').substring(0, 50) : '',
                                id: 'phone',
                            },
                            {
                                header: 'Email',
                                body: String(card.email || '').substring(0, 50),
                                id: 'email',
                            },
                            {
                                header: 'Website',
                                body: `https://contact-tree.vercel.app/card/${slug}`,
                                id: 'website',
                            }
                        ],
                        barcode: {
                            type: 'QR_CODE',
                            value: `https://contact-tree.vercel.app/card/${slug}`,
                            alternateText: 'Scan to View',
                        },
                    },
                ],
                // IMPORTANT: We define the class inline so we don't need to make an API call to create it first.
                // This makes the process stateless and faster.
                genericClasses: [
                    {
                        id: classId,
                        classTemplateInfo: {
                            cardTemplateOverride: {
                                cardRowTemplateInfos: [
                                    {
                                        twoItems: {
                                            startItem: {
                                                firstValue: {
                                                    fields: [
                                                        {
                                                            fieldPath: 'object.textModulesData["phone"]',
                                                        },
                                                    ],
                                                },
                                            },
                                            endItem: {
                                                firstValue: {
                                                    fields: [
                                                        {
                                                            fieldPath: 'object.textModulesData["email"]',
                                                        },
                                                    ],
                                                },
                                            },
                                        },
                                    },
                                    {
                                        oneItem: {
                                            item: {
                                                firstValue: {
                                                    fields: [
                                                        {
                                                            fieldPath: 'object.textModulesData["website"]',
                                                        },
                                                    ],
                                                },
                                            }
                                        }
                                    }
                                ],
                            },
                        },
                    },
                ],
            },
        };

        // 3. Sign the JWT
        // Ensure privateKey corresponds to the service account email
        let token;
        try {
            token = jwt.sign(newPass, PRIVATE_KEY as string, {
                algorithm: 'RS256',
            });
        } catch (signError: any) {
            console.error('Error signing JWT:', signError);
            throw new Error(`JWT Signing Failed: ${signError.message}`);
        }

        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        return res.status(200).json({ saveUrl });

    } catch (error: any) {
        console.error('Error in generate-google-pass handler:', error);
        // Ensure we always return JSON, even for unknown errors
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    }
}
