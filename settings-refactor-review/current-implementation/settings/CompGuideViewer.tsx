// src/features/settings/CompGuideViewer.tsx

import React, { useState, useMemo } from 'react';
import { Download, FileText, FileSpreadsheet, Table, Search, Filter } from 'lucide-react';
import { Button, Input, Select, DataTable } from '../../components/ui';
import { DataTableColumn, ProductType } from '../../types';
import { PDF_COMMISSION_DATA } from '../../data/compGuideData';
import { CONTRACT_LEVELS } from '../../types/product.types';

interface CommissionRateDisplay {
  id: string;
  carrierName: string;
  productName: string;
  productType: ProductType;
  contractLevel: number;
  percentage: number;
}

const PRODUCT_TYPE_OPTIONS = [
  { value: '', label: 'All Product Types' },
  { value: 'term', label: 'Term Life' },
  { value: 'whole_life', label: 'Whole Life' },
  { value: 'universal_life', label: 'Universal Life' },
  { value: 'indexed_universal_life', label: 'Indexed Universal Life' },
  { value: 'final_expense', label: 'Final Expense' },
  { value: 'accidental', label: 'Accidental Death' },
  { value: 'annuity', label: 'Annuity' },
];

const CONTRACT_LEVEL_OPTIONS = [
  { value: '', label: 'All Contract Levels' },
  ...CONTRACT_LEVELS.map(level => ({
    value: level.toString(),
    label: `${level}%`
  }))
];

