// src/components/dashboard/ActionableInsights.tsx

import React from 'react';
import { Lightbulb, TrendingUp, AlertCircle, Target } from 'lucide-react';

export interface Insight {
  type: 'success' | 'warning' | 'info' | 'target';
  message: string;
  action?: string;
}

interface ActionableInsightsProps {
  insights: Insight[];
}

export const ActionableInsights: React.FC<ActionableInsightsProps> = ({ insights }) => {
  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return <TrendingUp size={18} />;
      case 'warning':
        return <AlertCircle size={18} />;
      case 'target':
        return <Target size={18} />;
      default:
        return <Lightbulb size={18} />;
    }
  };

  const getColor = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'target':
        return '#8b5cf6';
      default:
        return '#3b82f6';
    }
  };

  return (
    <div className="actionable-insights">
      <h2 className="insights-title">
        <Lightbulb size={20} />
        Actionable Insights
      </h2>

      <div className="insights-list">
        {insights.length === 0 ? (
          <div className="empty-state">
            <Lightbulb size={32} className="empty-icon" />
            <p>No insights available yet. Add more policies to see recommendations.</p>
          </div>
        ) : (
          insights.map((insight, index) => (
            <div key={index} className="insight-card" style={{ borderLeftColor: getColor(insight.type) }}>
              <div className="insight-icon" style={{ color: getColor(insight.type) }}>
                {getIcon(insight.type)}
              </div>
              <div className="insight-content">
                <p className="insight-message">{insight.message}</p>
                {insight.action && (
                  <p className="insight-action">{insight.action}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .actionable-insights {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .insights-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #1a1a1a;
        }

        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          color: #6b7280;
        }

        .empty-icon {
          opacity: 0.3;
          margin-bottom: 16px;
        }

        .insight-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: #f9fafb;
          border-left: 4px solid;
          border-radius: 8px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .insight-card:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .insight-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .insight-content {
          flex: 1;
        }

        .insight-message {
          font-size: 14px;
          font-weight: 500;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        .insight-action {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};
