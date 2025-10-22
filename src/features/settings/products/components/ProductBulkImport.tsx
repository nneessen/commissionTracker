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
import { useCarriers } from '../../carriers/hooks/useCarriers';
import type { Database } from '@/types/database.types';
import type { ProductFormData } from '@/types/product.types';

type ProductType = Database['public']['Enums']['product_type'];

interface ProductBulkImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (products: ProductFormData[]) => void;
  isImporting?: boolean;
}

export function ProductBulkImport({
  open,
  onOpenChange,
  onImport,
  isImporting = false,
}: ProductBulkImportProps) {
  const { carriers } = useCarriers();
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState('');

  const downloadTemplate = () => {
    const template = `Carrier Name,Product Name,Product Type
Foresters,Whole Life 0-75,whole_life
Foresters,Term Life 20yr,term_life
SBLI,Universal Life,universal_life`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setError('');

    if (!csvText.trim()) {
      setError('Please paste CSV data');
      return;
    }

    try {
      const lines = csvText.trim().split('\n');
      const products: ProductFormData[] = [];

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [carrierName, productName, productTypeStr] = line.split(',').map(s => s.trim());

        if (!carrierName || !productName) {
          setError(`Invalid data on line ${i + 1}: missing carrier or product name`);
          return;
        }

        // Find carrier
        const carrier = carriers.find(c =>
          c.name.toLowerCase() === carrierName.toLowerCase()
        );

        if (!carrier) {
          setError(`Carrier "${carrierName}" not found on line ${i + 1}. Please create the carrier first.`);
          return;
        }

        const productType = (productTypeStr || 'term_life') as ProductType;

        products.push({
          carrier_id: carrier.id,
          name: productName,
          product_type: productType,
          is_active: true,
        });
      }

      if (products.length === 0) {
        setError('No valid products found in CSV');
        return;
      }

      onImport(products);
      setCsvText('');
    } catch (err) {
      setError(`Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Products</DialogTitle>
          <DialogDescription>
            Import multiple products at once using CSV format. Carriers must already exist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Format: Carrier Name, Product Name, Product Type
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
              onChange={(e) => {
                setCsvText(e.target.value);
                setError('');
              }}
              placeholder="Foresters,Whole Life 0-75,whole_life&#10;Foresters,Term Life 20yr,term_life&#10;SBLI,Universal Life,universal_life"
              className="h-48 font-mono text-sm"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="rounded-md bg-muted p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Valid Product Types:</strong> term_life, whole_life, universal_life,
              variable_life, health, disability, annuity
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setCsvText('');
              setError('');
            }}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || !csvText.trim()}
          >
            {isImporting ? 'Importing...' : 'Import Products'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
