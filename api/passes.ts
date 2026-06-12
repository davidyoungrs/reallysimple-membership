import { db } from '../src/db/index.js';
import { businessCards, users, memberships, clubs } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { PKPass } from 'passkit-generator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, validatePayload } from './_utils/security.js';

// Polyfill __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate certs folder
const CERT_DIR = path.join(__dirname, 'certs');

// export const config = {
//     runtime: 'edge', // Only if appropriate. Usually Node is safer for file ops.
// };

/**
 * Reads a certificate/key from an environment variable or local file.
 * Handles:
 *  - Stripping macOS Keychain "Bag Attributes" headers
 *  - Unescaping \\n sequences stored in env vars
 *  - Converting PKCS#8 private keys (-----BEGIN PRIVATE KEY-----) to PKCS#1
 *    RSA format (-----BEGIN RSA PRIVATE KEY-----) that node-forge can parse
 */
function getCertContent(envVar: string, fileName: string): string | null {
    let raw: string | null = null;

    try {
        if (fileName === 'wwdr.pem') {
            raw = fs.readFileSync(path.join(__dirname, 'certs/wwdr.pem'), 'utf8');
        } else if (fileName === 'signerCert.pem') {
            raw = fs.readFileSync(path.join(__dirname, 'certs/signerCert.pem'), 'utf8');
        } else if (fileName === 'signerKey.pem') {
            raw = fs.readFileSync(path.join(__dirname, 'certs/signerKey.pem'), 'utf8');
        } else if (fileName === 'wwdrKey.pem') {
            raw = fs.readFileSync(path.join(__dirname, 'certs/wwdrKey.pem'), 'utf8');
        }
    } catch (e) {
        // Fallback to environment variable
        const envVal = process.env[envVar];
        if (envVal) {
            let val = envVal.trim();
            // Strip surrounding quotes that some secret managers add
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            // Unescape literal \n sequences (env vars can't contain real newlines in some providers)
            val = val.replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\r/g, '').trim();
            raw = val;
        }
    }

    if (!raw) return null;

    // Strip any "Bag Attributes" / "Key Attributes" headers that macOS Keychain
    // exports prepend to the PEM block. We need only the PEM block itself.
    const certMatch = raw.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
    if (certMatch) return certMatch[0];

    // For private keys: convert PKCS#8 to PKCS#1 because node-forge's
    // decryptRsaPrivateKey() cannot parse unencrypted PKCS#8 keys.
    const pkcs8Match = raw.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/);
    if (pkcs8Match) {
        try {
            const privKey = crypto.createPrivateKey({ key: pkcs8Match[0], format: 'pem', type: 'pkcs8' });
            return privKey.export({ format: 'pem', type: 'pkcs1' }) as string;
        } catch (e) {
            console.error('[PassGen] PKCS#8->PKCS#1 conversion failed:', e);
            return pkcs8Match[0]; // fall back and let the library fail with its own error
        }
    }

    // Already PKCS#1 RSA key or some other format – just strip bag attributes
    const rsaKeyMatch = raw.match(/-----BEGIN RSA PRIVATE KEY-----[\s\S]+?-----END RSA PRIVATE KEY-----/);
    if (rsaKeyMatch) return rsaKeyMatch[0];

    const encKeyMatch = raw.match(/-----BEGIN ENCRYPTED PRIVATE KEY-----[\s\S]+?-----END ENCRYPTED PRIVATE KEY-----/);
    if (encKeyMatch) return encKeyMatch[0];

    // No known block found — return as-is (may still work or produce a clear error)
    console.warn(`[PassGen] getCertContent(${envVar}): no recognisable PEM block found, returning raw value`);
    return raw;
}

