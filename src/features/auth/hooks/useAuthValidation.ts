// src/features/auth/hooks/useAuthValidation.ts

import { useState } from 'react';

export interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export type AuthMode = 'signin' | 'signup' | 'reset';

export function useAuthValidation() {
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const validateForm = (
    email: string,
    password: string,
    confirmPassword: string,
    mode: AuthMode
  ): boolean => {
    const errors: FormErrors = {};

    // Email validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (mode !== 'reset') {
      if (!password) {
        errors.password = 'Password is required';
      } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }

      // Confirm password validation (signup only)
      if (mode === 'signup') {
        if (!confirmPassword) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearErrors = () => setFormErrors({});

  return {
    formErrors,
    validateForm,
    clearErrors,
  };
}
