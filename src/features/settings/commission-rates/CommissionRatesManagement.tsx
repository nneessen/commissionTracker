// src/features/settings/commission-rates/CommissionRatesManagement.tsx
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Upload, Percent } from "lucide-react";
import {
  useCommissionRates,
  ProductWithRates,
  CreateRateData,
} from "./hooks/useCommissionRates";
import { useCarriers } from "../carriers/hooks/useCarriers";
import { useProducts } from "../products/hooks/useProducts";
import { RateEditDialog } from "./components/RateEditDialog";
import { RateBulkImport } from "./components/RateBulkImport";
import type { Database } from "@/types/database.types";

type ProductType = Database["public"]["Enums"]["product_type"];

const PRODUCT_TYPES: ProductType[] = [
  "term_life",
  "whole_life",
  "universal_life",
  "variable_life",
  "health",
  "disability",
  "annuity",
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

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCarrierId, setFilterCarrierId] = useState("");
  const [filterProductType, setFilterProductType] = useState<ProductType | "">(
    "",
  );
  const [showEmptyOnly, setShowEmptyOnly] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithRates | null>(null);

  // Filter products (React 19.1 optimizes automatically)
  let filteredProducts = productsWithRates;

  if (filterCarrierId) {
    filteredProducts = filteredProducts.filter(
      (p) => p.carrierId === filterCarrierId,
    );
  }

  if (filterProductType) {
    filteredProducts = filteredProducts.filter(
      (p) => p.productType === filterProductType,
    );
  }

  if (showEmptyOnly) {
    filteredProducts = filteredProducts.filter(
      (p) => Object.keys(p.rates).length === 0,
    );
  }

  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (product) =>
        product.productName.toLowerCase().includes(search) ||
        product.carrierName.toLowerCase().includes(search),
    );
  }

  const handleEditRates = (product: ProductWithRates) => {
    setSelectedProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleSaveRates = async (
    productId: string,
    rates: Record<number, number>,
  ) => {
    try {
      // Get existing rates for this product
      const existingRates = await getProductRates(productId);
      const existingRatesByLevel = new Map(
        existingRates.map((r: any) => [r.contract_level, r.id]),
      );

      const product = products.find((p) => p.id === productId);
      if (!product) {
        throw new Error("Product not found");
      }

      // Update or create rates
      const promises = Object.entries(rates).map(
        async ([level, percentage]) => {
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
              effective_date: new Date().toISOString().split("T")[0],
            };
            await createRate.mutateAsync(newRate);
          }
        },
      );

      // Delete rates that were removed
      const levelsToKeep = new Set(Object.keys(rates).map(Number));
      const ratesToDelete = existingRates.filter(
        (r: any) => !levelsToKeep.has(r.contract_level),
      );

      const deletePromises = ratesToDelete.map((r: any) =>
        deleteRate.mutateAsync(r.id),
      );

      await Promise.all([...promises, ...deletePromises]);

      setIsEditDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Failed to save rates:", error);
    }
  };

  const handleBulkImport = async (csvText: string) => {
    try {
      const lines = csvText.trim().split("\n");
      const ratesToCreate: CreateRateData[] = [];

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [productName, contractLevelStr, commissionStr] = line
          .split(",")
          .map((s) => s.trim());

        if (!productName || !contractLevelStr || !commissionStr) {
          alert(`Invalid data on line ${i + 1}: missing required fields`);
          return;
        }

        // Find product by name
        const product = products.find(
          (p) => p.name.toLowerCase() === productName.toLowerCase(),
        );

        if (!product) {
          alert(
            `Product "${productName}" not found on line ${i + 1}. Please create the product first.`,
          );
          return;
        }

        const contractLevel = parseInt(contractLevelStr);
        const commission = parseFloat(commissionStr);

        if (isNaN(contractLevel) || isNaN(commission)) {
          alert(`Invalid numbers on line ${i + 1}`);
          return;
        }

        if (commission < 0 || commission > 100) {
          alert(
            `Invalid commission percentage on line ${i + 1}: must be 0-100`,
          );
          return;
        }

        // Get existing rate for this product/level
        const existingRates = await getProductRates(product.id);
        const existingRate = existingRates.find(
          (r: any) => r.contract_level === contractLevel,
        );

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
            effective_date: new Date().toISOString().split("T")[0],
          });
        }
      }

      // Create all new rates
      for (const rate of ratesToCreate) {
        await createRate.mutateAsync(rate);
      }

      setIsBulkImportOpen(false);
    } catch (error) {
      console.error("Bulk import failed:", error);
      alert(
        `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-center py-4 text-muted-foreground text-[11px]">
            Loading commission rates...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Percent className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                Commission Rates
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({productsWithRates.length})
              </span>
            </div>
            <Button
              onClick={() => setIsBulkImportOpen(true)}
              size="sm"
              className="h-6 px-2 text-[10px]"
            >
              <Upload className="h-3 w-3 mr-1" />
              Bulk Import
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap mb-2">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-7 text-[11px]"
              />
            </div>
            <select
              value={filterCarrierId}
              onChange={(e) => setFilterCarrierId(e.target.value)}
              className="h-7 px-2 text-[11px] border rounded bg-background min-w-[120px]"
            >
              <option value="">All Carriers</option>
              {carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
            <select
              value={filterProductType}
              onChange={(e) =>
                setFilterProductType(e.target.value as ProductType | "")
              }
              className="h-7 px-2 text-[11px] border rounded bg-background min-w-[110px]"
            >
              <option value="">All Types</option>
              {PRODUCT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace("_", " ")}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 px-2 h-7 border rounded bg-background">
              <input
                type="checkbox"
                checked={showEmptyOnly}
                onChange={(e) => setShowEmptyOnly(e.target.checked)}
                className="h-3 w-3"
              />
              <span className="text-[10px]">Empty only</span>
            </label>
          </div>

          {/* Table */}
          <div className="rounded border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] h-7">Carrier</TableHead>
                  <TableHead className="text-[10px] h-7">Product</TableHead>
                  <TableHead className="text-[10px] h-7">Type</TableHead>
                  <TableHead className="text-[10px] h-7 text-center">
                    Coverage
                  </TableHead>
                  <TableHead className="text-[10px] h-7 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-4 text-muted-foreground text-[11px]"
                    >
                      {showEmptyOnly
                        ? "No products without rates found."
                        : searchTerm || filterCarrierId || filterProductType
                          ? "No products found matching your filters."
                          : "No products yet. Add products in the Products tab first."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const [filled, total] = product.rateCoverage
                      .split("/")
                      .map(Number);
                    const isComplete = filled === total;
                    const isEmpty = filled === 0;

                    return (
                      <TableRow key={product.productId}>
                        <TableCell className="text-[11px] font-medium py-1.5">
                          {product.carrierName}
                        </TableCell>
                        <TableCell className="text-[11px] py-1.5">
                          {product.productName}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0"
                          >
                            {product.productType.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center py-1.5">
                          <Badge
                            variant={
                              isComplete
                                ? "default"
                                : isEmpty
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-[9px] px-1.5 py-0"
                          >
                            {product.rateCoverage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRates(product)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
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
        isSaving={
          createRate.isPending || updateRate.isPending || deleteRate.isPending
        }
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
