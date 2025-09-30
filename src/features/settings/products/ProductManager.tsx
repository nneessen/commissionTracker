// /home/nneessen/projects/commissionTracker/src/features/settings/products/ProductManager.tsx

import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Search, Filter, Download, Upload, X, Calendar } from 'lucide-react';
import { CompGuideEntry, NewCompGuideForm, CompGuideFilters } from '../../../types/compGuide.types';
import { Database } from '../../../types/database.types';
import { Carrier } from '../../../types/carrier.types';
import { compGuideService } from '../../../services/settings/compGuideService';
import { carrierService } from '../../../services/settings/carrierService';
import { SettingsCard } from '../components/SettingsComponents';

interface ProductFormProps {
  entry?: CompGuideEntry | null;
  carriers: Carrier[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: CompGuideEntry) => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ entry, carriers, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<NewCompGuideForm>({
    carrier_id: '',
    product_type: 'term_life' as Database["public"]["Enums"]["product_type"],
    comp_level: 'street' as Database["public"]["Enums"]["comp_level"],
    commission_percentage: 0,
    bonus_percentage: 0,
    effective_date: new Date().toISOString().split('T')[0],
    minimum_premium: 0,
    maximum_premium: 0
  });

  // Available enum values
  const productTypes: Database["public"]["Enums"]["product_type"][] = [
    'term_life', 'whole_life', 'universal_life', 'variable_life',
    'health', 'disability', 'annuity', 'other'
  ];

  const compLevels: Database["public"]["Enums"]["comp_level"][] = [
    'street', 'release', 'enhanced', 'premium'
  ];

