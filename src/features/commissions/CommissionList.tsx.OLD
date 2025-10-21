import React, { useState } from 'react';
import { Trash2, Plus, CheckCircle, Edit2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui';
import { DataTable } from '@/components/custom_ui/DataTable';
import { Commission, DataTableColumn } from '../../types';
import { useCommissions, useDeleteCommission, useCommissionMetrics, useCarriers } from '../../hooks';
import { useMarkCommissionPaid } from '../../hooks/commissions/useMarkCommissionPaid';
import { useUpdateMonthsPaid } from '../../hooks/commissions/useUpdateMonthsPaid';
import { CommissionForm } from './CommissionForm';

export const CommissionList: React.FC = () => {
  const { data: commissions = [] } = useCommissions();
  const { mutate: deleteCommission, isPending: isDeleting } = useDeleteCommission();
  const { mutate: markAsPaid, isPending: isMarkingPaid } = useMarkCommissionPaid();
  const { mutate: updateMonthsPaid, isPending: isUpdatingMonths } = useUpdateMonthsPaid();
  const { data: commissionSummary } = useCommissionMetrics();
  const { data: carriers = [] } = useCarriers();
  const getCarrierById = (id: string) => carriers.find(c => c.id === id);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMonthsPaid, setEditingMonthsPaid] = useState<string | null>(null);
  const [monthsPaidValue, setMonthsPaidValue] = useState<number>(0);

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

  const handleUpdateMonthsPaid = (commissionId: string, newValue: number) => {
    if (newValue < 0 || newValue > 12) {
      alert('Months paid must be between 0 and 12');
      return;
    }
    updateMonthsPaid(
      { commissionId, monthsPaid: newValue },
      {
        onSuccess: () => {
          setEditingMonthsPaid(null);
        },
        onError: (error) => {
          alert(`Failed to update months paid: ${error.message}`);
        }
      }
    );
  };

  const startEditingMonthsPaid = (commissionId: string, currentValue: number) => {
    setEditingMonthsPaid(commissionId);
    setMonthsPaidValue(currentValue);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
      pending: { color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Pending' },
      earned: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Earned' },
      paid: { color: 'text-green-700', bg: 'bg-green-100', label: 'Paid' },
      clawback: { color: 'text-red-700', bg: 'bg-red-100', label: 'Clawback' },
      charged_back: { color: 'text-red-700', bg: 'bg-red-100', label: 'Charged Back' },
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
      key: 'monthsPaid',
      header: 'Months Paid',
      sortable: true,
      accessor: (commission) => {
        const monthsPaid = commission.monthsPaid || 0;
        const isAtRisk = monthsPaid < 3 && commission.status === 'earned';

        if (editingMonthsPaid === commission.id) {
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                min="0"
                max="12"
                value={monthsPaidValue}
                onChange={(e) => setMonthsPaidValue(parseInt(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateMonthsPaid(commission.id, monthsPaidValue);
                  } else if (e.key === 'Escape') {
                    setEditingMonthsPaid(null);
                  }
                }}
                className="w-16 px-2 py-1 border rounded text-sm"
                autoFocus
                disabled={isUpdatingMonths}
              />
              <button
                onClick={() => handleUpdateMonthsPaid(commission.id, monthsPaidValue)}
                disabled={isUpdatingMonths}
                className="btn-primary px-1.5 py-1 text-[11px]"
              >
                <CheckCircle size={12} />
              </button>
              <button
                onClick={() => setEditingMonthsPaid(null)}
                disabled={isUpdatingMonths}
                className="btn-delete px-1.5 py-1 text-[11px]"
              >
                ×
              </button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <span className={isAtRisk ? 'font-semibold text-red-600' : ''}>
              {monthsPaid} / 12
            </span>
            {isAtRisk && <AlertCircle size={14} className="text-red-600" title="At risk of chargeback" />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                startEditingMonthsPaid(commission.id, monthsPaid);
              }}
              className="opacity-0 hover:opacity-100 transition-opacity"
              title="Edit months paid"
            >
              <Edit2 size={14} className="text-gray-500" />
            </button>
          </div>
        );
      },
      width: '28',
    },
    {
      key: 'chargebackAmount',
      header: 'Chargeback',
      sortable: true,
      accessor: (commission) => {
        if (commission.chargebackAmount && commission.chargebackAmount > 0) {
          return (
            <span className="font-semibold text-red-600">
              -${commission.chargebackAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          );
        }
        return <span className="text-gray-400">-</span>;
      },
      width: '24',
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
              className="px-2 py-1 text-xs flex items-center gap-1"
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