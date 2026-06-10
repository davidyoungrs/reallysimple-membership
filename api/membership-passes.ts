import { db } from '../src/db/index.js';
import { memberships, clubs } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { PKPass } from 'passkit-generator';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, validatePayload } from './_utils/security.js';

const CERT_DIR = path.join(process.cwd(), 'certs');

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

    if (!slug) return res.status(400).json({ error: 'Missing slug' });
    if (!type) return res.status(400).json({ error: 'Missing type (apple or google)' });

    if (type === 'apple') {
        return await handleAppleMembershipPass(req, res, slug);
    } else if (type === 'google') {
        return await handleGoogleMembershipPass(req, res, slug);
    } else {
        return res.status(400).json({ error: 'Invalid type' });
    }
}

export async function handleAppleMembershipPass(req: VercelRequest, res: VercelResponse, slug: string) {
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

        // Set Pass Layout Type to generic (membership layout recommended by Apple)
        pass.type = 'generic';

        // Add Logo and Strip images
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
            // Fields (Main Layout)
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

            // Back Fields for member information
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
        } else {
            // Voided Pass fields
            pass.primaryFields.push({ key: 'status', label: 'STATUS', value: 'INACTIVE' });
            pass.backFields.push({
                key: 'reason',
                label: 'Why is this pass inactive?',
                value: `Your membership at ${club.name} is ${membership.status}. Please contact the club administrator to renew or reactivate.`,
            });
        }

        // Barcode / QR logic pointing to public verification page
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

        const lastUpdatedStr = new Date(membership.updatedAt || new Date()).toISOString().split('.')[0] + 'Z';
        res.setHeader('last-modified', lastUpdatedStr);
        return res.status(200).send(buffer);

    } catch (error: any) {
        console.error('Apple Pass Generation Error:', error);
        return res.status(500).json({ error: 'Failed to generate Apple Wallet pass', details: error.message });
    }
}

async function handleGoogleMembershipPass(req: VercelRequest, res: VercelResponse, slug: string) {
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
        const objectId = `${GOOGLE_ISSUER_ID}.membership_${membership.uid}`;

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
