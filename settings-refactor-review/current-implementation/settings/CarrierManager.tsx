// src/features/settings/CarrierManager.tsx

import React, { useState } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button, Modal, Input, DataTable } from '../../components/ui';
import { Carrier, NewCarrierForm, DataTableColumn } from '../../types';
import { useCarriers } from '../../hooks';

export const CarrierManager: React.FC = () => {
  const {
    carriers,
    addCarrier,
    updateCarrier,
    deleteCarrier,
    toggleCarrierActive,
  } = useCarriers();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);

  const [formData, setFormData] = useState<NewCarrierForm>({
    name: '',
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      isActive: true,
    });
  };

  const handleAddCarrier = () => {
    if (formData.name.trim()) {
      addCarrier(formData);
      resetForm();
      setShowAddModal(false);
    }
  };

  const handleEditCarrier = (carrier: Carrier) => {
    setEditingCarrier(carrier);
    setFormData({
      name: carrier.name,
      isActive: carrier.isActive,
    });
    setShowEditModal(true);
  };

  const handleUpdateCarrier = () => {
    if (editingCarrier && formData.name.trim()) {
      updateCarrier(editingCarrier.id, {
        name: formData.name,
        isActive: formData.isActive,
      });
      resetForm();
      setEditingCarrier(null);
      setShowEditModal(false);
    }
  };

  const handleDeleteCarrier = (id: string) => {
    if (window.confirm('Are you sure you want to delete this carrier? This action cannot be undone.')) {
      deleteCarrier(id);
    }
  };

  const columns: DataTableColumn<Carrier>[] = [
    {
      key: 'name',
      header: 'Carrier Name',
      sortable: true,
      accessor: (carrier) => carrier.name,
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      width: '24',
      accessor: (carrier) => (
        <button
          onClick={() => toggleCarrierActive(carrier.id)}
          className={`flex items-center space-x-1 px-2 py-1 rounded text-sm font-medium ${
            carrier.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {carrier.isActive ? (
            <ToggleRight size={16} className="text-green-600" />
          ) : (
            <ToggleLeft size={16} className="text-red-400" />
          )}
          {carrier.isActive ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      accessor: (carrier) => new Date(carrier.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '32',
      accessor: (carrier) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditCarrier(carrier)}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="Edit carrier"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteCarrier(carrier.id)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Delete carrier"
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
        <Input
          label="Carrier Name"
          value={formData.name}
          onChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              name: value,
            }))
          }
          placeholder="Enter carrier name"
          required
        />

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                isActive: e.target.checked,
              }))
            }
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Active Carrier
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="carrier-manager">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Carrier Management</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={16} className="mr-2" />
          Add Carrier
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={carriers}
          columns={columns}
          emptyMessage="No carriers configured yet. Click 'Add Carrier' to get started."
        />
      </div>

      {/* Add Carrier Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add New Carrier"
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
              onClick={handleAddCarrier}
              disabled={!formData.name.trim()}
            >
              Add Carrier
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Carrier Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCarrier(null);
          resetForm();
        }}
        title="Edit Carrier"
        size="md"
      >
        <div className="space-y-4">
          {renderFormFields()}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowEditModal(false);
                setEditingCarrier(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCarrier}
              disabled={!formData.name.trim()}
            >
              Update Carrier
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};