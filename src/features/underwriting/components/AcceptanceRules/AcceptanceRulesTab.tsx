// src/features/underwriting/components/AcceptanceRules/AcceptanceRulesTab.tsx
// Tab for managing carrier condition acceptance rules

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, CheckCircle2 } from "lucide-react";
import { useCarriersWithProducts } from "../../hooks/useCarriersWithProducts";
import { useCarriersWithAcceptanceRules } from "../../hooks/useAcceptance";
import { AcceptanceRuleForm } from "./AcceptanceRuleForm";

export function AcceptanceRulesTab() {
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>("");

  const { data: carriers, isLoading: loadingCarriers } =
    useCarriersWithProducts();
  const { data: carriersWithRules, isLoading: _loadingCarriersWithRules } =
    useCarriersWithAcceptanceRules();

  // Get carriers list (just need id and name, not products)
  const carriersList = useMemo(() => {
    if (!carriers) return [];
    return carriers.map((c) => ({
      id: c.id,
      name: c.name,
    }));
  }, [carriers]);

  // Get selected carrier
  const selectedCarrier = useMemo(() => {
    return carriersList.find((c) => c.id === selectedCarrierId);
  }, [carriersList, selectedCarrierId]);

  // Check if carrier has rules
  const carrierHasRules = (carrierId: string) => {
    return carriersWithRules?.includes(carrierId) || false;
  };

  if (loadingCarriers) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Carrier Acceptance Rules
          </CardTitle>
          <CardDescription>
            Define how each carrier handles specific health conditions. These
            rules help the decision engine determine which carriers are likely
            to approve a client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Select Carrier</label>
            <Select
              value={selectedCarrierId}
              onValueChange={setSelectedCarrierId}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a carrier to manage rules..." />
              </SelectTrigger>
              <SelectContent>
                {carriersList.map((carrier) => {
                  const hasRules = carrierHasRules(carrier.id);
                  return (
                    <SelectItem key={carrier.id} value={carrier.id}>
                      <div className="flex items-center gap-2">
                        <span>{carrier.name}</span>
                        {hasRules && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Acceptance Rule Form */}
      {selectedCarrier && (
        <AcceptanceRuleForm
          carrierId={selectedCarrier.id}
          carrierName={selectedCarrier.name}
        />
      )}

      {/* Empty State */}
      {!selectedCarrierId && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">
              Select a carrier to manage acceptance rules
            </p>
            <p className="text-sm mt-1">
              Start with your most-used carriers: Mutual of Omaha, Baltimore
              Life, Transamerica
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {carriersWithRules && carriersWithRules.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Acceptance Rules Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {carriersWithRules.length}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                carriers with rules
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {carriersList
                .filter((c) => carrierHasRules(c.id))
                .map((carrier) => (
                  <Badge key={carrier.id} variant="outline">
                    {carrier.name}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
