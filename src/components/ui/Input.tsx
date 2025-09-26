import React from 'react';
import { InputProps } from '../../types';

export const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  className = '',
  prefix,
  suffix,
}) => {
  const getInputClass = () => {
    let inputClass = 'form-input';

    if (error) {
      inputClass += ' form-input-error';
    }

    if (disabled) {
      inputClass += ' form-input-disabled';
    }

    return `${inputClass} ${className}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (type === 'number') {
      onChange(inputValue === '' ? 0 : parseFloat(inputValue) || 0);
    } else {
      onChange(inputValue);
    }
  };

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <div className={prefix || suffix ? 'input-group' : ''}>
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={getInputClass()}
          step={type === 'number' ? '0.01' : undefined}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
      {error && (
        <p className="form-error">{error}</p>
      )}
    </div>
  );
};