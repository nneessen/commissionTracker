// src/types/community.types.ts
// Layer: domain

import type { Database } from "@/types/database.types";

export type ForumTopicStatus = "open" | "resolved" | "locked" | "archived";
export type ForumTopicSort = "recent" | "popular" | "unanswered";
export type FaqArticleStatus = "draft" | "published" | "archived";
export type ForumReportStatus = "open" | "reviewing" | "actioned" | "dismissed";
export type ForumReportEntityType = "topic" | "post";

export type ForumCategory =
  Database["public"]["Tables"]["forum_categories"]["Row"];
export type ForumReport = Database["public"]["Tables"]["forum_reports"]["Row"];

export type ForumTopicSummaryRpc =
  Database["public"]["Functions"]["forum_list_topics_v1"]["Returns"][number];
export type ForumTopicDetailRpc =
  Database["public"]["Functions"]["forum_get_topic_detail_v1"]["Returns"][number];
export type ForumPostRpc =
  Database["public"]["Functions"]["forum_list_posts_v1"]["Returns"][number];
export type FaqArticleSummaryRpc =
  Database["public"]["Functions"]["faq_list_articles_v1"]["Returns"][number];
export type FaqArticleDetailRpc =
  Database["public"]["Functions"]["faq_get_article_v1"]["Returns"][number];

export interface ForumTopicSummary
  extends Omit<ForumTopicSummaryRpc, "accepted_post_id"> {
  accepted_post_id: string | null;
}

export interface ForumTopicDetail
  extends Omit<ForumTopicDetailRpc, "accepted_post_id"> {
  accepted_post_id: string | null;
}

export interface ForumPost extends Omit<ForumPostRpc, "edited_at" | "my_vote"> {
  edited_at: string | null;
  my_vote: number | null;
}

export interface FaqArticleSummary
  extends Omit<FaqArticleSummaryRpc, "source_topic_id" | "published_at"> {
  source_topic_id: string | null;
  published_at: string | null;
}

export interface FaqArticleDetail
  extends Omit<FaqArticleDetailRpc, "source_topic_id" | "published_at"> {
  source_topic_id: string | null;
  published_at: string | null;
}

export interface ForumActivityCursor {
  last_activity_at: string;
  topic_id: string;
}

export interface ForumPostCursor {
  created_at: string;
  post_id: string;
}

export interface FaqCursor {
  published_at: string;
  article_id: string;
}

export interface ForumTopicFilters {
  categorySlug?: string;
  search?: string;
  status?: ForumTopicStatus | "all";
  sort?: ForumTopicSort;
  limit?: number;
}

export interface ForumPostsFilters {
  topicId: string;
  limit?: number;
}

export interface FaqArticleFilters {
  search?: string;
  limit?: number;
}

export interface ForumReportsFilters {
  status?: ForumReportStatus | "all";
  limit?: number;
}

export interface CreateForumCategoryInput {
  slug: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface CreateForumTopicInput {
  categoryId: string;
  title: string;
  bodyMarkdown: string;
}

export interface CreateForumPostInput {
  topicId: string;
  bodyMarkdown: string;
}

export interface UpdateForumTopicInput {
  topicId: string;
  title: string;
  bodyMarkdown: string;
}

export interface UpdateForumPostInput {
  topicId: string;
  postId: string;
  bodyMarkdown: string;
}

export interface SetForumTopicStatusInput {
  topicId: string;
  status: ForumTopicStatus;
}

export interface SetForumAcceptedPostInput {
  topicId: string;
  postId: string;
}

export interface SetForumPostVoteInput {
  postId: string;
  vote: -1 | 1;
}

export interface ReportForumContentInput {
  entityType: ForumReportEntityType;
  entityId: string;
  reason: string;
  details?: string;
}

export interface ResolveForumReportInput {
  reportId: string;
  status: Exclude<ForumReportStatus, "open">;
  resolutionNote?: string;
}

export interface UpsertFaqArticleInput {
  articleId?: string;
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  status: FaqArticleStatus;
  sourceTopicId?: string;
}

export interface PublishFaqFromTopicInput {
  topicId: string;
  slug: string;
  title: string;
  summary: string;
}

export interface DeleteForumCategoryInput {
  categoryId: string;
}

export interface DeleteForumTopicInput {
  topicId: string;
}

export interface DeleteForumPostInput {
  topicId: string;
  postId: string;
}

export interface DeleteFaqArticleInput {
  articleId: string;
  slug?: string;
}
