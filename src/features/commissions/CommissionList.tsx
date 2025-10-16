import React, { useState } from 'react';
import { Trash2, Plus, CheckCircle } from 'lucide-react';
import { Button, DataTable } from '../../components/ui';
import { Commission, DataTableColumn } from '../../types';
import { useCommissions, useDeleteCommission, useCommissionMetrics, useCarriers } from '../../hooks';
import { useMarkCommissionPaid } from '../../hooks/commissions/useMarkCommissionPaid';
import { CommissionForm } from './CommissionForm';

export const CommissionList: React.FC = () => {
  const { data: commissions = [] } = useCommissions();
  const { mutate: deleteCommission, isPending: isDeleting } = useDeleteCommission();
  const { mutate: markAsPaid, isPending: isMarkingPaid } = useMarkCommissionPaid();
  const { data: commissionSummary } = useCommissionMetrics();
  const { data: carriers = [] } = useCarriers();
  const getCarrierById = (id: string) => carriers.find(c => c.id === id);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleDeleteCommission = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this commission?')) {
      deleteCommission(id);
    }
  };

  const handleMarkAsPaid = (commissionId: string) => {
    if (window.confirm('Mark this commission as paid? This will record that you received payment.')) {
      markAsPaid({ commissionId });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
      pending: { color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Pending' },
      earned: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Earned' },
      paid: { color: 'text-green-700', bg: 'bg-green-100', label: 'Paid' },
      clawback: { color: 'text-red-700', bg: 'bg-red-100', label: 'Clawback' },
      cancelled: { color: 'text-gray-700', bg: 'bg-gray-100', label: 'Cancelled' },
    };

    const config = statusConfig[status] || { color: 'text-gray-700', bg: 'bg-gray-100', label: status };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.color}`}
      >
        {config.label}
      </span>
    );
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
          term: 'Term Life',
          universal_life: 'Universal Life',
          indexed_universal_life: 'Indexed Universal Life',
          accidental: 'Accidental Death',
          final_expense: 'Final Expense',
          annuity: 'Annuity',
        };
        return productLabels[commission.product] || commission.product;
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (commission) => getStatusBadge(commission.status),
      width: '24',
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
      accessor: (commission) => `${commission.commissionRate.toFixed(1)}%`,
      width: '20',
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      accessor: (commission) => (
        <span className="font-semibold text-blue-600">
          ${commission.amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: 'earnedAmount',
      header: 'Earned',
      sortable: true,
      accessor: (commission) => (
        <span className="font-semibold text-green-600">
          ${commission.earnedAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: 'unearnedAmount',
      header: 'Unearned',
      sortable: true,
      accessor: (commission) => (
        <span className="font-semibold text-orange-600">
          ${commission.unearnedAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: 'paymentDate',
      header: 'Payment Date',
      sortable: true,
      accessor: (commission) => {
        if (commission.status === 'paid' && commission.paymentDate) {
          return new Date(commission.paymentDate).toLocaleDateString();
        }
        return <span className="text-gray-400">-</span>;
      },
      width: '28',
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '28',
      accessor: (commission) => (
        <div className="flex gap-2">
          {commission.status === 'earned' && (
            <button
              className="btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                handleMarkAsPaid(commission.id);
              }}
              disabled={isMarkingPaid}
              title="Mark as paid"
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle size={14} />
              Mark Paid
            </button>
          )}
          <button
            className="btn-delete"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCommission(commission.id);
            }}
            disabled={isDeleting}
            title="Delete commission"
          >
            <Trash2 size={16} />
          </button>
        </div>
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
            ${commissionSummary?.totalCommissions?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || '0.00'}
          </div>
        </div>
        <div className="metric-card">
          <h4>Total Policies</h4>
          <div className="metric-value">
            {commissionSummary?.commissionCount || 0}
          </div>
        </div>
        <div className="metric-card">
          <h4>Avg Commission Rate</h4>
          <div className="metric-value">
            {commissionSummary ? (commissionSummary.averageCommissionRate * 100).toFixed(1) : '0.0'}%
          </div>
        </div>
        <div className="metric-card">
          <h4>Total Premiums</h4>
          <div className="metric-value">
            ${commissionSummary?.totalPremiums?.toLocaleString() || '0'}
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