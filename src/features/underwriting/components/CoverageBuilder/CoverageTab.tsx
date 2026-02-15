// src/features/underwriting/components/CoverageBuilder/CoverageTab.tsx
// Main container for Coverage Builder - three-level drill-down: Carrier → Product → Conditions

import { useState } from "react";
import { CarrierCoverageList } from "./CarrierCoverageList";
import { ProductCoverageList } from "./ProductCoverageList";
import { ConditionChecklist } from "./ConditionChecklist";

interface NavigationState {
  carrierId: string;
  carrierName: string;
  productId?: string;
  productName?: string;
}

export function CoverageTab() {
  const [nav, setNav] = useState<NavigationState | null>(null);

  // Level 3: Carrier + Product selected → show condition checklist
  if (nav?.productId && nav?.productName) {
    return (
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
  }

  // Level 2: Carrier selected → show product list
  if (nav) {
    return (
      <ProductCoverageList
        carrierId={nav.carrierId}
        carrierName={nav.carrierName}
        onBack={() => setNav(null)}
        onSelectProduct={(productId, productName) =>
          setNav({ ...nav, productId, productName })
        }
      />
    );
  }

  // Level 1: Show carrier list
  return (
    <CarrierCoverageList
      onSelectCarrier={(id, name) =>
        setNav({ carrierId: id, carrierName: name })
      }
    />
  );
}
