// src/features/recruiting/components/StatusLegend.tsx

import React from 'react';

export function StatusLegend() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1.5 py-0.5 border-b">
      <span>🟢 &lt;7d</span>
      <span>🟡 7-14d</span>
      <span>🔴 &gt;14d/drop</span>
      <span>✅ done</span>
    </div>
  );
}
