import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/services/base/supabase";
import type { MarketingCampaign } from "../../types/marketing.types";
import { updateDraftCampaign } from "../campaignService";

vi.mock("@/services/base/supabase", () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

const BASE_CAMPAIGN: MarketingCampaign = {
  id: "campaign-1",
  name: "Draft Campaign",
  subject_override: "Subject",
  campaign_type: "email",
  status: "draft",
  template_id: null,
  audience_id: null,
  sms_content: null,
  brand_settings: null,
  recipient_count: 0,
  recipient_source: "manual",
  sent_count: 0,
  opened_count: 0,
  clicked_count: 0,
  bounced_count: 0,
  failed_count: 0,
  delivered_count: 0,
  unsubscribed_count: 0,
  scheduled_for: null,
  started_at: null,
  completed_at: null,
  send_rate: null,
  created_at: null,
  updated_at: null,
  user_id: "user-1",
};

describe("updateDraftCampaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates only campaigns currently in draft status", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: BASE_CAMPAIGN,
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqStatus = vi.fn().mockReturnValue({ select });
    const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
    const update = vi.fn().mockReturnValue({ eq: eqId });

    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
    fromMock.mockReturnValue({ update });

    const result = await updateDraftCampaign(BASE_CAMPAIGN.id, {
      name: "Updated Draft Name",
    });

    expect(fromMock).toHaveBeenCalledWith("bulk_email_campaigns");
    expect(eqId).toHaveBeenCalledWith("id", BASE_CAMPAIGN.id);
    expect(eqStatus).toHaveBeenCalledWith("status", "draft");
    expect(result).toEqual(BASE_CAMPAIGN);
  });

  it("throws when campaign is not editable as a draft", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqStatus = vi.fn().mockReturnValue({ select });
    const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
    const update = vi.fn().mockReturnValue({ eq: eqId });

    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
    fromMock.mockReturnValue({ update });

    await expect(
      updateDraftCampaign(BASE_CAMPAIGN.id, { name: "Nope" }),
    ).rejects.toThrow("Only draft campaigns can be edited");
  });

  it("surfaces database errors", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("db error"),
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqStatus = vi.fn().mockReturnValue({ select });
    const eqId = vi.fn().mockReturnValue({ eq: eqStatus });
    const update = vi.fn().mockReturnValue({ eq: eqId });

    const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
    fromMock.mockReturnValue({ update });

    await expect(
      updateDraftCampaign(BASE_CAMPAIGN.id, { name: "Nope" }),
    ).rejects.toThrow("db error");
  });
});
