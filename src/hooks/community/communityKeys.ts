// src/hooks/community/communityKeys.ts
// Layer: application

import { communityService } from "@/services/community";
import type {
  FaqArticleFilters,
  ForumActivityCursor,
  ForumPostCursor,
  ForumPostsFilters,
  ForumReportsFilters,
  ForumTopicFilters,
} from "@/types/community.types";

const QUERY_VERSION = "v1" as const;

export const communityDefaults = {
  topicLimit: 20,
  postLimit: 50,
  faqLimit: 30,
  reportLimit: 25,
} as const;

export const communityKeys = {
  all: ["community", QUERY_VERSION] as const,
  categories: () => [...communityKeys.all, "categories"] as const,
  topics: (filters: ForumTopicFilters) =>
    [...communityKeys.all, "topics", filters] as const,
  topicDetail: (topicId: string) =>
    [...communityKeys.all, "topic-detail", topicId] as const,
  topicPosts: (topicId: string, filters: ForumPostsFilters) =>
    [...communityKeys.all, "topic-posts", topicId, filters] as const,
  faqList: (filters: FaqArticleFilters) =>
    [...communityKeys.all, "faq-list", filters] as const,
  faqDetail: (slug: string) =>
    [...communityKeys.all, "faq-detail", slug] as const,
  reports: (filters: ForumReportsFilters) =>
    [...communityKeys.all, "reports", filters] as const,
};

export const communityQueryFns = {
  categories: () => communityService.getCategories(),

  topicsPage: async ({
    filters,
    pageParam,
  }: {
    filters: ForumTopicFilters;
    pageParam?: ForumActivityCursor;
  }) => {
    const limit = filters.limit ?? communityDefaults.topicLimit;
    const rows = await communityService.listTopics(
      {
        ...filters,
        limit,
      },
      pageParam,
    );

    const last = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && last
        ? {
            last_activity_at: last.last_activity_at,
            topic_id: last.id,
          }
        : undefined;

    return {
      rows,
      nextCursor,
    };
  },

  topicDetail: (topicId: string) => communityService.getTopicDetail(topicId),

  postsPage: async ({
    filters,
    pageParam,
  }: {
    filters: ForumPostsFilters;
    pageParam?: ForumPostCursor;
  }) => {
    const limit = filters.limit ?? communityDefaults.postLimit;
    const rows = await communityService.listPosts(
      {
        ...filters,
        limit,
      },
      pageParam,
    );

    const last = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && last
        ? {
            created_at: last.created_at,
            post_id: last.id,
          }
        : undefined;

    return {
      rows,
      nextCursor,
    };
  },

  faqList: (filters: FaqArticleFilters) =>
    communityService.listFaqArticles({
      ...filters,
      limit: filters.limit ?? communityDefaults.faqLimit,
    }),

  faqDetail: (slug: string) => communityService.getFaqArticle(slug),

  reportsPage: async ({
    filters,
    pageParam = 0,
  }: {
    filters: ForumReportsFilters;
    pageParam?: number;
  }) => {
    const limit = filters.limit ?? communityDefaults.reportLimit;
    const rows = await communityService.listReports(
      {
        ...filters,
        limit,
      },
      pageParam,
    );

    const nextPage = rows.length === limit ? pageParam + 1 : undefined;

    return {
      rows,
      nextPage,
    };
  },
};
