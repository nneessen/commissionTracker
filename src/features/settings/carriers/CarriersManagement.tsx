// src/features/settings/carriers/CarriersManagement.tsx
// Redesigned with zinc palette and compact design patterns

import React, { useState } from 'react';
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
import { Plus, Search, Edit, Trash2, Building2 } from 'lucide-react';
import { useCarriers, Carrier } from './hooks/useCarriers';
import { CarrierForm } from './components/CarrierForm';
import { CarrierDeleteDialog } from './components/CarrierDeleteDialog';
import { NewCarrierForm } from '../../../types/carrier.types';

export function CarriersManagement() {
  const { carriers, isLoading, createCarrier, updateCarrier, deleteCarrier } = useCarriers();

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);

  // Filter carriers based on search
  let filteredCarriers = carriers;

  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    filteredCarriers = carriers.filter(
      (carrier) =>
        carrier.name.toLowerCase().includes(search) ||
        carrier.short_name?.toLowerCase().includes(search)
    );
  }

  // Count products per carrier
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
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-center text-[11px] text-zinc-500 dark:text-zinc-400">
          Loading carriers...
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
            <Building2 className="h-3.5 w-3.5 text-zinc-400" />
            <div>
              <h3 className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                Carriers
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Manage insurance carriers and their information
              </p>
            </div>
          </div>
          <Button size="sm" className="h-6 px-2 text-[10px]" onClick={handleAddCarrier}>
            <Plus className="h-3 w-3 mr-1" />
            New Carrier
          </Button>
        </div>

        <div className="p-3 space-y-2">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search carriers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-[11px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
            />
          </div>

          {/* Table */}
          <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <Table>
              <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/50 z-10">
                <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Carrier Name
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[120px]">
                    Short Name
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[80px]">
                    # Products
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[80px]">
                    Status
                  </TableHead>
                  <TableHead className="h-8 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 w-[80px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCarriers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-6"
                    >
                      {searchTerm
                        ? 'No carriers found matching your search.'
                        : 'No carriers yet. Click "New Carrier" to add one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCarriers.map((carrier) => (
                    <TableRow
                      key={carrier.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50"
                    >
                      <TableCell className="py-1.5">
                        <span className="font-medium text-[11px] text-zinc-900 dark:text-zinc-100">
                          {carrier.name}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {carrier.short_name || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {getProductCount(carrier.id)}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge
                          variant={carrier.is_active ? 'default' : 'secondary'}
                          className="text-[10px] h-4 px-1"
                        >
                          {carrier.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                            onClick={() => handleEditCarrier(carrier)}
                          >
                            <Edit className="h-2.5 w-2.5 mr-0.5" />
                            <span className="text-[10px]">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleDeleteClick(carrier)}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

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
