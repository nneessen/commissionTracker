import React from 'react';
import { SelectProps } from '../../types';

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  className = '',
}) => {
  const getSelectClass = () => {
    let selectClass = 'form-select';

    if (error) {
      selectClass += ' form-select-error';
    }

    if (disabled) {
      selectClass += ' form-select-disabled';
    }

    return `${selectClass} ${className}`;
  };

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={getSelectClass()}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="form-error">{error}</p>
      )}
    </div>
  );
};