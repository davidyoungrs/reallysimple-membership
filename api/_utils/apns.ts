import jwt from 'jsonwebtoken';
import http2 from 'http2';

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

    // 2. Determine APNs endpoint
    const host = 'api.push.apple.com'; // Production
    const path = `/3/device/${pushToken}`;

    // 3. Send the Push Request using HTTP/2
    return new Promise((resolve, reject) => {
        const client = http2.connect(`https://${host}`);

        client.on('error', (err) => {
            console.error('[APNs] HTTP/2 Client Error:', err);
            reject(err);
        });

        const req = client.request({
            [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_POST,
            [http2.constants.HTTP2_HEADER_PATH]: path,
            'authorization': `bearer ${token}`,
            'apns-topic': passTypeIdentifier,
            'apns-push-type': 'background',
            'apns-priority': '10',
        });

        req.on('response', (headers) => {
            const status = headers[http2.constants.HTTP2_HEADER_STATUS];

            let data = '';
            req.on('data', (chunk) => { data += chunk; });

            req.on('end', () => {
                client.close();
                if (status === 200) {
                    console.log(`[APNs] Push successfully sent to ${pushToken}`);
                    resolve(true);
                } else {
                    console.error(`[APNs] Push failed for token ${pushToken}:`, status, data);
                    reject(new Error(`APNs Error: ${status} - ${data}`));
                }
            });
        });

        req.on('error', (err) => {
            client.close();
            reject(err);
        });

        req.write(JSON.stringify({}));
        req.end();
    });
}
