import React, { useState } from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {Plus, Search, Edit, Trash2} from 'lucide-react';
import {useCarriers, Carrier} from './hooks/useCarriers';
import {CarrierForm} from './components/CarrierForm';
import {CarrierDeleteDialog} from './components/CarrierDeleteDialog';
import {NewCarrierForm} from '../../../types/carrier.types';

export function CarriersManagement() {
  const { carriers, isLoading, createCarrier, updateCarrier, deleteCarrier } = useCarriers();

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);

  // Filter carriers based on search (React 19.1 optimizes automatically)
  let filteredCarriers = carriers;

  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    filteredCarriers = carriers.filter(
      (carrier) =>
        carrier.name.toLowerCase().includes(search) ||
        carrier.short_name?.toLowerCase().includes(search)
    );
  }

  // Count products per carrier (this would come from a join query in real app)
  const getProductCount = (_carrierId: string) => {
    // TODO: Implement actual product count query
    return 0;
  };

  const handleAddCarrier = () => {
    setSelectedCarrier(null);
    setIsFormOpen(true);
  };

  const handleEditCarrier = (carrier: Carrier) => {
    setSelectedCarrier(carrier);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (carrier: Carrier) => {
    setSelectedCarrier(carrier);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: NewCarrierForm) => {
    if (selectedCarrier) {
      await updateCarrier.mutateAsync({ id: selectedCarrier.id, data });
    } else {
      await createCarrier.mutateAsync(data);
    }
    setIsFormOpen(false);
    setSelectedCarrier(null);
  };

  const handleDeleteConfirm = async () => {
    if (selectedCarrier) {
      await deleteCarrier.mutateAsync(selectedCarrier.id);
      setIsDeleteDialogOpen(false);
      setSelectedCarrier(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading carriers...</p>
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
              <CardTitle>Carriers</CardTitle>
              <CardDescription>
                Manage insurance carriers and their information
              </CardDescription>
            </div>
            <Button onClick={handleAddCarrier}>
              <Plus className="h-4 w-4 mr-2" />
              New Carrier
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search carriers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carrier Name</TableHead>
                  <TableHead>Short Name</TableHead>
                  <TableHead># Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCarriers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm
                        ? 'No carriers found matching your search.'
                        : 'No carriers yet. Click "New Carrier" to add one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCarriers.map((carrier) => (
                    <TableRow key={carrier.id}>
                      <TableCell className="font-medium">{carrier.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {carrier.short_name || '—'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getProductCount(carrier.id)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={carrier.is_active ? 'default' : 'secondary'}>
                          {carrier.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCarrier(carrier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(carrier)}
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

      {/* Form Sheet */}
      <CarrierForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        carrier={selectedCarrier}
        onSubmit={handleFormSubmit}
        isSubmitting={createCarrier.isPending || updateCarrier.isPending}
      />

      {/* Delete Dialog */}
      <CarrierDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        carrier={selectedCarrier}
        productCount={selectedCarrier ? getProductCount(selectedCarrier.id) : 0}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteCarrier.isPending}
      />
    </>
  );
}
