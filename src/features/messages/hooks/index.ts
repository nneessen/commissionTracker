// src/features/messages/hooks/index.ts
// Messages feature hooks barrel export

export * from "./useThreads";
export * from "./useThread";
export * from "./useLabels";
export * from "./useSendEmail";
export * from "./useFolderCounts";
export * from "./useContacts";
// Export useContactBrowser but not its useContactSearch (conflicts with useContacts)
export { useContactBrowser, type ContactTab } from "./useContactBrowser";
