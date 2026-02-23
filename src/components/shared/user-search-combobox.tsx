// src/components/user-search-combobox.tsx
// Reusable searchable combobox for user selection (upline assignment, etc.)
// Uses server-side search with debouncing for scalability

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearchUsers, useUserById } from "@/hooks";
// eslint-disable-next-line no-restricted-imports
import { getUserDisplayName } from "@/services";

interface UserSearchComboboxProps {
  /** Currently selected user ID */
  value: string | null;
  /** Callback when selection changes */
  onChange: (userId: string | null) => void;
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Filter by roles (user must have at least one of these roles) */
  roles?: string[];
  /** Filter by approval status (default: 'approved') */
  approvalStatus?: "approved" | "pending" | "denied" | null;
  /** Exclude specific user IDs (for excluding self, downlines, etc.) */
  excludeIds?: string[];
  /** Show "No upline" option at the top */
  showNoUplineOption?: boolean;
  /** Label for the no upline option */
  noUplineLabel?: string;
  /** Disable the combobox */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Searchable combobox for user selection (upline assignment, recruiter assignment, etc.)
 *
 * Uses server-side search with 200ms debounce for scalability with large user lists.
 * Shows the currently selected user immediately when the combobox opens.
 *
 * @example
 * ```tsx
 * <UserSearchCombobox
 *   value={uplineId}
 *   onChange={setUplineId}
 *   roles={['agent', 'admin', 'trainer']}
 *   showNoUplineOption={true}
 *   placeholder="Search for upline..."
 * />
 * ```
 */
export function UserSearchCombobox({
  value,
  onChange,
  placeholder = "Search users...",
  roles,
  approvalStatus = "approved",
  excludeIds,
  showNoUplineOption = false,
  noUplineLabel = "No upline",
  disabled = false,
  className,
}: UserSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch current selection for display
  const { data: selectedUser } = useUserById(value);

  // Server-side search with debouncing
  const { data: searchResults = [], isLoading } = useSearchUsers(searchTerm, {
    roles,
    approvalStatus,
    excludeIds,
    limit: 15,
  });

  // Get display text for the trigger button
  const getDisplayText = () => {
    if (!value) {
      return showNoUplineOption ? noUplineLabel : "Select user...";
    }
    if (selectedUser) {
      return getUserDisplayName(selectedUser);
    }
    return "Loading...";
  };

  const handleSelect = (userId: string | null) => {
    onChange(userId);
    setOpen(false);
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-7 w-full justify-between text-[11px] pl-7 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 font-normal",
            disabled && "opacity-50 cursor-not-allowed",
            className,
          )}
        >
          <Users className="absolute left-2 h-3 w-3 text-zinc-400" />
          <span className="truncate">{getDisplayText()}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 z-[100]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            className="h-8 text-[11px]"
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                <span className="ml-2 text-[11px] text-zinc-500">
                  Searching...
                </span>
              </div>
            )}

            {!isLoading &&
              searchResults.length === 0 &&
              searchTerm.length >= 2 && (
                <CommandEmpty className="py-4 text-[11px]">
                  No users found.
                </CommandEmpty>
              )}

            {!isLoading && searchTerm.length > 0 && searchTerm.length < 2 && (
              <div className="py-4 text-center text-[11px] text-zinc-500">
                Type at least 2 characters to search
              </div>
            )}

            {!isLoading && searchTerm === "" && searchResults.length === 0 && (
              <div className="py-4 text-center text-[11px] text-zinc-500">
                Start typing to search users
              </div>
            )}

            <CommandGroup>
              {/* No upline option */}
              {showNoUplineOption && (
                <CommandItem
                  value="__none__"
                  onSelect={() => handleSelect(null)}
                  className="text-[11px]"
                >
                  <Check
                    className={cn(
                      "mr-1.5 h-3 w-3",
                      value === null ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {noUplineLabel}
                </CommandItem>
              )}

              {/* Search results */}
              {searchResults.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => handleSelect(user.id)}
                  className="text-[11px] flex items-center"
                >
                  <Check
                    className={cn(
                      "mr-1.5 h-3 w-3 shrink-0",
                      value === user.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium">
                      {getUserDisplayName(user)}
                    </span>
                    <span className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                      {user.email}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default UserSearchCombobox;
