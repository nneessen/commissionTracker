import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Button, DataTable } from '../../components/ui';
import { Commission, DataTableColumn } from '../../types';
import { useCommissions, useCarriers } from '../../hooks';
import { CommissionForm } from './CommissionForm';

export const CommissionList: React.FC = () => {
  const { commissions, deleteCommission, commissionSummary } = useCommissions();
  const { getCarrierById } = useCarriers();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleDeleteCommission = (id: string) => {
    if (window.confirm('Are you sure you want to delete this commission?')) {
      deleteCommission(id);
    }
  };

  const columns: DataTableColumn<Commission>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      accessor: (commission) =>
        new Date(commission.createdAt).toLocaleDateString(),
    },
    {
      key: 'client.name',
      header: 'Client',
      sortable: true,
      accessor: (commission) => commission.client.name,
    },
    {
      key: 'client.age',
      header: 'Age',
      sortable: true,
      accessor: (commission) => commission.client.age.toString(),
      width: '16',
    },
    {
      key: 'client.state',
      header: 'State',
      sortable: true,
      accessor: (commission) => commission.client.state,
      width: '20',
    },
    {
      key: 'carrierId',
      header: 'Carrier',
      sortable: true,
      accessor: (commission) => {
        const carrier = getCarrierById(commission.carrierId);
        return carrier?.name || 'Unknown';
      },
    },
    {
      key: 'product',
      header: 'Product',
      sortable: true,
      accessor: (commission) => {
        const productLabels = {
          whole_life: 'Whole Life',
          term_life: 'Term Life',
          universal_life: 'Universal Life',
          indexed_universal_life: 'Indexed Universal Life',
          accidental_life: 'Accidental Life',
        };
        return productLabels[commission.product] || commission.product;
      },
    },
    {
      key: 'annualPremium',
      header: 'Annual Premium',
      sortable: true,
      accessor: (commission) => `$${commission.annualPremium.toLocaleString()}`,
    },
    {
      key: 'commissionRate',
      header: 'Rate',
      sortable: true,
      accessor: (commission) => `${(commission.commissionRate * 100).toFixed(1)}%`,
      width: '20',
    },
    {
      key: 'commissionAmount',
      header: 'Commission',
      sortable: true,
      accessor: (commission) => (
        <span className="font-semibold text-green-600">
          ${commission.commissionAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '24',
      accessor: (commission) => (
        <button
          className="btn-delete"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteCommission(commission.id);
          }}
          title="Delete commission"
        >
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="commission-list">
      {/* Summary Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h4>Total Commissions</h4>
          <div className="metric-value">
            ${commissionSummary.totalCommissions.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
        <div className="metric-card">
          <h4>Total Policies</h4>
          <div className="metric-value">
            {commissionSummary.commissionCount}
          </div>
        </div>
        <div className="metric-card">
          <h4>Avg Commission Rate</h4>
          <div className="metric-value">
            {(commissionSummary.averageCommissionRate * 100).toFixed(1)}%
          </div>
        </div>
        <div className="metric-card">
          <h4>Total Premiums</h4>
          <div className="metric-value">
            ${commissionSummary.totalPremiums.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <h2>Commission History</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          Log Commission
        </Button>
      </div>

      {/* Commission Table */}
      <div className="table-section">
        <DataTable
          data={commissions}
          columns={columns}
          emptyMessage="No commissions logged yet. Click 'Log Commission' to get started."
        />
      </div>

      {/* Add Commission Modal */}
      <CommissionForm
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};