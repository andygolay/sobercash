import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

// Generate an ephemeral X25519 keypair for NaCl box.
// Public key is emitted as base58 so it stays URL safe when embedded in deep links.
export function generateKeypair() {
  const kp = nacl.box.keyPair();
  return {
    publicKey58: bs58.encode(kp.publicKey),
    secretKey: kp.secretKey,
  };
}

// Derive a shared secret using our secret key and their public key (base58).
export function deriveSharedSecret(theirPublicKey58, mySecretKey) {
  const theirPublicKey = bs58.decode(theirPublicKey58);
  if (theirPublicKey.length !== nacl.box.publicKeyLength) {
    throw new Error('Invalid peer public key length');
  }
  if (mySecretKey.length !== nacl.box.secretKeyLength) {
    throw new Error('Invalid secret key length');
  }
  return nacl.box.before(theirPublicKey, mySecretKey);
}

// Encrypt an object using shared secret; returns nonce + base64 ciphertext.
// Nonce is base58 for the same deep-link friendliness, while ciphertext remains base64.
export function encryptPayload(sharedSecret, payload) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const boxed = nacl.box.after(plaintext, nonce, sharedSecret);
  return {
    nonce58: bs58.encode(nonce),
    dataB64: Buffer.from(boxed).toString('base64'),
  };
}

// Decrypt payload using shared secret, returning parsed JSON.
export function decryptPayload(sharedSecret, nonce58, dataB64) {
  const nonce = bs58.decode(nonce58);
  const boxed = Buffer.from(dataB64, 'base64');
  const opened = nacl.box.open.after(
    new Uint8Array(boxed),
    nonce,
    sharedSecret,
  );
  if (!opened) throw new Error('Failed to decrypt payload');
  const txt = Buffer.from(opened).toString('utf8');
  return JSON.parse(txt);
}

export const tryBase64JsonDecode = (value) => {
  if (!value) return null;
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {}
  return value;
};

