// src/features/messages/components/layout/MessagesLayout.tsx
// Two-panel layout for messages (list, detail) using Card components

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface MessagesLayoutProps {
  list: ReactNode;
  detail: ReactNode;
}

export function MessagesLayout({ list, detail }: MessagesLayoutProps) {
  return (
    <div className="h-full flex gap-2">
      {/* Thread list - fixed width */}
      <Card className="w-72 flex-shrink-0 overflow-hidden">
        <CardContent className="p-0 h-full overflow-auto">{list}</CardContent>
      </Card>

      {/* Detail view - flexible width */}
      <div className="flex-1 overflow-hidden">{detail}</div>
    </div>
  );
}
