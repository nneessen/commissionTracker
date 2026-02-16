// src/features/admin/components/AddonTierEditor.tsx
// Editor for configuring usage-based tiers for add-ons like UW Wizard

import { Plus, Trash2, GripVertical, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface AddonTier {
  id: string;
  name: string;
  runs_per_month: number;
  price_monthly: number;
  price_annual: number;
  stripe_price_id_monthly?: string;
  stripe_price_id_annual?: string;
}

export interface TierConfig {
  tiers: AddonTier[];
}

interface AddonTierEditorProps {
  tierConfig: TierConfig | null;
  onChange: (config: TierConfig) => void;
}

const DEFAULT_TIER: AddonTier = {
  id: "",
  name: "",
  runs_per_month: 100,
  price_monthly: 999,
  price_annual: 9590,
};

export function AddonTierEditor({ tierConfig, onChange }: AddonTierEditorProps) {
  const tiers = tierConfig?.tiers || [];

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleTierChange = (index: number, field: keyof AddonTier, value: string | number) => {
    const newTiers = [...tiers];
    newTiers[index] = {
      ...newTiers[index],
      [field]: value,
    };
    onChange({ tiers: newTiers });
  };

  const handleAddTier = () => {
    const newId = `tier_${Date.now()}`;
    const newTier: AddonTier = {
      ...DEFAULT_TIER,
      id: newId,
      name: `Tier ${tiers.length + 1}`,
    };
    onChange({ tiers: [...tiers, newTier] });
  };

  const handleRemoveTier = (index: number) => {
    const newTiers = tiers.filter((_, i) => i !== index);
    onChange({ tiers: newTiers });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <h4 className="text-xs font-medium">Usage Tiers</h4>
        </div>
        <Badge variant="outline" className="text-[9px]">
          {tiers.length} tier{tiers.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {tiers.length === 0 ? (
        <div className="text-center py-6 bg-muted/50 rounded-lg border border-dashed">
          <p className="text-xs text-muted-foreground mb-2">
            No tiers configured. Add tiers to enable usage-based limits.
          </p>
          <Button variant="outline" size="sm" onClick={handleAddTier} className="text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add First Tier
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tiers.map((tier, index) => (
            <div
              key={tier.id || index}
              className="p-3 border rounded-lg bg-background hover:bg-muted/30 transition-colors"
            >
              {/* Tier Header */}
              <div className="flex items-center gap-2 mb-3">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <Badge
                  variant="secondary"
                  className="text-[10px] font-mono"
                >
                  #{index + 1}
                </Badge>
                <span className="text-sm font-medium flex-1">{tier.name || "Unnamed Tier"}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleRemoveTier(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Tier Details */}
              <div className="grid grid-cols-2 gap-3">
                {/* ID */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">ID (slug)</Label>
                  <Input
                    value={tier.id}
                    onChange={(e) => handleTierChange(index, "id", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                    className="h-7 text-xs font-mono"
                    placeholder="starter"
                  />
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Display Name</Label>
                  <Input
                    value={tier.name}
                    onChange={(e) => handleTierChange(index, "name", e.target.value)}
                    className="h-7 text-xs"
                    placeholder="Starter"
                  />
                </div>

                {/* Runs per Month */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Runs / Month</Label>
                  <Input
                    type="number"
                    value={tier.runs_per_month}
                    onChange={(e) => handleTierChange(index, "runs_per_month", parseInt(e.target.value) || 0)}
                    className="h-7 text-xs"
                    min={1}
                  />
                </div>

                {/* Price Monthly */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Monthly Price <span className="text-muted-foreground">(cents)</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={tier.price_monthly}
                      onChange={(e) => handleTierChange(index, "price_monthly", parseInt(e.target.value) || 0)}
                      className="h-7 text-xs"
                      min={0}
                    />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      = {formatPrice(tier.price_monthly)}
                    </span>
                  </div>
                </div>

                {/* Price Annual */}
                <div className="space-y-1 col-span-2">
                  <Label className="text-[10px] text-muted-foreground">
                    Annual Price <span className="text-muted-foreground">(cents)</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={tier.price_annual}
                      onChange={(e) => handleTierChange(index, "price_annual", parseInt(e.target.value) || 0)}
                      className="h-7 text-xs flex-1"
                      min={0}
                    />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      = {formatPrice(tier.price_annual)}/yr
                      {tier.price_monthly > 0 && (
                        <span className="text-emerald-600 ml-1">
                          ({Math.round((1 - tier.price_annual / (tier.price_monthly * 12)) * 100)}% off)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Stripe Price IDs */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Stripe Monthly Price ID</Label>
                  <Input
                    value={tier.stripe_price_id_monthly || ""}
                    onChange={(e) => handleTierChange(index, "stripe_price_id_monthly", e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="e.g., price_1Abc..."
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Stripe Annual Price ID</Label>
                  <Input
                    value={tier.stripe_price_id_annual || ""}
                    onChange={(e) => handleTierChange(index, "stripe_price_id_annual", e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="e.g., price_1Def..."
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Tier Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddTier}
            className="w-full text-xs border-dashed"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Tier
          </Button>
        </div>
      )}

      {/* Summary */}
      {tiers.length > 0 && (
        <div className="text-[10px] text-muted-foreground bg-muted/50 rounded p-2">
          <strong>Tier Summary:</strong>{" "}
          {tiers.map((t, i) => (
            <span key={t.id || i}>
              {t.name} ({t.runs_per_month} runs @ {formatPrice(t.price_monthly)}/mo)
              {i < tiers.length - 1 ? " → " : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
