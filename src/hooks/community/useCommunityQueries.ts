// src/hooks/community/useCommunityQueries.ts
// Layer: application

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type {
  FaqArticleFilters,
  ForumActivityCursor,
  ForumPostCursor,
  ForumPostsFilters,
  ForumReportsFilters,
  ForumTopicFilters,
} from "@/types/community.types";
import { communityDefaults, communityKeys, communityQueryFns } from "./communityKeys";

type TopicPageResult = Awaited<
  ReturnType<typeof communityQueryFns.topicsPage>
>;
type PostPageResult = Awaited<ReturnType<typeof communityQueryFns.postsPage>>;
type ReportPageResult = Awaited<
  ReturnType<typeof communityQueryFns.reportsPage>
>;

export function useForumCategories(enabled = true) {
  return useQuery({
    queryKey: communityKeys.categories(),
    queryFn: communityQueryFns.categories,
    staleTime: 5 * 60_000,
    gcTime: 20 * 60_000,
    enabled,
  });
}

export function useForumTopics(filters: ForumTopicFilters, enabled = true) {
  return useInfiniteQuery<
    TopicPageResult,
    Error,
    InfiniteData<TopicPageResult, ForumActivityCursor | null>,
    ReturnType<typeof communityKeys.topics>,
    ForumActivityCursor | null
  >({
    queryKey: communityKeys.topics(filters),
    queryFn: ({ pageParam }) =>
      communityQueryFns.topicsPage({
        filters: {
          ...filters,
          limit: filters.limit ?? communityDefaults.topicLimit,
        },
        pageParam: pageParam ?? undefined,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    maxPages: 5,
    enabled,
  });
}

export function useForumTopicDetail(topicId?: string, enabled = true) {
  return useQuery({
    queryKey: communityKeys.topicDetail(topicId || ""),
    queryFn: () => communityQueryFns.topicDetail(topicId!),
    enabled: enabled && !!topicId,
    staleTime: 15_000,
    gcTime: 10 * 60_000,
  });
}

export function useForumPosts(filters: ForumPostsFilters | null, enabled = true) {
  return useInfiniteQuery<
    PostPageResult,
    Error,
    InfiniteData<PostPageResult, ForumPostCursor | null>,
    ReturnType<typeof communityKeys.topicPosts>,
    ForumPostCursor | null
  >({
    queryKey: communityKeys.topicPosts(filters?.topicId || "", {
      topicId: filters?.topicId || "",
      limit: filters?.limit,
    }),
    queryFn: ({ pageParam }) =>
      communityQueryFns.postsPage({
        filters: {
          topicId: filters!.topicId,
          limit: filters?.limit ?? communityDefaults.postLimit,
        },
        pageParam: pageParam ?? undefined,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 15_000,
    gcTime: 10 * 60_000,
    maxPages: 6,
    enabled: enabled && !!filters?.topicId,
  });
}

export function useFaqArticles(filters: FaqArticleFilters, enabled = true) {
  return useQuery({
    queryKey: communityKeys.faqList(filters),
    queryFn: () =>
      communityQueryFns.faqList({
        ...filters,
        limit: filters.limit ?? communityDefaults.faqLimit,
      }),
    staleTime: 5 * 60_000,
    gcTime: 20 * 60_000,
    enabled,
  });
}

export function useFaqArticle(slug?: string, enabled = true) {
  return useQuery({
    queryKey: communityKeys.faqDetail(slug || ""),
    queryFn: () => communityQueryFns.faqDetail(slug!),
    staleTime: 5 * 60_000,
    gcTime: 20 * 60_000,
    enabled: enabled && !!slug,
  });
}

export function useForumReports(filters: ForumReportsFilters, enabled = true) {
  return useInfiniteQuery<
    ReportPageResult,
    Error,
    InfiniteData<ReportPageResult, number>,
    ReturnType<typeof communityKeys.reports>,
    number
  >({
    queryKey: communityKeys.reports(filters),
    queryFn: ({ pageParam }) =>
      communityQueryFns.reportsPage({
        filters: {
          ...filters,
          limit: filters.limit ?? communityDefaults.reportLimit,
        },
        pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    maxPages: 4,
    enabled,
  });
}
