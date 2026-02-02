// src/features/admin/components/TierTestingPanel.tsx
// Admin panel for testing subscription tier feature gating

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  TestTube,
  Check,
  RefreshCw,
  User,
  CreditCard,
  Search,
} from "lucide-react";
import {
  useAdminSubscriptionPlans,
  useChangeUserPlan,
  useUserSubscriptionAdmin,
} from "@/hooks";
import { useAllUsers } from "@/hooks/admin";
import type { UserProfile } from "@/types/user.types";
import { cn } from "@/lib/utils";

// Default test emails - can be expanded
const TEST_EMAILS = ["nick@nickneessen.com"];

export function TierTestingPanel() {
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const { data: plans = [], isLoading: plansLoading } =
    useAdminSubscriptionPlans();
  const { data: allUsers = [] } = useAllUsers();
  const changeUserPlan = useChangeUserPlan();

  // Get the selected user's current subscription
  const { data: userSubData, isLoading: subLoading } = useUserSubscriptionAdmin(
    selectedUser?.id,
  );

  // Filter to active plans only, sorted by price
  const activePlans = useMemo(
    () =>
      plans
        .filter((p) => p.is_active)
        .sort((a, b) => (a.price_monthly || 0) - (b.price_monthly || 0)),
    [plans],
  );

  // Find matching users based on search
  const matchingUsers = useMemo(() => {
    if (!searchEmail) return [];
    const search = searchEmail.toLowerCase();
    return allUsers
      .filter(
        (u) =>
          u.email?.toLowerCase().includes(search) ||
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(search),
      )
      .slice(0, 5);
  }, [searchEmail, allUsers]);

  // Find test users automatically
  const testUsers = useMemo(
    () => allUsers.filter((u) => TEST_EMAILS.includes(u.email || "")),
    [allUsers],
  );

  const handleChangePlan = async (planId: string) => {
    if (!selectedUser) return;
    await changeUserPlan.mutateAsync({
      userId: selectedUser.id,
      planId,
      reason: "Tier testing via admin panel",
    });
  };

  const currentPlanId = userSubData?.subscription?.plan_id;
  const currentPlan = userSubData?.plan;

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <TestTube className="h-4 w-4 text-violet-500" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Tier Testing
          </h2>
          <Badge variant="outline" className="text-[9px] h-4">
            Dev Only
          </Badge>
        </div>
        <p className="text-[10px] text-zinc-500">
          Switch user plans to test feature gating
        </p>
      </div>

      {/* Content Grid */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {/* Left: User Selection */}
        <div className="flex flex-col gap-2 bg-white dark:bg-zinc-900 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            <User className="h-3.5 w-3.5" />
            Select Test User
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
            <Input
              placeholder="Search by email or name..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="h-7 text-[11px] pl-7"
            />
          </div>

          {/* Search Results / Quick Test Users */}
          <div className="flex-1 overflow-y-auto">
            {searchEmail && matchingUsers.length > 0 ? (
              <div className="space-y-1">
                <p className="text-[9px] text-zinc-500 uppercase tracking-wide">
                  Search Results
                </p>
                {matchingUsers.map((user) => (
                  <UserButton
                    key={user.id}
                    user={user}
                    isSelected={selectedUser?.id === user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setSearchEmail("");
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[9px] text-zinc-500 uppercase tracking-wide">
                  Quick Test Users
                </p>
                {testUsers.length > 0 ? (
                  testUsers.map((user) => (
                    <UserButton
                      key={user.id}
                      user={user}
                      isSelected={selectedUser?.id === user.id}
                      onClick={() => setSelectedUser(user)}
                    />
                  ))
                ) : (
                  <p className="text-[10px] text-zinc-400 py-2">
                    No users found matching test emails
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Current User Info */}
          {selectedUser && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {selectedUser.email}
                  </p>
                </div>
                {subLoading ? (
                  <RefreshCw className="h-3 w-3 animate-spin text-zinc-400" />
                ) : currentPlan ? (
                  <Badge
                    className={cn(
                      "text-[9px] h-4",
                      currentPlan.name === "free" &&
                        "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                      currentPlan.name === "pro" &&
                        "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                      currentPlan.name === "team" &&
                        "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
                    )}
                  >
                    {currentPlan.display_name}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[9px] h-4 text-amber-600"
                  >
                    No Plan
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Plan Selection */}
        <div className="flex flex-col gap-2 bg-white dark:bg-zinc-900 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            <CreditCard className="h-3.5 w-3.5" />
            Switch to Plan
          </div>

          {plansLoading ? (
            <div className="flex items-center justify-center h-20">
              <RefreshCw className="h-4 w-4 animate-spin text-zinc-400" />
            </div>
          ) : !selectedUser ? (
            <div className="flex items-center justify-center h-20 text-[11px] text-zinc-400">
              Select a user first
            </div>
          ) : (
            <div className="space-y-2">
              {activePlans.map((plan) => {
                const isCurrent = plan.id === currentPlanId;
                return (
                  <button
                    key={plan.id}
                    onClick={() => !isCurrent && handleChangePlan(plan.id)}
                    disabled={isCurrent || changeUserPlan.isPending}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-md border transition-all text-left",
                      isCurrent
                        ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20",
                      changeUserPlan.isPending && "opacity-50",
                    )}
                  >
                    <div>
                      <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                        {plan.display_name}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        ${((plan.price_monthly || 0) / 100).toFixed(0)}/mo
                      </p>
                    </div>
                    {isCurrent ? (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3 w-3" />
                        Current
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 px-2 text-[10px]"
                        disabled={changeUserPlan.isPending}
                      >
                        {changeUserPlan.isPending ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          "Switch"
                        )}
                      </Button>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Feature Summary */}
          {selectedUser && currentPlan && (
            <div className="mt-auto pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-[9px] text-zinc-500 uppercase tracking-wide mb-1">
                Current Plan Features
              </p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(currentPlan.features || {})
                  .filter(([, enabled]) => enabled)
                  .slice(0, 8)
                  .map(([feature]) => (
                    <Badge
                      key={feature}
                      variant="secondary"
                      className="text-[8px] h-3.5 px-1"
                    >
                      {feature.replace(/_/g, " ")}
                    </Badge>
                  ))}
                {Object.values(currentPlan.features || {}).filter(Boolean)
                  .length > 8 && (
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                    +
                    {Object.values(currentPlan.features || {}).filter(Boolean)
                      .length - 8}{" "}
                    more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800/50 rounded-md px-3 py-2">
        <strong>Testing workflow:</strong> Select a user → Switch their plan →
        Log in as that user (or refresh if testing your own account) → Verify
        feature access
      </div>
    </div>
  );
}

// Helper component for user selection buttons
function UserButton({
  user,
  isSelected,
  onClick,
}: {
  user: UserProfile;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 p-2 rounded-md text-left transition-all",
        isSelected
          ? "bg-violet-100 border border-violet-300 dark:bg-violet-900/30 dark:border-violet-700"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent",
      )}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-[10px] font-medium">
        {(user.first_name?.[0] || "?").toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {user.first_name} {user.last_name}
        </p>
        <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
      </div>
      {isSelected && <Check className="h-3 w-3 text-violet-600" />}
    </button>
  );
}

export default TierTestingPanel;