function cleanColorToRgb(color: string | undefined | null, defaultColor: string): string {
    if (!color) return defaultColor;
    const trimmed = color.trim();
    if (trimmed.startsWith('rgb(')) return trimmed;
    if (trimmed.startsWith('rgba(')) {
        const match = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (match) {
            return `rgb(${match[1]},${match[2]},${match[3]})`;
        }
    }
    
    let hex = trimmed.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            return `rgb(${r},${g},${b})`;
        }
    }
    
    return defaultColor;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!checkRateLimit(req, res)) return;
    if (!validatePayload(req, res)) return;

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const type = req.query.type as string; // 'apple' or 'google'
    const slug = req.query.slug as string;
    const resource = req.query.resource as string;

    if (!slug) return res.status(400).json({ error: 'Missing slug' });
    if (!type) return res.status(400).json({ error: 'Missing type (apple or google)' });

    if (resource === 'membership') {
        if (type === 'apple') {
            return await handleAppleMembershipPass(req, res, slug);
        } else if (type === 'google') {
            return await handleGoogleMembershipPass(req, res, slug);
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }
    }

    if (type === 'apple') {
        return await handleApplePass(req, res, slug);
    } else if (type === 'google') {
        return await handleGooglePass(req, res, slug);
    } else {
        return res.status(400).json({ error: 'Invalid type' });
    }
}

// --- HANDLERS ---

