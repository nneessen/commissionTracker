// src/features/messages/components/layout/MessagesLayout.tsx
// Two-panel layout for messages with zinc palette styling

import { ReactNode } from "react";

interface MessagesLayoutProps {
  list: ReactNode;
  detail: ReactNode;
}

export function MessagesLayout({ list, detail }: MessagesLayoutProps) {
  return (
    <div className="h-full flex gap-2">
      {/* Thread list - fixed width */}
      <div className="w-72 flex-shrink-0 overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="h-full overflow-auto">{list}</div>
      </div>

      {/* Detail view - flexible width */}
      <div className="flex-1 overflow-hidden">{detail}</div>
    </div>
  );
}