export const CompGuideViewer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');
  const [selectedContractLevel, setSelectedContractLevel] = useState('');

  // Transform PDF data into flat structure for table display
  const commissionData = useMemo(() => {
    const flatData: CommissionRateDisplay[] = [];
    let idCounter = 1;

    PDF_COMMISSION_DATA.forEach(carrier => {
      carrier.products.forEach(product => {
        product.commissionRates.forEach(rate => {
          flatData.push({
            id: (idCounter++).toString(),
            carrierName: carrier.carrierName,
            productName: product.productName,
            productType: product.productType,
            contractLevel: rate.contractLevel,
            percentage: rate.percentage,
          });
        });
      });
    });

    return flatData;
  }, []);

  // Get unique carriers for filter dropdown
  const availableCarriers = useMemo(() => {
    const carriers = PDF_COMMISSION_DATA.map(carrier => carrier.carrierName);
    return [
      { value: '', label: 'All Carriers' },
      ...carriers.map(name => ({ value: name, label: name }))
    ];
  }, []);

  // Filter data based on search and filter criteria
  const filteredData = useMemo(() => {
    return commissionData.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.carrierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCarrier = selectedCarrier === '' || item.carrierName === selectedCarrier;
      const matchesProductType = selectedProductType === '' || item.productType === selectedProductType;
      const matchesContractLevel = selectedContractLevel === '' ||
        item.contractLevel.toString() === selectedContractLevel;

      return matchesSearch && matchesCarrier && matchesProductType && matchesContractLevel;
    });
  }, [commissionData, searchTerm, selectedCarrier, selectedProductType, selectedContractLevel]);

  // Export functions
  const exportToCSV = () => {
    const headers = ['Carrier', 'Product Name', 'Product Type', 'Contract Level', 'Commission %'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        item.carrierName,
        `"${item.productName}"`,
        item.productType,
        item.contractLevel,
        item.percentage
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commission_guide_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    // For now, we'll export as CSV with .xlsx extension
    // In a real application, you'd use a library like xlsx
    const headers = ['Carrier', 'Product Name', 'Product Type', 'Contract Level', 'Commission %'];
    const csvContent = [
      headers.join('\t'),
      ...filteredData.map(item => [
        item.carrierName,
        item.productName,
        item.productType,
        item.contractLevel,
        item.percentage
      ].join('\t'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commission_guide_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
  };

  const exportToPDF = () => {
    // For now, we'll create a printable HTML version
    // In a real application, you'd use a library like jsPDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Commission Guide - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .stats { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Commission Guide</h1>
          <div class="stats">
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Records:</strong> ${filteredData.length}</p>
            <p><strong>Carriers:</strong> ${Array.from(new Set(filteredData.map(d => d.carrierName))).length}</p>
            <p><strong>Products:</strong> ${Array.from(new Set(filteredData.map(d => d.productName))).length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Carrier</th>
                <th>Product Name</th>
                <th>Product Type</th>
                <th>Contract Level</th>
                <th>Commission %</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(item => `
                <tr>
                  <td>${item.carrierName}</td>
                  <td>${item.productName}</td>
                  <td>${item.productType}</td>
                  <td>${item.contractLevel}%</td>
                  <td>${item.percentage}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Trigger print after a short delay to ensure content is loaded
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const getProductTypeLabel = (type: ProductType) => {
    const productType = PRODUCT_TYPE_OPTIONS.find(pt => pt.value === type);
    return productType?.label || type;
  };

  const columns: DataTableColumn<CommissionRateDisplay>[] = [
    {
      key: 'carrierName',
      header: 'Carrier',
      sortable: true,
      accessor: (item) => item.carrierName,
    },
    {
      key: 'productName',
      header: 'Product Name',
      sortable: true,
      accessor: (item) => item.productName,
    },
    {
      key: 'productType',
      header: 'Product Type',
      sortable: true,
      accessor: (item) => getProductTypeLabel(item.productType),
    },
    {
      key: 'contractLevel',
      header: 'Contract Level',
      sortable: true,
      width: '32',
      accessor: (item) => `${item.contractLevel}%`,
    },
    {
      key: 'percentage',
      header: 'Commission %',
      sortable: true,
      width: '32',
      accessor: (item) => (
        <span className="font-semibold text-green-700">
          {item.percentage}%
        </span>
      ),
    },
  ];

  return (
    <div className="comp-guide-viewer">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Compensation Guide</h2>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            onClick={exportToCSV}
            className="flex items-center space-x-2"
          >
            <Table size={16} />
            <span>Export CSV</span>
          </Button>
          <Button
            variant="ghost"
            onClick={exportToExcel}
            className="flex items-center space-x-2"
          >
            <FileSpreadsheet size={16} />
            <span>Export Excel</span>
          </Button>
          <Button
            variant="ghost"
            onClick={exportToPDF}
            className="flex items-center space-x-2"
          >
            <FileText size={16} />
            <span>Export PDF</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{filteredData.length}</div>
          <div className="text-sm text-gray-600">Total Records</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-green-600">
            {Array.from(new Set(filteredData.map(d => d.carrierName))).length}
          </div>
          <div className="text-sm text-gray-600">Carriers</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-purple-600">
            {Array.from(new Set(filteredData.map(d => d.productName))).length}
          </div>
          <div className="text-sm text-gray-600">Products</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-orange-600">
            {Array.from(new Set(filteredData.map(d => d.contractLevel))).length}
          </div>
          <div className="text-sm text-gray-600">Contract Levels</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <Input
              label="Search"
              value={searchTerm}
              onChange={(value) => setSearchTerm(String(value))}
              placeholder="Search carriers or products..."
            />
          </div>
          <Select
            label="Carrier"
            value={selectedCarrier}
            onChange={setSelectedCarrier}
            options={availableCarriers}
          />
          <Select
            label="Product Type"
            value={selectedProductType}
            onChange={setSelectedProductType}
            options={PRODUCT_TYPE_OPTIONS}
          />
          <Select
            label="Contract Level"
            value={selectedContractLevel}
            onChange={setSelectedContractLevel}
            options={CONTRACT_LEVEL_OPTIONS}
          />
        </div>
        {(searchTerm || selectedCarrier || selectedProductType || selectedContractLevel) && (
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Showing {filteredData.length} of {commissionData.length} records
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCarrier('');
                setSelectedProductType('');
                setSelectedContractLevel('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={filteredData}
          columns={columns}
          emptyMessage="No commission data found matching your filters."
        />
      </div>
    </div>
  );
};