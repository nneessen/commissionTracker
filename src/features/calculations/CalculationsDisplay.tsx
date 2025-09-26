import React from 'react';
import { useExpensesContext } from '../../contexts/ExpensesContext';

export const CalculationsDisplay: React.FC = () => {
  const { calculations, performanceMetrics } = useExpensesContext();

  // Debug log to verify calculations update - PROOF OF FIX
  React.useEffect(() => {
    console.log('✅ [CalculationsDisplay] RENDERING with new values:');
    calculations.forEach((calc, idx) => {
      console.log(`   Card ${idx + 1} (${calc.scenario}):
      - Commission Needed: $${calc.commissionNeeded}
      - AP (100%): $${Math.round(calc.apNeeded100)}
      - Policies (100%): ${calc.policies100}
      - AP (90%): $${Math.round(calc.apNeeded90)}
      - Policies (90%): ${calc.policies90}
      - AP (80%): $${Math.round(calc.apNeeded80)}
      - Policies (80%): ${calc.policies80}
      - AP (70%): $${Math.round(calc.apNeeded70)}
      - Policies (70%): ${calc.policies70}`);
    });
    console.log('   Performance Metrics:', {
      weeklyAPTarget: performanceMetrics.weeklyAPTarget,
      dailyAPTarget: performanceMetrics.dailyAPTarget,
      commissionPerPolicy: performanceMetrics.commissionPerPolicy,
      expenseRatio: performanceMetrics.expenseRatio
    });
  }, [calculations, performanceMetrics]);

  return (
    <div>
      {/* Quick Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h4>Weekly AP Target</h4>
          <div className="metric-value">
            ${performanceMetrics.weeklyAPTarget.toLocaleString()}
          </div>
          <div className="metric-label">For breakeven</div>
        </div>
        <div className="metric-card">
          <h4>Daily AP Target</h4>
          <div className="metric-value">
            ${performanceMetrics.dailyAPTarget.toLocaleString()}
          </div>
          <div className="metric-label">For breakeven</div>
        </div>
        <div className="metric-card">
          <h4>Commission per Policy</h4>
          <div className="metric-value">
            ${performanceMetrics.commissionPerPolicy.toLocaleString()}
          </div>
          <div className="metric-label">At current rates</div>
        </div>
        <div className="metric-card">
          <h4>Expense Ratio</h4>
          <div className="metric-value">{performanceMetrics.expenseRatio}%</div>
          <div className="metric-label">Of gross commission</div>
        </div>
      </div>

      {/* Results Table */}
      <div className="results-section">
        <div className="section-header">
          Commission Requirements & Sales Targets
          <div className="section-subtitle">
            Monthly targets based on different persistency rates (how many
            policies remain active)
          </div>
        </div>

        <div className="results-grid">
          {calculations.map((calc, index) => (
            <div
              key={calc.scenario}
              className={`result-card ${
                index === 0
                  ? 'breakeven-card'
                  : index === 1
                    ? 'target-card-1'
                    : 'target-card-2'
              }`}
            >
              <div className="result-header">
                <h4 className="scenario-title">{calc.scenario}</h4>
                <div className="commission-needed">
                  ${calc.commissionNeeded.toLocaleString()}
                </div>
                <div className="commission-label">Commission Needed</div>
              </div>

              <div className="persistency-grid">
                <div className="persistency-item">
                  <div className="persistency-rate">100%</div>
                  <div className="persistency-label">Perfect Retention</div>
                  <div className="ap-amount">
                    ${Math.round(calc.apNeeded100).toLocaleString()}
                  </div>
                  <div className="policies-count">{calc.policies100} policies</div>
                </div>

                <div className="persistency-item">
                  <div className="persistency-rate">90%</div>
                  <div className="persistency-label">Excellent Retention</div>
                  <div className="ap-amount">
                    ${Math.round(calc.apNeeded90).toLocaleString()}
                  </div>
                  <div className="policies-count">{calc.policies90} policies</div>
                </div>

                <div className="persistency-item">
                  <div className="persistency-rate">80%</div>
                  <div className="persistency-label">Good Retention</div>
                  <div className="ap-amount">
                    ${Math.round(calc.apNeeded80).toLocaleString()}
                  </div>
                  <div className="policies-count">{calc.policies80} policies</div>
                </div>

                <div className="persistency-item">
                  <div className="persistency-rate">70%</div>
                  <div className="persistency-label">Fair Retention</div>
                  <div className="ap-amount">
                    ${Math.round(calc.apNeeded70).toLocaleString()}
                  </div>
                  <div className="policies-count">{calc.policies70} policies</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};