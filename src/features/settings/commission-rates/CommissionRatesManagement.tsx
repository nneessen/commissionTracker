// src/features/settings/commission-rates/CommissionRatesManagement.tsx
// Redesigned with zinc palette and compact design patterns

import React, { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  // Filter products
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rate data type
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
                commission_percentage: percentage / 100,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rate data type
        (r: any) => !levelsToKeep.has(r.contract_level),
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rate data type
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rate data type
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
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-center text-[11px] text-zinc-500 dark:text-zinc-400">
          Loading commission rates...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-zinc-400" />
            <div>
              <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                Commission Rates
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Configure contract level commission percentages for each product
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setIsBulkImportOpen(true)}
          >
            <Upload className="h-3 w-3 mr-1" />
            Bulk Import
          </Button>
        </div>

        <div className="p-3 space-y-2">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <Select
              value={filterCarrierId || "all"}
              onValueChange={(v) => setFilterCarrierId(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-36 h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                <SelectValue placeholder="All Carriers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Carriers</SelectItem>
                {carriers.map((carrier) => (
                  <SelectItem key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterProductType || "all"}
              onValueChange={(v) =>
                setFilterProductType(v === "all" ? "" : (v as ProductType))
              }
            >
              <SelectTrigger className="w-36 h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PRODUCT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 px-2 h-7 border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900">
              <Checkbox
                checked={showEmptyOnly}
                onCheckedChange={(checked) =>
                  setShowEmptyOnly(checked as boolean)
                }
                className="h-3 w-3"
              />
              <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                Empty only
              </span>
            </label>
          </div>

          {/* Table */}
          <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <Table>
              <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
                <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Carrier
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Product
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px]">
                    Type
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[100px] text-center">
                    Rate Coverage
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[60px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-6"
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
                      <TableRow
                        key={product.productId}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50"
                      >
                        <TableCell className="py-1.5">
                          <span className="font-medium text-[11px] text-zinc-900 dark:text-zinc-100">
                            {product.carrierName}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-[11px] text-zinc-700 dark:text-zinc-300">
                            {product.productName}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1 border-zinc-300 dark:border-zinc-600"
                          >
                            {product.productType.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5 text-center">
                          <Badge
                            variant={
                              isComplete
                                ? "default"
                                : isEmpty
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-[10px] h-4 px-1"
                          >
                            {product.rateCoverage}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                            onClick={() => handleEditRates(product)}
                          >
                            <Edit className="h-2.5 w-2.5 mr-0.5" />
                            <span className="text-[10px]">Edit</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

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
