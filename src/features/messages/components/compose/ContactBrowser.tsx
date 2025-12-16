// src/features/messages/components/compose/ContactBrowser.tsx
// Contact browser sidebar for email compose with tabs, filtering, and favorites

import { useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Star,
  Users,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useContactBrowser,
  type ContactTab,
} from "../../hooks/useContactBrowser";
import type { Contact } from "../../services/contactService";

interface ContactBrowserProps {
  onSelectContact: (contact: Contact) => void;
  selectedEmails: string[];
  className?: string;
}

export function ContactBrowser({
  onSelectContact,
  selectedEmails,
  className,
}: ContactBrowserProps) {
  const {
    contacts,
    total,
    hasMore,
    roles,
    hasDownlines,
    activeTab,
    search,
    roleFilter,
    teamOnlyFilter,
    page,
    isLoading,
    isFetching,
    setActiveTab,
    setSearch,
    setRoleFilter,
    setTeamOnlyFilter,
    nextPage,
    prevPage,
    toggleFavorite,
    isTogglingFavorite,
  } = useContactBrowser({ pageSize: 50 });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter out already selected contacts
  const availableContacts = contacts.filter(
    (c) => !selectedEmails.includes(c.email.toLowerCase()),
  );

  // Only show team-related tabs (no clients)
  const tabs: { id: ContactTab; label: string; icon: typeof Users }[] = [
    { id: "all", label: "All Team", icon: Users },
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

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col h-full border-l border-border bg-muted/30",
        className,
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-primary/5 border-b border-border">
        <h3 className="text-[11px] font-semibold text-primary">
          Team Contacts
        </h3>
        <p className="text-[10px] text-muted-foreground">
          {total} contact{total !== 1 ? "s" : ""} available
        </p>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/60" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="h-8 pl-8 text-[11px] bg-background"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1.5 border-b border-border bg-background">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[10px] rounded transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-foreground hover:bg-primary/10",
              )}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="px-2 py-2 space-y-2 border-b border-border">
        {/* Role filter - only for team/all tabs */}
        {(activeTab === "all" || activeTab === "team") && roles.length > 0 && (
          <Select
            value={roleFilter || "all"}
            onValueChange={(v) => setRoleFilter(v === "all" ? undefined : v)}
          >
            <SelectTrigger className="h-6 text-[10px]">
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
        )}

        {/* Team only filter - only if user has downlines */}
        {hasDownlines && (activeTab === "all" || activeTab === "team") && (
          <label className="flex items-center gap-2 text-[10px] text-muted-foreground cursor-pointer">
            <Checkbox
              checked={teamOnlyFilter}
              onCheckedChange={(checked) => setTeamOnlyFilter(!!checked)}
              className="h-3.5 w-3.5"
            />
            My team only
          </label>
        )}
      </div>

      {/* Contact List */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : availableContacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[11px] text-muted-foreground">
                {search.length >= 2
                  ? "No contacts found"
                  : activeTab === "favorites"
                    ? "No favorites yet"
                    : "No contacts available"}
              </p>
            </div>
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

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-between px-2 py-2 border-t border-border bg-background">
          <button
            onClick={prevPage}
            disabled={page === 1}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors",
              page === 1
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "text-primary hover:bg-primary/10",
            )}
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>
          <span className="text-[10px] font-medium text-foreground">
            Page {page}
          </span>
          <button
            onClick={nextPage}
            disabled={!hasMore}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors",
              !hasMore
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "text-primary hover:bg-primary/10",
            )}
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

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
        "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer group",
        "bg-background hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all",
        "mb-1 mx-1",
      )}
    >
      {/* Add button - more prominent */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="p-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary shrink-0 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {/* Name and email - horizontal layout */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-foreground truncate max-w-[100px]">
          {contact.name}
        </span>
        <span className="text-[10px] text-muted-foreground truncate">
          {contact.email}
        </span>
      </div>

      {/* Role badge if exists - always visible */}
      {contact.role && (
        <Badge className="h-4 text-[8px] px-1.5 shrink-0 bg-primary/10 text-primary">
          {contact.role.slice(0, 10)}
        </Badge>
      )}

      {/* Favorite button - more visible */}
      <button
        onClick={onFavoriteClick}
        disabled={isTogglingFavorite}
        className={cn(
          "p-1 rounded-md shrink-0 transition-colors",
          contact.isFavorite
            ? "text-amber-500 bg-amber-50 hover:bg-amber-100"
            : "text-muted-foreground/50 hover:text-amber-400 hover:bg-amber-50",
        )}
      >
        <Star
          className="h-3.5 w-3.5"
          fill={contact.isFavorite ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
}
