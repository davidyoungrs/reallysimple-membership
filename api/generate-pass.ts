import { db } from '../src/db/index.js';
import { businessCards } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { PKPass } from 'passkit-generator';
import fs from 'fs';
import path from 'path';

// Load certs from local file system (in a real app these would be secrets/env vars)
const CERT_DIR = path.join(process.cwd(), 'certs');

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Check if it's a standard Request object or Node request
    if (req.method !== 'GET') {
        return res.status(405).send('Method not allowed');
    }

    const host = req.headers.host || 'localhost';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const url = new URL(req.url || '', `${protocol}://${host}`);
    const slug = url.searchParams.get('slug') || req.query.slug as string;

    if (!slug) {
        return res.status(400).send('Missing slug');
    }

    try {
        console.log(`[PassGen] verify requests for slug: ${slug}`);

        // 1. Fetch Card Data
        const cards = await db
            .select()
            .from(businessCards)
            .where(eq(businessCards.slug, slug))
            .limit(1);

        if (cards.length === 0) {
            console.error('[PassGen] Card not found');
            return res.status(404).send('Card not found');
        }

        const card = cards[0];
        const data = card.data as any;

        // 2. Prepare Certs & IDs
        const teamId = process.env.APPLE_TEAM_ID;
        const passTypeId = process.env.APPLE_PASS_TYPE_ID;

        if (!teamId || !passTypeId) {
            console.error('[PassGen] Missing APPLE_TEAM_ID or APPLE_PASS_TYPE_ID');
            return res.status(500).json({ error: 'Server configuration error: Missing Apple IDs' });
        }

        // Helper to get cert content
        const getCertContent = (envVar: string, fileName: string) => {
            if (process.env[envVar]) {
                console.log(`[PassGen] Loaded ${fileName} from Env Var`);
                // Handle potential escaped newlines in env vars
                return process.env[envVar]!.replace(/\\n/g, '\n');
            }
            // Fallback to local file
            const localPath = path.join(CERT_DIR, fileName);
            if (fs.existsSync(localPath)) {
                console.log(`[PassGen] Loaded ${fileName} from local file: ${localPath}`);
                return fs.readFileSync(localPath, 'utf8');
            }
            console.error(`[PassGen] Missing certificate: ${fileName}`);
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

        // Verify model.pass path
        const modelPath = path.join(process.cwd(), 'certs', 'model.pass');
        if (!fs.existsSync(modelPath)) {
            console.error(`[PassGen] model.pass not found at: ${modelPath}`);
            // List contents of current dir to help debug
            console.log('[PassGen] CWD contents:', fs.readdirSync(process.cwd()));
            if (fs.existsSync(path.join(process.cwd(), 'certs'))) {
                console.log('[PassGen] certs/ contents:', fs.readdirSync(path.join(process.cwd(), 'certs')));
            }
            return res.status(500).json({ error: `Server configuration error: model.pass not found at ${modelPath}` });
        }

        console.log(`[PassGen] found model.pass at ${modelPath}`);

        const pass = await PKPass.from(
            {
                model: modelPath,
                certificates: certs as any, // Cast to avoid strict type issues if checks passed
            },
            {
                serialNumber: card.uid,
                description: 'Digital Business Card',
                logoText: data.wallet?.showLogoText === false ? '' : (data.wallet?.logoText || data.company || 'Digital Card'),
                organizationName: data.company || 'Contact Tree',
                passTypeIdentifier: passTypeId,
                teamIdentifier: teamId,
                backgroundColor: data.wallet?.backgroundColor || 'rgb(255,255,255)',
                foregroundColor: data.wallet?.foregroundColor || 'rgb(0,0,0)',
                labelColor: data.wallet?.labelColor || 'rgb(0,0,0)',
            }
        );

        pass.type = 'storeCard';

        // Add logo image if specified
        const logoUrl = data.wallet?.logoUrl || data.logoUrl;
        if (logoUrl) {
            try {
                if (logoUrl.startsWith('/')) {
                    const publicPath = path.join(process.cwd(), 'public', logoUrl);
                    if (fs.existsSync(publicPath)) {
                        pass.addBuffer('logo.png', fs.readFileSync(publicPath));
                    }
                } else if (logoUrl.startsWith('data:image')) {
                    const buffer = Buffer.from(logoUrl.split(',')[1], 'base64');
                    pass.addBuffer('logo.png', buffer);
                }
                // Remote URLs could be added here too with fetch, but sticking to local/data for now
            } catch (err) {
                console.error('[PassGen] Error adding logo image:', err);
            }
        }

        // Add strip image if specified
        const stripImageUrl = data.wallet?.stripImageUrl || '/wallet-strip.png';
        if (stripImageUrl) {
            try {
                // If it's a relative path to public, load from fs
                if (stripImageUrl.startsWith('/')) {
                    const publicPath = path.join(process.cwd(), 'public', stripImageUrl);
                    if (fs.existsSync(publicPath)) {
                        pass.addBuffer('strip.png', fs.readFileSync(publicPath));
                    }
                } else if (stripImageUrl.startsWith('data:image')) {
                    const buffer = Buffer.from(stripImageUrl.split(',')[1], 'base64');
                    pass.addBuffer('strip.png', buffer);
                }
            } catch (err) {
                console.error('[PassGen] Error adding strip image:', err);
            }
        }

        pass.primaryFields.push({
            key: 'name',
            label: 'Name',
            value: data.fullName || data.name || 'Your Name',
        });

        if (data.jobTitle && data.wallet?.showRole !== false) {
            pass.secondaryFields.push({
                key: 'role',
                label: 'Role',
                value: data.jobTitle,
            });
        }

        if (data.company && data.wallet?.showCompany !== false) {
            pass.secondaryFields.push({
                key: 'company',
                label: 'Company',
                value: data.company,
            });
        }

        // --- Back Fields (Metadata & Links) ---

        // 1. Link to the digital card itself
        const publicCardUrl = `${protocol}://${host}/card/${slug}`;
        pass.backFields.push({
            key: 'card-url',
            label: 'My Digital Card',
            value: 'Open Card',
            attributedValue: `<a href="${publicCardUrl}">Open Card</a>`,
        } as any);

        // 2. Phone Numbers
        if (data.phoneNumbers && Array.isArray(data.phoneNumbers)) {
            data.phoneNumbers.forEach((phone: any, index: number) => {
                pass.backFields.push({
                    key: `phone-${index}`,
                    label: phone.label || 'Phone',
                    value: phone.number,
                });
            });
        }

        // 3. Email & Social Links
        if (data.socialLinks && Array.isArray(data.socialLinks)) {
            data.socialLinks.forEach((link: any, index: number) => {
                let label = link.label || link.platform;
                let value = link.url;
                let attributedValue = undefined;

                // Capitalize label
                label = label.charAt(0).toUpperCase() + label.slice(1);

                if (link.platform === 'email') {
                    // For emails, just show the email address (it's auto-linkable and useful to read)
                    value = value.replace('mailto:', '');
                } else if (link.platform === 'phone') {
                    value = value.replace('tel:', '');
                } else {
                    // For web links (socials, custom, website), use "Link" text
                    // Ensure URL is absolute for the href
                    let href = value;
                    if (!href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('tel')) {
                        href = `https://${href}`;
                    }

                    attributedValue = `<a href="${href}">Link</a>`;
                    value = 'Link'; // Fallback text
                }

                pass.backFields.push({
                    key: `social-${index}`,
                    label: label,
                    value: value,
                    attributedValue: attributedValue,
                } as any);
            });
        }

        // Add QR Code
        const publicUrl = `${protocol}://${host}/card/${slug}?src=wallet`;
        pass.setBarcodes({
            format: 'PKBarcodeFormatQR',
            message: publicUrl,
            messageEncoding: 'utf-8',
        });

        console.log('Generating pass buffer...');
        const buffer = pass.getAsBuffer();
        console.log('Buffer generated. Size:', buffer.length);

        res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
        res.setHeader('Content-Disposition', `attachment; filename=${slug}.pkpass`);
        res.status(200).send(buffer);

    } catch (error: any) {
        console.error('Pass Generation Error:', error);
        // Include stack trace only if safe (usually not in prod, but needed for debugging now)
        return res.status(500).json({
            error: 'Failed to generate pass',
            details: error.message,
            stack: error.stack
        });
    }
}
