// src/features/expenses/ExpensesPage.tsx
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Target } from "lucide-react";
import { ExpenseDashboardCompact } from "./ExpenseDashboardCompact";
import { LeadPurchaseDashboard } from "./leads";

type TabValue = "expenses" | "leads";

export function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("expenses");

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Tab Navigation - Fixed at top */}
      <div className="flex-shrink-0 px-3 pt-3">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabValue)}
          className="w-full"
        >
          <TabsList className="h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <TabsTrigger
              value="expenses"
              className="h-7 text-xs data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
            >
              <Receipt className="h-3 w-3 mr-1.5" />
              General Expenses
            </TabsTrigger>
            <TabsTrigger
              value="leads"
              className="h-7 text-xs data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
            >
              <Target className="h-3 w-3 mr-1.5" />
              Lead Purchases
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content - Scrollable area */}
      <div className="flex-1 overflow-auto">
        {activeTab === "expenses" && <ExpenseDashboardCompact />}
        {activeTab === "leads" && <LeadPurchaseDashboard />}
      </div>
    </div>
  );
}
