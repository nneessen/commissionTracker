import React from 'react';
import { Input } from '../../components/ui';
import { useExpenses } from '../../hooks';

export const ConstantsManager: React.FC = () => {
  const { constants, updateConstant } = useExpenses();

  return (
    <div className="constants-section">
      <div className="constant-group">
        <div className="constant-label">Avg AP</div>
        <input
          type="number"
          className="constant-input"
          value={constants.avgAP}
          onChange={(e) => updateConstant('avgAP', Number(e.target.value))}
        />
      </div>
      <div className="constant-group">
        <div className="constant-label">Comm Rate</div>
        <input
          type="number"
          className="constant-input"
          step="0.01"
          value={constants.commissionRate}
          onChange={(e) => updateConstant('commissionRate', Number(e.target.value))}
        />
      </div>
      <div className="constant-group">
        <div className="constant-label">Target 1</div>
        <input
          type="number"
          className="constant-input"
          value={constants.target1}
          onChange={(e) => updateConstant('target1', Number(e.target.value))}
        />
      </div>
      <div className="constant-group">
        <div className="constant-label">Target 2</div>
        <input
          type="number"
          className="constant-input"
          value={constants.target2}
          onChange={(e) => updateConstant('target2', Number(e.target.value))}
        />
      </div>
    </div>
  );
};