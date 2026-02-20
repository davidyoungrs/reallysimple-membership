import { db } from '../src/db/index.js';
import { businessCards, users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { PKPass } from 'passkit-generator';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// export const config = {
//     runtime: 'edge', // Only if appropriate. Usually Node is safer for file ops.
// };

// Use process.cwd() to locate certs in Vercel environment
const CERT_DIR = path.join(process.cwd(), 'certs');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const type = req.query.type as string; // 'apple' or 'google'
    const slug = req.query.slug as string;

    if (!slug) return res.status(400).json({ error: 'Missing slug' });
    if (!type) return res.status(400).json({ error: 'Missing type (apple or google)' });

    if (type === 'apple') {
        return await handleApplePass(req, res, slug);
    } else if (type === 'google') {
        return await handleGooglePass(req, res, slug);
    } else {
        return res.status(400).json({ error: 'Invalid type' });
    }
}

// --- HANDLERS ---

async function handleApplePass(req: VercelRequest, res: VercelResponse, slug: string) {
    try {
        console.log(`[PassGen] Generating Apple Pass for slug: ${slug}`);

        const results = await db.select({
            card: businessCards,
            user: users
        })
            .from(businessCards)
            .leftJoin(users, eq(businessCards.userId, users.clerkId))
            .where(eq(businessCards.slug, slug))
            .limit(1);

        if (results.length === 0) return res.status(404).send('Card not found');

        const { card, user } = results[0];
        const data = card.data as any;

        const teamId = process.env.APPLE_TEAM_ID;
        const passTypeId = process.env.APPLE_PASS_TYPE_ID;

        if (!teamId || !passTypeId) {
            console.error('[PassGen] Missing APPLE_TEAM_ID or APPLE_PASS_TYPE_ID');
            return res.status(500).json({ error: 'Server configuration error: Missing Apple IDs' });
        }

        const getCertContent = (envVar: string, fileName: string) => {
            if (process.env[envVar]) return process.env[envVar]!.replace(/\\n/g, '\n');
            const localPath = path.join(CERT_DIR, fileName);
            if (fs.existsSync(localPath)) return fs.readFileSync(localPath, 'utf8');
            return null;
        };

        const certs = {
            wwdr: getCertContent('WALLET_WWDR_CERT', 'wwdr.pem'),
            signerCert: getCertContent('WALLET_SIGNER_CERT', 'signerCert.pem'),
            signerKey: getCertContent('WALLET_SIGNER_KEY', 'signerKey.pem'),
        };

        if (!certs.wwdr || !certs.signerCert || !certs.signerKey) {
            return res.status(500).json({ error: 'Missing certificates' });
        }

        const modelPath = path.join(process.cwd(), 'certs', 'model.pass');
        if (!fs.existsSync(modelPath)) {
            console.error(`[PassGen] model.pass not found at: ${modelPath}`);
            return res.status(500).json({ error: 'Model.pass not found' });
        }

        const pass = await PKPass.from(
            { model: modelPath, certificates: certs as any },
            {
                serialNumber: card.uid,
                description: 'Digital Business Card',
                logoText: data.wallet?.showLogoText === false ? ' ' : (data.wallet?.logoText || data.company || 'Digital Card'),
                organizationName: data.company || 'Contact Tree',
                passTypeIdentifier: passTypeId,
                teamIdentifier: teamId,
                backgroundColor: data.wallet?.backgroundColor || 'rgb(255,255,255)',
                foregroundColor: data.wallet?.foregroundColor || 'rgb(0,0,0)',
                labelColor: data.wallet?.labelColor || 'rgb(0,0,0)',
            }
        );

        if (user && user.tier !== 'grandfathered' && user.tier !== 'business' && user.currentPeriodEnd) {
            (pass as any).setExpirationDate(user.currentPeriodEnd);
            if (user.subscriptionStatus === 'canceled' || (user.subscriptionStatus === 'past_due' && user.currentPeriodEnd < new Date())) {
                (pass as any).voided = true;
            }
        }

        pass.type = 'storeCard';

        // Add Logic for Images (Logo, Strip)
        const addImage = (url: string | undefined, name: string) => {
            if (!url) return;
            if (url.startsWith('/')) {
                const publicPath = path.join(process.cwd(), 'public', url);
                if (fs.existsSync(publicPath)) pass.addBuffer(name, fs.readFileSync(publicPath));
            } else if (url.startsWith('data:image')) {
                const buffer = Buffer.from(url.split(',')[1], 'base64');
                pass.addBuffer(name, buffer);
            }
        };

        addImage(data.wallet?.logoUrl || data.logoUrl, 'logo.png');
        addImage(data.wallet?.stripImageUrl || '/wallet-strip.png', 'strip.png');

        // Fields
        pass.primaryFields.push({ key: 'name', label: 'Name', value: data.fullName || data.name || 'Your Name' });

        if (data.jobTitle && data.wallet?.showRole !== false) {
            pass.secondaryFields.push({ key: 'role', label: 'Role', value: data.jobTitle });
        }
        if (data.company && data.wallet?.showCompany !== false) {
            pass.secondaryFields.push({ key: 'company', label: 'Company', value: data.company });
        }

        // Back Fields
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host || 'localhost';
        const publicCardUrl = `${protocol}://${host}/card/${slug}`;

        pass.backFields.push({ key: 'card-url', label: 'My Digital Card', value: 'Open Card', attributedValue: `<a href="${publicCardUrl}">Open Card</a>` } as any);

        if (data.phoneNumbers && Array.isArray(data.phoneNumbers)) {
            data.phoneNumbers.forEach((phone: any, index: number) => {
                pass.backFields.push({ key: `phone-${index}`, label: phone.label || 'Phone', value: phone.number });
            });
        }

        if (data.socialLinks && Array.isArray(data.socialLinks)) {
            data.socialLinks.forEach((link: any, index: number) => {
                let label = (link.label || link.platform);
                label = label.charAt(0).toUpperCase() + label.slice(1);
                let value = link.url;
                let attributedValue = undefined;

                if (link.platform === 'email') value = value.replace('mailto:', '');
                else if (link.platform === 'phone') value = value.replace('tel:', '');
                else {
                    let href = value;
                    if (!href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('tel')) href = `https://${href}`;
                    attributedValue = `<a href="${href}">Link</a>`;
                    value = 'Link';
                }
                pass.backFields.push({ key: `social-${index}`, label, value, attributedValue } as any);
            });
        }

        pass.setBarcodes({ format: 'PKBarcodeFormatQR', message: `${publicCardUrl}?src=wallet`, messageEncoding: 'utf-8' });

        console.log('Generating pass buffer...');
        const buffer = pass.getAsBuffer();

        res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
        res.setHeader('Content-Disposition', `attachment; filename=${slug}.pkpass`);
        return res.status(200).send(buffer);

    } catch (error: any) {
        console.error('Apple Pass Error:', error);
        return res.status(500).json({ error: 'Failed to generate pass', details: error.message });
    }
}

