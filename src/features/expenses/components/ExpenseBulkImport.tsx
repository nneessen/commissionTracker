// src/features/expenses/components/ExpenseBulkImport.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Info } from 'lucide-react';

interface ExpenseBulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (csvText: string) => Promise<void>;
  isImporting: boolean;
}

export function ExpenseBulkImport({
  open,
  onOpenChange,
  onImport,
  isImporting,
}: ExpenseBulkImportProps) {
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState('');

  const handleImport = async () => {
    setError('');

    if (!csvText.trim()) {
      setError('Please paste CSV data');
      return;
    }

    try {
      await onImport(csvText);
      setCsvText('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const exampleCSV = `Name,Description,Amount,Type,Category,Date,Deductible
Office Supplies,Pens and paper,45.99,business,office,2025-01-15,true
Coffee Meeting,Client meeting expenses,28.50,business,professional,2025-01-14,true
Gym Membership,Monthly fitness,89.00,personal,other,2025-01-10,false`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Expenses</DialogTitle>
          <DialogDescription>
            Import multiple expenses at once using CSV format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-md p-4 bg-blue-50 border-blue-200">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="font-semibold text-sm">CSV Format Requirements:</div>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    <strong>Columns (in order):</strong> Name, Description, Amount, Type, Category,
                    Date, Deductible
                  </li>
                  <li>
                    <strong>Type:</strong> "personal" or "business"
                  </li>
                  <li>
                    <strong>Category:</strong> marketing, office, travel, professional, technology,
                    or other
                  </li>
                  <li>
                    <strong>Date:</strong> YYYY-MM-DD format
                  </li>
                  <li>
                    <strong>Deductible:</strong> "true" or "false"
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Example CSV:</label>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
              {exampleCSV}
            </pre>
          </div>

          <div className="space-y-2">
            <label htmlFor="csv-input" className="text-sm font-medium">
              Paste your CSV data:
            </label>
            <Textarea
              id="csv-input"
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setError('');
              }}
              placeholder="Paste CSV data here..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {error && (
            <div className="border rounded-md p-4 bg-red-50 border-red-200">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !csvText.trim()}>
            {isImporting ? 'Importing...' : 'Import Expenses'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
