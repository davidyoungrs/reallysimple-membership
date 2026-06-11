import apn from '@parse/node-apn';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sends a push notification to a device via Apple Push Notification service (APNs).
 * Requires APPLE_APNS_AUTH_KEY (or api/certs/apns.p8), APPLE_APNS_KEY_ID, and APPLE_TEAM_ID in environment variables.
 * 
 * @param pushToken The device's push token
 * @param passTypeIdentifier The pass type identifier (topic)
 */
export async function sendPassPush(pushToken: string, passTypeIdentifier: string) {
    let authKey = '';
    
    try {
        const p8Path = path.join(__dirname, '../certs/apns.p8');
        if (fs.existsSync(p8Path)) {
            authKey = fs.readFileSync(p8Path, 'utf8').trim();
            console.log('[APNs-Debug] Loaded authKey from static apns.p8 file');
        }
    } catch (err) {
        console.warn('[APNs-Debug] Failed to read static apns.p8 file, falling back to environment variable:', err);
    }

    if (!authKey) {
        let envKey = process.env.APPLE_APNS_AUTH_KEY?.trim();
        if (envKey) {
            if ((envKey.startsWith('"') && envKey.endsWith('"')) || (envKey.startsWith("'") && envKey.endsWith("'"))) {
                envKey = envKey.slice(1, -1);
            }
            authKey = envKey.replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\r/g, '').trim();
            console.log('[APNs-Debug] Loaded authKey from environment variable');
        }
    }

    const keyId = process.env.APPLE_APNS_KEY_ID;
    const teamId = process.env.APPLE_TEAM_ID;

    if (!authKey || !keyId || !teamId) {
        throw new Error('Missing APNs configuration (Key, Key ID, or Team ID)');
    }

    console.log('[APNs-Debug] authKey length:', authKey.length);
    console.log('[APNs-Debug] authKey head:', authKey.substring(0, 30));
    console.log('[APNs-Debug] authKey tail:', authKey.substring(authKey.length - 30));

    const options = {
        token: {
            key: authKey, // Can be a string containing your key
            keyId: keyId,
            teamId: teamId
        },
        production: true // Wallet pushes always go to production
    };

    const apnProvider = new apn.Provider(options);

    const note = new apn.Notification();
    note.topic = passTypeIdentifier;
    note.pushType = "background"; // Required by APNs since iOS 13 for Wallet pass updates

    // Apple Wallet Pass update payload is uniquely required to be a strict empty JSON dictionary '{}'.
    // However, APNs rejects literally empty strings. It expects `{"aps":{}}`.
    // We use rawPayload to bypass node-apn's aggressive stripping of empty "aps" objects.
    note.rawPayload = { aps: {} };


    try {
        const result = await apnProvider.send(note, pushToken);

        // Critical: Shutdown the provider after sending so the Vercel function can cleanly exit
        apnProvider.shutdown();

        if (result.sent.length > 0) {
            console.log(`[APNs] Push successfully sent to ${pushToken}`);
            return true;
        } else if (result.failed.length > 0) {
            const failure = result.failed[0];
            const errorMessage = failure.response ? failure.response.reason : failure.error?.message;
            console.error(`[APNs] Push failed for token ${pushToken}:`, errorMessage);
            throw new Error(`APNs Error: ${errorMessage}`);
        }

    } catch (err) {
        apnProvider.shutdown();
        console.error('[APNs] Provider Error:', err);
        throw err;
    }
}