export async function handleApplePass(req: VercelRequest, res: VercelResponse, slug: string) {
    try {
        const host = req.headers.host || 'reallysimple-membership.vercel.app';
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
        const { getEffectiveTier, applyTierLimits } = await import('../src/utils/tier-limits.js');

        // Allow simulator overrides for testing
        const simStatus = req.query.sim_status as string;
        const simTier = req.query.sim_tier as string;

        const effectiveTier = getEffectiveTier({
            tier: (simTier as any) || (user?.tier as any) || 'starter',
            status: (simStatus as any) || (user?.subscriptionStatus as any),
            currentPeriodEnd: user?.currentPeriodEnd ?? null
        });

        const data = applyTierLimits(card.data as any, effectiveTier);

        const teamId = process.env.APPLE_TEAM_ID;
        const passTypeId = process.env.APPLE_PASS_TYPE_ID;

        if (!teamId || !passTypeId) {
            console.error('[PassGen] Missing APPLE_TEAM_ID or APPLE_PASS_TYPE_ID');
            return res.status(500).json({ error: 'Server configuration error: Missing Apple IDs' });
        }

        try {
            console.log('[PassGen] files in certs:', fs.readdirSync(CERT_DIR));
        } catch (err) {
            console.error('[PassGen] failed to read certs dir:', err);
        }

        const certs = {
            wwdr: getCertContent('WALLET_WWDR_CERT', 'wwdr.pem'),
            signerCert: getCertContent('WALLET_SIGNER_CERT', 'signerCert.pem'),
            signerKey: getCertContent('WALLET_SIGNER_KEY', 'signerKey.pem'),
        };

        console.log('[PassGen] cert types:', {
            wwdr: certs.wwdr?.substring(0, 27),
            signerCert: certs.signerCert?.substring(0, 27),
            signerKey: certs.signerKey?.substring(0, 30),
        });

        if (!certs.wwdr || !certs.signerCert || !certs.signerKey) {
            return res.status(500).json({ error: 'Missing certificates' });
        }

        const modelPath = path.join(__dirname, 'certs/model.pass');
        if (!fs.existsSync(modelPath)) {
            console.error(`[PassGen] model.pass not found at: ${modelPath}`);
            return res.status(500).json({ error: 'Model.pass not found' });
        }

        const isHttps = !host.includes('localhost') && !host.includes('127.0.0.1');
        const protocol = isHttps ? 'https' : 'http';

        const pass = await PKPass.from(
            { model: modelPath, certificates: certs as any },
            {
                serialNumber: card.uid,
                ...(isHttps ? {
                    webServiceURL: `https://${host}/api`,
                    authenticationToken: Buffer.from(card.uid).toString('base64'),
                } : {}),
                description: effectiveTier === 'starter' ? 'Digital Card - Subscription Lapsed' : 'Digital Business Card',
                logoText: effectiveTier === 'starter' ? 'SUBSCRIPTION LAPSED' : (data.wallet?.showLogoText === false ? ' ' : (data.wallet?.logoText || data.company || 'Digital Card')),
                organizationName: data.company || 'Contact Tree',
                passTypeIdentifier: passTypeId,
                teamIdentifier: teamId,
                backgroundColor: cleanColorToRgb(data.wallet?.backgroundColor, 'rgb(255,255,255)'),
                foregroundColor: cleanColorToRgb(data.wallet?.foregroundColor, 'rgb(0,0,0)'),
                labelColor: cleanColorToRgb(data.wallet?.labelColor, 'rgb(0,0,0)'),
                voided: effectiveTier === 'starter'
            }
        );

        if (user && user.tier !== 'grandfathered' && user.tier !== 'business' && user.currentPeriodEnd) {
            (pass as any).setExpirationDate(user.currentPeriodEnd);
        }

        pass.type = 'storeCard';

        // Add Logic for Images (Logo, Strip)
        const addImage = async (url: string | undefined, name: string) => {
            if (!url) return;
            try {
                if (url.startsWith('/api/public') || url.includes('/api/public?')) {
                    const urlObj = new URL(url, 'http://localhost');
                    const key = urlObj.searchParams.get('key');
                    if (key) {
                        const { getFromR2 } = await import('../src/utils/storage.js');
                        const s3Response = await getFromR2(key);
                        if (s3Response.Body) {
                            const buffer = Buffer.from(await s3Response.Body.transformToByteArray());
                            pass.addBuffer(name, buffer);
                            if (name === 'logo.png') {
                                pass.addBuffer('logo@2x.png', buffer);
                                pass.addBuffer('logo@3x.png', buffer);
                            }
                            return;
                        }
                    }
                }

                if (url.startsWith('/')) {
                    const publicPath = path.join(process.cwd(), 'public', url);
                    if (fs.existsSync(publicPath)) {
                        const buffer = fs.readFileSync(publicPath);
                        pass.addBuffer(name, buffer);
                        // Retina Sync: Replace high-res versions in model to prevent fallback to default logo
                        if (name === 'logo.png') {
                            pass.addBuffer('logo@2x.png', buffer);
                            pass.addBuffer('logo@3x.png', buffer);
                        }
                    }
                } else if (url.startsWith('data:image')) {
                    const buffer = Buffer.from(url.split(',')[1], 'base64');
                    pass.addBuffer(name, buffer);
                    // Retina Sync: Replace high-res versions in model to prevent fallback to default logo
                    if (name === 'logo.png') {
                        pass.addBuffer('logo@2x.png', buffer);
                        pass.addBuffer('logo@3x.png', buffer);
                    }
                } else if (url.startsWith('http')) {
                    const response = await fetch(url);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        pass.addBuffer(name, buffer);
                        // Retina Sync: Replace high-res versions in model to prevent fallback to default logo
                        if (name === 'logo.png') {
                            pass.addBuffer('logo@2x.png', buffer);
                            pass.addBuffer('logo@3x.png', buffer);
                        }
                    }
                }
            } catch (err) {
                console.error(`Failed to add image ${name}:`, err);
            }
        };

        await addImage(data.wallet?.logoUrl || data.logoUrl, 'logo.png');
        if (data.wallet?.showStripImage !== false) {
            await addImage(data.wallet?.stripImageUrl || '/wallet-strip.png', 'strip.png');
        }

        // --- FIELD POPULATION ---
        if (effectiveTier !== 'starter') {
            // Fields (Main)
            if (data.wallet?.showNameFields !== false && !data.wallet?.hideStripText) {
                pass.primaryFields.push({ key: 'name', label: 'Name', value: data.fullName || 'Your Name' });
            }

            if (data.jobTitle && data.wallet?.showRole !== false) {
                pass.secondaryFields.push({ key: 'role', label: 'Role', value: data.jobTitle });
            }
            if (data.company && data.wallet?.showCompany !== false) {
                pass.secondaryFields.push({ key: 'company', label: 'Company', value: data.company });
            }

            // Back Fields
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
        } else {
            // Voided Pass Content
            pass.primaryFields.push({ key: 'status', label: 'OFFLINE', value: 'Reactivate via App' });
            pass.backFields.push({
                key: 'help',
                label: 'Why is this card inactive?',
                value: 'Your subscription has lapsed. Scan the QR code or visit our website to reactivate.'
            });
            // Override visibility for voided passes
            (pass as any).logoText = 'SUBSCRIPTION LAPSED';
        }

        // Barcode / QR Logic
        const publicCardUrl = `${protocol}://${host}/card/${slug}`;
        const qrUrl = effectiveTier === 'starter'
            ? `${protocol}://${host}/lapsed`
            : `${publicCardUrl}?src=wallet`;

        pass.setBarcodes({
            format: 'PKBarcodeFormatQR',
            message: qrUrl,
            messageEncoding: 'utf-8'
        });

        console.log('Generating pass buffer...');
        const buffer = pass.getAsBuffer();

        res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
        res.setHeader('Content-Disposition', `attachment; filename=${slug}.pkpass`);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

        // To ensure Apple Wallet accepts this pass, the `last-modified` header MUST be >= the tag 
        // returned in the registrations endpoint. Since tier changes don't update `card.updatedAt`, 
        // we pull the exact `updatedAt` from the walletPushRegistrations table which is bumped during pushes.
        const { walletPushRegistrations } = await import('../src/db/schema.js');
        const reg = await db.select({ updatedAt: walletPushRegistrations.updatedAt })
            .from(walletPushRegistrations)
            .where(eq(walletPushRegistrations.serialNumber, card.uid))
            .limit(1);

        let lastUpdatedObj = new Date();
        if (reg.length > 0 && reg[0].updatedAt) {
            lastUpdatedObj = reg[0].updatedAt;
        } else if (card.updatedAt) {
            lastUpdatedObj = new Date(card.updatedAt);
        }

        const lastUpdated = lastUpdatedObj.toISOString().split('.')[0] + 'Z';
        res.setHeader('last-modified', lastUpdated);
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
        const { getEffectiveTier, applyTierLimits } = await import('../src/utils/tier-limits.js');

        // Allow simulator overrides for testing
        const simStatus = req.query.sim_status as string;
        const simTier = req.query.sim_tier as string;

        const effectiveTier = getEffectiveTier({
            tier: (simTier as any) || (user?.tier as any) || 'starter',
            status: (simStatus as any) || (user?.subscriptionStatus as any),
            currentPeriodEnd: user?.currentPeriodEnd ?? null
        });

        const card = applyTierLimits(cardRecord.data as any, effectiveTier);

        const classId = `${GOOGLE_ISSUER_ID}.contact-tree-standard-v3`;
        const objectId = `${GOOGLE_ISSUER_ID}.${slug.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}`; // Stable ID for auto-syncing

        // Force Production URL for Google to reach images
        const baseUrl = 'https://reallysimple-membership.vercel.app';

        const toAbsoluteUrl = (url: string) => {
            if (!url || url.startsWith('data:')) return '';
            if (url.startsWith('http')) return url;
            return new URL(url, baseUrl).toString();
        };

        // Helper to find first non-data-uri logo
        const getValidUrl = (preferred: string | undefined, secondary: string | undefined, fallback: string) => {
            if (preferred && !preferred.startsWith('data:')) return toAbsoluteUrl(preferred);
            if (secondary && !secondary.startsWith('data:')) return toAbsoluteUrl(secondary);
            return toAbsoluteUrl(fallback);
        };

        const logoUrl = getValidUrl(card.wallet?.logoUrl, card.logoUrl, '/icon.png');
        const heroUrl = getValidUrl(card.wallet?.stripImageUrl, '/wallet-strip.png', '/wallet-strip.png');

        if (card.wallet?.logoUrl?.startsWith('data:')) {
            console.warn(`[PassGen] Google Wallet does not support data URIs. Falling back for logo.`);
        }
        const title = (card.wallet?.logoText || card.company || 'Digital Card').substring(0, 50);
        const headerValue = (card.wallet?.showNameFields !== false && !card.wallet?.hideStripText) ? (card.fullName || 'Digital Card').substring(0, 50) : ' ';

        const subheaderParts = [];
        if (card.wallet?.showRole !== false && card.jobTitle && !card.wallet?.hideStripText) subheaderParts.push(card.jobTitle);
        if (card.wallet?.showCompany !== false && card.company && !card.wallet?.hideStripText) subheaderParts.push(card.company);
        const subheaderValue = subheaderParts.join(' | ').substring(0, 50) || ' ';

        const textModules: any[] = [
            { header: 'Phone', body: card.phoneNumbers?.[0]?.number || '', id: 'phone' },
            { header: 'Email', body: card.socialLinks?.find((l: any) => l.platform === 'email')?.url.replace('mailto:', '') || user?.email || '', id: 'email' },
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
                    ...(card.wallet?.showStripImage !== false ? {
                        heroImage: {
                            sourceUri: { uri: heroUrl },
                            contentDescription: { defaultValue: { language: 'en-US', value: 'HERO' } }
                        }
                    } : {}),
                    cardTitle: { defaultValue: { language: 'en-US', value: effectiveTier === 'starter' ? 'SUBSCRIPTION LAPSED' : title } },
                    header: { defaultValue: { language: 'en-US', value: effectiveTier === 'starter' ? 'INACTIVE' : headerValue } },
                    subheader: { defaultValue: { language: 'en-US', value: effectiveTier === 'starter' ? 'Reactivate via app' : subheaderValue } },
                    state: effectiveTier === 'starter' ? 'expired' : 'active',
                    textModulesData: effectiveTier === 'starter' ? [] : textModules.slice(0, 10), // Limit to 10 modules
                    barcode: {
                        type: 'QR_CODE',
                        value: effectiveTier === 'starter' ? `${baseUrl}/lapsed` : `${baseUrl}/card/${slug}`,
                        alternateText: effectiveTier === 'starter' ? 'SCAN TO REACTIVATE' : 'Scan to View'
                    }
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

export async function handleAppleMembershipPass(req: VercelRequest, res: VercelResponse, slug: string) {
    let certs: any = null;
    try {
        console.log(`[PassGen-Membership] Generating Apple Pass for slug: ${slug}`);

        const results = await db.select({
            membership: memberships,
            club: clubs,
        })
        .from(memberships)
        .innerJoin(clubs, eq(memberships.clubId, clubs.id))
        .where(eq(memberships.slug, slug))
        .limit(1);

        if (results.length === 0) return res.status(404).send('Membership not found');

        const { membership, club } = results[0];
        const cardConfig = membership.cardConfig as any;

        const teamId = process.env.APPLE_TEAM_ID;
        const passTypeId = process.env.APPLE_PASS_TYPE_ID;

        if (!teamId || !passTypeId) {
            console.error('[PassGen-Membership] Missing APPLE_TEAM_ID or APPLE_PASS_TYPE_ID');
            return res.status(500).json({ error: 'Server configuration error: Missing Apple IDs' });
        }

        try {
            console.log('[PassGen-Membership] files in certs:', fs.readdirSync(CERT_DIR));
        } catch (err) {
            console.error('[PassGen-Membership] failed to read certs dir:', err);
        }

        certs = {
            wwdr: getCertContent('WALLET_WWDR_CERT', 'wwdr.pem'),
            signerCert: getCertContent('WALLET_SIGNER_CERT', 'signerCert.pem'),
            signerKey: getCertContent('WALLET_SIGNER_KEY', 'signerKey.pem'),
        };

        console.log('[PassGen-Membership] cert types:', {
            wwdr: certs.wwdr?.substring(0, 27),
            signerCert: certs.signerCert?.substring(0, 27),
            signerKey: certs.signerKey?.substring(0, 30),
        });

        if (!certs.wwdr || !certs.signerCert || !certs.signerKey) {
            return res.status(500).json({ error: 'Missing certificates' });
        }

        const modelPath = path.join(__dirname, 'certs/model.pass');
        if (!fs.existsSync(modelPath)) {
            console.error(`[PassGen-Membership] model.pass not found at: ${modelPath}`);
            return res.status(500).json({ error: 'Model.pass not found' });
        }

        const host = req.headers.host || 'reallysimple-membership.vercel.app';
        const isHttps = !host.includes('localhost') && !host.includes('127.0.0.1');
        const protocol = isHttps ? 'https' : 'http';

        const isVoided = membership.status === 'expired' || membership.status === 'revoked';

        const pass = await PKPass.from(
            { model: modelPath, certificates: certs as any },
            {
                serialNumber: membership.uid,
                ...(isHttps ? {
                    webServiceURL: `https://${host}/api`,
                    authenticationToken: Buffer.from(membership.uid).toString('base64'),
                } : {}),
                description: isVoided ? `${club.name} Membership - Inactive` : `${club.name} Membership Card`,
                logoText: isVoided ? 'INACTIVE' : (cardConfig.showClubName === false ? ' ' : club.name),
                organizationName: club.name,
                passTypeIdentifier: passTypeId,
                teamIdentifier: teamId,
                backgroundColor: cleanColorToRgb(cardConfig.walletBackgroundColor, 'rgb(255,255,255)'),
                foregroundColor: cleanColorToRgb(cardConfig.walletForegroundColor, 'rgb(0,0,0)'),
                labelColor: cleanColorToRgb(cardConfig.walletLabelColor, 'rgb(0,0,0)'),
                voided: isVoided,
            }
        );

        if (membership.expiresAt) {
            (pass as any).setExpirationDate(new Date(membership.expiresAt));
        }

        pass.type = 'storeCard';

        const addImage = async (url: string | undefined, name: string) => {
            if (!url) return;
            try {
                if (url.startsWith('/api/public') || url.includes('/api/public?')) {
                    const urlObj = new URL(url, 'http://localhost');
                    const key = urlObj.searchParams.get('key');
                    if (key) {
                        const { getFromR2 } = await import('../src/utils/storage.js');
                        const s3Response = await getFromR2(key);
                        if (s3Response.Body) {
                            const buffer = Buffer.from(await s3Response.Body.transformToByteArray());
                            pass.addBuffer(name, buffer);
                            if (name === 'logo.png') {
                                pass.addBuffer('logo@2x.png', buffer);
                                pass.addBuffer('logo@3x.png', buffer);
                            }
                            return;
                        }
                    }
                }

                if (url.startsWith('/')) {
                    const publicPath = path.join(process.cwd(), 'public', url);
                    if (fs.existsSync(publicPath)) {
                        const buffer = fs.readFileSync(publicPath);
                        pass.addBuffer(name, buffer);
                        if (name === 'logo.png') {
                            pass.addBuffer('logo@2x.png', buffer);
                            pass.addBuffer('logo@3x.png', buffer);
                        }
                    }
                } else if (url.startsWith('data:image')) {
                    const buffer = Buffer.from(url.split(',')[1], 'base64');
                    pass.addBuffer(name, buffer);
                    if (name === 'logo.png') {
                        pass.addBuffer('logo@2x.png', buffer);
                        pass.addBuffer('logo@3x.png', buffer);
                    }
                } else if (url.startsWith('http')) {
                    const response = await fetch(url);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        pass.addBuffer(name, buffer);
                        if (name === 'logo.png') {
                            pass.addBuffer('logo@2x.png', buffer);
                            pass.addBuffer('logo@3x.png', buffer);
                        }
                    }
                }
            } catch (err) {
                console.error(`Failed to add image ${name} to pass:`, err);
            }
        };

        if (cardConfig.showClubLogo !== false) {
            await addImage(club.logoUrl || '/icon.png', 'logo.png');
        }
        await addImage(membership.stripImageUrl || '/wallet-strip.png', 'strip.png');

        if (!isVoided) {
            if (cardConfig.showMembershipType !== false) {
                pass.secondaryFields.push({
                    key: 'membership-type',
                    label: 'Membership Type',
                    value: membership.membershipType,
                });
            }

            if (cardConfig.showMembershipNumber !== false) {
                pass.secondaryFields.push({
                    key: 'membership-number',
                    label: 'Membership Number',
                    value: membership.membershipNumber,
                });
            }

            const verificationUrl = `${protocol}://${host}/membership/${membership.slug}`;
            pass.backFields.push({
                key: 'verification-url',
                label: 'Verify Membership',
                value: 'Verify Online',
                attributedValue: `<a href="${verificationUrl}">Verify Membership Online</a>`
            } as any);

            pass.backFields.push({
                key: 'member-name',
                label: 'Member Name',
                value: membership.memberName,
            });

            pass.backFields.push({
                key: 'member-email',
                label: 'Email Address',
                value: membership.memberEmail,
            });

            if (membership.expiresAt) {
                pass.backFields.push({
                    key: 'expiry-date',
                    label: 'Expiry Date',
                    value: new Date(membership.expiresAt).toLocaleDateString(),
                });
            }

            pass.backFields.push({
                key: 'powered-by',
                label: ' ',
                value: 'Powered by Really Simple',
                attributedValue: '<a href="https://reallysimpleapps.com">Powered by Really Simple</a>'
            } as any);
        } else {
            pass.primaryFields.push({ key: 'status', label: 'STATUS', value: 'INACTIVE' });
            pass.backFields.push({
                key: 'reason',
                label: 'Why is this pass inactive?',
                value: `Your membership at ${club.name} is ${membership.status}. Please contact the club administrator to renew or reactivate.`,
            });
        }

        const verificationUrl = `${protocol}://${host}/membership/${membership.slug}`;
        pass.setBarcodes({
            format: 'PKBarcodeFormatQR',
            message: verificationUrl,
            messageEncoding: 'utf-8',
        });

        console.log('Generating pass buffer for membership...');
        const buffer = pass.getAsBuffer();

        res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
        res.setHeader('Content-Disposition', `attachment; filename=membership_${membership.membershipNumber}.pkpass`);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

        const lastUpdatedStr = new Date(membership.updatedAt || new Date()).toISOString().split('.')[0] + 'Z';
        res.setHeader('last-modified', lastUpdatedStr);
        return res.status(200).send(buffer);

    } catch (error: any) {
        console.error('Apple Pass Generation Error:', error);
        return res.status(500).json({ error: 'Failed to generate Apple Wallet pass', details: error.message });
    }
}

export async function handleGoogleMembershipPass(req: VercelRequest, res: VercelResponse, slug: string) {
    const GOOGLE_ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
    const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_CLIENT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!GOOGLE_ISSUER_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        console.error("Missing Google Wallet credentials");
        return res.status(500).json({ error: 'Missing server configuration (Google Wallet)' });
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
        console.log(`[PassGen-Membership] Generating Google Pass for slug: ${slug}`);

        const results = await db.select({
            membership: memberships,
            club: clubs,
        })
        .from(memberships)
        .innerJoin(clubs, eq(memberships.clubId, clubs.id))
        .where(eq(memberships.slug, slug))
        .limit(1);

        if (results.length === 0) return res.status(404).json({ error: 'Membership not found' });

        const { membership, club } = results[0];
        const cardConfig = membership.cardConfig as any;

        const classId = `${GOOGLE_ISSUER_ID}.contact-tree-membership-v1`;
        const objectId = `${GOOGLE_ISSUER_ID}.${membership.uid.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}`;

        const baseUrl = 'https://reallysimple-membership.vercel.app';

        const toAbsoluteUrl = (url: string) => {
            if (!url || url.startsWith('data:')) return '';
            if (url.startsWith('http')) return url;
            return new URL(url, baseUrl).toString();
        };

        const getValidUrl = (preferred: string | undefined, secondary: string | undefined, fallback: string) => {
            if (preferred && !preferred.startsWith('data:')) return toAbsoluteUrl(preferred);
            if (secondary && !secondary.startsWith('data:')) return toAbsoluteUrl(secondary);
            return toAbsoluteUrl(fallback);
        };

        const logoUrl = getValidUrl(club.logoUrl, '/icon.png', '/icon.png');
        const stripUrl = getValidUrl(membership.stripImageUrl, '/wallet-strip.png', '/wallet-strip.png');

        const title = club.name.substring(0, 50);
        const isVoided = membership.status === 'expired' || membership.status === 'revoked';

        const textModules: any[] = [
            { header: 'Member Name', body: membership.memberName, id: 'member_name' },
            { header: 'Email Address', body: membership.memberEmail, id: 'member_email' },
            { header: 'Status', body: membership.status.toUpperCase(), id: 'member_status' },
        ];

        if (membership.expiresAt) {
            textModules.push({
                header: 'Expiry Date',
                body: new Date(membership.expiresAt).toLocaleDateString(),
                id: 'expiry_date'
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
                    ...(membership.expiresAt ? {
                        validTimeInterval: {
                            end: {
                                date: {
                                    year: new Date(membership.expiresAt).getFullYear(),
                                    month: new Date(membership.expiresAt).getMonth() + 1,
                                    day: new Date(membership.expiresAt).getDate(),
                                    hours: new Date(membership.expiresAt).getHours(),
                                    minutes: new Date(membership.expiresAt).getMinutes(),
                                    seconds: new Date(membership.expiresAt).getSeconds(),
                                }
                            }
                        }
                    } : {}),
                    genericType: 'GENERIC_TYPE_UNSPECIFIED',
                    hexBackgroundColor: cardConfig.walletBackgroundColor || '#4f46e5',
                    logo: {
                        sourceUri: { uri: logoUrl },
                        contentDescription: { defaultValue: { language: 'en-US', value: 'LOGO' } }
                    },
                    heroImage: {
                        sourceUri: { uri: stripUrl },
                        contentDescription: { defaultValue: { language: 'en-US', value: 'STRIP' } }
                    },
                    cardTitle: { defaultValue: { language: 'en-US', value: isVoided ? 'INACTIVE MEMBERSHIP' : title } },
                    header: { defaultValue: { language: 'en-US', value: membership.membershipType } },
                    subheader: { defaultValue: { language: 'en-US', value: membership.membershipNumber } },
                    state: isVoided ? 'expired' : 'active',
                    textModulesData: textModules,
                    barcode: {
                        type: 'QR_CODE',
                        value: `${baseUrl}/membership/${membership.slug}`,
                        alternateText: 'Scan to Verify'
                    }
                }],
                genericClasses: [{
                    id: classId,
                    classTemplateInfo: {
                        cardTemplateOverride: {
                            cardRowTemplateInfos: [
                                { twoItems: { startItem: { firstValue: { fields: [{ fieldPath: 'object.textModulesData["member_name"]' }] } }, endItem: { firstValue: { fields: [{ fieldPath: 'object.textModulesData["expiry_date"]' }] } } } }
                            ]
                        }
                    }
                }]
            }
        };

        const token = jwt.sign(newPass, GOOGLE_PRIVATE_KEY, { algorithm: 'RS256' });
        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        return res.status(200).json({ saveUrl });

    } catch (error: any) {
        console.error('Google Pass Generation Error:', error);
        return res.status(500).json({ error: 'Failed to generate Google pass', details: error.message });
    }
}
