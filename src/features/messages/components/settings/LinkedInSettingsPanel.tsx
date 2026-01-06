// src/features/messages/components/settings/LinkedInSettingsPanel.tsx
// LinkedIn messaging settings - coming soon placeholder

import { Linkedin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function LinkedInSettingsPanel() {
  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Linkedin className="h-4 w-4 text-zinc-500" />
              LinkedIn Integration
            </CardTitle>
            <Badge
              variant="outline"
              className="text-[10px] h-5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
            >
              Coming Soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="h-12 w-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Linkedin className="h-6 w-6 text-white" />
            </div>
            <p className="text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">
              LinkedIn Messaging
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              Connect your LinkedIn account to send and receive messages
              directly from your communications hub.
            </p>
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                This feature is currently in development. Stay tuned for
                updates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
