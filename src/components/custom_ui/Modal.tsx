import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { ModalProps } from '../../types';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getModalClass = () => {
    let modalClass = 'modal';

    if (size === 'sm') {
      modalClass += ' modal-sm';
    } else if (size === 'lg') {
      modalClass += ' modal-lg';
    } else if (size === 'xl') {
      modalClass += ' modal-xl';
    }

    return modalClass;
  };

  return (
    <div className="modal-overlay">
      <div className={getModalClass()}>
        {/* Header */}
        {title && (
          <div className="modal-header">
            <h3>{title}</h3>
            <button onClick={onClose} className="modal-close">
              <X size={20} />
            </button>
          </div>
        )}

        {/* Close button without title */}
        {!title && (
          <button onClick={onClose} className="modal-close-absolute">
            <X size={20} />
          </button>
        )}

        {/* Content */}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};