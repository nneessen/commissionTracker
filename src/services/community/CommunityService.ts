// src/services/community/CommunityService.ts
// Layer: infrastructure

import { supabase } from "@/services/base/supabase";
import type { Database } from "@/types/database.types";
import type {
  CreateForumCategoryInput,
  CreateForumPostInput,
  CreateForumTopicInput,
  FaqArticleDetail,
  FaqArticleFilters,
  FaqArticleSummary,
  FaqCursor,
  ForumActivityCursor,
  ForumCategory,
  ForumPost,
  ForumPostCursor,
  ForumPostsFilters,
  ForumReport,
  ForumReportsFilters,
  ForumTopicDetail,
  ForumTopicFilters,
  ForumTopicSummary,
  PublishFaqFromTopicInput,
  ReportForumContentInput,
  ResolveForumReportInput,
  SetForumAcceptedPostInput,
  SetForumPostVoteInput,
  SetForumTopicStatusInput,
  UpsertFaqArticleInput,
} from "@/types/community.types";

const TOPICS_DEFAULT_LIMIT = 20;
const POSTS_DEFAULT_LIMIT = 50;
const FAQ_DEFAULT_LIMIT = 20;
const REPORTS_DEFAULT_LIMIT = 25;

function toServiceError(context: string, message: string): Error {
  return new Error(`community.${context} failed: ${message}`);
}

function clampLimit(value: number | undefined, min: number, max: number): number {
  const raw = value ?? min;
  return Math.min(max, Math.max(min, raw));
}

function normalizeTopicSummary(row: Database["public"]["Functions"]["forum_list_topics_v1"]["Returns"][number]): ForumTopicSummary {
  return {
    ...row,
    accepted_post_id: row.accepted_post_id ?? null,
  };
}

function normalizeTopicDetail(row: Database["public"]["Functions"]["forum_get_topic_detail_v1"]["Returns"][number]): ForumTopicDetail {
  return {
    ...row,
    accepted_post_id: row.accepted_post_id ?? null,
  };
}

function normalizePost(row: Database["public"]["Functions"]["forum_list_posts_v1"]["Returns"][number]): ForumPost {
  return {
    ...row,
    edited_at: row.edited_at ?? null,
    my_vote: row.my_vote ?? null,
  };
}

function normalizeFaqSummary(row: Database["public"]["Functions"]["faq_list_articles_v1"]["Returns"][number]): FaqArticleSummary {
  return {
    ...row,
    source_topic_id: row.source_topic_id ?? null,
    published_at: row.published_at ?? null,
  };
}

function normalizeFaqDetail(row: Database["public"]["Functions"]["faq_get_article_v1"]["Returns"][number]): FaqArticleDetail {
  return {
    ...row,
    source_topic_id: row.source_topic_id ?? null,
    published_at: row.published_at ?? null,
  };
}

