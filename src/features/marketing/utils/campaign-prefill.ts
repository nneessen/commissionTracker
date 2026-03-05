import type { EmailBlock } from "@/types/email.types";

const PREFIX = "marketing-campaign-prefill:";
const MAX_PREFILL_CHARS = 250_000;

export interface CampaignPrefillPayload {
  blocks: EmailBlock[];
  subject?: string;
  createdAt: number;
}

export function saveCampaignPrefill(
  payload: Omit<CampaignPrefillPayload, "createdAt">,
): string | null {
  const id = crypto.randomUUID();
  const fullPayload: CampaignPrefillPayload = {
    ...payload,
    createdAt: Date.now(),
  };

  try {
    const serialized = JSON.stringify(fullPayload);
    if (serialized.length > MAX_PREFILL_CHARS) {
      return null;
    }
    sessionStorage.setItem(`${PREFIX}${id}`, serialized);
    return id;
  } catch {
    // Ignore storage failures; caller can continue without prefill.
    return null;
  }
}

export function consumeCampaignPrefill(
  id?: string,
): CampaignPrefillPayload | null {
  if (!id) return null;

  try {
    const key = `${PREFIX}${id}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;

    sessionStorage.removeItem(key);
    return JSON.parse(raw) as CampaignPrefillPayload;
  } catch {
    return null;
  }
}
