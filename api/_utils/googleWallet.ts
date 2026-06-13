import { GoogleAuth } from 'google-auth-library';

let auth: GoogleAuth | null = null;

export async function getGoogleAuthToken() {
    if (!auth) {
        const email = process.env.GOOGLE_WALLET_CLIENT_EMAIL?.trim();
        const key = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, '');

        if (!email || !key) {
            throw new Error('Google Wallet credentials missing');
        }

        auth = new GoogleAuth({
            credentials: {
                client_email: email,
                private_key: key
            },
            scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
        });
    }

    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
}

export async function patchGoogleWalletObject(objectId: string, payload: any) {
    const token = await getGoogleAuthToken();
    if (!token) throw new Error('Failed to obtain Google Auth Token');

    const response = await fetch(`https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${objectId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Google Wallet API error: ${response.status} ${errData}`);
    }

    return await response.json();
}

export async function revokeGoogleWalletObject(objectId: string) {
    // According to Google Wallet API, setting state to 'inactive' effectively revokes it
    return await patchGoogleWalletObject(objectId, { state: 'inactive' });
}

export function buildGoogleWalletMembershipObject(
    membership: any, 
    club: any, 
    template: any, 
    baseUrl: string, 
    GOOGLE_ISSUER_ID: string
) {
    const cardConfig = membership.cardConfig as any;
    const classId = `${GOOGLE_ISSUER_ID}.contact-tree-membership-v1`;
    const objectId = `${GOOGLE_ISSUER_ID}.${membership.uid.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}`;

    const toAbsoluteUrl = (url: string) => {
        if (!url || url.startsWith('data:')) return '';
        if (url.startsWith('http')) return url;
        return new URL(url, baseUrl).toString();
    };

    const getValidUrl = (preferred: string | undefined, secondary: string | undefined, fallback?: string) => {
        if (preferred && !preferred.startsWith('data:')) return toAbsoluteUrl(preferred);
        if (secondary && !secondary.startsWith('data:')) return toAbsoluteUrl(secondary);
        return fallback ? toAbsoluteUrl(fallback) : '';
    };

    const logoUrl = getValidUrl(club.logoUrl, club.brandingConfig?.logoUrl);
    const stripUrl = getValidUrl(membership.stripImageUrl, undefined, undefined);

    const title = club.name.substring(0, 50);
    const isVoided = membership.status === 'expired' || membership.status === 'revoked';

    const textModules: any[] = [
        { header: 'Member Name', body: membership.memberName, id: 'member_name' },
        { header: 'Status', body: membership.status.toUpperCase(), id: 'member_status' },
    ];

    if (membership.expiresAt) {
        textModules.push({
            header: 'Expiry Date',
            body: new Date(membership.expiresAt).toLocaleDateString(),
            id: 'expiry_date'
        });
    }

    const genericObject = {
        id: objectId,
        classId: classId,
        ...(membership.expiresAt ? {
            validTimeInterval: {
                end: {
                    date: new Date(membership.expiresAt).toISOString()
                }
            }
        } : {}),
        genericType: 'GENERIC_TYPE_UNSPECIFIED',
        hexBackgroundColor: cardConfig.walletBackgroundColor || '#4f46e5',
        logo: {
            sourceUri: { uri: logoUrl },
            contentDescription: { defaultValue: { language: 'en-US', value: 'LOGO' } }
        },
        ...(stripUrl ? {
            heroImage: {
                sourceUri: { uri: stripUrl },
                contentDescription: { defaultValue: { language: 'en-US', value: 'STRIP' } }
            }
        } : {}),
        cardTitle: { defaultValue: { language: 'en-US', value: isVoided ? 'INACTIVE MEMBERSHIP' : title } },
        ...(cardConfig.showMembershipType !== false ? {
            header: { defaultValue: { language: 'en-US', value: membership.membershipType } }
        } : {}),
        ...(cardConfig.showMembershipNumber !== false ? {
            subheader: { defaultValue: { language: 'en-US', value: membership.membershipNumber } }
        } : {}),
        state: isVoided ? 'inactive' : 'active',
        textModulesData: textModules,
        barcode: {
            type: 'QR_CODE',
            value: `${baseUrl}/membership/${membership.slug}`,
            alternateText: 'Scan to Verify'
        }
    };

    return genericObject;
}
