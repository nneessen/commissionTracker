// src/features/messages/index.ts
// Communications Hub - Main exports

// Page
export { MessagesPage } from "./MessagesPage";

// Components - Layout
export { MessagesLayout } from "./components/layout/MessagesLayout";
export { MessagesHeader } from "./components/layout/MessagesHeader";

// Components - Inbox
export { ThreadList } from "./components/inbox/ThreadList";
export { ThreadListItem } from "./components/inbox/ThreadListItem";

// Components - Thread
export { ThreadView } from "./components/thread/ThreadView";

// Components - Compose
export { ComposeDialog } from "./components/compose/ComposeDialog";

// Hooks
export { useThreads } from "./hooks/useThreads";
export { useThread } from "./hooks/useThread";
export { useLabels } from "./hooks/useLabels";
export { useSendEmail } from "./hooks/useSendEmail";

// Services
export * from "./services/threadService";
export * from "./services/emailService";
export * from "./services/labelService";
