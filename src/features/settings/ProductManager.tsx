// src/features/settings/ProductManager.tsx

import React, { useState } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Filter } from 'lucide-react';
import { Button, Modal, Input, DataTable, Select } from '../../components/ui';
import { Product, NewProductForm, DataTableColumn, ProductType } from '../../types';
import { useProducts, useCarriers } from '../../hooks';

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'term', label: 'Term Life' },
  { value: 'whole_life', label: 'Whole Life' },
  { value: 'universal_life', label: 'Universal Life' },
  { value: 'indexed_universal_life', label: 'Indexed Universal Life' },
  { value: 'final_expense', label: 'Final Expense' },
  { value: 'accidental', label: 'Accidental Death' },
  { value: 'annuity', label: 'Annuity' },
];

export const ProductManager: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, toggleProductActive } = useProducts();
  const { carriers, activeCarriers } = useCarriers();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>('');

  const [formData, setFormData] = useState<NewProductForm>({
    carrierId: '',
    productName: '',
    productType: 'term',
    isActive: true,
  });

  // Filter products by selected carrier
  const filteredProducts = selectedCarrierId
    ? products.filter(product => product.carrierId === selectedCarrierId)
    : products;

  const resetForm = () => {
    setFormData({
      carrierId: '',
      productName: '',
      productType: 'term',
      isActive: true,
    });
  };

  const handleAddProduct = () => {
    if (formData.productName.trim() && formData.carrierId) {
      addProduct(formData);
      resetForm();
      setShowAddModal(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      carrierId: product.carrierId,
      productName: product.productName,
      productType: product.productType,
      isActive: product.isActive,
    });
    setShowEditModal(true);
  };

  const handleUpdateProduct = () => {
    if (editingProduct && formData.productName.trim() && formData.carrierId) {
      updateProduct(editingProduct.id, {
        carrierId: formData.carrierId,
        productName: formData.productName,
        productType: formData.productType,
        isActive: formData.isActive,
      });
      resetForm();
      setEditingProduct(null);
      setShowEditModal(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      deleteProduct(id);
    }
  };

  const getCarrierName = (carrierId: string) => {
    const carrier = carriers.find(c => c.id === carrierId);
    return carrier?.name || 'Unknown Carrier';
  };

  const getProductTypeLabel = (type: ProductType) => {
    const productType = PRODUCT_TYPES.find(pt => pt.value === type);
    return productType?.label || type;
  };

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'carrier',
      header: 'Carrier',
      sortable: true,
      accessor: (product) => getCarrierName(product.carrierId),
    },
    {
      key: 'productName',
      header: 'Product Name',
      sortable: true,
      accessor: (product) => product.productName,
    },
    {
      key: 'productType',
      header: 'Product Type',
      sortable: true,
      accessor: (product) => getProductTypeLabel(product.productType),
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      width: '24',
      accessor: (product) => (
        <button
          onClick={() => toggleProductActive(product.id)}
          className={`flex items-center space-x-1 px-2 py-1 rounded text-sm font-medium ${
            product.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {product.isActive ? (
            <ToggleRight size={16} className="text-green-600" />
          ) : (
            <ToggleLeft size={16} className="text-red-400" />
          )}
          {product.isActive ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      accessor: (product) => new Date(product.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '32',
      accessor: (product) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditProduct(product)}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="Edit product"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteProduct(product.id)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Delete product"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const renderFormFields = () => {
    return (
      <div className="space-y-4">
        <Select
          label="Carrier"
          value={formData.carrierId}
          onChange={(value) =>
            setFormData((prev: NewProductForm) => ({
              ...prev,
              carrierId: String(value),
            }))
          }
          options={activeCarriers.map(carrier => ({
            value: carrier.id,
            label: carrier.name,
          }))}
          placeholder="Select a carrier"
          required
        />

        <Input
          label="Product Name"
          value={formData.productName}
          onChange={(value) =>
            setFormData((prev: NewProductForm) => ({
              ...prev,
              productName: String(value),
            }))
          }
          placeholder="Enter product name"
          required
        />

        <Select
          label="Product Type"
          value={formData.productType}
          onChange={(value) =>
            setFormData((prev: NewProductForm) => ({
              ...prev,
              productType: value as ProductType,
            }))
          }
          options={PRODUCT_TYPES}
          required
        />

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) =>
              setFormData((prev: NewProductForm) => ({
                ...prev,
                isActive: e.target.checked,
              }))
            }
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Active Product
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="product-manager">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Product Management</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={16} className="mr-2" />
          Add Product
        </Button>
      </div>

      {/* Carrier Filter */}
      <div className="mb-6 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-gray-400" />
          <Select
            label=""
            value={selectedCarrierId}
            onChange={setSelectedCarrierId}
            options={[
              { value: '', label: 'All Carriers' },
              ...activeCarriers.map(carrier => ({
                value: carrier.id,
                label: carrier.name,
              }))
            ]}
            placeholder="Filter by carrier"
          />
        </div>
        {selectedCarrierId && (
          <span className="text-sm text-gray-600">
            Showing {filteredProducts.length} products for {getCarrierName(selectedCarrierId)}
          </span>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={filteredProducts}
          columns={columns}
          emptyMessage={
            selectedCarrierId
              ? "No products found for the selected carrier. Click 'Add Product' to get started."
              : "No products configured yet. Click 'Add Product' to get started."
          }
        />
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add New Product"
        size="md"
      >
        <div className="space-y-4">
          {renderFormFields()}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProduct}
              disabled={!formData.productName.trim() || !formData.carrierId}
            >
              Add Product
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProduct(null);
          resetForm();
        }}
        title="Edit Product"
        size="md"
      >
        <div className="space-y-4">
          {renderFormFields()}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowEditModal(false);
                setEditingProduct(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProduct}
              disabled={!formData.productName.trim() || !formData.carrierId}
            >
              Update Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};