import React, { useState, useEffect } from 'react';
import { Upload, X, Check, AlertCircle, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
      <div
        className="bg-card rounded-xl p-6 max-h-[80vh] overflow-auto shadow-2xl"
        style={{
          width: step === 'preview' ? '800px' : '600px',
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="m-0 text-2xl font-semibold">
            Import FFG Commission Guide
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <X size={20} />
          </Button>
        </div>

        {step === 'preview' && (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">
                Select Carriers to Import
              </h3>
              <p className="text-muted-foreground mb-4">
                Choose which carriers from the FFG Comp Guide you want to import. This will import all products and contract levels for the selected carriers.
              </p>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3">
                {ffgCarriers.map(carrier => (
                  <label
                    key={carrier}
                    className={cn(
                      "flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer",
                      selectedCarriers.includes(carrier) ? "bg-blue-50" : "bg-card"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCarriers.includes(carrier)}
                      onChange={() => handleCarrierToggle(carrier)}
                    />
                    <span className="font-medium">{carrier}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {getProductsByCarrier(carrier).length} products
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg mb-6">
              <h4 className="m-0 mb-3 text-base font-semibold">Import Summary</h4>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                <div>
                  <span className="text-sm text-muted-foreground">Total Records</span>
                  <div className="text-xl font-semibold">{summary.totalRecords}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Carriers</span>
                  <div className="text-xl font-semibold">{selectedCarriers.length}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Products</span>
                  <div className="text-xl font-semibold">{summary.productsToImport}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Contract Levels</span>
                  <div className="text-xl font-semibold">
                    {summary.contractLevels.length} ({summary.contractLevels[0]}-{summary.contractLevels[summary.contractLevels.length - 1]})
                  </div>
                </div>
              </div>

              {summary.carriersToCreate.length > 0 && (
                <div className="mt-3 p-2 bg-yellow-100 rounded-md">
                  <div className="text-sm font-medium text-yellow-900">
                    New carriers to be created: {summary.carriersToCreate.join(', ')}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3">
              <Button
                onClick={exportData}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Export CSV
              </Button>

              <div className="flex gap-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={proceedToMapping}
                  disabled={selectedCarriers.length === 0}
                >
                  Continue Import
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'mapping' && (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">
                Carrier Mapping
              </h3>
              <p className="text-muted-foreground mb-4">
                Confirm how carriers should be handled during import.
              </p>

              <div className="grid gap-3">
                {selectedCarriers.map(carrier => {
                  const existingCarrier = existingCarriers.find(c => c.name === carrier);
                  return (
                    <div
                      key={carrier}
                      className="p-3 border border-border rounded-lg flex justify-between items-center"
                    >
                      <span className="font-medium">{carrier}</span>
                      <span className={cn(
                        "text-sm px-2 py-1 rounded",
                        existingCarrier
                          ? "bg-green-100 text-green-900"
                          : "bg-yellow-100 text-yellow-900"
                      )}>
                        {existingCarrier ? 'Map to existing' : 'Create new'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setStep('preview')}
                variant="outline"
              >
                Back
              </Button>
              <Button
                onClick={startImport}
              >
                Start Import
              </Button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <div className="text-center p-10">
            <Upload size={48} className="mb-4 text-info inline-block" />
            <h3 className="text-lg font-semibold mb-2">
              Importing Commission Data...
            </h3>
            <p className="text-muted-foreground mb-6">
              Please wait while we import the commission guide data.
            </p>

            <div className="w-full h-2 bg-muted rounded overflow-hidden mb-2">
              <div
                className="h-full bg-info transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
        )}

        {step === 'complete' && (
          <>
            <div className="text-center mb-6">
              {importResults.success > 0 ? (
                <Check size={48} className="text-success mb-4 inline-block" />
              ) : (
                <AlertCircle size={48} className="text-error mb-4 inline-block" />
              )}

              <h3 className="text-lg font-semibold mb-2">
                {importResults.success > 0 ? 'Import Completed' : 'Import Failed'}
              </h3>
            </div>

            <div className="p-4 bg-muted rounded-lg mb-6">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
                <div>
                  <span className="text-sm text-muted-foreground">Imported</span>
                  <div className="text-xl font-semibold text-success">
                    {importResults.success}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Errors</span>
                  <div className="text-xl font-semibold text-error">
                    {importResults.errors.length}
                  </div>
                </div>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="max-h-[200px] overflow-auto p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
                <h4 className="text-sm font-semibold text-error mb-2">
                  Import Errors:
                </h4>
                {importResults.errors.map((error, index) => (
                  <div key={index} className="text-xs text-error mb-1">
                    {error}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};