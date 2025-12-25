// Shared HMAC utilities for state signing
// Uses HMAC-SHA256 for signing OAuth state to prevent tampering

const SIGNING_KEY = Deno.env.get("SLACK_SIGNING_SECRET") || "";

/**
 * Convert string to Uint8Array
 */
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Get HMAC signing key
 */
async function getSigningKey(): Promise<CryptoKey> {
  if (!SIGNING_KEY) {
    throw new Error("SLACK_SIGNING_SECRET not set");
  }

  return await crypto.subtle.importKey(
    "raw",
    stringToBytes(SIGNING_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Sign data using HMAC-SHA256
 * Returns signature as hex string
 */
export async function signState(data: string): Promise<string> {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, stringToBytes(data));
  return bytesToHex(new Uint8Array(signature));
}

/**
 * Verify HMAC signature
 */
export async function verifySignature(
  data: string,
  signature: string,
): Promise<boolean> {
  try {
    const expectedSignature = await signState(data);
    // Constant-time comparison to prevent timing attacks
    if (expectedSignature.length !== signature.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Create signed state parameter
 * Format: base64(JSON) + "." + signature
 */
export async function createSignedState(
  state: Record<string, unknown>,
): Promise<string> {
  const payload = btoa(JSON.stringify(state));
  const signature = await signState(payload);
  return `${payload}.${signature}`;
}

/**
 * Parse and verify signed state
 * Returns parsed state if valid, null if invalid
 */
export async function parseSignedState<T>(
  signedState: string,
): Promise<T | null> {
  const parts = signedState.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;

  // Verify signature
  const isValid = await verifySignature(payload, signature);
  if (!isValid) {
    return null;
  }

  // Parse payload
  try {
    return JSON.parse(atob(payload)) as T;
  } catch {
    return null;
  }
}
