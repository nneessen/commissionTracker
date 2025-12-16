// src/features/messages/hooks/useContactBrowser.ts
// Hook for contact browser with pagination, filtering, and favorites

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPaginatedContacts,
  addFavoriteContact,
  removeFavoriteContact,
  getAvailableRoles,
  userHasDownlines,
  type Contact,
  type ContactFilters,
  type ContactType,
} from "../services/contactService";

export type ContactTab = "all" | "favorites" | "team" | "clients";

interface UseContactBrowserOptions {
  pageSize?: number;
  initialTab?: ContactTab;
}

export function useContactBrowser(options: UseContactBrowserOptions = {}) {
  const { pageSize = 50, initialTab = "all" } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<ContactTab>(initialTab);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [teamOnlyFilter, setTeamOnlyFilter] = useState(false);
  const [page, setPage] = useState(1);

  // Build filters based on state
  const filters = useMemo((): ContactFilters => {
    const f: ContactFilters = {};

    if (search.length >= 2) {
      f.search = search;
    }

    if (roleFilter) {
      f.role = roleFilter;
    }

    if (teamOnlyFilter) {
      f.teamOnly = true;
    }

    // Tab-specific filters
    switch (activeTab) {
      case "favorites":
        f.favoritesOnly = true;
        break;
      case "team":
        f.type = "team";
        break;
      case "clients":
        f.type = "client";
        break;
      default:
        f.type = "all";
    }

    return f;
  }, [search, roleFilter, teamOnlyFilter, activeTab]);

  // Query for contacts
  const contactsQuery = useQuery({
    queryKey: ["contacts", "browser", user?.id, filters, page, pageSize],
    queryFn: () => getPaginatedContacts(user!.id, filters, page, pageSize),
    enabled: !!user?.id,
    staleTime: 30000,
    placeholderData: (prev) => prev,
  });

  // Query for available roles
  const rolesQuery = useQuery({
    queryKey: ["contacts", "roles"],
    queryFn: getAvailableRoles,
    staleTime: 300000, // 5 minutes
  });

  // Query to check if user has downlines
  const hasDownlinesQuery = useQuery({
    queryKey: ["contacts", "hasDownlines", user?.id],
    queryFn: () => userHasDownlines(user!.id),
    enabled: !!user?.id,
    staleTime: 300000,
  });

  // Mutation for adding favorites
  const addFavoriteMutation = useMutation({
    mutationFn: ({
      contactId,
      type,
    }: {
      contactId: string;
      type: ContactType;
    }) => addFavoriteContact(user!.id, contactId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", "browser"] });
    },
  });

  // Mutation for removing favorites
  const removeFavoriteMutation = useMutation({
    mutationFn: ({
      contactId,
      type,
    }: {
      contactId: string;
      type: ContactType;
    }) => removeFavoriteContact(user!.id, contactId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", "browser"] });
    },
  });

  // Handlers
  const handleTabChange = useCallback((tab: ContactTab) => {
    setActiveTab(tab);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearch(query);
    setPage(1);
  }, []);

  const handleRoleFilterChange = useCallback((role: string | undefined) => {
    setRoleFilter(role);
    setPage(1);
  }, []);

  const handleTeamOnlyChange = useCallback((enabled: boolean) => {
    setTeamOnlyFilter(enabled);
    setPage(1);
  }, []);

  const handleNextPage = useCallback(() => {
    if (contactsQuery.data?.hasMore) {
      setPage((p) => p + 1);
    }
  }, [contactsQuery.data?.hasMore]);

  const handlePrevPage = useCallback(() => {
    if (page > 1) {
      setPage((p) => p - 1);
    }
  }, [page]);

  const toggleFavorite = useCallback(
    async (contact: Contact) => {
      if (contact.isFavorite) {
        await removeFavoriteMutation.mutateAsync({
          contactId: contact.id,
          type: contact.type,
        });
      } else {
        await addFavoriteMutation.mutateAsync({
          contactId: contact.id,
          type: contact.type,
        });
      }
    },
    [addFavoriteMutation, removeFavoriteMutation],
  );

  return {
    // Data
    contacts: contactsQuery.data?.data || [],
    total: contactsQuery.data?.total || 0,
    hasMore: contactsQuery.data?.hasMore || false,
    roles: rolesQuery.data || [],
    hasDownlines: hasDownlinesQuery.data || false,

    // State
    activeTab,
    search,
    roleFilter,
    teamOnlyFilter,
    page,
    pageSize,

    // Loading states
    isLoading: contactsQuery.isLoading,
    isFetching: contactsQuery.isFetching,
    isLoadingRoles: rolesQuery.isLoading,

    // Handlers
    setActiveTab: handleTabChange,
    setSearch: handleSearchChange,
    setRoleFilter: handleRoleFilterChange,
    setTeamOnlyFilter: handleTeamOnlyChange,
    nextPage: handleNextPage,
    prevPage: handlePrevPage,
    toggleFavorite,

    // Mutations loading
    isTogglingFavorite:
      addFavoriteMutation.isPending || removeFavoriteMutation.isPending,
  };
}

// Simple hook for just getting contacts for selection
export function useContactSearch(query: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contacts", "search", query],
    queryFn: async () => {
      if (!user?.id || query.length < 2) return [];
      const result = await getPaginatedContacts(
        user.id,
        { search: query },
        1,
        20,
      );
      return result.data;
    },
    enabled: !!user?.id && query.length >= 2,
    staleTime: 30000,
  });
}
