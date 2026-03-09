// src/features/underwriting/components/CoverageBuilder/CoverageTab.tsx
// Main container for Coverage Builder - audit first, then carrier → product → conditions drill-down

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CarrierCoverageList } from "./CarrierCoverageList";
import { ProductCoverageList } from "./ProductCoverageList";
import { ConditionChecklist } from "./ConditionChecklist";
import { CoverageAuditView } from "./CoverageAuditView";

interface NavigationState {
  carrierId: string;
  carrierName: string;
  productId?: string;
  productName?: string;
}

export function CoverageTab() {
  const [view, setView] = useState<"audit" | "builder">("audit");
  const [nav, setNav] = useState<NavigationState | null>(null);

  let builderContent;

  // Level 3: Carrier + Product selected → show condition checklist
  if (nav?.productId && nav?.productName) {
    builderContent = (
      <ConditionChecklist
        carrierId={nav.carrierId}
        carrierName={nav.carrierName}
        productId={nav.productId}
        productName={nav.productName}
        onBack={() =>
          setNav({ carrierId: nav.carrierId, carrierName: nav.carrierName })
        }
      />
    );
  } else if (nav) {
    // Level 2: Carrier selected → show product list
    builderContent = (
      <ProductCoverageList
        carrierId={nav.carrierId}
        carrierName={nav.carrierName}
        onBack={() => setNav(null)}
        onSelectProduct={(productId, productName) =>
          setNav({ ...nav, productId, productName })
        }
      />
    );
  } else {
    // Level 1: Show carrier list
    builderContent = (
      <CarrierCoverageList
        onSelectCarrier={(id, name) =>
          setNav({ carrierId: id, carrierName: name })
        }
      />
    );
  }

  return (
    <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
      <TabsList
        variant="segment"
        size="sm"
        className="mb-3 h-auto w-full max-w-sm"
      >
        <TabsTrigger value="audit" variant="segment" size="sm">
          Audit
        </TabsTrigger>
        <TabsTrigger value="builder" variant="segment" size="sm">
          Builder
        </TabsTrigger>
      </TabsList>

      <TabsContent value="audit" className="mt-0">
        <CoverageAuditView
          onOpenBuilder={({
            carrierId,
            carrierName,
            productId,
            productName,
          }) => {
            setNav({ carrierId, carrierName, productId, productName });
            setView("builder");
          }}
        />
      </TabsContent>

      <TabsContent value="builder" className="mt-0">
        {builderContent}
      </TabsContent>
    </Tabs>
  );
}
