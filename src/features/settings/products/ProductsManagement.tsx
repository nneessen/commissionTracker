import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Edit, Trash2, Upload } from 'lucide-react';
import { useProducts, Product } from './hooks/useProducts';
import { useCarriers } from '../carriers/hooks/useCarriers';
import { ProductForm } from './components/ProductForm';
import { ProductBulkImport } from './components/ProductBulkImport';

export function ProductsManagement() {
  const { products, isLoading, createProduct, updateProduct, deleteProduct, bulkImportProducts } = useProducts();
  const { carriers } = useCarriers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCarrierId, setFilterCarrierId] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Filter products based on search and carrier filter (React 19.1 optimizes automatically)
  let filteredProducts = products;

  if (filterCarrierId) {
    filteredProducts = filteredProducts.filter(p => p.carrier_id === filterCarrierId);
  }

  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (product) => product.name.toLowerCase().includes(search)
    );
  }

  // Get carrier name by ID
  const getCarrierName = (carrierId: string) => {
    return carriers.find(c => c.id === carrierId)?.name || 'Unknown';
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

  const handleFormSubmit = async (data: any) => {
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

  const handleBulkImport = async (productsData: any[]) => {
    await bulkImportProducts.mutateAsync(productsData);
    setIsBulkImportOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading products...</p>
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
              <CardTitle>Products</CardTitle>
              <CardDescription>
                Manage insurance products and their details
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
              <Button onClick={handleAddProduct}>
                <Plus className="h-4 w-4 mr-2" />
                New Product
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterCarrierId}
              onChange={(e) => setFilterCarrierId(e.target.value)}
              className="h-10 px-3 border rounded-md min-w-[200px]"
            >
              <option value="">All Carriers</option>
              {carriers.map(carrier => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm || filterCarrierId
                        ? 'No products found matching your filters.'
                        : 'No products yet. Click "New Product" to add one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {getCarrierName(product.carrier_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {product.product_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(product)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>{selectedProduct?.name}</strong>?
              </p>
              <p className="text-sm text-muted-foreground">
                This will also delete all associated commission rates. This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProduct.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={deleteProduct.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProduct.isPending ? 'Deleting...' : 'Delete Product'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
