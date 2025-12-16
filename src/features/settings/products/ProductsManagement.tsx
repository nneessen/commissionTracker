// src/features/settings/products/ProductsManagement.tsx
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2, Upload, Package } from "lucide-react";
import { useProducts, Product } from "./hooks/useProducts";
import { useCarriers } from "../carriers/hooks/useCarriers";
import { ProductForm } from "./components/ProductForm";
import { ProductBulkImport } from "./components/ProductBulkImport";
import { ProductFormData } from "../../../types/product.types";

export function ProductsManagement() {
  const {
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkImportProducts,
  } = useProducts();
  const { carriers } = useCarriers();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCarrierId, setFilterCarrierId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Filter products based on search and carrier filter (React 19.1 optimizes automatically)
  let filteredProducts = products;

  if (filterCarrierId) {
    filteredProducts = filteredProducts.filter(
      (p) => p.carrier_id === filterCarrierId,
    );
  }

  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter((product) =>
      product.name.toLowerCase().includes(search),
    );
  }

  // Get carrier name by ID
  const getCarrierName = (carrierId: string) => {
    return carriers.find((c) => c.id === carrierId)?.name || "Unknown";
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: ProductFormData) => {
    if (selectedProduct) {
      await updateProduct.mutateAsync({ id: selectedProduct.id, data });
    } else {
      await createProduct.mutateAsync(data);
    }
    setIsFormOpen(false);
    setSelectedProduct(null);
  };

  const handleDeleteConfirm = async () => {
    if (selectedProduct) {
      await deleteProduct.mutateAsync(selectedProduct.id);
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  const handleBulkImport = async (productsData: ProductFormData[]) => {
    await bulkImportProducts.mutateAsync(productsData);
    setIsBulkImportOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-center py-4 text-muted-foreground text-[11px]">
            Loading products...
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
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                Products
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({products.length})
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                onClick={() => setIsBulkImportOpen(true)}
                size="sm"
                className="h-6 px-2 text-[10px]"
              >
                <Upload className="h-3 w-3 mr-1" />
                Import
              </Button>
              <Button
                onClick={handleAddProduct}
                size="sm"
                className="h-6 px-2 text-[10px]"
              >
                <Plus className="h-3 w-3 mr-1" />
                New Product
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
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
              className="h-7 px-2 text-[11px] border rounded bg-background min-w-[140px]"
            >
              <option value="">All Carriers</option>
              {carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="rounded border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] h-7">
                    Product Name
                  </TableHead>
                  <TableHead className="text-[10px] h-7">Carrier</TableHead>
                  <TableHead className="text-[10px] h-7">Type</TableHead>
                  <TableHead className="text-[10px] h-7">Status</TableHead>
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
                      {searchTerm || filterCarrierId
                        ? "No products found matching your filters."
                        : 'No products yet. Click "New Product" to add one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="text-[11px] font-medium py-1.5">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground py-1.5">
                        {getCarrierName(product.carrier_id)}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0"
                        >
                          {product.product_type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge
                          variant={product.is_active ? "default" : "secondary"}
                          className="text-[9px] px-1.5 py-0"
                        >
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-1.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(product)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={selectedProduct}
        onSubmit={handleFormSubmit}
        isSubmitting={createProduct.isPending || updateProduct.isPending}
      />

      {/* Bulk Import Dialog */}
      <ProductBulkImport
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onImport={handleBulkImport}
        isImporting={bulkImportProducts.isPending}
      />

      {/* Delete Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">
              Delete Product?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[11px] space-y-1">
              <p>
                Are you sure you want to delete{" "}
                <strong>{selectedProduct?.name}</strong>?
              </p>
              <p className="text-muted-foreground">
                This will also delete all associated commission rates. This
                action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteProduct.isPending}
              className="h-7 text-[11px]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={deleteProduct.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-7 text-[11px]"
            >
              {deleteProduct.isPending ? "Deleting..." : "Delete Product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
