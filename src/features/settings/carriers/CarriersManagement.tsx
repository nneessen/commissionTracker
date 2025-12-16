// src/features/settings/carriers/CarriersManagement.tsx
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
import { Plus, Search, Edit, Trash2, Building2 } from "lucide-react";
import { useCarriers, Carrier } from "./hooks/useCarriers";
import { CarrierForm } from "./components/CarrierForm";
import { CarrierDeleteDialog } from "./components/CarrierDeleteDialog";
import { NewCarrierForm } from "../../../types/carrier.types";

export function CarriersManagement() {
  const { carriers, isLoading, createCarrier, updateCarrier, deleteCarrier } =
    useCarriers();

  const [searchTerm, setSearchTerm] = useState("");
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
        carrier.short_name?.toLowerCase().includes(search),
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
        <CardContent className="p-3">
          <div className="flex items-center justify-center py-4 text-muted-foreground text-[11px]">
            Loading carriers...
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
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                Carriers
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({carriers.length})
              </span>
            </div>
            <Button
              onClick={handleAddCarrier}
              size="sm"
              className="h-6 px-2 text-[10px]"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Carrier
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search carriers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-[11px]"
            />
          </div>

          {/* Table */}
          <div className="rounded border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] h-7">
                    Carrier Name
                  </TableHead>
                  <TableHead className="text-[10px] h-7">Short Name</TableHead>
                  <TableHead className="text-[10px] h-7"># Products</TableHead>
                  <TableHead className="text-[10px] h-7">Status</TableHead>
                  <TableHead className="text-[10px] h-7 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCarriers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-4 text-muted-foreground text-[11px]"
                    >
                      {searchTerm
                        ? "No carriers found matching your search."
                        : 'No carriers yet. Click "New Carrier" to add one.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCarriers.map((carrier) => (
                    <TableRow key={carrier.id}>
                      <TableCell className="text-[11px] font-medium py-1.5">
                        {carrier.name}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground py-1.5">
                        {carrier.short_name || "—"}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground py-1.5">
                        {getProductCount(carrier.id)}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge
                          variant={carrier.is_active ? "default" : "secondary"}
                          className="text-[9px] px-1.5 py-0"
                        >
                          {carrier.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-1.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCarrier(carrier)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(carrier)}
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
