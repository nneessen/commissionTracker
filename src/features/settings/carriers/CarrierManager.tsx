import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Search, Phone, Mail, Globe, X } from 'lucide-react';
import { Carrier, NewCarrierForm } from '../../../types/carrier.types';
import { carrierService } from '../../../services/settings/carrierService';
import { SettingsCard } from '../components/SettingsComponents';

interface CarrierFormProps {
  carrier?: Carrier | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (carrier: Carrier) => void;
}

const CarrierForm: React.FC<CarrierFormProps> = ({ carrier, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<NewCarrierForm>({
    name: '',
    short_name: '',
    is_active: true,
    default_commission_rates: {},
    contact_info: {},
    notes: ''
  });

  useEffect(() => {
    if (carrier) {
      setFormData({
        name: carrier.name,
        short_name: carrier.short_name || '',
        is_active: carrier.is_active,
        default_commission_rates: carrier.default_commission_rates || {},
        contact_info: carrier.contact_info || {},
        notes: carrier.notes || ''
      });
    } else {
      setFormData({
        name: '',
        short_name: '',
        is_active: true,
        default_commission_rates: {},
        contact_info: {},
        notes: ''
      });
    }
  }, [carrier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (carrier) {
        if (!carrier.id) {
          console.error('Attempting to update carrier without ID:', carrier);
          alert('Cannot update carrier: Missing ID. Please refresh and try again.');
          return;
        }
        const { data: updated, error: updateError } = await carrierService.updateCarrier(carrier.id, formData);
        if (updateError) throw new Error(updateError.message);
        if (updated) onSave(updated);
      } else {
        const { data: created, error: createError } = await carrierService.createCarrier(formData);
        if (createError) throw new Error(createError.message);
        if (created) onSave(created);
      }
      onClose();
    } catch (error) {
      console.error('Error saving carrier:', error);
      alert(`Error saving carrier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            {carrier ? 'Edit Carrier' : 'Add New Carrier'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              color: '#6b7280'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Carrier Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Short Name
            </label>
            <input
              type="text"
              value={formData.short_name}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Email
              </label>
              <input
                type="email"
                value={formData.contact_info?.email || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  contact_info: { ...formData.contact_info, email: e.target.value }
                })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Phone
              </label>
              <input
                type="tel"
                value={formData.contact_info?.phone || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  contact_info: { ...formData.contact_info, phone: e.target.value }
                })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Website
            </label>
            <input
              type="url"
              value={formData.contact_info?.website || ''}
              onChange={(e) => setFormData({
                ...formData,
                contact_info: { ...formData.contact_info, website: e.target.value }
              })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontWeight: '500' }}>Active</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#3b82f6',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {carrier ? 'Update' : 'Create'} Carrier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const CarrierManager: React.FC = () => {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [filteredCarriers, setFilteredCarriers] = useState<Carrier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCarriers();
  }, []);

  useEffect(() => {
    const filtered = carriers.filter(carrier =>
      carrier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (carrier.short_name && carrier.short_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCarriers(filtered);
  }, [carriers, searchTerm]);

  const loadCarriers = async () => {
    try {
      setLoading(true);
      const { data, error } = await carrierService.getAllCarriers();
      if (error) throw new Error(error.message);
      if (data) {
        console.log('Loaded carriers:', data.map(c => ({ id: c.id, name: c.name })));
        setCarriers(data);
      }
    } catch (error) {
      console.error('Error loading carriers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCarrier = () => {
    setSelectedCarrier(null);
    setIsFormOpen(true);
  };

  const handleEditCarrier = (carrier: Carrier) => {
    setSelectedCarrier(carrier);
    setIsFormOpen(true);
  };

  const handleDeleteCarrier = async (carrier: Carrier) => {
    if (window.confirm(`Are you sure you want to delete ${carrier.name}?`)) {
      try {
        await carrierService.deleteCarrier(carrier.id);
        setCarriers(carriers.filter(c => c.id !== carrier.id));
      } catch (error) {
        console.error('Error deleting carrier:', error);
      }
    }
  };

  const handleSaveCarrier = (carrier: Carrier) => {
    if (selectedCarrier) {
      setCarriers(carriers.map(c => c.id === carrier.id ? carrier : c));
    } else {
      setCarriers([...carriers, carrier]);
    }
  };

  if (loading) {
    return (
      <SettingsCard title="Carrier Management" icon={<Building2 size={20} />}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading carriers...</div>
        </div>
      </SettingsCard>
    );
  }

  return (
    <>
      <SettingsCard title="Carrier Management" icon={<Building2 size={20} />}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, marginRight: '16px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6b7280' }} />
            <input
              type="text"
              placeholder="Search carriers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
          <button
            onClick={handleAddCarrier}
            style={{
              padding: '12px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500'
            }}
          >
            <Plus size={16} />
            Add Carrier
          </button>
        </div>

        {filteredCarriers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            {carriers.length === 0 ? 'No carriers found. Add your first carrier!' : 'No carriers match your search.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {filteredCarriers.map((carrier, index) => (
              <div
                key={carrier.id || `carrier-${index}`}
                style={{
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: carrier.is_active ? 'white' : '#f8f9fa'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                        {carrier.name}
                      </h3>
                      {carrier.short_name && (
                        <span style={{
                          fontSize: '12px',
                          padding: '4px 8px',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '4px',
                          color: '#64748b'
                        }}>
                          {carrier.short_name}
                        </span>
                      )}
                      <span style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        backgroundColor: carrier.is_active ? '#dcfce7' : '#fee2e2',
                        color: carrier.is_active ? '#166534' : '#dc2626',
                        borderRadius: '4px',
                        fontWeight: '500'
                      }}>
                        {carrier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {(carrier.contact_info?.email || carrier.contact_info?.phone || carrier.contact_info?.website) && (
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {carrier.contact_info?.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#6b7280' }}>
                            <Mail size={14} />
                            {carrier.contact_info.email}
                          </div>
                        )}
                        {carrier.contact_info?.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#6b7280' }}>
                            <Phone size={14} />
                            {carrier.contact_info.phone}
                          </div>
                        )}
                        {carrier.contact_info?.website && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#6b7280' }}>
                            <Globe size={14} />
                            <a href={carrier.contact_info.website} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                              Website
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {carrier.notes && (
                      <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                        {carrier.notes}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEditCarrier(carrier)}
                      style={{
                        padding: '8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        color: '#6b7280'
                      }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCarrier(carrier)}
                      style={{
                        padding: '8px',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        backgroundColor: '#fef2f2',
                        cursor: 'pointer',
                        color: '#dc2626'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      <CarrierForm
        carrier={selectedCarrier}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveCarrier}
      />
    </>
  );
};