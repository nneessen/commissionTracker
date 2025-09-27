// /home/nneessen/projects/commissionTracker/src/features/policies/PolicyDashboard.tsx

import React, { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { PolicyForm } from './PolicyForm';
import { PolicyList } from './PolicyList';
import { usePolicy } from '../../hooks/usePolicy';
import { useCarriers } from '../../hooks/useCarriers';
import '../../styles/policy.css';

export const PolicyDashboard: React.FC = () => {
  const [isPolicyFormOpen, setIsPolicyFormOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | undefined>();
  // Get ALL functions from usePolicy in ONE place
  const {
    policies,
    addPolicy,
    updatePolicy,
    deletePolicy,
    updatePolicyStatus,
    getPolicyById,
    filterPolicies,
    getPolicySummary,
    getExpiringPolicies,
  } = usePolicy();
  useCarriers();

  const summary = getPolicySummary();
  const expiringPolicies = getExpiringPolicies(30);

  const handleEditPolicy = (policyId: string) => {
    setEditingPolicyId(policyId);
    setIsPolicyFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsPolicyFormOpen(false);
    setEditingPolicyId(undefined);
  };

  const averageCommissionRate = summary.totalAnnualPremium > 0
    ? (summary.totalExpectedCommission / summary.totalAnnualPremium) * 100
    : 0;

  return (
    <div className="policy-dashboard">
      {/* Compact Header with Stats */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Policy Management</h1>
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-value">{summary.totalPolicies}</span>
              <span className="stat-label">Policies</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{summary.activePolicies}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">${(summary.totalAnnualPremium / 1000).toFixed(1)}K</span>
              <span className="stat-label">Premium</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">${(summary.totalExpectedCommission / 1000).toFixed(1)}K</span>
              <span className="stat-label">Commission</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{averageCommissionRate.toFixed(1)}%</span>
              <span className="stat-label">Avg Rate</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button
            onClick={() => setIsPolicyFormOpen(true)}
            className="btn-primary"
          >
            <Plus size={16} />
            New Policy
          </button>
        </div>
      </div>

      {/* Alerts Bar */}
      {expiringPolicies.length > 0 && (
        <div className="alert-bar">
          <AlertCircle size={16} />
          <span>{expiringPolicies.length} policies expiring in next 30 days</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="dashboard-content">
        {/* Policy List with Actions */}
        <PolicyList
          policies={policies}
          deletePolicy={deletePolicy}
          updatePolicyStatus={updatePolicyStatus}
          filterPolicies={filterPolicies}
          onEditPolicy={handleEditPolicy}
        />
      </div>

      {/* Modal Dialog */}
      {isPolicyFormOpen && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPolicyId ? 'Edit Policy' : 'New Policy Submission'}</h2>
              <button className="modal-close" onClick={handleCloseForm}>×</button>
            </div>
            <PolicyForm
              policyId={editingPolicyId}
              onClose={handleCloseForm}
              addPolicy={addPolicy}
              updatePolicy={updatePolicy}
              getPolicyById={getPolicyById}
            />
          </div>
        </div>
      )}
    </div>
  );
};