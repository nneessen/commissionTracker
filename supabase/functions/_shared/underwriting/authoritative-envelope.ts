import type { AuthoritativeRunResult, PersistableAuditRow } from "./engine.ts";
import type { UnderwritingRawPayload } from "./payload.ts";

interface UnsignedAuthoritativeRunEnvelope {
  version: 1;
  actorId: string;
  requestId: string;
  issuedAt: string;
  input: UnderwritingRawPayload;
  result: {
    sessionRecommendations: AuthoritativeRunResult["sessionRecommendations"];
    rateTableRecommendations: AuthoritativeRunResult["rateTableRecommendations"];
    eligibilitySummary: AuthoritativeRunResult["eligibilitySummary"];
    evaluationMetadata: AuthoritativeRunResult["evaluationMetadata"];
  };
  auditRows: PersistableAuditRow[];
}

export interface SignedAuthoritativeRunEnvelope extends UnsignedAuthoritativeRunEnvelope {
  signature: string;
}

const ALLOWED_SAVE_INPUT_OVERRIDES = new Set([
  "decisionTreeId",
  "notes",
  "sessionDurationSeconds",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item === undefined ? null : normalizeJson(item),
    );
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const child = value[key];
        if (child !== undefined) {
          acc[key] = normalizeJson(child);
        }
        return acc;
      }, {});
  }

  return value;
}

function canonicalizeJson(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function signCanonicalJson(
  canonicalJson: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`uw-authoritative-run:v1:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(canonicalJson),
  );

  return toHex(new Uint8Array(signature));
}

function stripSaveOnlyFields(
  input: UnderwritingRawPayload,
): Record<string, unknown> {
  return Object.entries(input).reduce<Record<string, unknown>>((acc, entry) => {
    const [key, value] = entry;
    if (!ALLOWED_SAVE_INPUT_OVERRIDES.has(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function mergePersistableInput(
  envelopeInput: UnderwritingRawPayload,
  saveInput: UnderwritingRawPayload,
): UnderwritingRawPayload {
  const comparableEnvelopeInput = stripSaveOnlyFields(envelopeInput);
  const comparableSaveInput = stripSaveOnlyFields(saveInput);

  if (
    canonicalizeJson(comparableEnvelopeInput) !==
    canonicalizeJson(comparableSaveInput)
  ) {
    throw new Error("Run results are stale. Please rerun recommendations.");
  }

  return {
    ...envelopeInput,
    decisionTreeId: saveInput.decisionTreeId,
    notes: saveInput.notes,
    sessionDurationSeconds: saveInput.sessionDurationSeconds,
  };
}

export async function createSignedAuthoritativeRunEnvelope(params: {
  actorId: string;
  requestId: string;
  input: UnderwritingRawPayload;
  runResult: AuthoritativeRunResult;
  secret: string;
}): Promise<SignedAuthoritativeRunEnvelope> {
  const unsignedEnvelope: UnsignedAuthoritativeRunEnvelope = {
    version: 1,
    actorId: params.actorId,
    requestId: params.requestId,
    issuedAt: new Date().toISOString(),
    input: params.input,
    result: {
      sessionRecommendations: params.runResult.sessionRecommendations,
      rateTableRecommendations: params.runResult.rateTableRecommendations,
      eligibilitySummary: params.runResult.eligibilitySummary,
      evaluationMetadata: params.runResult.evaluationMetadata,
    },
    auditRows: params.runResult.auditRows,
  };

  return {
    ...unsignedEnvelope,
    signature: await signCanonicalJson(
      canonicalizeJson(unsignedEnvelope),
      params.secret,
    ),
  };
}

export async function verifySignedAuthoritativeRunEnvelope(params: {
  envelope: unknown;
  actorId: string;
  saveInput: UnderwritingRawPayload;
  secret: string;
}): Promise<{
  requestId: string;
  input: UnderwritingRawPayload;
  result: SignedAuthoritativeRunEnvelope["result"];
  auditRows: PersistableAuditRow[];
}> {
  const { actorId, envelope, saveInput, secret } = params;

  if (!isPlainObject(envelope)) {
    throw new Error("Missing authoritative underwriting run envelope");
  }

  const candidate = envelope as Partial<SignedAuthoritativeRunEnvelope>;
  if (
    candidate.version !== 1 ||
    typeof candidate.actorId !== "string" ||
    typeof candidate.requestId !== "string" ||
    typeof candidate.issuedAt !== "string" ||
    typeof candidate.signature !== "string" ||
    !isPlainObject(candidate.input) ||
    !isPlainObject(candidate.result) ||
    !Array.isArray(candidate.auditRows)
  ) {
    throw new Error("Invalid authoritative underwriting run envelope");
  }

  if (candidate.actorId !== actorId) {
    throw new Error("Access denied");
  }

  const unsignedEnvelope: UnsignedAuthoritativeRunEnvelope = {
    version: 1,
    actorId: candidate.actorId,
    requestId: candidate.requestId,
    issuedAt: candidate.issuedAt,
    input: candidate.input as UnderwritingRawPayload,
    result: candidate.result as SignedAuthoritativeRunEnvelope["result"],
    auditRows: candidate.auditRows as PersistableAuditRow[],
  };

  const expectedSignature = await signCanonicalJson(
    canonicalizeJson(unsignedEnvelope),
    secret,
  );

  if (expectedSignature !== candidate.signature) {
    throw new Error("Invalid authoritative underwriting run envelope");
  }

  return {
    requestId: unsignedEnvelope.requestId,
    input: mergePersistableInput(unsignedEnvelope.input, saveInput),
    result: unsignedEnvelope.result,
    auditRows: unsignedEnvelope.auditRows,
  };
}
