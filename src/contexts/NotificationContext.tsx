// src/contexts/NotificationContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { notificationKeys } from "@/components/notifications/useNotifications";
import type { Notification } from "@/types/notification.types";

type ConnectionStatus = "connected" | "disconnected" | "error";

interface NotificationContextType {
  isSubscribed: boolean;
  connectionStatus: ConnectionStatus;
  error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setConnectionStatus("disconnected");
      return;
    }

    // SYNCHRONOUS channel creation (no async in useEffect)
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate queries to refresh
          queryClient.invalidateQueries({
            queryKey: notificationKeys.list(),
          });
          queryClient.invalidateQueries({
            queryKey: notificationKeys.unreadCount(),
          });

          // Optimistic cache update for immediate UI response
          const newNotification = payload.new as Notification;
          queryClient.setQueryData<Notification[]>(
            notificationKeys.list(),
            (old) => {
              if (!old) return [newNotification];
              // Add to beginning of list, keep max 50
              return [newNotification, ...old.slice(0, 49)];
            },
          );

          // Increment unread count
          queryClient.setQueryData<number>(
            notificationKeys.unreadCount(),
            (old) => (old ?? 0) + 1,
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh on updates (e.g., mark as read)
          queryClient.invalidateQueries({
            queryKey: notificationKeys.list(),
          });
          queryClient.invalidateQueries({
            queryKey: notificationKeys.unreadCount(),
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refresh on deletions
          queryClient.invalidateQueries({
            queryKey: notificationKeys.list(),
          });
          queryClient.invalidateQueries({
            queryKey: notificationKeys.unreadCount(),
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
          setError(null);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionStatus("error");
          setError(new Error(`Subscription failed: ${status}`));
        }
      });

    // SYNCHRONOUS cleanup - executes immediately on unmount
    return () => {
      supabase.removeChannel(channel);
      setConnectionStatus("disconnected");
    };
  }, [user?.id, queryClient]);

  const value: NotificationContextType = {
    isSubscribed: connectionStatus === "connected",
    connectionStatus,
    error,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to access notification connection status
 * Use this in components that need to display connection state
 */
export const useNotificationConnection = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationConnection must be used within NotificationProvider",
    );
  }
  return context;
};
