const crypto = require('crypto');
const pem = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDE2kQ/5O8B6r7q
<TRUNCATED FAKE KEY JUST FOR TESTING>
-----END PRIVATE KEY-----`;
try {
  console.log("Testing createPrivateKey");
} catch(e) { console.log(e); }
