// src/features/messages/hooks/useContacts.ts
// Hooks for fetching and searching contacts for email composition

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  searchContacts,
  getContactsByType,
  getRecentContacts,
  getContactsByRole,
  type Contact,
  type ContactType,
  type ContactSearchOptions,
} from "../services/contactService";

export type { Contact, ContactType, ContactSearchOptions };

/**
 * Hook for searching contacts with debouncing
 */
export function useContactSearch(
  query: string,
  options?: ContactSearchOptions,
) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200); // 200ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ["contacts", "search", debouncedQuery, options],
    queryFn: () => searchContacts(debouncedQuery, options),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000, // 30 seconds
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

/**
 * Hook for getting contacts by type
 */
export function useContactsByType(type: ContactType, enabled = true) {
  return useQuery({
    queryKey: ["contacts", "type", type],
    queryFn: () => getContactsByType(type),
    enabled,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for getting recent contacts
 */
export function useRecentContacts(limit = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contacts", "recent", user?.id, limit],
    queryFn: () => getRecentContacts(user!.id, limit),
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for getting contacts by role
 */
export function useContactsByRole(role: string, enabled = true) {
  return useQuery({
    queryKey: ["contacts", "role", role],
    queryFn: () => getContactsByRole(role),
    enabled: enabled && !!role,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Combined hook for contact picker with search + recent
 * Simplified to always load team and clients for dropdown
 */
export function useContactPicker(searchQuery: string) {
  const {
    data: searchResults,
    isLoading: isSearching,
    isFetching: isSearchFetching,
  } = useContactSearch(searchQuery);

  const { data: recentContacts, isLoading: isLoadingRecent } =
    useRecentContacts(5);

  // Always load team and clients for quick access
  const { data: allClients, isLoading: isLoadingClients } = useContactsByType(
    "client",
    true, // Always enabled
  );
  const { data: allTeam, isLoading: isLoadingTeam } = useContactsByType(
    "team",
    true, // Always enabled
  );

  // Show search results if searching, otherwise show recent + categorized
  const contacts = useMemo(() => {
    if (searchQuery.length >= 2) {
      return searchResults || [];
    }

    // When not searching, show recent contacts first, then all others
    const recent = recentContacts || [];
    const clients = allClients || [];
    const team = allTeam || [];

    // Deduplicate by email
    const seen = new Set<string>();
    const result: Contact[] = [];

    for (const contact of [...recent, ...team, ...clients]) {
      const key = contact.email.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(contact);
      }
    }

    return result;
  }, [searchQuery, searchResults, recentContacts, allClients, allTeam]);

  // Determine loading state
  const isLoading =
    searchQuery.length >= 2
      ? isSearching
      : isLoadingRecent || isLoadingClients || isLoadingTeam;

  return {
    contacts,
    isLoading,
    isFetching: isSearchFetching,
    hasSearchQuery: searchQuery.length >= 2,
  };
}
