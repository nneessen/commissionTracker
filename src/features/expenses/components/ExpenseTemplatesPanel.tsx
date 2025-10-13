// src/features/expenses/components/ExpenseTemplatesPanel.tsx

import React from 'react';
import { Edit, Trash2, Zap } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useExpenseTemplates } from '../../../hooks/expenses/useExpenseTemplates';
import type { ExpenseTemplate } from '../../../types/expense.types';
import { getRecurringShortLabel } from '../config/recurringConfig';
import { EXPENSE_BADGE_COLORS } from '../../../constants/expenses';

interface ExpenseTemplatesPanelProps {
  onUseTemplate: (template: ExpenseTemplate) => void;
  onEditTemplate?: (template: ExpenseTemplate) => void;
  onDeleteTemplate: (template: ExpenseTemplate) => void;
}

/**
 * ExpenseTemplatesPanel - Quick-add template buttons
 *
 * Displays saved expense templates with one-click actions.
 * Clicking a template opens the expense form pre-filled.
 */
export function ExpenseTemplatesPanel({
  onUseTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: ExpenseTemplatesPanelProps) {
  const { data: templates = [], isLoading } = useExpenseTemplates();

  if (isLoading) {
    return (
      <div
        style={{
          padding: '16px',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>Loading templates...</div>
      </div>
    );
  }

  // Don't render anything if no templates - the dashboard will handle empty state
  if (templates.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px',
          }}
        >
          Quick Add Templates
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748b',
            lineHeight: '1.4',
          }}
        >
          Click any template to instantly add expense for today
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {templates.map((template) => (
          <div
            key={template.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8f9fa';
              e.currentTarget.style.borderColor = '#cbd5e0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <button
              onClick={() => onUseTemplate(template)}
              style={{
                flex: 1,
                textAlign: 'left',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <div style={{ fontWeight: 500, fontSize: '13px', color: '#1a1a1a', marginBottom: '4px' }}>
                {template.template_name}
              </div>
              <div style={{ fontSize: '12px', color: '#656d76', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600 }}>
                  ${template.amount.toFixed(2)}
                </span>
                {template.recurring_frequency && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: EXPENSE_BADGE_COLORS.RECURRING.BG,
                      color: EXPENSE_BADGE_COLORS.RECURRING.TEXT,
                      border: `1px solid ${EXPENSE_BADGE_COLORS.RECURRING.BORDER}`,
                    }}
                  >
                    {getRecurringShortLabel(template.recurring_frequency)}
                  </span>
                )}
                {template.is_tax_deductible && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: EXPENSE_BADGE_COLORS.TAX_DEDUCTIBLE.BG,
                      color: EXPENSE_BADGE_COLORS.TAX_DEDUCTIBLE.TEXT,
                      border: `1px solid ${EXPENSE_BADGE_COLORS.TAX_DEDUCTIBLE.BORDER}`,
                    }}
                  >
                    📋
                  </span>
                )}
              </div>
            </button>

            <div style={{ display: 'flex', gap: '4px' }}>
              {onEditTemplate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTemplate(template);
                  }}
                  style={{
                    padding: '4px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#656d76',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#656d76';
                  }}
                  title="Edit template"
                >
                  <Edit style={{ width: '14px', height: '14px' }} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTemplate(template);
                }}
                style={{
                  padding: '4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#656d76',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = '#656d76';
                }}
                title="Delete template"
              >
                <Trash2 style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
