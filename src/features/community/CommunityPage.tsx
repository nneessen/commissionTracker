// src/features/community/CommunityPage.tsx
// Layer: UI

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  CheckCircle2,
  MessageCircle,
  MessageSquareWarning,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissionCheck } from "@/hooks/permissions";
import {
  useCreateForumCategory,
  useCreateForumPost,
  useCreateForumTopic,
  useFaqArticle,
  useFaqArticles,
  useForumCategories,
  useForumPosts,
  useForumReports,
  useForumTopicDetail,
  useForumTopics,
  usePublishFaqFromTopic,
  useReportForumContent,
  useResolveForumReport,
  useSetForumAcceptedPost,
  useSetForumPostVote,
  useSetForumTopicStatus,
  useUpsertFaqArticle,
} from "@/hooks/community";
import type {
  FaqArticleStatus,
  ForumReportEntityType,
  ForumReportStatus,
  ForumTopicFilters,
  ForumTopicStatus,
} from "@/types/community.types";
import {
  normalizeSlug,
  validateFaqBody,
  validateFaqSummary,
  validateReportReason,
  validateSlug,
  validateTopicBody,
  validateTopicTitle,
} from "@/services/community";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type CommunityTab = "discussions" | "faq" | "moderation";

type ReportTarget = {
  entityType: ForumReportEntityType;
  entityId: string;
  label: string;
};

const topicStatuses: ForumTopicStatus[] = [
  "open",
  "resolved",
  "locked",
  "archived",
];

const moderationStatuses: Exclude<ForumReportStatus, "open">[] = [
  "reviewing",
  "actioned",
  "dismissed",
];

const faqStatuses: FaqArticleStatus[] = ["draft", "published", "archived"];

function toCommunityTab(value: string): CommunityTab {
  if (value === "faq") {
    return "faq";
  }

  if (value === "moderation") {
    return "moderation";
  }

  return "discussions";
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return formatDistanceToNow(date, { addSuffix: true });
}

function statusBadgeVariant(
  status: ForumTopicStatus | ForumReportStatus | FaqArticleStatus,
): "default" | "success" | "warning" | "destructive" | "outline" {
  if (status === "resolved" || status === "published" || status === "actioned") {
    return "success";
  }

  if (status === "locked" || status === "reviewing") {
    return "warning";
  }

  if (status === "archived" || status === "dismissed") {
    return "outline";
  }

  return "default";
}

