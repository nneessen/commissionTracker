// src/features/training-hub/components/ActivityTab.tsx
import {Mail, Bell, Clock, AlertCircle, CheckCircle2, Info} from "lucide-react";
import {useQuery} from "@tanstack/react-query";
import {supabase} from "@/services/base/supabase";
import {Badge} from "@/components/ui/badge";
import {Skeleton} from "@/components/ui/skeleton";
import {formatDistanceToNow} from "date-fns";

interface ActivityTabProps {
  searchQuery: string;
}

interface EmailActivity {
  id: string;
  type: "email";
  subject: string;
  recipient: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface NotificationActivity {
  id: string;
  type: "notification";
  notification_type: string;
  title: string;
  message: string | null;
  user_name: string;
  created_at: string;
}

type Activity = EmailActivity | NotificationActivity;

export function ActivityTab({ searchQuery }: ActivityTabProps) {
  // Fetch recent emails (last 50)
  const { data: recentEmails, isLoading: emailsLoading } = useQuery({
    queryKey: ["training-hub-recent-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_emails")
        .select(
          `
          id,
          subject,
          status,
          sent_at,
          created_at,
          to_addresses,
          user:user_id(first_name, last_name, email)
        `
        )
        .in("status", ["sent", "delivered", "failed"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  // Fetch recent notifications (last 50)
  const { data: recentNotifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["training-hub-recent-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          id,
          type,
          title,
          message,
          created_at,
          user:user_id(first_name, last_name, email)
        `
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  // Combine and sort activities
  const activities: Activity[] = [];

  recentEmails?.forEach((email) => {
    const recipient = email.to_addresses?.[0] || "Unknown";
    activities.push({
      id: email.id,
      type: "email",
      subject: email.subject,
      recipient,
      status: email.status,
      sent_at: email.sent_at,
      created_at: email.created_at,
    });
  });

  recentNotifications?.forEach((notif) => {
    // Handle Supabase foreign key joins - could be object or array
    const userRecord = notif.user;
    const user = Array.isArray(userRecord) ? userRecord[0] : userRecord;
    const userName = user
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
      : "Unknown";
    activities.push({
      id: notif.id,
      type: "notification",
      notification_type: notif.type,
      title: notif.title,
      message: notif.message,
      user_name: userName,
      created_at: notif.created_at,
    });
  });

  // Sort by created_at descending
  activities.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Apply search filter
  const filteredActivities = activities.filter((activity) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (activity.type === "email") {
      return (
        activity.subject.toLowerCase().includes(query) ||
        activity.recipient.toLowerCase().includes(query)
      );
    } else {
      return (
        activity.title.toLowerCase().includes(query) ||
        activity.message?.toLowerCase().includes(query) ||
        activity.user_name.toLowerCase().includes(query)
      );
    }
  });

  const isLoading = emailsLoading || notificationsLoading;

  const getEmailStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-amber-500" />;
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-3 w-3 text-amber-500" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Info className="h-3 w-3 text-blue-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full p-3">
      {/* Stats row */}
      <div className="flex items-center gap-3 text-[11px] mb-2">
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3 text-blue-500" />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{recentEmails?.length || 0}</span>
          <span className="text-zinc-500 dark:text-zinc-400">emails</span>
        </div>
        <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex items-center gap-1">
          <Bell className="h-3 w-3 text-purple-500" />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{recentNotifications?.length || 0}</span>
          <span className="text-zinc-500 dark:text-zinc-400">notifications</span>
        </div>
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-8">
              <Clock className="h-6 w-6 mx-auto mb-2 text-zinc-400" />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {searchQuery ? "No activity matches your search" : "No recent activity"}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredActivities.slice(0, 100).map((activity) => (
              <div
                key={`${activity.type}-${activity.id}`}
                className="flex items-start gap-2.5 px-2.5 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                {/* Icon */}
                <div className="mt-0.5">
                  {activity.type === "email" ? (
                    <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Mail className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Bell className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {activity.type === "email" ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {activity.subject}
                        </span>
                        {getEmailStatusIcon(activity.status)}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                        To: {activity.recipient}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {activity.title}
                        </span>
                        {getNotificationTypeIcon(activity.notification_type)}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                        {activity.message || `Sent to ${activity.user_name}`}
                      </div>
                    </>
                  )}
                </div>

                {/* Timestamp & badge */}
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[9px] h-4 px-1 border ${
                      activity.type === "email"
                        ? "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                        : "text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                    }`}
                  >
                    {activity.type === "email" ? "Email" : "Notification"}
                  </Badge>
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-400">
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityTab;
