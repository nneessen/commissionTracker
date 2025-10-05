import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { compGuideService } from '@/services/settings/compGuideService';
import { carrierService } from '@/services/settings/carrierService';
import { productService } from '@/services/settings/productService';
import { useCompRates, useCreateCompRate, useUpdateCompRate, useDeleteCompRate } from '@/hooks/comps/useCompRates';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, Search, Save, X } from 'lucide-react';
import type { Database } from '@/types/database.types';

type ProductType = Database['public']['Enums']['product_type'];

interface CommissionGridRow {
  carrierId: string;
  carrierName: string;
  productId: string | null;
  productName: string;
  productType: ProductType | null;
  isActive: boolean;
  rates: Record<number, number>;
}

interface EditingCell {
  rowId: string;
  contractLevel: number;
  value: string;
}

interface EditingName {
  rowId: string;
  field: 'carrier' | 'product';
  value: string;
}

// Contract levels from 80 to 145 in increments of 5
const CONTRACT_LEVELS = Array.from({ length: 14 }, (_, i) => 80 + i * 5);

const PRODUCT_TYPES: ProductType[] = [
  'term_life',
  'whole_life',
  'universal_life',
  'variable_life',
  'health',
  'disability',
  'annuity'
];

export function CommissionManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editingName, setEditingName] = useState<EditingName | null>(null);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRowData, setNewRowData] = useState({
    carrierName: '',
    productName: '',
    productType: 'term_life' as ProductType
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all commission data
  const { data: gridData = [], isLoading, error } = useQuery({
    queryKey: ['commission-grid'],
    queryFn: () => compGuideService.getAllCommissionData(),
  });

  // Mutations
  const createCompRate = useCreateCompRate();
  const updateCompRate = useUpdateCompRate();
  const deleteCompRate = useDeleteCompRate();

  // Mutation for updating carrier name
  const updateCarrier = useMutation({
    mutationFn: ({ carrierId, name }: { carrierId: string; name: string }) =>
      carrierService.updateCarrier(carrierId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-grid'] });
    },
  });

  // Mutation for updating product name
  const updateProduct = useMutation({
    mutationFn: ({ productId, name }: { productId: string; name: string }) =>
      productService.updateProduct(productId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-grid'] });
    },
  });

  // Mutation for creating new carrier with product
  const createCarrierWithProduct = useMutation({
    mutationFn: async (data: typeof newRowData) => {
      // Create carrier first
      const carrierResponse = await carrierService.createCarrier({
        name: data.carrierName,
        is_active: true
      });

      if (!carrierResponse || !carrierResponse.data) {
        throw new Error('Failed to create carrier');
      }

      // Create product
      const product = await productService.createProduct({
        carrier_id: carrierResponse.data.id,
        name: data.productName,
        product_type: data.productType,
        is_active: true
      });

      return { carrier: carrierResponse.data, product };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-grid'] });
      setShowAddRow(false);
      setNewRowData({ carrierName: '', productName: '', productType: 'term_life' });
    },
  });

  // Filter data based on search
  const filteredData = gridData.filter(row =>
    row.carrierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle commission rate edit
  const handleRateEdit = useCallback(
    async (rowId: string, contractLevel: number, value: string) => {
      const row = gridData.find(r =>
        `${r.carrierId}-${r.productId || 'default'}` === rowId
      );

      if (!row) return;

      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        setEditingCell(null);
        return;
      }

      try {
        const existingRate = row.rates[contractLevel];

        if (existingRate !== undefined) {
          // Update existing rate
          await updateCompRate.mutateAsync({
            id: '', // We need to find the actual ID
            updates: {
              commission_percentage: numValue / 100,
              contract_level: contractLevel,
              carrier_id: row.carrierId,
              product_id: row.productId
            }
          });
        } else {
          // Create new rate
          await createCompRate.mutateAsync({
            carrier_id: row.carrierId,
            product_id: row.productId,
            product_type: row.productType || 'term_life',
            contract_level: contractLevel,
            commission_percentage: numValue / 100,
            effective_date: new Date().toISOString().split('T')[0]
          });
        }

        queryClient.invalidateQueries({ queryKey: ['commission-grid'] });
      } catch (error) {
        console.error('Error updating rate:', error);
      } finally {
        setEditingCell(null);
      }
    },
    [gridData, createCompRate, updateCompRate, queryClient]
  );

  // Handle name edits
  const handleNameEdit = useCallback(
    async (rowId: string, field: 'carrier' | 'product', value: string) => {
      const row = gridData.find(r =>
        `${r.carrierId}-${r.productId || 'default'}` === rowId
      );

      if (!row || !value.trim()) {
        setEditingName(null);
        return;
      }

      try {
        if (field === 'carrier') {
          await updateCarrier.mutateAsync({ carrierId: row.carrierId, name: value });
        } else if (field === 'product' && row.productId) {
          await updateProduct.mutateAsync({ productId: row.productId, name: value });
        }
      } catch (error) {
        console.error(`Error updating ${field}:`, error);
      } finally {
        setEditingName(null);
      }
    },
    [gridData, updateCarrier, updateProduct]
  );

  // Handle keyboard navigation in cells
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowId: string, contractLevel: number) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (editingCell) {
          handleRateEdit(editingCell.rowId, editingCell.contractLevel, editingCell.value);
        }
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      }
    },
    [editingCell, handleRateEdit]
  );

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell || editingName) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingCell, editingName]);

  // Handle adding new row
  const handleAddRow = async () => {
    if (!newRowData.carrierName.trim() || !newRowData.productName.trim()) {
      return;
    }

    await createCarrierWithProduct.mutateAsync(newRowData);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading commission data...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-500">Error loading commission data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Management</CardTitle>
        <CardDescription>
          Manage all carrier products and commission rates in one place
        </CardDescription>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search carriers or products..."
              value={searchTerm}
              onChange={(value) => setSearchTerm(String(value))}
              className="pl-9"
            />
          </div>
          <Button
            onClick={() => setShowAddRow(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px] sticky left-0 bg-background">Carrier</TableHead>
                <TableHead className="w-[200px]">Product</TableHead>
                {CONTRACT_LEVELS.map(level => (
                  <TableHead key={level} className="w-[80px] text-center">
                    {level}%
                  </TableHead>
                ))}
                <TableHead className="w-[80px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => {
                const rowId = `${row.carrierId}-${row.productId || 'default'}`;

                return (
                  <TableRow key={rowId}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {editingName?.rowId === rowId && editingName.field === 'carrier' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editingName.value}
                          onChange={(e) => setEditingName({ ...editingName, value: e.target.value })}
                          onBlur={() => handleNameEdit(rowId, 'carrier', editingName.value)}
                          onKeyDown={(e: React.KeyboardEvent) => {
                            if (e.key === 'Enter') handleNameEdit(rowId, 'carrier', editingName.value);
                            if (e.key === 'Escape') setEditingName(null);
                          }}
                          className="h-8 w-full px-2 border rounded"
                        />
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                          onClick={() => setEditingName({ rowId, field: 'carrier', value: row.carrierName })}
                        >
                          {row.carrierName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingName?.rowId === rowId && editingName.field === 'product' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editingName.value}
                          onChange={(e) => setEditingName({ ...editingName, value: e.target.value })}
                          onBlur={() => handleNameEdit(rowId, 'product', editingName.value)}
                          onKeyDown={(e: React.KeyboardEvent) => {
                            if (e.key === 'Enter') handleNameEdit(rowId, 'product', editingName.value);
                            if (e.key === 'Escape') setEditingName(null);
                          }}
                          className="h-8 w-full px-2 border rounded"
                        />
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                          onClick={() => setEditingName({ rowId, field: 'product', value: row.productName })}
                        >
                          {row.productName}
                          {row.productType && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({row.productType.replace('_', ' ')})
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    {CONTRACT_LEVELS.map(level => {
                      const rate = row.rates[level];
                      const cellId = `${rowId}-${level}`;
                      const isEditing = editingCell?.rowId === rowId && editingCell?.contractLevel === level;

                      return (
                        <TableCell
                          key={level}
                          className={`text-center p-1 ${!rate ? 'bg-red-50' : 'bg-green-50'}`}
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onBlur={() => handleRateEdit(rowId, level, editingCell.value)}
                              onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e, rowId, level)}
                              className="h-8 w-full text-center px-2 border rounded"
                            />
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded"
                              onClick={() => setEditingCell({
                                rowId,
                                contractLevel: level,
                                value: rate ? (rate * 100).toString() : ''
                              })}
                            >
                              {rate ? `${(rate * 100).toFixed(1)}%` : '-'}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // Handle row deletion
                          console.log('Delete row:', rowId);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Add new row */}
              {showAddRow && (
                <TableRow>
                  <TableCell className="sticky left-0 bg-background">
                    <Input
                      type="text"
                      placeholder="Carrier name"
                      value={newRowData.carrierName}
                      onChange={(value) => setNewRowData({ ...newRowData, carrierName: String(value) })}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Product name"
                        value={newRowData.productName}
                        onChange={(value) => setNewRowData({ ...newRowData, productName: String(value) })}
                        className="h-8 flex-1"
                      />
                      <select
                        value={newRowData.productType}
                        onChange={(e) => setNewRowData({ ...newRowData, productType: e.target.value as ProductType })}
                        className="h-8 px-2 border rounded"
                      >
                        {PRODUCT_TYPES.map(type => (
                          <option key={type} value={type}>
                            {type.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </TableCell>
                  {CONTRACT_LEVELS.map(level => (
                    <TableCell key={level} className="text-center text-muted-foreground">
                      -
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleAddRow}
                        disabled={!newRowData.carrierName.trim() || !newRowData.productName.trim()}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowAddRow(false);
                          setNewRowData({ carrierName: '', productName: '', productType: 'term_life' });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {filteredData.length === 0 && !showAddRow && (
          <div className="text-center py-8 text-muted-foreground">
            No commission data found. Click "Add Product" to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}