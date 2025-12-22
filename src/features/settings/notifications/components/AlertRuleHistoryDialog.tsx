/**
 * Alert Rule History Dialog
 *
 * Shows evaluation history for an alert rule.
 */

import { format } from "date-fns";
import { Loader2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import { useAlertRuleHistory } from "@/hooks/alerts";
import {
  METRIC_LABELS,
  COMPARISON_SYMBOLS,
  type AlertRule,
} from "@/types/alert-rules.types";

interface AlertRuleHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: AlertRule | null;
}

export function AlertRuleHistoryDialog({
  open,
  onOpenChange,
  rule,
}: AlertRuleHistoryDialogProps) {
  const { data: history, isLoading } = useAlertRuleHistory(rule?.id ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Alert Rule History</DialogTitle>
          <DialogDescription>
            {rule ? (
              <>
                Evaluation history for "{rule.name}"
                <br />
                <span className="text-xs">
                  {METRIC_LABELS[rule.metric]} {COMPARISON_SYMBOLS[rule.comparison]}{" "}
                  {rule.threshold_value}
                </span>
              </>
            ) : (
              "Loading..."
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !history || history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No evaluations yet</p>
            <p className="text-xs text-muted-foreground">
              This rule hasn't been evaluated. Evaluations run every 15 minutes.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {history.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className={`rounded-lg border p-3 ${
                    evaluation.triggered ? "border-destructive/50 bg-destructive/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {evaluation.triggered ? (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      )}
                      <div>
                        <div className="text-sm font-medium">
                          {evaluation.triggered ? "Triggered" : "Passed"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(evaluation.evaluated_at), "MMM d, yyyy h:mm a")}
                        </div>
                      </div>
                    </div>
                    <Badge variant={evaluation.triggered ? "destructive" : "secondary"} className="text-xs">
                      {evaluation.current_value !== null
                        ? `${evaluation.current_value} ${COMPARISON_SYMBOLS[evaluation.comparison]} ${evaluation.threshold_value}`
                        : "N/A"}
                    </Badge>
                  </div>

                  {evaluation.triggered && evaluation.affected_user_name && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Affected: {evaluation.affected_user_name}
                      {evaluation.affected_entity_type && (
                        <span className="ml-1">({evaluation.affected_entity_type})</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
