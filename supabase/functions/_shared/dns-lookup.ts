// DNS TXT verification helper for custom domain ownership
// Uses Deno's built-in DNS resolution

const VERIFICATION_PREFIX = "_thestandardhq-verify";

/**
 * Verify DNS TXT record contains the expected verification token
 * Looks up: _thestandardhq-verify.{hostname}
 */
export async function verifyDnsTxtRecord(
  hostname: string,
  expectedToken: string,
): Promise<{ verified: boolean; error?: string; foundRecords?: string[] }> {
  const lookupName = `${VERIFICATION_PREFIX}.${hostname}`;

  try {
    console.log(`[dns-lookup] Looking up TXT records for: ${lookupName}`);

    const txtRecords = await Deno.resolveDns(lookupName, "TXT");
    const foundRecords: string[] = [];

    // Each TXT record can be an array of strings (for long values split by DNS)
    // Also need to strip quotes that some DNS providers wrap values in
    for (const record of txtRecords) {
      // Join multi-part strings, strip surrounding/embedded quotes, trim whitespace
      const value = (Array.isArray(record) ? record.join("") : String(record))
        .replace(/^"|"$/g, "") // Strip surrounding quotes
        .replace(/"\s*"/g, "") // Handle split strings with quotes
        .trim();

      foundRecords.push(value);

      if (value === expectedToken) {
        console.log(`[dns-lookup] Token verified for: ${hostname}`);
        return { verified: true, foundRecords };
      }
    }

    console.log(
      `[dns-lookup] Token not found. Expected: ${expectedToken}, Found: ${foundRecords.join(", ")}`,
    );
    return {
      verified: false,
      error: "Verification token not found in DNS TXT records",
      foundRecords,
    };
  } catch (err) {
    // DNS lookup failed (NXDOMAIN, timeout, etc.)
    const errorMessage =
      err instanceof Error ? err.message : "Unknown DNS error";
    console.error(
      `[dns-lookup] DNS TXT lookup failed for ${lookupName}:`,
      errorMessage,
    );

    // Check for common DNS errors
    if (errorMessage.includes("NXDOMAIN") || errorMessage.includes("no data")) {
      return {
        verified: false,
        error: `No TXT record found at ${lookupName}. Please add the DNS record and wait for propagation.`,
      };
    }

    if (errorMessage.includes("SERVFAIL")) {
      return {
        verified: false,
        error: "DNS server error. Please try again in a few minutes.",
      };
    }

    return {
      verified: false,
      error: `DNS lookup failed: ${errorMessage}`,
    };
  }
}

/**
 * Generate DNS instruction text for users
 */
export function getDnsInstructions(
  hostname: string,
  verificationToken: string,
): {
  cname: { name: string; value: string };
  txt: { name: string; nameRelative: string; value: string };
} {
  // Extract subdomain prefix (everything before the first dot of the base domain)
  // e.g., "join.example.com" -> "join"
  const parts = hostname.split(".");
  const subdomainPrefix = parts.slice(0, -2).join(".");

  return {
    cname: {
      name: subdomainPrefix,
      value: "cname.vercel-dns.com",
    },
    txt: {
      name: `${VERIFICATION_PREFIX}.${hostname}`,
      nameRelative: `${VERIFICATION_PREFIX}.${subdomainPrefix}`,
      value: verificationToken,
    },
  };
}

/**
 * Validate hostname format for custom domains
 * Additional validation beyond database CHECK constraint
 */
export function validateHostname(hostname: string): {
  valid: boolean;
  error?: string;
} {
  // Must be provided
  if (!hostname || typeof hostname !== "string") {
    return { valid: false, error: "Hostname is required" };
  }

  // Normalize and check
  const normalized = hostname.toLowerCase().trim();

  // Max 253 characters (DNS limit)
  if (normalized.length > 253) {
    return { valid: false, error: "Hostname exceeds 253 character limit" };
  }

  // Must have at least 2 dots (subdomain requirement)
  const dotCount = (normalized.match(/\./g) || []).length;
  if (dotCount < 2) {
    return {
      valid: false,
      error:
        "Only subdomains are supported (e.g., join.yourdomain.com). Apex domains are not supported.",
    };
  }

  // Reject IP addresses
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(normalized)) {
    return { valid: false, error: "IP addresses are not allowed" };
  }

  // Reject localhost and common dev domains
  const blockedPatterns = [
    "localhost",
    "127.0.0.1",
    "::1",
    ".local",
    ".localhost",
    ".test",
    ".example",
    ".invalid",
  ];
  for (const pattern of blockedPatterns) {
    if (normalized === pattern || normalized.endsWith(pattern)) {
      return { valid: false, error: `Reserved hostname: ${pattern}` };
    }
  }

  // Reject our own domains (prevents resolver loops)
  const reservedDomains = [
    "thestandardhq.com",
    "www.thestandardhq.com",
    ".vercel.app",
    ".vercel.sh",
  ];
  for (const reserved of reservedDomains) {
    if (normalized === reserved || normalized.endsWith(reserved)) {
      return {
        valid: false,
        error: "Cannot use The Standard or Vercel domains",
      };
    }
  }

  // Check each label length (max 63 chars per DNS spec)
  const labels = normalized.split(".");
  for (const label of labels) {
    if (label.length > 63) {
      return {
        valid: false,
        error: "Each part of the hostname must be 63 characters or less",
      };
    }
    if (label.length < 2) {
      return {
        valid: false,
        error: "Each part of the hostname must be at least 2 characters",
      };
    }
    // Check for valid characters (alphanumeric and hyphens, no leading/trailing hyphens)
    if (
      !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(label) &&
      !/^[a-z0-9]{2}$/.test(label)
    ) {
      // Allow 2-char labels without hyphen check
      if (label.length === 2 && /^[a-z0-9]{2}$/.test(label)) {
        continue;
      }
      return {
        valid: false,
        error: `Invalid label "${label}": must be alphanumeric with optional hyphens (not at start/end)`,
      };
    }
  }

  return { valid: true };
}
