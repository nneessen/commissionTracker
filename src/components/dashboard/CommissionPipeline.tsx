// src/components/dashboard/CommissionPipeline.tsx

import React from 'react';
import { TrendingUp, DollarSign, Clock } from 'lucide-react';

interface CommissionPipelineProps {
  pending: number;
  paid: number;
  earned: number;
  unearned: number;
}

export const CommissionPipeline: React.FC<CommissionPipelineProps> = ({
  pending,
  paid,
  earned,
  unearned,
}) => {
  const total = pending + paid;
  const paidPercentage = total > 0 ? (paid / total) * 100 : 0;
  const pendingPercentage = total > 0 ? (pending / total) * 100 : 0;
  const earnedPercentage = paid > 0 ? (earned / paid) * 100 : 0;

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="commission-pipeline">
      <h2 className="pipeline-title">
        <TrendingUp size={20} />
        Commission Pipeline
      </h2>

      <div className="pipeline-visual">
        {/* Total Pipeline */}
        <div className="pipeline-stage">
          <div className="stage-header">
            <span className="stage-label">Total Pipeline</span>
            <span className="stage-value">{formatCurrency(total)}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-segment paid"
              style={{ width: `${paidPercentage}%` }}
              title={`Paid: ${formatCurrency(paid)}`}
            />
            <div
              className="progress-segment pending"
              style={{ width: `${pendingPercentage}%` }}
              title={`Pending: ${formatCurrency(pending)}`}
            />
          </div>
          <div className="stage-breakdown">
            <span className="breakdown-item paid">
              <DollarSign size={14} />
              Paid: {formatCurrency(paid)}
            </span>
            <span className="breakdown-item pending">
              <Clock size={14} />
              Pending: {formatCurrency(pending)}
            </span>
          </div>
        </div>

        {/* Earned vs Unearned */}
        <div className="pipeline-stage">
          <div className="stage-header">
            <span className="stage-label">Paid Commissions</span>
            <span className="stage-value">{formatCurrency(paid)}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-segment earned"
              style={{ width: `${earnedPercentage}%` }}
              title={`Earned: ${formatCurrency(earned)}`}
            />
            <div
              className="progress-segment unearned"
              style={{ width: `${100 - earnedPercentage}%` }}
              title={`Unearned (At Risk): ${formatCurrency(unearned)}`}
            />
          </div>
          <div className="stage-breakdown">
            <span className="breakdown-item earned">
              ✓ Earned: {formatCurrency(earned)}
            </span>
            <span className="breakdown-item unearned">
              ⚠ At Risk: {formatCurrency(unearned)}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .commission-pipeline {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 24px;
          color: white;
          margin-bottom: 24px;
        }

        .pipeline-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .pipeline-visual {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .pipeline-stage {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 16px;
        }

        .stage-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .stage-label {
          font-size: 14px;
          opacity: 0.9;
        }

        .stage-value {
          font-size: 20px;
          font-weight: 700;
        }

        .progress-bar {
          height: 32px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          margin-bottom: 12px;
        }

        .progress-segment {
          height: 100%;
          transition: width 0.3s ease;
        }

        .progress-segment.paid {
          background: linear-gradient(90deg, #10b981, #34d399);
        }

        .progress-segment.pending {
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
        }

        .progress-segment.earned {
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
        }

        .progress-segment.unearned {
          background: linear-gradient(90deg, #ef4444, #f87171);
        }

        .stage-breakdown {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .breakdown-item {
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0.95;
        }

        .breakdown-item.paid,
        .breakdown-item.earned {
          color: #d1fae5;
        }

        .breakdown-item.pending {
          color: #fde68a;
        }

        .breakdown-item.unearned {
          color: #fecaca;
        }
      `}</style>
    </div>
  );
};
