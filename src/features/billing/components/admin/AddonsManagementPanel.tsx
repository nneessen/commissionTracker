// src/features/billing/components/admin/AddonsManagementPanel.tsx
// Panel for managing subscription add-ons (e.g., UW Wizard)

import { useState, useEffect } from "react";
import { Package, Settings, Users, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useUpdateAddon,
  useAddonUsers,
  type SubscriptionAddon,
} from "@/hooks/admin";
import { AddonTierEditor, type TierConfig } from "./AddonTierEditor";

interface AddonsManagementPanelProps {
  addons: SubscriptionAddon[];
}

export function AddonsManagementPanel({ addons }: AddonsManagementPanelProps) {
  const [editingAddon, setEditingAddon] = useState<SubscriptionAddon | null>(
    null,
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Add-on Cards */}
      <div className="grid grid-cols-2 gap-4">
        {addons.map((addon) => (
          <AddonCard
            key={addon.id}
            addon={addon}
            onEdit={() => {
              setEditingAddon(addon);
              setIsEditorOpen(true);
            }}
          />
        ))}

        {addons.length === 0 && (
          <div className="col-span-2 text-center py-12 text-zinc-500">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No add-ons configured</p>
          </div>
        )}
      </div>

      {/* Add-on Editor Dialog */}
      <AddonEditorDialog
        addon={editingAddon}
        open={isEditorOpen}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) setEditingAddon(null);
        }}
      />
    </div>
  );
}

// ============================================
// Add-on Card Component
// ============================================

interface AddonCardProps {
  addon: SubscriptionAddon;
  onEdit: () => void;
}

