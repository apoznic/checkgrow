// AES-GCM encryption/decryption utilities for cluster integration keys

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;

async function getMasterKey(): Promise<CryptoKey> {
  const masterKeyHex = Deno.env.get('INTEGRATION_MASTER_KEY');
  if (!masterKeyHex) throw new Error('INTEGRATION_MASTER_KEY not configured');
  
  // Derive a 256-bit key from the master key string using SHA-256
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(masterKeyHex));
  
  return crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(plaintext)
  );
  
  // Combine IV + ciphertext and base64 encode
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encoded: string): Promise<string> {
  const key = await getMasterKey();
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(plaintext);
}