export function CommunityPage() {
  const { supabaseUser } = useAuth();
  const { can } = usePermissionCheck();

  const canCreate = can("community.create.own");
  const canModerate = can("community.moderate.own");
  const canManageFaq = can("community.faq.manage");

  const [activeTab, setActiveTab] = useState<CommunityTab>("discussions");

  const [topicSearchInput, setTopicSearchInput] = useState("");
  const topicSearch = useDeferredValue(topicSearchInput.trim());
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [topicStatusFilter, setTopicStatusFilter] = useState<string>("all");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const [newTopicCategoryId, setNewTopicCategoryId] = useState("");
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicBody, setNewTopicBody] = useState("");
  const [replyBody, setReplyBody] = useState("");

  const [faqSearchInput, setFaqSearchInput] = useState("");
  const faqSearch = useDeferredValue(faqSearchInput.trim());
  const [selectedFaqSlug, setSelectedFaqSlug] = useState<string | null>(null);

  const [faqFormArticleId, setFaqFormArticleId] = useState<string | undefined>(undefined);
  const [faqFormSlug, setFaqFormSlug] = useState("");
  const [faqFormTitle, setFaqFormTitle] = useState("");
  const [faqFormSummary, setFaqFormSummary] = useState("");
  const [faqFormBody, setFaqFormBody] = useState("");
  const [faqFormStatus, setFaqFormStatus] = useState<FaqArticleStatus>("draft");

  const [publishFaqSlug, setPublishFaqSlug] = useState("");
  const [publishFaqTitle, setPublishFaqTitle] = useState("");
  const [publishFaqSummary, setPublishFaqSummary] = useState("");

  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  const [reportStatusFilter, setReportStatusFilter] =
    useState<ForumReportStatus | "all">("open");
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>(
    {},
  );

  const categoryQuery = useForumCategories(activeTab === "discussions");

  const topicFilters = useMemo<ForumTopicFilters>(
    () => ({
      categorySlug: categoryFilter === "all" ? undefined : categoryFilter,
      search: topicSearch || undefined,
      status:
        topicStatusFilter === "all"
          ? "all"
          : (topicStatusFilter as ForumTopicStatus),
      sort: "recent" as const,
      limit: 20,
    }),
    [categoryFilter, topicSearch, topicStatusFilter],
  );

  const topicsQuery = useForumTopics(topicFilters, activeTab === "discussions");

  const topics = useMemo(
    () => topicsQuery.data?.pages.flatMap((page) => page.rows) ?? [],
    [topicsQuery.data],
  );

  const topicDetailQuery = useForumTopicDetail(
    selectedTopicId || undefined,
    activeTab === "discussions" && !!selectedTopicId,
  );

  const topicDetail = topicDetailQuery.data;

  const postsQuery = useForumPosts(
    selectedTopicId ? { topicId: selectedTopicId, limit: 50 } : null,
    activeTab === "discussions" && !!selectedTopicId,
  );

  const posts = useMemo(
    () => postsQuery.data?.pages.flatMap((page) => page.rows) ?? [],
    [postsQuery.data],
  );

  const faqQuery = useFaqArticles(
    {
      search: faqSearch || undefined,
      limit: 30,
    },
    activeTab === "faq",
  );

  const faqArticles = faqQuery.data ?? [];

  const faqDetailQuery = useFaqArticle(
    selectedFaqSlug || undefined,
    activeTab === "faq" && !!selectedFaqSlug,
  );

  const faqDetail = faqDetailQuery.data;

  const reportsQuery = useForumReports(
    {
      status: reportStatusFilter,
      limit: 25,
    },
    activeTab === "moderation" && canModerate,
  );

  const reports = useMemo(
    () => reportsQuery.data?.pages.flatMap((page) => page.rows) ?? [],
    [reportsQuery.data],
  );

  const createCategoryMutation = useCreateForumCategory();
  const createTopicMutation = useCreateForumTopic();
  const createPostMutation = useCreateForumPost();
  const setTopicStatusMutation = useSetForumTopicStatus();
  const setAcceptedPostMutation = useSetForumAcceptedPost();
  const setPostVoteMutation = useSetForumPostVote();
  const reportContentMutation = useReportForumContent();
  const resolveReportMutation = useResolveForumReport();
  const upsertFaqMutation = useUpsertFaqArticle();
  const publishFaqFromTopicMutation = usePublishFaqFromTopic();

  const categories = categoryQuery.data ?? [];
  const activeCategories = categories.filter((category) => category.is_active);

  useEffect(() => {
    if (!newTopicCategoryId && activeCategories.length > 0) {
      setNewTopicCategoryId(activeCategories[0].id);
    }
  }, [activeCategories, newTopicCategoryId]);

  useEffect(() => {
    if (topics.length === 0) {
      setSelectedTopicId(null);
      return;
    }

    const exists = topics.some((topic) => topic.id === selectedTopicId);
    if (!selectedTopicId || !exists) {
      setSelectedTopicId(topics[0].id);
    }
  }, [selectedTopicId, topics]);

  useEffect(() => {
    if (faqArticles.length === 0) {
      setSelectedFaqSlug(null);
      return;
    }

    const exists = faqArticles.some((article) => article.slug === selectedFaqSlug);
    if (!selectedFaqSlug || !exists) {
      setSelectedFaqSlug(faqArticles[0].slug);
    }
  }, [faqArticles, selectedFaqSlug]);

  const canMarkAccepted =
    !!topicDetail &&
    (topicDetail.user_can_moderate || topicDetail.author_id === supabaseUser?.id);

  const handleCreateCategory = async () => {
    const slug = normalizeSlug(newCategorySlug || newCategoryName);

    if (!newCategoryName.trim()) {
      toast.error("Category name is required.");
      return;
    }

    const slugError = validateSlug(slug);
    if (slugError) {
      toast.error(slugError);
      return;
    }

    try {
      await createCategoryMutation.mutateAsync({
        name: newCategoryName,
        slug,
        description: newCategoryDescription,
      });
      toast.success("Category created.");
      setNewCategoryName("");
      setNewCategorySlug("");
      setNewCategoryDescription("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create category.");
    }
  };

  const handleCreateTopic = async () => {
    const titleError = validateTopicTitle(newTopicTitle);
    if (titleError) {
      toast.error(titleError);
      return;
    }

    const bodyError = validateTopicBody(newTopicBody);
    if (bodyError) {
      toast.error(bodyError);
      return;
    }

    if (!newTopicCategoryId) {
      toast.error("Pick a category before posting.");
      return;
    }

    try {
      await createTopicMutation.mutateAsync({
        categoryId: newTopicCategoryId,
        title: newTopicTitle.trim(),
        bodyMarkdown: newTopicBody,
      });
      toast.success("Topic created.");
      setNewTopicTitle("");
      setNewTopicBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create topic.");
    }
  };

  const handleCreatePost = async () => {
    if (!selectedTopicId) {
      toast.error("Select a topic first.");
      return;
    }

    const bodyError = validateTopicBody(replyBody);
    if (bodyError) {
      toast.error(bodyError);
      return;
    }

    try {
      await createPostMutation.mutateAsync({
        topicId: selectedTopicId,
        bodyMarkdown: replyBody,
      });
      toast.success("Reply posted.");
      setReplyBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post reply.");
    }
  };

  const handleTopicStatusChange = async (status: ForumTopicStatus) => {
    if (!selectedTopicId) {
      return;
    }

    try {
      await setTopicStatusMutation.mutateAsync({
        topicId: selectedTopicId,
        status,
      });
      toast.success(`Topic status updated to ${status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status.");
    }
  };

  const handleMarkAccepted = async (postId: string) => {
    if (!selectedTopicId) {
      return;
    }

    try {
      await setAcceptedPostMutation.mutateAsync({
        topicId: selectedTopicId,
        postId,
      });
      toast.success("Accepted answer updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to set accepted answer.",
      );
    }
  };

  const handleVote = async (postId: string, vote: -1 | 1) => {
    try {
      await setPostVoteMutation.mutateAsync({
        postId,
        vote,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cast vote.");
    }
  };

  const handleSubmitReport = async () => {
    if (!reportTarget) {
      return;
    }

    const reasonError = validateReportReason(reportReason);
    if (reasonError) {
      toast.error(reasonError);
      return;
    }

    try {
      await reportContentMutation.mutateAsync({
        entityType: reportTarget.entityType,
        entityId: reportTarget.entityId,
        reason: reportReason,
        details: reportDetails || undefined,
      });
      toast.success("Report submitted.");
      setReportTarget(null);
      setReportReason("");
      setReportDetails("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit report.");
    }
  };

  const handleLoadFaqIntoForm = () => {
    if (!faqDetail) {
      return;
    }

    setFaqFormArticleId(faqDetail.id);
    setFaqFormSlug(faqDetail.slug);
    setFaqFormTitle(faqDetail.title);
    setFaqFormSummary(faqDetail.summary);
    setFaqFormBody(faqDetail.body_markdown);
    setFaqFormStatus(faqDetail.status as FaqArticleStatus);
    toast.success("FAQ loaded into editor.");
  };

  const handleUpsertFaq = async () => {
    const slug = normalizeSlug(faqFormSlug || faqFormTitle);

    const slugError = validateSlug(slug);
    if (slugError) {
      toast.error(slugError);
      return;
    }

    const titleError = validateTopicTitle(faqFormTitle);
    if (titleError) {
      toast.error(titleError);
      return;
    }

    const summaryError = validateFaqSummary(faqFormSummary);
    if (summaryError) {
      toast.error(summaryError);
      return;
    }

    const bodyError = validateFaqBody(faqFormBody);
    if (bodyError) {
      toast.error(bodyError);
      return;
    }

    try {
      const row = await upsertFaqMutation.mutateAsync({
        articleId: faqFormArticleId,
        slug,
        title: faqFormTitle.trim(),
        summary: faqFormSummary.trim(),
        bodyMarkdown: faqFormBody,
        status: faqFormStatus,
        sourceTopicId: selectedTopicId || undefined,
      });
      toast.success("FAQ saved.");
      setSelectedFaqSlug(row.slug);
      setFaqFormArticleId(row.id);
      setFaqFormSlug(row.slug);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save FAQ.");
    }
  };

  const handlePublishFaqFromTopic = async () => {
    if (!selectedTopicId) {
      toast.error("Select a topic before publishing to FAQ.");
      return;
    }

    const slug = normalizeSlug(publishFaqSlug || publishFaqTitle || topicDetail?.title || "");

    const slugError = validateSlug(slug);
    if (slugError) {
      toast.error(slugError);
      return;
    }

    const titleError = validateTopicTitle(publishFaqTitle);
    if (titleError) {
      toast.error(titleError);
      return;
    }

    const summaryError = validateFaqSummary(publishFaqSummary);
    if (summaryError) {
      toast.error(summaryError);
      return;
    }

    try {
      const row = await publishFaqFromTopicMutation.mutateAsync({
        topicId: selectedTopicId,
        slug,
        title: publishFaqTitle.trim(),
        summary: publishFaqSummary.trim(),
      });
      toast.success("Topic published to FAQ.");
      setSelectedFaqSlug(row.slug);
      setActiveTab("faq");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish FAQ.");
    }
  };

  const handleResolveReport = async (
    reportId: string,
    status: Exclude<ForumReportStatus, "open">,
  ) => {
    try {
      await resolveReportMutation.mutateAsync({
        reportId,
        status,
        resolutionNote: resolutionNotes[reportId] || undefined,
      });
      toast.success(`Report marked as ${status}.`);
      setResolutionNotes((prev) => ({
        ...prev,
        [reportId]: "",
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resolve report.");
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto bg-zinc-50 dark:bg-zinc-950 p-4 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Community
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          IMO-wide discussions, FAQ knowledge base, and moderation workflows.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(toCommunityTab(value))}
        className="space-y-3"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="discussions" className="text-xs">
            <MessageCircle className="h-4 w-4 mr-1" />
            Discussions
          </TabsTrigger>
          <TabsTrigger value="faq" className="text-xs">
            <BookOpen className="h-4 w-4 mr-1" />
            FAQ
          </TabsTrigger>
          {canModerate && (
            <TabsTrigger value="moderation" className="text-xs">
              <ShieldCheck className="h-4 w-4 mr-1" />
              Moderation
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="discussions" className="mt-0 space-y-3">
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Topic Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    value={topicSearchInput}
                    onChange={(event) => setTopicSearchInput(event.target.value)}
                    placeholder="Search topics"
                  />

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.slug}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={topicStatusFilter}
                    onValueChange={setTopicStatusFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {topicStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {canModerate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Create Category</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Input
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(event) => {
                        setNewCategoryName(event.target.value);
                        if (!newCategorySlug) {
                          setNewCategorySlug(normalizeSlug(event.target.value));
                        }
                      }}
                    />
                    <Input
                      placeholder="Slug"
                      value={newCategorySlug}
                      onChange={(event) =>
                        setNewCategorySlug(normalizeSlug(event.target.value))
                      }
                    />
                    <Textarea
                      placeholder="Description"
                      value={newCategoryDescription}
                      onChange={(event) =>
                        setNewCategoryDescription(event.target.value)
                      }
                      textSize="sm"
                    />
                    <Button
                      onClick={handleCreateCategory}
                      disabled={createCategoryMutation.isPending}
                      className="w-full"
                    >
                      {createCategoryMutation.isPending
                        ? "Creating..."
                        : "Create Category"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Topics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topicsQuery.isPending && (
                    <div className="space-y-2">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  )}

                  {!topicsQuery.isPending && topics.length === 0 && (
                    <div className="rounded-md border border-dashed border-zinc-300 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                      No topics found. {canCreate ? "Create the first one below." : "Ask an admin to create a topic."}
                    </div>
                  )}

                  {topics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      className={`w-full rounded-md border px-3 py-2 text-left transition ${
                        selectedTopicId === topic.id
                          ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-900"
                          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                      }`}
                      onClick={() => setSelectedTopicId(topic.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium">{topic.title}</p>
                        <Badge variant={statusBadgeVariant(topic.status as ForumTopicStatus)}>
                          {topic.status}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {topic.snippet}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500">
                        {topic.reply_count} replies • {formatRelativeTime(topic.last_activity_at)}
                      </p>
                    </button>
                  ))}

                  {topicsQuery.hasNextPage && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => topicsQuery.fetchNextPage()}
                      disabled={topicsQuery.isFetchingNextPage}
                    >
                      {topicsQuery.isFetchingNextPage ? "Loading..." : "Load more"}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {canCreate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">New Topic</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Select
                      value={newTopicCategoryId}
                      onValueChange={setNewTopicCategoryId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Topic title"
                      value={newTopicTitle}
                      onChange={(event) => setNewTopicTitle(event.target.value)}
                    />
                    <Textarea
                      placeholder="Describe your question or insight"
                      value={newTopicBody}
                      onChange={(event) => setNewTopicBody(event.target.value)}
                    />
                    <Button
                      className="w-full"
                      onClick={handleCreateTopic}
                      disabled={
                        createTopicMutation.isPending || activeCategories.length === 0
                      }
                    >
                      {createTopicMutation.isPending ? "Posting..." : "Post Topic"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-3 lg:col-span-8">
              {!selectedTopicId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Select a topic</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
                    Choose a topic from the left to read and reply.
                  </CardContent>
                </Card>
              )}

              {selectedTopicId && (
                <>
                  <Card>
                    <CardHeader>
                      {topicDetailQuery.isPending && (
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-2/3" />
                          <Skeleton className="h-4 w-1/3" />
                        </div>
                      )}

                      {!topicDetailQuery.isPending && topicDetail && (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <CardTitle className="text-base">{topicDetail.title}</CardTitle>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                {topicDetail.author_name} • {formatRelativeTime(topicDetail.created_at)}
                              </p>
                            </div>
                            <Badge
                              variant={statusBadgeVariant(
                                topicDetail.status as ForumTopicStatus,
                              )}
                            >
                              {topicDetail.status}
                            </Badge>
                          </div>

                          <div className="rounded-md border border-zinc-200 bg-white/60 p-3 text-sm whitespace-pre-wrap dark:border-zinc-800 dark:bg-zinc-900/40">
                            {topicDetail.body_markdown}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setReportTarget({
                                  entityType: "topic",
                                  entityId: topicDetail.id,
                                  label: topicDetail.title,
                                })
                              }
                            >
                              <MessageSquareWarning className="h-4 w-4" />
                              Report Topic
                            </Button>

                            {canModerate && (
                              <Select
                                value={topicDetail.status}
                                onValueChange={(value) =>
                                  handleTopicStatusChange(value as ForumTopicStatus)
                                }
                              >
                                <SelectTrigger className="w-44">
                                  <SelectValue placeholder="Set status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {topicStatuses.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {status}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </>
                      )}
                    </CardHeader>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Replies</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {postsQuery.isPending && (
                        <div className="space-y-2">
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                      )}

                      {!postsQuery.isPending && posts.length === 0 && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          No replies yet.
                        </p>
                      )}

                      {posts.map((post) => (
                        <div
                          key={post.id}
                          className="rounded-md border border-zinc-200 bg-white/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{post.author_name}</p>
                              <p className="text-[11px] text-zinc-500">
                                {formatRelativeTime(post.created_at)}
                              </p>
                            </div>
                            {topicDetail?.accepted_post_id === post.id && (
                              <Badge variant="success">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Accepted
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                            {post.body_markdown}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            <Button
                              size="xs"
                              variant={post.my_vote === 1 ? "default" : "outline"}
                              onClick={() => handleVote(post.id, 1)}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="xs"
                              variant={post.my_vote === -1 ? "destructive" : "outline"}
                              onClick={() => handleVote(post.id, -1)}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                            {canMarkAccepted && topicDetail?.accepted_post_id !== post.id && (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleMarkAccepted(post.id)}
                              >
                                Mark Accepted
                              </Button>
                            )}
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() =>
                                setReportTarget({
                                  entityType: "post",
                                  entityId: post.id,
                                  label: `Reply by ${post.author_name}`,
                                })
                              }
                            >
                              Report
                            </Button>
                          </div>
                        </div>
                      ))}

                      {postsQuery.hasNextPage && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => postsQuery.fetchNextPage()}
                          disabled={postsQuery.isFetchingNextPage}
                        >
                          {postsQuery.isFetchingNextPage ? "Loading..." : "Load more replies"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {canCreate && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Reply</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Textarea
                          placeholder="Post a reply"
                          value={replyBody}
                          onChange={(event) => setReplyBody(event.target.value)}
                          disabled={
                            topicDetail?.status === "locked" ||
                            topicDetail?.status === "archived"
                          }
                        />
                        <Button
                          onClick={handleCreatePost}
                          disabled={
                            createPostMutation.isPending ||
                            topicDetail?.status === "locked" ||
                            topicDetail?.status === "archived"
                          }
                        >
                          {createPostMutation.isPending ? "Posting..." : "Post Reply"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {reportTarget && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Report Content</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          Reporting: {reportTarget.label}
                        </p>
                        <Input
                          value={reportReason}
                          onChange={(event) => setReportReason(event.target.value)}
                          placeholder="Reason"
                        />
                        <Textarea
                          value={reportDetails}
                          onChange={(event) => setReportDetails(event.target.value)}
                          textSize="sm"
                          placeholder="Additional details (optional)"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            variant="destructive"
                            onClick={handleSubmitReport}
                            disabled={reportContentMutation.isPending}
                          >
                            {reportContentMutation.isPending
                              ? "Submitting..."
                              : "Submit Report"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setReportTarget(null);
                              setReportReason("");
                              setReportDetails("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="faq" className="mt-0">
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">FAQ Articles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    value={faqSearchInput}
                    onChange={(event) => setFaqSearchInput(event.target.value)}
                    placeholder="Search FAQ"
                  />

                  {faqQuery.isPending && (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  )}

                  {!faqQuery.isPending && faqArticles.length === 0 && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      No FAQ articles available.
                    </p>
                  )}

                  {faqArticles.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => setSelectedFaqSlug(article.slug)}
                      className={`w-full rounded-md border px-3 py-2 text-left transition ${
                        selectedFaqSlug === article.slug
                          ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-900"
                          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium">{article.title}</p>
                        <Badge
                          variant={statusBadgeVariant(
                            article.status as FaqArticleStatus,
                          )}
                        >
                          {article.status}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {article.summary}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3 lg:col-span-7">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Article Detail</CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedFaqSlug && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Select an FAQ article to view details.
                    </p>
                  )}

                  {faqDetailQuery.isPending && (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  )}

                  {!faqDetailQuery.isPending && faqDetail && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={statusBadgeVariant(
                            faqDetail.status as FaqArticleStatus,
                          )}
                        >
                          {faqDetail.status}
                        </Badge>
                        <span className="text-xs text-zinc-500">
                          Updated {formatRelativeTime(faqDetail.updated_at)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold">{faqDetail.title}</h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {faqDetail.summary}
                      </p>
                      <div className="rounded-md border border-zinc-200 bg-white/60 p-3 text-sm whitespace-pre-wrap dark:border-zinc-800 dark:bg-zinc-900/40">
                        {faqDetail.body_markdown}
                      </div>
                      {canManageFaq && (
                        <Button variant="outline" onClick={handleLoadFaqIntoForm}>
                          Load into editor
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {canManageFaq && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">FAQ Editor</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Input
                        value={faqFormTitle}
                        onChange={(event) => setFaqFormTitle(event.target.value)}
                        placeholder="Title"
                      />
                      <Input
                        value={faqFormSlug}
                        onChange={(event) =>
                          setFaqFormSlug(normalizeSlug(event.target.value))
                        }
                        placeholder="Slug"
                      />
                      <Textarea
                        value={faqFormSummary}
                        onChange={(event) => setFaqFormSummary(event.target.value)}
                        textSize="sm"
                        placeholder="Summary"
                      />
                      <Textarea
                        value={faqFormBody}
                        onChange={(event) => setFaqFormBody(event.target.value)}
                        placeholder="Body markdown"
                      />

                      <Select
                        value={faqFormStatus}
                        onValueChange={(value) => setFaqFormStatus(value as FaqArticleStatus)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {faqStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={handleUpsertFaq}
                        disabled={upsertFaqMutation.isPending}
                      >
                        {upsertFaqMutation.isPending
                          ? "Saving..."
                          : faqFormArticleId
                            ? "Update FAQ"
                            : "Create FAQ"}
                      </Button>
                    </CardContent>
                  </Card>

                  {topicDetail && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Publish Selected Topic to FAQ</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          Source topic: {topicDetail.title}
                        </p>
                        <Input
                          value={publishFaqTitle}
                          onChange={(event) => setPublishFaqTitle(event.target.value)}
                          placeholder="FAQ title"
                        />
                        <Input
                          value={publishFaqSlug}
                          onChange={(event) =>
                            setPublishFaqSlug(normalizeSlug(event.target.value))
                          }
                          placeholder="FAQ slug"
                        />
                        <Textarea
                          value={publishFaqSummary}
                          onChange={(event) => setPublishFaqSummary(event.target.value)}
                          textSize="sm"
                          placeholder="FAQ summary"
                        />
                        <Button
                          onClick={handlePublishFaqFromTopic}
                          disabled={publishFaqFromTopicMutation.isPending}
                        >
                          {publishFaqFromTopicMutation.isPending
                            ? "Publishing..."
                            : "Publish from Topic"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="moderation" className="mt-0">
          {!canModerate && (
            <Card>
              <CardContent className="p-5 text-sm text-zinc-600 dark:text-zinc-400">
                You do not have moderation access.
              </CardContent>
            </Card>
          )}

          {canModerate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={reportStatusFilter}
                  onValueChange={(value) =>
                    setReportStatusFilter(value as ForumReportStatus | "all")
                  }
                >
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All reports</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    {moderationStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {reportsQuery.isPending && (
                  <div className="space-y-2">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                )}

                {!reportsQuery.isPending && reports.length === 0 && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No reports found for this filter.
                  </p>
                )}

                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-md border border-zinc-200 bg-white/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {report.entity_type.toUpperCase()} • {report.reason}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Reported {formatRelativeTime(report.created_at)} by {report.reported_by.slice(0, 8)}...
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Entity: {report.entity_id}
                        </p>
                      </div>
                      <Badge
                        variant={statusBadgeVariant(
                          report.status as ForumReportStatus,
                        )}
                      >
                        {report.status}
                      </Badge>
                    </div>

                    {report.details && (
                      <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                        {report.details}
                      </p>
                    )}

                    <Textarea
                      className="mt-2"
                      textSize="sm"
                      placeholder="Resolution note (optional)"
                      value={resolutionNotes[report.id] ?? ""}
                      onChange={(event) =>
                        setResolutionNotes((prev) => ({
                          ...prev,
                          [report.id]: event.target.value,
                        }))
                      }
                    />

                    <div className="mt-2 flex flex-wrap gap-2">
                      {moderationStatuses.map((status) => (
                        <Button
                          key={status}
                          size="xs"
                          variant="outline"
                          disabled={resolveReportMutation.isPending}
                          onClick={() => handleResolveReport(report.id, status)}
                        >
                          Mark {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}

                {reportsQuery.hasNextPage && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => reportsQuery.fetchNextPage()}
                    disabled={reportsQuery.isFetchingNextPage}
                  >
                    {reportsQuery.isFetchingNextPage ? "Loading..." : "Load more reports"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
