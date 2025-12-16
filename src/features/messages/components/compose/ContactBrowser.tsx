// src/features/messages/components/compose/ContactBrowser.tsx
// Contact browser sidebar for email compose with tabs, filtering, and favorites

import { useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Building2,
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

  const tabs: { id: ContactTab; label: string; icon: typeof Users }[] = [
    { id: "all", label: "All", icon: Users },
    { id: "favorites", label: "Favorites", icon: Star },
    { id: "team", label: "Team", icon: User },
    { id: "clients", label: "Clients", icon: Building2 },
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
      className={cn("flex flex-col h-full border-l border-border", className)}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-[11px] font-semibold text-foreground">Contacts</h3>
        <p className="text-[10px] text-muted-foreground">
          {total} contact{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="h-7 pl-7 text-[11px]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] transition-colors",
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
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
        <div className="flex items-center justify-between px-2 py-1.5 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={prevPage}
            disabled={page === 1}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground">Page {page}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={nextPage}
            disabled={!hasMore}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
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
        "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer group",
        "hover:bg-muted/50 transition-colors",
      )}
    >
      {/* Add button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="p-0.5 rounded hover:bg-primary/10 text-primary shrink-0"
      >
        <Plus className="h-3 w-3" />
      </button>

      {/* Name and email - horizontal layout */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-[11px] font-medium truncate max-w-[100px]">
          {contact.name}
        </span>
        <span className="text-[10px] text-muted-foreground truncate">
          {contact.email}
        </span>
      </div>

      {/* Type badge */}
      <Badge
        variant="secondary"
        className={cn(
          "h-4 text-[8px] px-1 shrink-0",
          contact.type === "team"
            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
        )}
      >
        {contact.type === "team" ? "T" : "C"}
      </Badge>

      {/* Role badge if exists */}
      {contact.role && (
        <Badge
          variant="outline"
          className="h-4 text-[8px] px-1 shrink-0 hidden group-hover:flex"
        >
          {contact.role.slice(0, 8)}
        </Badge>
      )}

      {/* Favorite button */}
      <button
        onClick={onFavoriteClick}
        disabled={isTogglingFavorite}
        className={cn(
          "p-0.5 rounded shrink-0 transition-colors",
          contact.isFavorite
            ? "text-amber-500 hover:text-amber-600"
            : "text-muted-foreground/30 hover:text-amber-400 opacity-0 group-hover:opacity-100",
        )}
      >
        <Star
          className="h-3 w-3"
          fill={contact.isFavorite ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
}
