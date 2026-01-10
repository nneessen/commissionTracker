// src/features/underwriting/components/DecisionTreeEditor/RuleActionConfig.tsx

import { memo } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type {
  RuleRecommendation,
  CarrierWithProducts,
} from "../../types/underwriting.types";

interface RuleActionConfigProps {
  recommendations: RuleRecommendation[];
  onChange: (recommendations: RuleRecommendation[]) => void;
  carriers: CarrierWithProducts[];
}

function RuleActionConfigInner({
  recommendations,
  onChange,
  carriers,
}: RuleActionConfigProps) {
  const handleAddRecommendation = () => {
    const newRec: RuleRecommendation = {
      carrierId: carriers[0]?.id || "",
      productIds: [],
      priority: recommendations.length + 1,
    };
    onChange([...recommendations, newRec]);
  };

  const handleUpdateRecommendation = (
    index: number,
    updates: Partial<RuleRecommendation>,
  ) => {
    const updated = recommendations.map((rec, i) =>
      i === index ? { ...rec, ...updates } : rec,
    );
    onChange(updated);
  };

  const handleDeleteRecommendation = (index: number) => {
    const updated = recommendations.filter((_, i) => i !== index);
    // Re-assign priorities
    const reprioritized = updated.map((rec, i) => ({
      ...rec,
      priority: i + 1,
    }));
    onChange(reprioritized);
  };

  const handleProductToggle = (index: number, productId: string) => {
    const rec = recommendations[index];
    const productIds = rec.productIds.includes(productId)
      ? rec.productIds.filter((id) => id !== productId)
      : [...rec.productIds, productId];
    handleUpdateRecommendation(index, { productIds });
  };

  const getCarrierProducts = (carrierId: string) => {
    return carriers.find((c) => c.id === carrierId)?.products || [];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
          Recommendations (in priority order)
        </Label>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddRecommendation}
          className="h-6 text-[10px] px-2"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Carrier
        </Button>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-6 text-zinc-400 dark:text-zinc-500 text-[11px] bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-dashed border-zinc-200 dark:border-zinc-700">
          No recommendations configured. Add a carrier to recommend.
        </div>
      ) : (
        <div className="space-y-2">
          {recommendations.map((rec, index) => {
            const carrierProducts = getCarrierProducts(rec.carrierId);
            const carrier = carriers.find((c) => c.id === rec.carrierId);

            return (
              <div
                key={index}
                className="border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                  <GripVertical className="h-3.5 w-3.5 text-zinc-400 cursor-grab" />
                  <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 w-6">
                    #{rec.priority}
                  </span>
                  <Select
                    value={rec.carrierId}
                    onValueChange={(v) => {
                      handleUpdateRecommendation(index, {
                        carrierId: v,
                        productIds: [], // Reset products when carrier changes
                      });
                    }}
                  >
                    <SelectTrigger className="h-6 flex-1 text-[11px] bg-white dark:bg-zinc-900">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {carriers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRecommendation(index)}
                    className="h-6 w-6 p-0 text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Products */}
                <div className="p-2 space-y-2">
                  <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Products to recommend:
                  </Label>
                  {carrierProducts.length === 0 ? (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
                      No products available for{" "}
                      {carrier?.name || "this carrier"}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {carrierProducts.map((product) => (
                        <label
                          key={product.id}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          <Checkbox
                            checked={rec.productIds.includes(product.id)}
                            onCheckedChange={() =>
                              handleProductToggle(index, product.id)
                            }
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-[10px] text-zinc-700 dark:text-zinc-300">
                            {product.name}
                            <span className="text-zinc-400 dark:text-zinc-500 ml-1">
                              ({product.product_type.replace("_", " ")})
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  <div className="pt-1.5">
                    <Label className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Notes (optional):
                    </Label>
                    <Textarea
                      value={rec.notes || ""}
                      onChange={(e) =>
                        handleUpdateRecommendation(index, {
                          notes: e.target.value || undefined,
                        })
                      }
                      placeholder="Additional guidance for this recommendation..."
                      className="mt-1 text-[11px] min-h-[60px] resize-none"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const RuleActionConfig = memo(RuleActionConfigInner);
export default RuleActionConfig;
