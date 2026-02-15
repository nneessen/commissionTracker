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
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissionCheck } from "@/hooks/permissions";
import {
  useCreateForumCategory,
  useCreateForumPost,
  useCreateForumTopic,
  useDeleteFaqArticle,
  useDeleteForumCategory,
  useDeleteForumPost,
  useDeleteForumTopic,
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
} from "@/lib/communityValidation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
const COMMUNITY_WIP_NOTICE_KEY = "community-feature-wip-notice-v1";

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
  const [showLaunchNotice, setShowLaunchNotice] = useState(false);

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

  const categoryQuery = useForumCategories();

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

  const faqArticles = useMemo(() => faqQuery.data ?? [], [faqQuery.data]);

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
  const deleteCategoryMutation = useDeleteForumCategory();
  const createTopicMutation = useCreateForumTopic();
  const deleteTopicMutation = useDeleteForumTopic();
  const createPostMutation = useCreateForumPost();
  const deletePostMutation = useDeleteForumPost();
  const setTopicStatusMutation = useSetForumTopicStatus();
  const setAcceptedPostMutation = useSetForumAcceptedPost();
  const setPostVoteMutation = useSetForumPostVote();
  const reportContentMutation = useReportForumContent();
  const resolveReportMutation = useResolveForumReport();
  const upsertFaqMutation = useUpsertFaqArticle();
  const deleteFaqMutation = useDeleteFaqArticle();
  const publishFaqFromTopicMutation = usePublishFaqFromTopic();

  const categories = categoryQuery.data ?? [];
  const activeCategories = categories.filter((category) => category.is_active);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(COMMUNITY_WIP_NOTICE_KEY);
      setShowLaunchNotice(dismissed !== "dismissed");
    } catch {
      setShowLaunchNotice(true);
    }
  }, []);

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

  const handleDeleteCategory = async (categoryId: string, name: string) => {
    const confirmed = window.confirm(
      `Delete category "${name}"? This only works if no topics still reference it.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCategoryMutation.mutateAsync({ categoryId });
      toast.success("Category deleted.");
      if (categoryFilter !== "all") {
        setCategoryFilter("all");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category.");
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

  const handleDeleteTopic = async (topicId: string, title: string) => {
    const confirmed = window.confirm(
      `Delete topic "${title}" and all replies? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteTopicMutation.mutateAsync({ topicId });
      toast.success("Topic deleted.");
      if (selectedTopicId === topicId) {
        setSelectedTopicId(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete topic.");
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

  const handleDeletePost = async (postId: string, authorName: string) => {
    if (!selectedTopicId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete this reply by ${authorName}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deletePostMutation.mutateAsync({
        topicId: selectedTopicId,
        postId,
      });
      toast.success("Reply deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete reply.");
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

  const handleDeleteFaq = async () => {
    if (!faqDetail) {
      return;
    }

    const confirmed = window.confirm(
      `Delete FAQ "${faqDetail.title}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteFaqMutation.mutateAsync({
        articleId: faqDetail.id,
        slug: faqDetail.slug,
      });
      toast.success("FAQ deleted.");
      setSelectedFaqSlug(null);
      setFaqFormArticleId(undefined);
      setFaqFormSlug("");
      setFaqFormTitle("");
      setFaqFormSummary("");
      setFaqFormBody("");
      setFaqFormStatus("draft");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete FAQ.");
    }
  };

  const handlePublishFaqFromTopic = async () => {
    if (!selectedTopicId) {
      toast.error("Select a topic before publishing to FAQ.");
      return;
    }

    const slug = normalizeSlug(
      publishFaqSlug || publishFaqTitle || topicDetail?.title || "",
    );

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

  const dismissLaunchNotice = () => {
    setShowLaunchNotice(false);

    try {
      window.localStorage.setItem(COMMUNITY_WIP_NOTICE_KEY, "dismissed");
    } catch {
      // Ignore localStorage issues and allow usage.
    }
  };

  const handleLaunchNoticeOpenChange = (open: boolean) => {
    if (!open) {
      dismissLaunchNotice();
      return;
    }

    setShowLaunchNotice(true);
  };

  const statTopics = topicsQuery.isPending ? "-" : String(topics.length);
  const statFaq = faqQuery.isPending ? "-" : String(faqArticles.length);
  const statReports = reportsQuery.isPending ? "-" : String(reports.length);

  return (
    <>
      <Dialog open={showLaunchNotice} onOpenChange={handleLaunchNoticeOpenChange}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>New Feature: Community (Work In Progress)</DialogTitle>
            <DialogDescription>
              Community is now live and usable, and we are still actively refining
              the experience.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <p>Once you close this message, you can post normally.</p>
            <p>
              Post about anything relevant to this business: general questions,
              this app, life insurance, IMO, agency, and agent workflows.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={dismissLaunchNotice}>Continue To Community</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Community
              </h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Discussions, FAQ, and moderation in one workspace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>{statTopics} topics</span>
            <span>{statFaq} FAQ</span>
            {canModerate && <span>{statReports} reports</span>}
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(toCommunityTab(value))}
          className="flex-1 min-h-0 flex flex-col"
        >
          <TabsList className="h-8 w-fit bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <TabsTrigger
              value="discussions"
              className="h-7 text-xs data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1" />
              Discussions
            </TabsTrigger>
            <TabsTrigger
              value="faq"
              className="h-7 text-xs data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
            >
              <BookOpen className="h-3.5 w-3.5 mr-1" />
              FAQ
            </TabsTrigger>
            {canModerate && (
              <TabsTrigger
                value="moderation"
                className="h-7 text-xs data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Moderation
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 min-h-0 overflow-auto mt-2.5">
            <TabsContent value="discussions" className="m-0 space-y-3">
              <div className="grid gap-3 xl:grid-cols-12">
                <div className="space-y-3 xl:col-span-4">
                  <Card>
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm">Discussion Feed</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5 p-3 pt-0">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          Search
                        </Label>
                        <Input
                          value={topicSearchInput}
                          onChange={(event) => setTopicSearchInput(event.target.value)}
                          placeholder="Search topics"
                        />
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            Category
                          </Label>
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
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            Status
                          </Label>
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
                        </div>
                      </div>

                      {topicsQuery.isPending && (
                        <div className="space-y-2 pt-1">
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      )}

                      {!topicsQuery.isPending && topics.length === 0 && (
                        <div className="rounded-md border border-dashed border-zinc-300 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                          No topics found. {canCreate ? "Use the form to post first." : "Ask an admin to create a topic."}
                        </div>
                      )}

                      <div className="space-y-2 max-h-[44vh] overflow-auto pr-1">
                        {topics.map((topic) => (
                          <button
                            key={topic.id}
                            type="button"
                            className={`w-full rounded-md border px-2.5 py-2 text-left transition ${
                              selectedTopicId === topic.id
                                ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-900"
                                : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                            }`}
                            onClick={() => setSelectedTopicId(topic.id)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="line-clamp-1 text-[13px] font-medium">{topic.title}</p>
                              <Badge
                                variant={statusBadgeVariant(topic.status as ForumTopicStatus)}
                              >
                                {topic.status}
                              </Badge>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                              {topic.snippet}
                            </p>
                            <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-500">
                              {topic.reply_count} replies • {formatRelativeTime(topic.last_activity_at)}
                            </p>
                          </button>
                        ))}
                      </div>

                      {topicsQuery.hasNextPage && (
                        <Button
                          size="sm"
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

                  {canModerate && (
                    <Card>
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm">Category Management</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2.5 p-3 pt-0">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            Category Name
                          </Label>
                          <Input
                            placeholder="General Questions"
                            value={newCategoryName}
                            onChange={(event) => {
                              setNewCategoryName(event.target.value);
                              if (!newCategorySlug) {
                                setNewCategorySlug(normalizeSlug(event.target.value));
                              }
                            }}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            Slug
                          </Label>
                          <Input
                            placeholder="general-questions"
                            value={newCategorySlug}
                            onChange={(event) =>
                              setNewCategorySlug(normalizeSlug(event.target.value))
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            Description
                          </Label>
                          <Textarea
                            placeholder="Short category description"
                            value={newCategoryDescription}
                            onChange={(event) => setNewCategoryDescription(event.target.value)}
                            textSize="sm"
                          />
                        </div>

                        <Button
                          size="sm"
                          onClick={handleCreateCategory}
                          disabled={createCategoryMutation.isPending}
                          className="w-full"
                        >
                          {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                        </Button>

                        <div className="space-y-1 pt-1">
                          <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                            Existing Categories
                          </p>
                          <div className="space-y-1.5 max-h-40 overflow-auto pr-1">
                            {categories.map((category) => (
                              <div
                                key={category.id}
                                className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white/60 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/40"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium">{category.name}</p>
                                  <p className="truncate text-[10px] text-zinc-500">{category.slug}</p>
                                </div>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDeleteCategory(category.id, category.name)
                                  }
                                  disabled={deleteCategoryMutation.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-3 xl:col-span-8">
                  {!selectedTopicId && (
                    <Card>
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm">Select a topic</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-sm text-zinc-600 dark:text-zinc-400">
                        Choose a topic from the feed to read and reply.
                      </CardContent>
                    </Card>
                  )}

                  {selectedTopicId && (
                    <>
                      <Card>
                        <CardHeader className="p-3 pb-2 space-y-2">
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
                                  <CardTitle className="text-sm">{topicDetail.title}</CardTitle>
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
                                  <>
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

                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() =>
                                        handleDeleteTopic(topicDetail.id, topicDetail.title)
                                      }
                                      disabled={deleteTopicMutation.isPending}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete Topic
                                    </Button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </CardHeader>
                      </Card>

                      <Card>
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-sm">Replies</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 p-3 pt-0">
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
                                {canModerate && (
                                  <Button
                                    size="xs"
                                    variant="destructive"
                                    onClick={() => handleDeletePost(post.id, post.author_name)}
                                    disabled={deletePostMutation.isPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                  </Button>
                                )}
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
                          <CardHeader className="p-3 pb-2">
                            <CardTitle className="text-sm">Reply Form</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2.5 p-3 pt-0">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                Reply
                              </Label>
                              <Textarea
                                placeholder="Post a reply"
                                value={replyBody}
                                onChange={(event) => setReplyBody(event.target.value)}
                                disabled={
                                  topicDetail?.status === "locked" ||
                                  topicDetail?.status === "archived"
                                }
                              />
                            </div>
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
                          <CardHeader className="p-3 pb-2">
                            <CardTitle className="text-sm">Report Content</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2.5 p-3 pt-0">
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                              Reporting: {reportTarget.label}
                            </p>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                Reason
                              </Label>
                              <Input
                                value={reportReason}
                                onChange={(event) => setReportReason(event.target.value)}
                                placeholder="Reason"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                Details (Optional)
                              </Label>
                              <Textarea
                                value={reportDetails}
                                onChange={(event) => setReportDetails(event.target.value)}
                                textSize="sm"
                                placeholder="Additional details"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="destructive"
                                onClick={handleSubmitReport}
                                disabled={reportContentMutation.isPending}
                              >
                                {reportContentMutation.isPending ? "Submitting..." : "Submit Report"}
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

                  {canCreate && (
                    <Card>
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm">New Topic Form</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2.5 p-3 pt-0">
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-1 md:col-span-1">
                            <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              Category
                            </Label>
                            <Select value={newTopicCategoryId} onValueChange={setNewTopicCategoryId}>
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
                          </div>

                          <div className="space-y-1 md:col-span-1">
                            <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              Title
                            </Label>
                            <Input
                              placeholder="How do I..."
                              value={newTopicTitle}
                              onChange={(event) => setNewTopicTitle(event.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            Body
                          </Label>
                          <Textarea
                            placeholder="Describe your question or insight"
                            value={newTopicBody}
                            onChange={(event) => setNewTopicBody(event.target.value)}
                          />
                        </div>

                        <Button
                          size="sm"
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
              </div>
            </TabsContent>

            <TabsContent value="faq" className="m-0 space-y-3">
              <div className="grid gap-3 xl:grid-cols-12">
                <div className="space-y-3 xl:col-span-5">
                  <Card>
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm">FAQ Articles</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5 p-3 pt-0">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          Search
                        </Label>
                        <Input
                          value={faqSearchInput}
                          onChange={(event) => setFaqSearchInput(event.target.value)}
                          placeholder="Search FAQ"
                        />
                      </div>

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

                      <div className="space-y-2 max-h-[58vh] overflow-auto pr-1">
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
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3 xl:col-span-7">
                  <Card>
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm">Article Detail</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
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
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
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
                            <div className="flex flex-wrap items-center gap-2">
                              <Button variant="outline" onClick={handleLoadFaqIntoForm}>
                                Load into editor
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleDeleteFaq}
                                disabled={deleteFaqMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete FAQ
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {canManageFaq && (
                    <>
                      <Card>
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-sm">FAQ Editor</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5 p-3 pt-0">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              Title
                            </Label>
                            <Input
                              value={faqFormTitle}
                              onChange={(event) => setFaqFormTitle(event.target.value)}
                              placeholder="FAQ title"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              Slug
                            </Label>
                            <Input
                              value={faqFormSlug}
                              onChange={(event) =>
                                setFaqFormSlug(normalizeSlug(event.target.value))
                              }
                              placeholder="faq-slug"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              Summary
                            </Label>
                            <Textarea
                              value={faqFormSummary}
                              onChange={(event) => setFaqFormSummary(event.target.value)}
                              textSize="sm"
                              placeholder="Short summary"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              Body
                            </Label>
                            <Textarea
                              value={faqFormBody}
                              onChange={(event) => setFaqFormBody(event.target.value)}
                              placeholder="Body markdown"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              Status
                            </Label>
                            <Select
                              value={faqFormStatus}
                              onValueChange={(value) =>
                                setFaqFormStatus(value as FaqArticleStatus)
                              }
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
                          </div>

                          <Button
                            size="sm"
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
                          <CardHeader className="p-3 pb-2">
                            <CardTitle className="text-sm">Publish Topic To FAQ</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2.5 p-3 pt-0">
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                              Source topic: {topicDetail.title}
                            </p>

                            <div className="space-y-1">
                              <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                FAQ Title
                              </Label>
                              <Input
                                value={publishFaqTitle}
                                onChange={(event) => setPublishFaqTitle(event.target.value)}
                                placeholder="FAQ title"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                FAQ Slug
                              </Label>
                              <Input
                                value={publishFaqSlug}
                                onChange={(event) =>
                                  setPublishFaqSlug(normalizeSlug(event.target.value))
                                }
                                placeholder="faq-slug"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                FAQ Summary
                              </Label>
                              <Textarea
                                value={publishFaqSummary}
                                onChange={(event) => setPublishFaqSummary(event.target.value)}
                                textSize="sm"
                                placeholder="Summary"
                              />
                            </div>

                            <Button
                              size="sm"
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

            <TabsContent value="moderation" className="m-0">
              {!canModerate && (
                <Card>
                  <CardContent className="p-3 text-sm text-zinc-600 dark:text-zinc-400">
                    You do not have moderation access.
                  </CardContent>
                </Card>
              )}

              {canModerate && (
                <Card>
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm">Report Queue</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 p-3 pt-0">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Filter Status
                      </Label>
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
                    </div>

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

                        <div className="mt-2 space-y-1">
                          <Label className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            Resolution Note (Optional)
                          </Label>
                          <Textarea
                            textSize="sm"
                            placeholder="Resolution note"
                            value={resolutionNotes[report.id] ?? ""}
                            onChange={(event) =>
                              setResolutionNotes((prev) => ({
                                ...prev,
                                [report.id]: event.target.value,
                              }))
                            }
                          />
                        </div>

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
          </div>
        </Tabs>
      </div>
    </>
  );
}