function AddonCard({ addon, onEdit }: AddonCardProps) {
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const { data: users, isLoading: usersLoading } = useAddonUsers(addon.id);

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <Card
      className={`${
        !addon.is_active
          ? "opacity-60 border-zinc-300 dark:border-zinc-700"
          : "border-purple-200 dark:border-purple-800"
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-500" />
            {addon.display_name}
          </CardTitle>
          {!addon.is_active && (
            <Badge variant="destructive" className="text-[9px]">
              Inactive
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-zinc-500">
          {addon.description || "No description"}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pricing */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold">
            {formatPrice(addon.price_monthly)}
          </span>
          {addon.price_monthly > 0 && (
            <span className="text-xs text-zinc-500">/month</span>
          )}
        </div>
        {addon.price_annual > 0 && (
          <p className="text-[10px] text-zinc-500">
            {formatPrice(addon.price_annual)}/year (
            {Math.round(
              (1 - addon.price_annual / (addon.price_monthly * 12)) * 100,
            )}
            % off)
          </p>
        )}

        {/* Users with add-on */}
        <Collapsible open={isUsersOpen} onOpenChange={setIsUsersOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs justify-between"
            >
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {usersLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  `${users?.length || 0} users`
                )}
              </span>
              <span className="text-[10px] text-zinc-400">
                {isUsersOpen ? "Hide" : "Show"}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {users && users.length > 0 ? (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between text-[10px] px-2 py-1 bg-zinc-50 dark:bg-zinc-900 rounded"
                  >
                    <span className="font-mono text-zinc-600 dark:text-zinc-400 truncate">
                      {user.userId.slice(0, 8)}...
                    </span>
                    <Badge
                      variant={
                        user.status === "manual_grant" ? "secondary" : "default"
                      }
                      className="text-[9px]"
                    >
                      {user.status === "manual_grant" ? "Manual" : "Paid"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-zinc-500 text-center py-2">
                No users with this add-on
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Edit button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-7"
          onClick={onEdit}
        >
          <Settings className="h-3 w-3 mr-1" />
          Configure
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// Add-on Editor Dialog
// ============================================

interface AddonEditorDialogProps {
  addon: SubscriptionAddon | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddonEditorDialog({
  addon,
  open,
  onOpenChange,
}: AddonEditorDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [priceMonthly, setPriceMonthly] = useState(0);
  const [priceAnnual, setPriceAnnual] = useState(0);
  const [stripePriceMonthly, setStripePriceMonthly] = useState("");
  const [stripePriceAnnual, setStripePriceAnnual] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [tierConfig, setTierConfig] = useState<TierConfig | null>(null);

  const updateAddon = useUpdateAddon();

  // Re-initialize form state when addon prop changes or dialog opens
  useEffect(() => {
    if (addon && open) {
      setDisplayName(addon.display_name);
      setDescription(addon.description || "");
      setPriceMonthly(addon.price_monthly);
      setPriceAnnual(addon.price_annual);
      setStripePriceMonthly(addon.stripe_price_id_monthly || "");
      setStripePriceAnnual(addon.stripe_price_id_annual || "");
      setIsActive(addon.is_active ?? true);
      const rawTierConfig = (addon as { tier_config?: TierConfig | null })
        .tier_config;
      setTierConfig(rawTierConfig || null);
    }
  }, [addon, open]);

  if (!addon) return null;

  // Check if this addon supports tiers (currently just UW Wizard)
  const supportsTiers = addon.name === "uw_wizard";

  const handleSave = async () => {
    await updateAddon.mutateAsync({
      addonId: addon.id,
      params: {
        displayName,
        description: description || undefined,
        priceMonthly,
        priceAnnual,
        stripePriceIdMonthly: stripePriceMonthly || null,
        stripePriceIdAnnual: stripePriceAnnual || null,
        isActive,
        tierConfig: supportsTiers ? tierConfig : undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-500" />
            Configure: {addon.display_name}
            <Badge variant="outline" className="text-[10px] font-mono">
              {addon.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="addonDisplayName" className="text-xs">
              Display Name
            </Label>
            <Input
              id="addonDisplayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addonDescription" className="text-xs">
              Description
            </Label>
            <Textarea
              id="addonDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="addonPriceMonthly" className="text-xs">
                Monthly Price (cents)
              </Label>
              <Input
                id="addonPriceMonthly"
                type="number"
                value={priceMonthly}
                onChange={(e) => setPriceMonthly(parseInt(e.target.value) || 0)}
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-zinc-500">
                ${(priceMonthly / 100).toFixed(2)} / month
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addonPriceAnnual" className="text-xs">
                Annual Price (cents)
              </Label>
              <Input
                id="addonPriceAnnual"
                type="number"
                value={priceAnnual}
                onChange={(e) => setPriceAnnual(parseInt(e.target.value) || 0)}
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-zinc-500">
                ${(priceAnnual / 100).toFixed(2)} / year
              </p>
            </div>
          </div>

          {/* Stripe Price IDs */}
          <div className="border-t pt-4">
            <h4 className="text-xs font-medium text-zinc-500 mb-3">
              Stripe Integration
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addonStripeMonthly" className="text-xs">
                  Stripe Monthly Price ID
                </Label>
                <Input
                  id="addonStripeMonthly"
                  value={stripePriceMonthly}
                  onChange={(e) => setStripePriceMonthly(e.target.value)}
                  className="h-8 text-sm font-mono"
                  placeholder="e.g., price_1Abc..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addonStripeAnnual" className="text-xs">
                  Stripe Annual Price ID
                </Label>
                <Input
                  id="addonStripeAnnual"
                  value={stripePriceAnnual}
                  onChange={(e) => setStripePriceAnnual(e.target.value)}
                  className="h-8 text-sm font-mono"
                  placeholder="e.g., price_1Def..."
                />
              </div>
            </div>
          </div>

          {/* Tier Configuration (for usage-based addons like UW Wizard) */}
          {supportsTiers && (
            <div className="border-t pt-4">
              <AddonTierEditor tierConfig={tierConfig} onChange={setTierConfig} />
            </div>
          )}

          {/* Active Toggle */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <Label htmlFor="addonActive" className="text-xs">
                Active
              </Label>
              <p className="text-[10px] text-zinc-500">
                Inactive add-ons cannot be purchased
              </p>
            </div>
            <Switch
              id="addonActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={updateAddon.isPending}
              size="sm"
              className="text-xs"
            >
              {updateAddon.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
