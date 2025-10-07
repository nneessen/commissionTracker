import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Upload } from 'lucide-react';
import { useCommissionRates, ProductWithRates, CreateRateData } from './hooks/useCommissionRates';
import { useCarriers } from '../carriers/hooks/useCarriers';
import { useProducts } from '../products/hooks/useProducts';
import { RateEditDialog } from './components/RateEditDialog';
import { RateBulkImport } from './components/RateBulkImport';
import type { Database } from '@/types/database.types';

type ProductType = Database['public']['Enums']['product_type'];

const PRODUCT_TYPES: ProductType[] = [
  'term_life',
  'whole_life',
  'universal_life',
  'variable_life',
  'health',
  'disability',
  'annuity'
];

export function CommissionRatesManagement() {
  const {
    productsWithRates,
    isLoading,
    createRate,
    updateRate,
    deleteRate,
    getProductRates,
  } = useCommissionRates();

  const { carriers } = useCarriers();
  const { products } = useProducts();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCarrierId, setFilterCarrierId] = useState('');
  const [filterProductType, setFilterProductType] = useState<ProductType | ''>('');
  const [showEmptyOnly, setShowEmptyOnly] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRates | null>(null);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = productsWithRates;

    if (filterCarrierId) {
      result = result.filter(p => p.carrierId === filterCarrierId);
    }

    if (filterProductType) {
      result = result.filter(p => p.productType === filterProductType);
    }

    if (showEmptyOnly) {
      result = result.filter(p => Object.keys(p.rates).length === 0);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (product) =>
          product.productName.toLowerCase().includes(search) ||
          product.carrierName.toLowerCase().includes(search)
      );
    }

    return result;
  }, [productsWithRates, searchTerm, filterCarrierId, filterProductType, showEmptyOnly]);

  const handleEditRates = (product: ProductWithRates) => {
    setSelectedProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleSaveRates = async (productId: string, rates: Record<number, number>) => {
    try {
      // Get existing rates for this product
      const existingRates = await getProductRates(productId);
      const existingRatesByLevel = new Map(
        existingRates.map((r: any) => [r.contract_level, r.id])
      );

      const product = products.find(p => p.id === productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Update or create rates
      const promises = Object.entries(rates).map(async ([level, percentage]) => {
        const contractLevel = Number(level);
        const existingRateId = existingRatesByLevel.get(contractLevel);

        if (existingRateId) {
          // Update existing rate
          await updateRate.mutateAsync({
            id: existingRateId,
            data: {
              commission_percentage: percentage / 100, // Convert percentage to decimal
            },
          });
        } else {
          // Create new rate
          const newRate: CreateRateData = {
            carrier_id: product.carrier_id,
            product_id: productId,
            product_type: product.product_type,
            contract_level: contractLevel,
            commission_percentage: percentage / 100,
            effective_date: new Date().toISOString().split('T')[0],
          };
          await createRate.mutateAsync(newRate);
        }
      });

      // Delete rates that were removed
      const levelsToKeep = new Set(Object.keys(rates).map(Number));
      const ratesToDelete = existingRates.filter(
        (r: any) => !levelsToKeep.has(r.contract_level)
      );

      const deletePromises = ratesToDelete.map((r: any) =>
        deleteRate.mutateAsync(r.id)
      );

      await Promise.all([...promises, ...deletePromises]);

      setIsEditDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Failed to save rates:', error);
    }
  };

  const handleBulkImport = async (csvText: string) => {
    try {
      const lines = csvText.trim().split('\n');
      const ratesToCreate: CreateRateData[] = [];

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [productName, contractLevelStr, commissionStr] = line.split(',').map(s => s.trim());

        if (!productName || !contractLevelStr || !commissionStr) {
          alert(`Invalid data on line ${i + 1}: missing required fields`);
          return;
        }

        // Find product by name
        const product = products.find(p =>
          p.name.toLowerCase() === productName.toLowerCase()
        );

        if (!product) {
          alert(`Product "${productName}" not found on line ${i + 1}. Please create the product first.`);
          return;
        }

        const contractLevel = parseInt(contractLevelStr);
        const commission = parseFloat(commissionStr);

        if (isNaN(contractLevel) || isNaN(commission)) {
          alert(`Invalid numbers on line ${i + 1}`);
          return;
        }

        if (commission < 0 || commission > 100) {
          alert(`Invalid commission percentage on line ${i + 1}: must be 0-100`);
          return;
        }

        // Get existing rate for this product/level
        const existingRates = await getProductRates(product.id);
        const existingRate = existingRates.find((r: any) => r.contract_level === contractLevel);

        if (existingRate) {
          // Update existing
          await updateRate.mutateAsync({
            id: existingRate.id,
            data: {
              commission_percentage: commission / 100,
            },
          });
        } else {
          // Create new
          ratesToCreate.push({
            carrier_id: product.carrier_id,
            product_id: product.id,
            product_type: product.product_type,
            contract_level: contractLevel,
            commission_percentage: commission / 100,
            effective_date: new Date().toISOString().split('T')[0],
          });
        }
      }

      // Create all new rates
      for (const rate of ratesToCreate) {
        await createRate.mutateAsync(rate);
      }

      setIsBulkImportOpen(false);
    } catch (error) {
      console.error('Bulk import failed:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading commission rates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Commission Rates</CardTitle>
              <CardDescription>
                Configure contract level commission percentages for each product
              </CardDescription>
            </div>
            <Button onClick={() => setIsBulkImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(value) => setSearchTerm(String(value))}
                className="pl-9"
              />
            </div>
            <select
              value={filterCarrierId}
              onChange={(e) => setFilterCarrierId(e.target.value)}
              className="h-10 px-3 border rounded-md min-w-[150px]"
            >
              <option value="">All Carriers</option>
              {carriers.map(carrier => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
            <select
              value={filterProductType}
              onChange={(e) => setFilterProductType(e.target.value as ProductType | '')}
              className="h-10 px-3 border rounded-md min-w-[150px]"
            >
              <option value="">All Types</option>
              {PRODUCT_TYPES.map(type => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 px-3 h-10 border rounded-md">
              <input
                type="checkbox"
                checked={showEmptyOnly}
                onChange={(e) => setShowEmptyOnly(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">Empty only</span>
            </label>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Rate Coverage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {showEmptyOnly
                        ? 'No products without rates found.'
                        : searchTerm || filterCarrierId || filterProductType
                        ? 'No products found matching your filters.'
                        : 'No products yet. Add products in the Products tab first.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const [filled, total] = product.rateCoverage.split('/').map(Number);
                    const isComplete = filled === total;
                    const isEmpty = filled === 0;

                    return (
                      <TableRow key={product.productId}>
                        <TableCell className="font-medium">{product.carrierName}</TableCell>
                        <TableCell>{product.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {product.productType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isComplete ? 'default' : isEmpty ? 'destructive' : 'secondary'}
                          >
                            {product.rateCoverage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRates(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Rates Dialog */}
      <RateEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        product={selectedProduct}
        onSave={handleSaveRates}
        isSaving={createRate.isPending || updateRate.isPending || deleteRate.isPending}
      />

      {/* Bulk Import Dialog */}
      <RateBulkImport
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onImport={handleBulkImport}
        isImporting={createRate.isPending}
      />
    </>
  );
}
