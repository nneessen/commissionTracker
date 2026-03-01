import { describe, expect, it } from "vitest";
import {
  buildNewRecruitMessage,
  buildNpnReceivedMessage,
} from "./recruitNotificationService";

describe("recruitNotificationService", () => {
  it("includes resident state when available", () => {
    const result = buildNewRecruitMessage({
      first_name: "Matt",
      last_name: "Heady",
      email: "matt@example.com",
      resident_state: "TX",
      upline_name: "Nick Neessen",
    });

    expect(result.blocks[0]).toMatchObject({
      type: "section",
      text: {
        type: "mrkdwn",
      },
    });

    const blockText = (result.blocks[0] as { text: { text: string } }).text
      .text;
    expect(blockText).toContain("*Resident State:*  TX");
  });

  it("falls back to address state when resident_state is missing", () => {
    const result = buildNpnReceivedMessage({
      first_name: "Matt",
      last_name: "Heady",
      email: "matt@example.com",
      npn: "1234567",
      state: "MI",
      upline_name: "Nick Neessen",
    });

    const blockText = (result.blocks[0] as { text: { text: string } }).text
      .text;
    expect(blockText).toContain("*Resident State:*  MI");
  });
});
