import jwt from 'jsonwebtoken';

/**
 * Sends a push notification to a device via Apple Push Notification service (APNs).
 * Requires APPLE_APNS_AUTH_KEY, APPLE_APNS_KEY_ID, and APPLE_TEAM_ID in environment variables.
 * 
 * @param pushToken The device's push token
 * @param passTypeIdentifier The pass type identifier (topic)
 */
export async function sendPassPush(pushToken: string, passTypeIdentifier: string) {
    const authKey = process.env.APPLE_APNS_AUTH_KEY?.replace(/\\n/g, '\n');
    const keyId = process.env.APPLE_APNS_KEY_ID;
    const teamId = process.env.APPLE_TEAM_ID;

    if (!authKey || !keyId || !teamId) {
        throw new Error('Missing APNs configuration (Key, Key ID, or Team ID)');
    }

    // 1. Generate the Auth Token (JWT)
    // APNs tokens should be refreshed every 45-60 minutes, but for a single push, generating one is fine.
    const token = jwt.sign(
        {
            iss: teamId,
            iat: Math.floor(Date.now() / 1000),
        },
        authKey,
        {
            algorithm: 'ES256',
            header: {
                alg: 'ES256',
                kid: keyId,
            },
        }
    );

    // 2. Determine APNs endpoint (Sandbox vs Production)
    // For Wallet, it's usually always production, but we can verify.
    const baseUrl = 'https://api.push.apple.com'; // Production
    // const baseUrl = 'https://api.sandbox.push.apple.com'; // Sandbox

    const url = `${baseUrl}/3/device/${pushToken}`;

    // 3. Send the Push Request
    // Apple Wallet pushes have an empty body. The notification is triggered by the topic.
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'authorization': `bearer ${token}`,
            'apns-topic': passTypeIdentifier,
            'apns-push-type': 'background', // Required for iOS 13+ background pushes
            'apns-priority': '10',         // High priority
        },
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[APNs] Push failed for token ${pushToken}:`, errorText);
        throw new Error(`APNs Error: ${response.status} - ${errorText}`);
    }

    console.log(`[APNs] Push successfully sent to ${pushToken}`);
    return true;
}
