import React from 'react';
import { ButtonProps } from '../../types';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
  type = 'button',
  className = '',
}) => {
  const getButtonClass = () => {
    let btnClass = 'btn';

    if (variant === 'primary') {
      btnClass += ' btn-primary';
    } else if (variant === 'secondary') {
      btnClass += ' btn-secondary';
    } else if (variant === 'danger') {
      btnClass += ' btn-danger';
    } else if (variant === 'ghost') {
      btnClass += ' btn-ghost';
    }

    if (size === 'sm') {
      btnClass += ' btn-sm';
    } else if (size === 'lg') {
      btnClass += ' btn-lg';
    }

    if (disabled || loading) {
      btnClass += ' btn-disabled';
    }

    return `${btnClass} ${className}`;
  };

  return (
    <button
      type={type}
      className={getButtonClass()}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};