import React, { useState, useEffect } from 'react';
import { Upload, X, Check, AlertCircle, Download, Eye } from 'lucide-react';
import { FFG_COMP_GUIDE_DATA, getUniqueCarriers, getProductsByCarrier } from '../data/ffgCompGuideData';
import { Carrier } from '../../../types/carrier.types';
import { Comp, CreateCompData } from '../../../types/comp.types';
import { Database } from '../../../types/database.types';
import { carrierService } from '../../../services/settings/carrierService';
import { compGuideService } from '../../../services/settings/compGuideService';

interface CompGuideImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (importedEntries: Comp[]) => void;
  existingCarriers: Carrier[];
}

interface ImportSummary {
  totalRecords: number;
  carriersToCreate: string[];
  existingCarriers: string[];
  productsToImport: number;
  contractLevels: number[];
}

export const CompGuideImporter: React.FC<CompGuideImporterProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingCarriers
}) => {
  const [step, setStep] = useState<'preview' | 'mapping' | 'importing' | 'complete'>('preview');
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [carrierMapping, setCarrierMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
    imported: Comp[];
  }>({ success: 0, errors: [], imported: [] });

  const ffgCarriers = getUniqueCarriers();

  useEffect(() => {
    if (isOpen) {
      setStep('preview');
      setSelectedCarriers(ffgCarriers);
      setProgress(0);
      setImportResults({ success: 0, errors: [], imported: [] });
    }
  }, [isOpen]);

  const getImportSummary = (): ImportSummary => {
    const filteredData = FFG_COMP_GUIDE_DATA.filter(item =>
      selectedCarriers.includes(item.carrier)
    );

    const carriersToCreate = selectedCarriers.filter(carrier =>
      !existingCarriers.some(existing => existing.name === carrier)
    );

    const existingCarrierNames = selectedCarriers.filter(carrier =>
      existingCarriers.some(existing => existing.name === carrier)
    );

    return {
      totalRecords: filteredData.length,
      carriersToCreate,
      existingCarriers: existingCarrierNames,
      productsToImport: [...new Set(filteredData.map(item => item.product))].length,
      contractLevels: [...new Set(filteredData.map(item => item.contractLevel))]
    };
  };

  const handleCarrierToggle = (carrier: string) => {
    setSelectedCarriers(prev =>
      prev.includes(carrier)
        ? prev.filter(c => c !== carrier)
        : [...prev, carrier]
    );
  };

  const proceedToMapping = () => {
    const summary = getImportSummary();

    // Initialize carrier mapping for carriers that need to be created
    const newMapping: Record<string, string> = {};
    summary.carriersToCreate.forEach(carrier => {
      newMapping[carrier] = 'create-new';
    });
    summary.existingCarriers.forEach(carrier => {
      const existing = existingCarriers.find(c => c.name === carrier);
      if (existing) {
        newMapping[carrier] = existing.id;
      }
    });

    setCarrierMapping(newMapping);
    setStep('mapping');
  };

  const startImport = async () => {
    setStep('importing');
    setImporting(true);
    setProgress(0);

    const filteredData = FFG_COMP_GUIDE_DATA.filter(item =>
      selectedCarriers.includes(item.carrier)
    );

    const errors: string[] = [];
    const imported: Comp[] = [];
    let processed = 0;

    try {
      // First, create any new carriers
      const carriersToCreate = Object.entries(carrierMapping)
        .filter(([_, mapping]) => mapping === 'create-new')
        .map(([carrier, _]) => carrier);

      const newCarrierIds: Record<string, string> = {};

      for (const carrierName of carriersToCreate) {
        try {
          const { data: newCarrier, error } = await carrierService.createCarrier({
            name: carrierName,
            short_name: carrierName,
            is_active: true,
            default_commission_rates: {},
            contact_info: {}
          });
          if (error) throw new Error(error.message);
          if (newCarrier) {
            newCarrierIds[carrierName] = newCarrier.id;
          }
        } catch (error) {
          errors.push(`Failed to create carrier ${carrierName}: ${error}`);
        }
      }

      // Update carrier mapping with new IDs
      const finalCarrierMapping = { ...carrierMapping };
      Object.entries(newCarrierIds).forEach(([name, id]) => {
        finalCarrierMapping[name] = id;
      });

      // Import products in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < filteredData.length; i += batchSize) {
        const batch = filteredData.slice(i, i + batchSize);

        await Promise.all(batch.map(async (item) => {
          try {
            const carrierId = finalCarrierMapping[item.carrier];
            if (!carrierId || carrierId === 'create-new') {
              throw new Error(`No carrier ID found for ${item.carrier}`);
            }

            // Map the product type from FFG data to database enum
            const mapProductType = (product: string): Database["public"]["Enums"]["product_type"] => {
              const productMap: Record<string, Database["public"]["Enums"]["product_type"]> = {
                'Term Life': 'term_life',
                'Whole Life': 'whole_life',
                'Universal Life': 'universal_life',
                'Variable Life': 'variable_life',
                'Health': 'health',
                'Disability': 'disability',
                'Annuity': 'annuity'
              };
              return productMap[product] || 'other';
            };

            const formData: CreateCompData = {
              carrier_id: carrierId,
              product_type: mapProductType(item.product),
              contract_level: item.contractLevel, // Use contract level directly as number
              commission_percentage: item.commissionRate,
              bonus_percentage: 0,
              effective_date: new Date(item.effectiveDate).toISOString().split('T')[0],
              minimum_premium: 0,
              maximum_premium: 0
            };

            const { data: created, error: createError } = await compGuideService.createEntry(formData);
            if (createError) throw new Error(createError.message);
            if (created) {
              imported.push(created);
            }
          } catch (error) {
            errors.push(`Failed to import ${item.carrier} - ${item.product} (${item.contractLevel}): ${error}`);
          }
        }));

        processed += batch.length;
        setProgress((processed / filteredData.length) * 100);
      }

    } catch (error) {
      errors.push(`Import failed: ${error}`);
    }

    setImportResults({
      success: imported.length,
      errors,
      imported
    });

    setImporting(false);
    setStep('complete');

    if (imported.length > 0) {
      onImportComplete(imported);
    }
  };

  const exportData = () => {
    const filteredData = FFG_COMP_GUIDE_DATA.filter(item =>
      selectedCarriers.includes(item.carrier)
    );

    const csvContent = [
      'Carrier,Product,Contract Level,Commission Rate,Effective Date',
      ...filteredData.map(item =>
        `"${item.carrier}","${item.product}",${item.contractLevel},${item.commissionRate},"${item.effectiveDate}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ffg-comp-guide-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const summary = getImportSummary();

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
        width: step === 'preview' ? '800px' : '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            Import FFG Commission Guide
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {step === 'preview' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
                Select Carriers to Import
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                Choose which carriers from the FFG Comp Guide you want to import. This will import all products and contract levels for the selected carriers.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                {ffgCarriers.map(carrier => (
                  <label key={carrier} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedCarriers.includes(carrier) ? '#f0f9ff' : 'white'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedCarriers.includes(carrier)}
                      onChange={() => handleCarrierToggle(carrier)}
                    />
                    <span style={{ fontWeight: '500' }}>{carrier}</span>
                    <span style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginLeft: 'auto'
                    }}>
                      {getProductsByCarrier(carrier).length} products
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>Import Summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Total Records</span>
                  <div style={{ fontSize: '20px', fontWeight: '600' }}>{summary.totalRecords}</div>
                </div>
                <div>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Carriers</span>
                  <div style={{ fontSize: '20px', fontWeight: '600' }}>{selectedCarriers.length}</div>
                </div>
                <div>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Products</span>
                  <div style={{ fontSize: '20px', fontWeight: '600' }}>{summary.productsToImport}</div>
                </div>
                <div>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Contract Levels</span>
                  <div style={{ fontSize: '20px', fontWeight: '600' }}>
                    {summary.contractLevels.length} ({summary.contractLevels[0]}-{summary.contractLevels[summary.contractLevels.length - 1]})
                  </div>
                </div>
              </div>

              {summary.carriersToCreate.length > 0 && (
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '6px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#92400e' }}>
                    New carriers to be created: {summary.carriersToCreate.join(', ')}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <button
                onClick={exportData}
                style={{
                  padding: '12px 20px',
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
                Export CSV
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={proceedToMapping}
                  disabled={selectedCarriers.length === 0}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: selectedCarriers.length > 0 ? '#3b82f6' : '#e2e8f0',
                    color: selectedCarriers.length > 0 ? 'white' : '#6b7280',
                    cursor: selectedCarriers.length > 0 ? 'pointer' : 'not-allowed',
                    fontWeight: '500'
                  }}
                >
                  Continue Import
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'mapping' && (
          <>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
                Carrier Mapping
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                Confirm how carriers should be handled during import.
              </p>

              <div style={{ display: 'grid', gap: '12px' }}>
                {selectedCarriers.map(carrier => {
                  const existingCarrier = existingCarriers.find(c => c.name === carrier);
                  return (
                    <div key={carrier} style={{
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '500' }}>{carrier}</span>
                      <span style={{
                        fontSize: '14px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: existingCarrier ? '#dcfce7' : '#fef3c7',
                        color: existingCarrier ? '#166534' : '#92400e'
                      }}>
                        {existingCarrier ? 'Map to existing' : 'Create new'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setStep('preview')}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Back
              </button>
              <button
                onClick={startImport}
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
                Start Import
              </button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Upload size={48} style={{ marginBottom: '16px', color: '#3b82f6' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              Importing Commission Data...
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              Please wait while we import the commission guide data.
            </p>

            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#f1f5f9',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease'
              }} />
            </div>

            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {Math.round(progress)}% complete
            </span>
          </div>
        )}

        {step === 'complete' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              {importResults.success > 0 ? (
                <Check size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
              ) : (
                <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
              )}

              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                {importResults.success > 0 ? 'Import Completed' : 'Import Failed'}
              </h3>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Imported</span>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#10b981' }}>
                    {importResults.success}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Errors</span>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444' }}>
                    {importResults.errors.length}
                  </div>
                </div>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div style={{
                maxHeight: '200px',
                overflow: 'auto',
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>
                  Import Errors:
                </h4>
                {importResults.errors.map((error, index) => (
                  <div key={index} style={{ fontSize: '12px', color: '#dc2626', marginBottom: '4px' }}>
                    {error}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
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
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};