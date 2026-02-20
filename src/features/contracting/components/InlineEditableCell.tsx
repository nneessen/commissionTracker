// src/features/contracting/components/InlineEditableCell.tsx
// Reusable inline editable cell for table columns

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type EditMode = 'text' | 'textarea' | 'select';

interface InlineEditableCellProps {
  value: string | null;
  mode: EditMode;
  options?: Array<{ value: string; label: string }>; // For select mode
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}

export function InlineEditableCell({
  value,
  mode,
  options,
  onSave,
  placeholder = 'Click to edit',
  className = '',
}: InlineEditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      // Rollback on error
      setEditValue(value || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className={`cursor-pointer hover:bg-accent px-2 py-1 rounded text-xs ${className}`}
      >
        {value || <span className="text-muted-foreground italic">{placeholder}</span>}
      </div>
    );
  }

  if (mode === 'select' && options) {
    return (
      <Select
        value={editValue}
        onValueChange={(newValue) => {
          setEditValue(newValue);
          // Auto-save on select change
          setIsSaving(true);
          onSave(newValue)
            .then(() => setIsEditing(false))
            .catch(() => setEditValue(value || ''))
            .finally(() => setIsSaving(false));
        }}
        disabled={isSaving}
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (mode === 'textarea') {
    return (
      <div className="flex flex-col gap-1">
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
          }}
          className="h-20 text-xs"
          disabled={isSaving}
        />
        <div className="flex gap-1">
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-6 px-2 text-xs">
            <Check className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving} className="h-6 px-2 text-xs">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  // Text mode
  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
        onBlur={handleSave}
        className="h-7 text-xs"
        disabled={isSaving}
      />
    </div>
  );
}