  useEffect(() => {
    if (entry) {
      setFormData({
        carrier_id: entry.carrier_id,
        product_type: entry.product_type,
        comp_level: entry.comp_level,
        commission_percentage: entry.commission_percentage,
        bonus_percentage: entry.bonus_percentage || 0,
        effective_date: entry.effective_date,
        expiration_date: entry.expiration_date,
        minimum_premium: entry.minimum_premium || 0,
        maximum_premium: entry.maximum_premium || 0
      });
    } else {
      setFormData({
        carrier_id: '',
        product_type: 'term_life',
        comp_level: 'street',
        commission_percentage: 0,
        bonus_percentage: 0,
        effective_date: new Date().toISOString().split('T')[0],
        minimum_premium: 0,
        maximum_premium: 0
      });
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (entry) {
        const { data: updated, error: updateError } = await compGuideService.updateEntry(entry.id, formData);
        if (updateError) throw new Error(updateError.message);
        if (updated) onSave(updated);
      } else {
        const { data: created, error: createError } = await compGuideService.createEntry(formData);
        if (createError) throw new Error(createError.message);
        if (created) onSave(created);
      }
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
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
        width: '700px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            {entry ? 'Edit Product' : 'Add New Product'}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Carrier *
              </label>
              <select
                value={formData.carrier_id}
                onChange={(e) => setFormData({ ...formData, carrier_id: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select a carrier</option>
                {carriers.filter(c => c.is_active).map((carrier) => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Product Type *
              </label>
              <select
                value={formData.product_type}
                onChange={(e) => setFormData({ ...formData, product_type: e.target.value as Database["public"]["Enums"]["product_type"] })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                {productTypes.map(type => (
                  <option key={type} value={type}>
                    {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Comp Level *
              </label>
              <select
                value={formData.comp_level}
                onChange={(e) => setFormData({ ...formData, comp_level: e.target.value as Database["public"]["Enums"]["comp_level"] })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                {compLevels.map(level => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Commission % *
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="999.999"
                value={formData.commission_percentage}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setFormData({ ...formData, commission_percentage: isNaN(val) ? 0 : val });
                }}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Bonus %
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={formData.bonus_percentage || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : undefined;
                  setFormData({ ...formData, bonus_percentage: val !== undefined && !isNaN(val) ? val : undefined });
                }}
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
                Effective Date *
              </label>
              <input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Minimum Premium
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.minimum_premium || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : undefined;
                  setFormData({ ...formData, minimum_premium: val !== undefined && !isNaN(val) ? val : undefined });
                }}
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
                Maximum Premium
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.maximum_premium || ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : undefined;
                  setFormData({ ...formData, maximum_premium: val !== undefined && !isNaN(val) ? val : undefined });
                }}
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
              Expiration Date
            </label>
            <input
              type="date"
              value={formData.expiration_date || ''}
              onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value || undefined })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
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
              {entry ? 'Update' : 'Create'} Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ProductManager: React.FC = () => {
  const [entries, setEntries] = useState<CompGuideEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<CompGuideEntry[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<CompGuideFilters>({});
  const [selectedEntry, setSelectedEntry] = useState<CompGuideEntry | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const productTypes: Database["public"]["Enums"]["product_type"][] = [
    'term_life', 'whole_life', 'universal_life', 'variable_life',
    'health', 'disability', 'annuity', 'other'
  ];

  const compLevels: Database["public"]["Enums"]["comp_level"][] = [
    'street', 'release', 'enhanced', 'premium'
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, searchTerm, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesResult, carriersResult] = await Promise.all([
        compGuideService.getAllEntries(),
        carrierService.getAllCarriers()
      ]);

      if (entriesResult.error) throw new Error(entriesResult.error.message);
      if (carriersResult.error) throw new Error(carriersResult.error.message);

      if (entriesResult.data) setEntries(entriesResult.data);
      if (carriersResult.data) setCarriers(carriersResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = entries.filter(entry => {
      const matchesSearch =
        entry.product_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        carriers.find(c => c.id === entry.carrier_id)?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCarrier = !filters.carrier_id || entry.carrier_id === filters.carrier_id;
      const matchesProduct = !filters.product_type || entry.product_type === filters.product_type;
      const matchesLevel = !filters.comp_level || entry.comp_level === filters.comp_level;

      return matchesSearch && matchesCarrier && matchesProduct && matchesLevel;
    });

    setFilteredEntries(filtered);
  };

  const handleAddProduct = () => {
    setSelectedEntry(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (entry: CompGuideEntry) => {
    setSelectedEntry(entry);
    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (entry: CompGuideEntry) => {
    const carrierName = carriers.find(c => c.id === entry.carrier_id)?.name || 'Unknown';
    const productName = entry.product_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    if (window.confirm(`Are you sure you want to delete ${productName} for ${carrierName}?`)) {
      try {
        await compGuideService.deleteEntry(entry.id);
        setEntries(entries.filter(e => e.id !== entry.id));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleSaveProduct = (entry: CompGuideEntry) => {
    if (selectedEntry) {
      setEntries(entries.map(e => e.id === entry.id ? entry : e));
    } else {
      setEntries([...entries, entry]);
    }
  };

  const formatPercentage = (value?: number | string) => {
    if (value === undefined || value === null || value === '') return '-';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '-';
    return `${numValue.toFixed(3)}%`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getCarrierName = (carrierId: string) => {
    return carriers.find(c => c.id === carrierId)?.name || 'Unknown';
  };

  const formatProductType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatCompLevel = (level: string) => {
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  if (loading) {
    return (
      <SettingsCard title="Product/Commission Guide" icon={<Package size={20} />}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading products...</div>
        </div>
      </SettingsCard>
    );
  }

  return (
    <>
      <SettingsCard title="Product/Commission Guide" icon={<Package size={20} />}>
        {/* Header Controls */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6b7280' }} />
                <input
                  type="text"
                  placeholder="Search products or carriers..."
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
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: showFilters ? '#f8f9fa' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Filter size={16} />
                Filters
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Upload size={16} />
                Import
              </button>
              <button
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Download size={16} />
                Export
              </button>
              <button
                onClick={handleAddProduct}
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
                Add Product
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div style={{
              padding: '16px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#f8f9fa',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
                  Carrier
                </label>
                <select
                  value={filters.carrier_id || ''}
                  onChange={(e) => setFilters({ ...filters, carrier_id: e.target.value || undefined })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">All Carriers</option>
                  {carriers.map((carrier) => (
                    <option key={carrier.id} value={carrier.id}>
                      {carrier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
                  Product Type
                </label>
                <select
                  value={filters.product_type || ''}
                  onChange={(e) => setFilters({ ...filters, product_type: e.target.value as Database["public"]["Enums"]["product_type"] || undefined })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">All Products</option>
                  {productTypes.map(type => (
                    <option key={type} value={type}>
                      {formatProductType(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>
                  Comp Level
                </label>
                <select
                  value={filters.comp_level || ''}
                  onChange={(e) => setFilters({ ...filters, comp_level: e.target.value as Database["public"]["Enums"]["comp_level"] || undefined })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">All Levels</option>
                  {compLevels.map(level => (
                    <option key={level} value={level}>
                      {formatCompLevel(level)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button
                  onClick={() => setFilters({})}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Products Table */}
        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            {entries.length === 0 ? 'No products found. Add your first product!' : 'No products match your search criteria.'}
          </div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                    Carrier
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                    Product
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                    Level
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                    Commission
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                    Bonus
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                    Effective
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                    Premium Range
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, index) => (
                  <tr key={entry.id || `entry-${index}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500' }}>{getCarrierName(entry.carrier_id)}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500' }}>{formatProductType(entry.product_type)}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {formatCompLevel(entry.comp_level)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>
                      {formatPercentage(entry.commission_percentage)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {formatPercentage(entry.bonus_percentage)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                      {formatDate(entry.effective_date)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px' }}>
                      {entry.minimum_premium || entry.maximum_premium ? (
                        `$${entry.minimum_premium || 0} - $${entry.maximum_premium || '∞'}`
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleEditProduct(entry)}
                          style={{
                            padding: '6px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            color: '#6b7280'
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(entry)}
                          style={{
                            padding: '6px',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            backgroundColor: '#fef2f2',
                            cursor: 'pointer',
                            color: '#dc2626'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {filteredEntries.length > 0 && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Showing {filteredEntries.length} of {entries.length} products
          </div>
        )}
      </SettingsCard>

      <ProductForm
        entry={selectedEntry}
        carriers={carriers}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveProduct}
      />
    </>
  );
};