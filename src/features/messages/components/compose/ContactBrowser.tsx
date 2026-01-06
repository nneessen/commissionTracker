// src/features/messages/components/compose/ContactBrowser.tsx
// Contact browser sheet for email compose with tabs, filtering, and favorites
// Uses zinc palette and compact design patterns

import { useCallback, useRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Star,
  Users,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useContactBrowser,
  type ContactTab,
} from "../../hooks/useContactBrowser";
import type { Contact } from "../../services/contactService";

interface ContactBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContact: (contact: Contact) => void;
  selectedEmails: string[];
}

export function ContactBrowser({
  open,
  onOpenChange,
  onSelectContact,
  selectedEmails,
}: ContactBrowserProps) {
  const {
    contacts,
    total,
    hasMore,
    roles,
    activeTab,
    search,
    roleFilter,
    page,
    pageSize,
    isLoading,
    isFetching,
    setActiveTab,
    setSearch,
    setRoleFilter,
    nextPage,
    prevPage,
    toggleFavorite,
    isTogglingFavorite,
    fetchAllTeamContacts,
  } = useContactBrowser({ pageSize: 50 });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isAddingAll, setIsAddingAll] = useState(false);

  // Filter out already selected contacts
  const availableContacts = contacts.filter(
    (c) => !selectedEmails.includes(c.email.toLowerCase()),
  );

  // Updated tabs with correct naming
  const tabs: { id: ContactTab; label: string; icon: typeof Users }[] = [
    { id: "all", label: "All Contacts", icon: Users },
    { id: "favorites", label: "Favorites", icon: Star },
    { id: "team", label: "My Team", icon: User },
  ];

  const handleContactClick = useCallback(
    (contact: Contact) => {
      onSelectContact(contact);
    },
    [onSelectContact],
  );

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent, contact: Contact) => {
      e.stopPropagation();
      toggleFavorite(contact);
    },
    [toggleFavorite],
  );

  // Add entire team handler
  const handleAddAll = useCallback(async () => {
    setIsAddingAll(true);
    try {
      const allTeamContacts = await fetchAllTeamContacts();
      const unselected = allTeamContacts.filter(
        (c) => !selectedEmails.includes(c.email.toLowerCase()),
      );
      unselected.forEach((contact) => {
        onSelectContact(contact);
      });
    } finally {
      setIsAddingAll(false);
    }
  }, [fetchAllTeamContacts, selectedEmails, onSelectContact]);

  // Focus search when sheet opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[320px] sm:w-[380px] p-0 flex flex-col bg-zinc-50 dark:bg-zinc-950"
      >
        {/* Header - Zinc styled */}
        <SheetHeader className="px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <SheetTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Team Contacts
            </SheetTitle>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {total} contact{total !== 1 ? "s" : ""} available
          </p>
        </SheetHeader>

        {/* Search - Compact */}
        <div className="px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-7 h-7 text-[11px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            />
          </div>
        </div>

        {/* Tabs - Compact zinc style */}
        <div className="flex gap-0.5 p-1.5 bg-zinc-100/50 dark:bg-zinc-800/50 mx-2 mt-2 rounded-md">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[10px] font-medium rounded transition-all",
                  isActive
                    ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
                )}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters - Only when relevant */}
        {(activeTab === "all" || activeTab === "team") && roles.length > 0 && (
          <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
            <Select
              value={roleFilter || "all"}
              onValueChange={(v) => setRoleFilter(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="h-6 text-[10px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[10px]">
                  All roles
                </SelectItem>
                {roles.map((role) => (
                  <SelectItem
                    key={role.name}
                    value={role.name}
                    className="text-[10px]"
                  >
                    {role.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Add Entire Team button - only on My Team tab */}
        {activeTab === "team" && total > 0 && (
          <div className="px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <button
              onClick={handleAddAll}
              disabled={isAddingAll}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded transition-colors w-full justify-center",
                isAddingAll
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300",
              )}
            >
              {isAddingAll ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-3 w-3" />
                  Add Entire Team ({total})
                </>
              )}
            </button>
          </div>
        )}

        {/* Contact List - Fixed height with scroll */}
        <ScrollArea className="flex-1">
          <div className="px-2 py-1 space-y-0.5">
            {isLoading ? (
              <LoadingSkeleton />
            ) : availableContacts.length === 0 ? (
              <EmptyState activeTab={activeTab} search={search} />
            ) : (
              availableContacts.map((contact) => (
                <ContactRow
                  key={`${contact.type}-${contact.id}`}
                  contact={contact}
                  onClick={() => handleContactClick(contact)}
                  onFavoriteClick={(e) => handleFavoriteClick(e, contact)}
                  isTogglingFavorite={isTogglingFavorite}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Pagination - ALWAYS visible */}
        <div className="px-3 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between text-[10px]">
            <button
              onClick={prevPage}
              disabled={page === 1}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded transition-colors",
                page === 1
                  ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
              )}
            >
              <ChevronLeft className="h-3 w-3" />
              Prev
            </button>
            <span className="text-zinc-500 dark:text-zinc-400">
              {total > 0 ? (
                <>
                  {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}{" "}
                  of {total}
                </>
              ) : (
                "No contacts"
              )}
            </span>
            <button
              onClick={nextPage}
              disabled={!hasMore}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded transition-colors",
                !hasMore
                  ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
              )}
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Loading overlay for fetching */}
        {isFetching && !isLoading && (
          <div className="absolute inset-0 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center justify-center pointer-events-none">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="space-y-1 py-2">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-2 py-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="h-5 w-5 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="h-2.5 w-32 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          </div>
          <div className="h-4 w-12 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// Empty state component
function EmptyState({
  activeTab,
  search,
}: {
  activeTab: ContactTab;
  search: string;
}) {
  const getMessage = () => {
    if (search.length >= 2) return "No contacts found";
    switch (activeTab) {
      case "favorites":
        return "No favorites yet";
      case "team":
        return "No team members under you";
      default:
        return "No contacts available";
    }
  };

  return (
    <div className="text-center py-8">
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        {getMessage()}
      </p>
      {activeTab === "favorites" && search.length < 2 && (
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
          Click the star icon on any contact to add favorites
        </p>
      )}
      {activeTab === "team" && search.length < 2 && (
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
          Your downlines will appear here
        </p>
      )}
    </div>
  );
}

// Contact row component - Zinc styled
interface ContactRowProps {
  contact: Contact;
  onClick: () => void;
  onFavoriteClick: (e: React.MouseEvent) => void;
  isTogglingFavorite: boolean;
}

function ContactRow({
  contact,
  onClick,
  onFavoriteClick,
  isTogglingFavorite,
}: ContactRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group",
        "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800",
        "border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700",
        "transition-all",
      )}
    >
      {/* Add button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 shrink-0 transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>

      {/* Name and email */}
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate block">
          {contact.name}
        </span>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">
          {contact.email}
        </span>
      </div>

      {/* Role badge */}
      {contact.role && (
        <Badge className="h-4 text-[9px] px-1 shrink-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-0">
          {contact.role.slice(0, 8)}
        </Badge>
      )}

      {/* Favorite button - More prominent */}
      <button
        onClick={onFavoriteClick}
        disabled={isTogglingFavorite}
        className={cn(
          "p-1 rounded shrink-0 transition-all",
          contact.isFavorite
            ? "text-amber-500 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            : "text-zinc-300 dark:text-zinc-600 hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30",
        )}
        title={
          contact.isFavorite ? "Remove from favorites" : "Add to favorites"
        }
      >
        <Star
          className="h-3.5 w-3.5"
          fill={contact.isFavorite ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
}
