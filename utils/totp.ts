
// Basic Base32 decode for OTP secrets
const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32ToBuffer(str: string): Uint8Array {
    let buffer = [];
    let bits = 0;
    let value = 0;

    const cleanStr = str.toUpperCase().replace(/[^A-Z2-7]/g, '');

    for (let i = 0; i < cleanStr.length; i++) {
        const val = base32chars.indexOf(cleanStr[i]);
        value = (value << 5) | val;
        bits += 5;

        if (bits >= 8) {
            buffer.push((value >>> (bits - 8)) & 0xFF);
            bits -= 8;
        }
    }
    return new Uint8Array(buffer);
}

function hexToUint8Array(hexString: string): Uint8Array {
    if (hexString.length % 2 !== 0) {
        throw "Invalid hex string";
    }
    const arrayBuffer = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        const byteValue = parseInt(hexString.substring(i, i + 2), 16);
        arrayBuffer[i / 2] = byteValue;
    }
    return arrayBuffer;
}

// Generate HOTP (HMAC-based One-Time Password)
async function generateHOTP(secret: string, counter: number): Promise<string> {
    const secretBytes = base32ToBuffer(secret);

    // Counter to 8 bytes buffer
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setUint32(4, counter, false); // Low 32 bits, big endian
    counterView.setUint32(0, 0, false); // High 32 bits assume 0 for now (good until 2106)

    // Import key for HMAC-SHA1
    const key = await window.crypto.subtle.importKey(
        'raw',
        secretBytes as BufferSource,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    // Sign
    const signature = await window.crypto.subtle.sign(
        'HMAC',
        key,
        counterBuffer
    );

    const signatureArray = new Uint8Array(signature);
    const offset = signatureArray[signatureArray.length - 1] & 0xf;

    const binary =
        ((signatureArray[offset] & 0x7f) << 24) |
        ((signatureArray[offset + 1] & 0xff) << 16) |
        ((signatureArray[offset + 2] & 0xff) << 8) |
        (signatureArray[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
}

// Generate TOTP (Time-based One-Time Password)
export async function generateTOTP(secret: string, windowSeconds = 30): Promise<string> {
    const counter = Math.floor(Date.now() / 1000 / windowSeconds);
    return generateHOTP(secret, counter);
}

// Verify TOTP
export async function verifyTOTP(token: string, secret: string, window = 1): Promise<boolean> {
    if (!token || token.length !== 6) return false;

    const currentCounter = Math.floor(Date.now() / 1000 / 30);

    // Check current, previous, and next windows (allow slight drift)
    for (let i = -window; i <= window; i++) {
        const generated = await generateHOTP(secret, currentCounter + i);
        if (generated === token) {
            return true;
        }
    }
    return false;
}
