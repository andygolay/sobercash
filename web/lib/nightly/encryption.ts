import bs58 from 'bs58';
import nacl from 'tweetnacl';

export type EphemeralKeys = {
  publicKey58: string;
  secretKey: Uint8Array;
};

export function generateKeypair(): EphemeralKeys {
  const kp = nacl.box.keyPair();
  return { publicKey58: bs58.encode(kp.publicKey), secretKey: kp.secretKey };
}

export function deriveSharedSecret(walletPublicKey58: string, dappSecretKey: Uint8Array): Uint8Array {
  const walletPub = bs58.decode(walletPublicKey58);
  return nacl.box.before(walletPub, dappSecretKey);
}

export function encryptWithSharedKey(shared: Uint8Array, messageUtf8: string) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const message = new TextEncoder().encode(messageUtf8);
  const boxed = nacl.box.after(message, nonce, shared);
  const payloadBase64 = typeof window !== 'undefined'
    ? btoa(String.fromCharCode(...boxed))
    : Buffer.from(boxed).toString('base64');
  return { nonceBase58: bs58.encode(nonce), payloadBase64 };
}

export function decryptWithSharedKey(shared: Uint8Array, nonceBase58: string, payloadBase64: string): string {
  const nonce = bs58.decode(nonceBase58);
  const boxedU8: Uint8Array = typeof window !== 'undefined'
    ? Uint8Array.from(atob(payloadBase64), c => c.charCodeAt(0))
    : new Uint8Array(Buffer.from(payloadBase64, 'base64'));
  const opened = nacl.box.open.after(boxedU8, nonce, shared);
  if (!opened) throw new Error('Failed to decrypt');
  return new TextDecoder().decode(opened);
}


