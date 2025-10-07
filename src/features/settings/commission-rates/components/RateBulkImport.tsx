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
import { Download } from 'lucide-react';

interface RateBulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (csvText: string) => void;
  isImporting?: boolean;
}

export function RateBulkImport({
  open,
  onOpenChange,
  onImport,
  isImporting = false,
}: RateBulkImportProps) {
  const [csvText, setCsvText] = useState('');

  const downloadTemplate = () => {
    const template = `Product Name,Contract Level,Commission %
Whole Life 0-75,80,95.0
Whole Life 0-75,85,97.5
Whole Life 0-75,90,100.0
Term Life 20yr,80,90.0
Term Life 20yr,85,92.5`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commission-rates-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!csvText.trim()) {
      alert('Please paste CSV data');
      return;
    }

    onImport(csvText);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Commission Rates</DialogTitle>
          <DialogDescription>
            Import commission rates for multiple products and contract levels at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Format: Product Name, Contract Level, Commission %
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Paste CSV Data
            </label>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Whole Life 0-75,80,95.0&#10;Whole Life 0-75,85,97.5&#10;Term Life 20yr,80,90.0"
              className="h-64 font-mono text-sm"
            />
          </div>

          <div className="rounded-md bg-muted p-3 space-y-2">
            <p className="text-sm font-medium">Requirements:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Products must already exist in the system</li>
              <li>Contract levels: 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145</li>
              <li>Commission percentages: 0-100</li>
              <li>CSV will update existing rates or create new ones</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setCsvText('');
            }}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !csvText.trim()}>
            {isImporting ? 'Importing...' : 'Import Rates'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
