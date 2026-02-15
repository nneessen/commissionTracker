// src/hooks/community/useCommunityMutations.ts
// Layer: application

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { communityService } from "@/services/community";
import type {
  CreateForumCategoryInput,
  CreateForumPostInput,
  CreateForumTopicInput,
  DeleteFaqArticleInput,
  DeleteForumCategoryInput,
  DeleteForumPostInput,
  DeleteForumTopicInput,
  PublishFaqFromTopicInput,
  ReportForumContentInput,
  ResolveForumReportInput,
  SetForumAcceptedPostInput,
  SetForumPostVoteInput,
  SetForumTopicStatusInput,
  UpdateForumPostInput,
  UpdateForumTopicInput,
  UpsertFaqArticleInput,
} from "@/types/community.types";
import { communityKeys } from "./communityKeys";

const topicPostsPrefix = [...communityKeys.all, "topic-posts"] as const;
const topicsPrefix = [...communityKeys.all, "topics"] as const;

export function useCreateForumCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateForumCategoryInput) =>
      communityService.createCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.categories() });
    },
  });
}

export function useCreateForumTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateForumTopicInput) => communityService.createTopic(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: topicsPrefix });
    },
  });
}

export function useCreateForumPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateForumPostInput) => communityService.createPost(input),
    onSuccess: (_row, variables) => {
      queryClient.invalidateQueries({
        queryKey: communityKeys.topicDetail(variables.topicId),
      });
      queryClient.invalidateQueries({ queryKey: topicPostsPrefix });
      queryClient.invalidateQueries({ queryKey: topicsPrefix });
    },
  });
}

export function useUpdateForumTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateForumTopicInput) =>
      communityService.updateTopic(input),
    onSuccess: (_row, variables) => {
      queryClient.invalidateQueries({
        queryKey: communityKeys.topicDetail(variables.topicId),
      });
      queryClient.invalidateQueries({ queryKey: topicsPrefix });
    },
  });
}

export function useUpdateForumPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateForumPostInput) => communityService.updatePost(input),
    onSuccess: (_row, variables) => {
      queryClient.invalidateQueries({
        queryKey: communityKeys.topicDetail(variables.topicId),
      });
      queryClient.invalidateQueries({ queryKey: topicPostsPrefix });
      queryClient.invalidateQueries({ queryKey: topicsPrefix });
    },
  });
}

export function useSetForumTopicStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetForumTopicStatusInput) =>
      communityService.setTopicStatus(input),
    onSuccess: (_row, variables) => {
      queryClient.invalidateQueries({
        queryKey: communityKeys.topicDetail(variables.topicId),
      });
      queryClient.invalidateQueries({ queryKey: topicsPrefix });
    },
  });
}

export function useSetForumAcceptedPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetForumAcceptedPostInput) =>
      communityService.setAcceptedPost(input),
    onSuccess: (_row, variables) => {
      queryClient.invalidateQueries({
        queryKey: communityKeys.topicDetail(variables.topicId),
      });
      queryClient.invalidateQueries({ queryKey: topicsPrefix });
      queryClient.invalidateQueries({ queryKey: topicPostsPrefix });
    },
  });
}

export function useSetForumPostVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetForumPostVoteInput) => communityService.setPostVote(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: topicPostsPrefix });
    },
  });
}

export function useToggleForumTopicFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicId, shouldFollow }: { topicId: string; shouldFollow: boolean }) =>
      communityService.toggleTopicFollow(topicId, shouldFollow),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: topicsPrefix });
    },
  });
}

export function useReportForumContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReportForumContentInput) =>
      communityService.reportContent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...communityKeys.all, "reports"],
      });
    },
  });
}

export function useResolveForumReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResolveForumReportInput) =>
      communityService.resolveReport(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...communityKeys.all, "reports"],
      });
      queryClient.invalidateQueries({ queryKey: topicsPrefix });
    },
  });
}

export function useDeleteForumCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteForumCategoryInput) =>
      communityService.deleteCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.categories() });
      queryClient.invalidateQueries({ queryKey: topicsPrefix });
    },
  });
}

export function useDeleteForumTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteForumTopicInput) => communityService.deleteTopic(input),
    onSuccess: (_row, variables) => {
      queryClient.removeQueries({
        queryKey: communityKeys.topicDetail(variables.topicId),
      });
      queryClient.invalidateQueries({ queryKey: topicPostsPrefix });
      queryClient.invalidateQueries({ queryKey: topicsPrefix });
    },
  });
}

export function useDeleteForumPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteForumPostInput) => communityService.deletePost(input),
    onSuccess: (_row, variables) => {
      queryClient.invalidateQueries({
        queryKey: communityKeys.topicDetail(variables.topicId),
      });
      queryClient.invalidateQueries({ queryKey: topicPostsPrefix });
      queryClient.invalidateQueries({ queryKey: topicsPrefix });
    },
  });
}

export function useUpsertFaqArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertFaqArticleInput) => communityService.upsertFaqArticle(input),
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: [...communityKeys.all, "faq-list"],
      });

      if (row.slug) {
        queryClient.invalidateQueries({
          queryKey: communityKeys.faqDetail(row.slug),
        });
      }
    },
  });
}

export function useDeleteFaqArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteFaqArticleInput) =>
      communityService.deleteFaqArticle(input),
    onSuccess: (_row, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...communityKeys.all, "faq-list"],
      });

      if (variables.slug) {
        queryClient.removeQueries({
          queryKey: communityKeys.faqDetail(variables.slug),
        });
      }
    },
  });
}

export function usePublishFaqFromTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PublishFaqFromTopicInput) =>
      communityService.publishFaqFromTopic(input),
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: [...communityKeys.all, "faq-list"],
      });
      if (row.slug) {
        queryClient.invalidateQueries({
          queryKey: communityKeys.faqDetail(row.slug),
        });
      }
    },
  });
}
