// src/hooks/community/__tests__/communityKeys.test.ts

import { describe, expect, it } from "vitest";
import { communityKeys } from "../communityKeys";

describe("communityKeys", () => {
  it("builds topics key with stable filter shape", () => {
    expect(
      communityKeys.topics({
        categorySlug: "general",
        search: "term",
        sort: "recent",
        status: "open",
        limit: 20,
      }),
    ).toEqual([
      "community",
      "v1",
      "topics",
      {
        categorySlug: "general",
        search: "term",
        sort: "recent",
        status: "open",
        limit: 20,
      },
    ]);
  });

  it("builds topic posts key with topic id", () => {
    expect(communityKeys.topicPosts("topic-1", { topicId: "topic-1", limit: 50 })).toEqual([
      "community",
      "v1",
      "topic-posts",
      "topic-1",
      { topicId: "topic-1", limit: 50 },
    ]);
  });

  it("builds FAQ detail key", () => {
    expect(communityKeys.faqDetail("getting-started")).toEqual([
      "community",
      "v1",
      "faq-detail",
      "getting-started",
    ]);
  });
});