async function handleGooglePass(req: VercelRequest, res: VercelResponse, slug: string) {
    const GOOGLE_ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_CLIENT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!GOOGLE_ISSUER_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        console.error("Missing Google Wallet credentials");
        return res.status(500).json({ error: 'Missing server configuration (Google Wallet)' });
    }

    // CORS headers for Google Pay Button interaction if needed
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        console.log(`[PassGen] Generating Google Pass for slug: ${slug}`);
        const results = await db.select({
            cardRecord: businessCards,
            user: users
        })
            .from(businessCards)
            .leftJoin(users, eq(businessCards.userId, users.clerkId))
            .where(eq(businessCards.slug, slug))
            .limit(1);

        if (!results.length) return res.status(404).json({ error: 'Card not found' });

        const { cardRecord, user } = results[0];
        const card = cardRecord.data as any;

        const classId = `${GOOGLE_ISSUER_ID}.contact-tree-standard-v3`;
        const objectId = `${GOOGLE_ISSUER_ID}.${slug.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}`; // Stable ID for auto-syncing

        // Force Production URL for Google to reach images
        const baseUrl = 'https://reallysimple-new.vercel.app';

        const toAbsoluteUrl = (url: string) => {
            if (!url) return '';
            if (url.startsWith('data:image')) return ''; // Google Wallet doesn't support data URIs for images in stateless JWT
            if (url.startsWith('http')) return url;
            return new URL(url, baseUrl).toString();
        };

        const logoUrl = toAbsoluteUrl(card.wallet?.logoUrl || card.logoUrl || '/icon.png');
        const heroUrl = toAbsoluteUrl(card.wallet?.stripImageUrl || '/wallet-strip.png');
        const title = (card.wallet?.logoText || card.company || 'Digital Card').substring(0, 50);
        const headerValue = (card.fullName || 'Digital Card').substring(0, 50);
        const subheaderValue = (card.jobTitle || card.company || 'Digital Business Card').substring(0, 50);

        const textModules: any[] = [
            { header: 'Phone', body: card.phoneNumbers?.[0]?.number || '', id: 'phone' },
            { header: 'Email', body: card.email || '', id: 'email' },
            { header: 'Website', body: `https://contact-tree.vercel.app/card/${slug}`, id: 'website' }
        ];

        // Add additional phone numbers
        if (card.phoneNumbers && card.phoneNumbers.length > 1) {
            card.phoneNumbers.slice(1).forEach((p: any, i: number) => {
                textModules.push({ header: p.label || `Phone ${i + 2}`, body: p.number, id: `phone_${p.id}` });
            });
        }

        // Add social links
        if (card.socialLinks && Array.isArray(card.socialLinks)) {
            card.socialLinks.forEach((link: any) => {
                if (link.url) {
                    textModules.push({
                        header: link.platform.charAt(0).toUpperCase() + link.platform.slice(1),
                        body: link.url,
                        id: `social_${link.id}`
                    });
                }
            });
        }

        const newPass = {
            iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            aud: 'google',
            typ: 'savetowallet',
            iat: Math.floor(Date.now() / 1000),
            payload: {
                genericObjects: [{
                    id: objectId,
                    classId: classId,
                    ...(user?.currentPeriodEnd && user.tier !== 'grandfathered' && user.tier !== 'business' ? {
                        validTimeInterval: {
                            end: {
                                date: {
                                    year: user.currentPeriodEnd.getFullYear(),
                                    month: user.currentPeriodEnd.getMonth() + 1,
                                    day: user.currentPeriodEnd.getDate(),
                                    hours: user.currentPeriodEnd.getHours(),
                                    minutes: user.currentPeriodEnd.getMinutes(),
                                    seconds: user.currentPeriodEnd.getSeconds()
                                }
                            }
                        }
                    } : {}),
                    genericType: 'GENERIC_TYPE_UNSPECIFIED',
                    hexBackgroundColor: card.wallet?.backgroundColor || card.themeColor || '#4f46e5',
                    logo: {
                        sourceUri: { uri: logoUrl },
                        contentDescription: { defaultValue: { language: 'en-US', value: 'LOGO' } }
                    },
                    heroImage: {
                        sourceUri: { uri: heroUrl },
                        contentDescription: { defaultValue: { language: 'en-US', value: 'HERO' } }
                    },
                    cardTitle: { defaultValue: { language: 'en-US', value: title } },
                    header: { defaultValue: { language: 'en-US', value: headerValue } },
                    subheader: { defaultValue: { language: 'en-US', value: subheaderValue } },
                    textModulesData: textModules.slice(0, 10), // Limit to 10 modules
                    barcode: { type: 'QR_CODE', value: `https://contact-tree.vercel.app/card/${slug}`, alternateText: 'Scan to View' }
                }],
                // Define class inline for statelessness
                genericClasses: [{
                    id: classId,
                    classTemplateInfo: {
                        cardTemplateOverride: {
                            cardRowTemplateInfos: [
                                { twoItems: { startItem: { firstValue: { fields: [{ fieldPath: 'object.textModulesData["phone"]' }] } }, endItem: { firstValue: { fields: [{ fieldPath: 'object.textModulesData["email"]' }] } } } },
                                { oneItem: { item: { firstValue: { fields: [{ fieldPath: 'object.textModulesData["website"]' }] } } } }
                            ]
                        }
                    }
                }]
            }
        };

        if (!jwt || !jwt.sign) {
            throw new Error('Internal Server Error: JWT library issue');
        }

        const token = jwt.sign(newPass, GOOGLE_PRIVATE_KEY, { algorithm: 'RS256' });
        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        return res.status(200).json({ saveUrl });

    } catch (error: any) {
        console.error('Google Pass Error:', error);
        return res.status(500).json({ error: 'Failed to generate Google pass', details: error.message });
    }
}