export class CommunityService {
  private async getCurrentUserId(): Promise<string> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw toServiceError("getCurrentUserId", error.message);
    }

    if (!user) {
      throw toServiceError("getCurrentUserId", "User not authenticated");
    }

    return user.id;
  }

  async getCategories(): Promise<ForumCategory[]> {
    const { data, error } = await supabase
      .from("forum_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw toServiceError("getCategories", error.message);
    }

    return data ?? [];
  }

  async createCategory(input: CreateForumCategoryInput): Promise<ForumCategory> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await supabase
      .from("forum_categories")
      .insert({
        slug: input.slug.trim().toLowerCase(),
        name: input.name.trim(),
        description: input.description?.trim() || null,
        sort_order: input.sortOrder ?? 0,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) {
      throw toServiceError("createCategory", error.message);
    }

    return data;
  }

  async listTopics(
    filters: ForumTopicFilters,
    cursor?: ForumActivityCursor,
  ): Promise<ForumTopicSummary[]> {
    const limit = clampLimit(filters.limit, TOPICS_DEFAULT_LIMIT, 100);

    const { data, error } = await supabase.rpc("forum_list_topics_v1", {
      p_category_slug: filters.categorySlug || null,
      p_search: filters.search || null,
      p_status:
        !filters.status || filters.status === "all" ? null : filters.status,
      p_sort: filters.sort ?? "recent",
      p_cursor_last_activity: cursor?.last_activity_at ?? null,
      p_cursor_topic_id: cursor?.topic_id ?? null,
      p_limit: limit,
    });

    if (error) {
      throw toServiceError("listTopics", error.message);
    }

    return (data ?? []).map(normalizeTopicSummary);
  }

  async getTopicDetail(topicId: string): Promise<ForumTopicDetail | null> {
    const { data, error } = await supabase.rpc("forum_get_topic_detail_v1", {
      p_topic_id: topicId,
    });

    if (error) {
      throw toServiceError("getTopicDetail", error.message);
    }

    const row = data?.[0];
    return row ? normalizeTopicDetail(row) : null;
  }

  async listPosts(
    filters: ForumPostsFilters,
    cursor?: ForumPostCursor,
  ): Promise<ForumPost[]> {
    const limit = clampLimit(filters.limit, POSTS_DEFAULT_LIMIT, 200);

    const { data, error } = await supabase.rpc("forum_list_posts_v1", {
      p_topic_id: filters.topicId,
      p_cursor_created_at: cursor?.created_at ?? null,
      p_cursor_post_id: cursor?.post_id ?? null,
      p_limit: limit,
    });

    if (error) {
      throw toServiceError("listPosts", error.message);
    }

    return (data ?? []).map(normalizePost);
  }

  async listFaqArticles(
    filters: FaqArticleFilters,
    cursor?: FaqCursor,
  ): Promise<FaqArticleSummary[]> {
    const limit = clampLimit(filters.limit, FAQ_DEFAULT_LIMIT, 100);

    const { data, error } = await supabase.rpc("faq_list_articles_v1", {
      p_search: filters.search || null,
      p_cursor_published_at: cursor?.published_at ?? null,
      p_cursor_id: cursor?.article_id ?? null,
      p_limit: limit,
    });

    if (error) {
      throw toServiceError("listFaqArticles", error.message);
    }

    return (data ?? []).map(normalizeFaqSummary);
  }

  async getFaqArticle(slug: string): Promise<FaqArticleDetail | null> {
    const { data, error } = await supabase.rpc("faq_get_article_v1", {
      p_slug: slug,
    });

    if (error) {
      throw toServiceError("getFaqArticle", error.message);
    }

    const row = data?.[0];
    return row ? normalizeFaqDetail(row) : null;
  }

  async listReports(
    filters: ForumReportsFilters,
    page: number,
  ): Promise<ForumReport[]> {
    const limit = clampLimit(filters.limit, REPORTS_DEFAULT_LIMIT, 100);
    const offset = page * limit;

    let query = supabase
      .from("forum_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      throw toServiceError("listReports", error.message);
    }

    return data ?? [];
  }

  async createTopic(input: CreateForumTopicInput): Promise<Database["public"]["Functions"]["forum_create_topic_v1"]["Returns"][number]> {
    const { data, error } = await supabase.rpc("forum_create_topic_v1", {
      p_category_id: input.categoryId,
      p_title: input.title,
      p_body_markdown: input.bodyMarkdown,
    });

    if (error) {
      throw toServiceError("createTopic", error.message);
    }

    const row = data?.[0];
    if (!row) {
      throw toServiceError("createTopic", "No topic returned");
    }

    return row;
  }

  async createPost(input: CreateForumPostInput): Promise<Database["public"]["Functions"]["forum_create_post_v1"]["Returns"][number]> {
    const { data, error } = await supabase.rpc("forum_create_post_v1", {
      p_topic_id: input.topicId,
      p_body_markdown: input.bodyMarkdown,
    });

    if (error) {
      throw toServiceError("createPost", error.message);
    }

    const row = data?.[0];
    if (!row) {
      throw toServiceError("createPost", "No post returned");
    }

    return row;
  }

  async setTopicStatus(input: SetForumTopicStatusInput): Promise<Database["public"]["Functions"]["forum_set_topic_status_v1"]["Returns"][number]> {
    const { data, error } = await supabase.rpc("forum_set_topic_status_v1", {
      p_topic_id: input.topicId,
      p_status: input.status,
    });

    if (error) {
      throw toServiceError("setTopicStatus", error.message);
    }

    const row = data?.[0];
    if (!row) {
      throw toServiceError("setTopicStatus", "No status row returned");
    }

    return row;
  }

  async setAcceptedPost(input: SetForumAcceptedPostInput): Promise<Database["public"]["Functions"]["forum_set_accepted_post_v1"]["Returns"][number]> {
    const { data, error } = await supabase.rpc("forum_set_accepted_post_v1", {
      p_topic_id: input.topicId,
      p_post_id: input.postId,
    });

    if (error) {
      throw toServiceError("setAcceptedPost", error.message);
    }

    const row = data?.[0];
    if (!row) {
      throw toServiceError("setAcceptedPost", "No accepted row returned");
    }

    return row;
  }

  async setPostVote(input: SetForumPostVoteInput): Promise<Database["public"]["Functions"]["forum_set_post_vote_v1"]["Returns"][number]> {
    const { data, error } = await supabase.rpc("forum_set_post_vote_v1", {
      p_post_id: input.postId,
      p_vote: input.vote,
    });

    if (error) {
      throw toServiceError("setPostVote", error.message);
    }

    const row = data?.[0];
    if (!row) {
      throw toServiceError("setPostVote", "No vote row returned");
    }

    return row;
  }

  async toggleTopicFollow(topicId: string, shouldFollow: boolean): Promise<Database["public"]["Functions"]["forum_toggle_follow_topic_v1"]["Returns"][number]> {
    const { data, error } = await supabase.rpc("forum_toggle_follow_topic_v1", {
      p_topic_id: topicId,
      p_follow: shouldFollow,
    });

    if (error) {
      throw toServiceError("toggleTopicFollow", error.message);
    }

    const row = data?.[0];
    if (!row) {
      throw toServiceError("toggleTopicFollow", "No follow row returned");
    }

    return row;
  }

  async reportContent(input: ReportForumContentInput): Promise<Database["public"]["Functions"]["forum_report_content_v1"]["Returns"][number]> {
    const { data, error } = await supabase.rpc("forum_report_content_v1", {
      p_entity_type: input.entityType,
      p_entity_id: input.entityId,
      p_reason: input.reason,
      p_details: input.details || null,
    });

    if (error) {
      throw toServiceError("reportContent", error.message);
    }

    const row = data?.[0];
    if (!row) {
      throw toServiceError("reportContent", "No report row returned");
    }

    return row;
  }

  async resolveReport(input: ResolveForumReportInput): Promise<Database["public"]["Functions"]["forum_resolve_report_v1"]["Returns"][number]> {
    const { data, error } = await supabase.rpc("forum_resolve_report_v1", {
      p_report_id: input.reportId,
      p_status: input.status,
      p_resolution_note: input.resolutionNote || null,
    });

    if (error) {
      throw toServiceError("resolveReport", error.message);
    }

    const row = data?.[0];
    if (!row) {
      throw toServiceError("resolveReport", "No resolved row returned");
    }

    return row;
  }

  async upsertFaqArticle(input: UpsertFaqArticleInput): Promise<Database["public"]["Functions"]["faq_upsert_article_v1"]["Returns"][number]> {
    const { data, error } = await supabase.rpc("faq_upsert_article_v1", {
      p_article_id: input.articleId || null,
      p_slug: input.slug,
      p_title: input.title,
      p_summary: input.summary,
      p_body_markdown: input.bodyMarkdown,
      p_status: input.status,
      p_source_topic_id: input.sourceTopicId || null,
    });

    if (error) {
      throw toServiceError("upsertFaqArticle", error.message);
    }

    const row = data?.[0];
    if (!row) {
      throw toServiceError("upsertFaqArticle", "No FAQ row returned");
    }

    return row;
  }

  async publishFaqFromTopic(input: PublishFaqFromTopicInput): Promise<Database["public"]["Functions"]["faq_publish_from_topic_v1"]["Returns"][number]> {
    const { data, error } = await supabase.rpc("faq_publish_from_topic_v1", {
      p_topic_id: input.topicId,
      p_slug: input.slug,
      p_title: input.title,
      p_summary: input.summary,
    });

    if (error) {
      throw toServiceError("publishFaqFromTopic", error.message);
    }

    const row = data?.[0];
    if (!row) {
      throw toServiceError("publishFaqFromTopic", "No published FAQ returned");
    }

    return row;
  }
}

export const communityService = new CommunityService();
