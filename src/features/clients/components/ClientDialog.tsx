// ClientDialog.tsx - Add/Edit client form dialog
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Client, CreateClientData, ClientStatus } from '@/types/client.types';
import { isValidEmail, isValidPhone, formatPhoneNumber } from '@/types/client.types';

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSave: (data: CreateClientData) => Promise<void>;
  isSubmitting: boolean;
}

export function ClientDialog({
  open,
  onOpenChange,
  client,
  onSave,
  isSubmitting,
}: ClientDialogProps) {
  const [formData, setFormData] = useState<CreateClientData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    notes: '',
    status: 'active',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateClientData, string>>>({});
  const [touched, setTouched] = useState<Set<keyof CreateClientData>>(new Set());

  // Reset form when dialog opens/closes or client changes
  useEffect(() => {
    if (open) {
      if (client) {
        // Editing existing client
        setFormData({
          name: client.name,
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          date_of_birth: client.date_of_birth || '',
          notes: client.notes || '',
          status: client.status,
        });
      } else {
        // Adding new client
        setFormData({
          name: '',
          email: '',
          phone: '',
          address: '',
          date_of_birth: '',
          notes: '',
          status: 'active',
        });
      }
      setErrors({});
      setTouched(new Set());
    }
  }, [client, open]);

  const validateField = (field: keyof CreateClientData, value: any) => {
    switch (field) {
      case 'name':
        if (!value || value.trim().length < 2) {
          return 'Name must be at least 2 characters';
        }
        break;
      case 'email':
        if (value && !isValidEmail(value)) {
          return 'Invalid email format';
        }
        break;
      case 'phone':
        if (value && !isValidPhone(value)) {
          return 'Invalid phone format (use XXX-XXX-XXXX or (XXX) XXX-XXXX)';
        }
        break;
      case 'date_of_birth':
        if (value) {
          const date = new Date(value);
          const today = new Date();
          if (date > today) {
            return 'Birth date cannot be in the future';
          }
          const age = today.getFullYear() - date.getFullYear();
          if (age > 120) {
            return 'Invalid birth date';
          }
        }
        break;
    }
    return '';
  };

  const handleFieldChange = (field: keyof CreateClientData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Validate on change if field has been touched
    if (touched.has(field)) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleFieldBlur = (field: keyof CreateClientData) => {
    setTouched(prev => new Set([...prev, field]));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handlePhoneChange = (value: string) => {
    // Remove all non-numeric characters for validation
    const cleaned = value.replace(/\D/g, '');

    // Format as user types
    if (cleaned.length <= 10) {
      handleFieldChange('phone', formatPhoneNumber(cleaned));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateClientData, string>> = {};

    // Validate all fields
    Object.keys(formData).forEach(field => {
      const error = validateField(field as keyof CreateClientData, formData[field as keyof CreateClientData]);
      if (error) {
        newErrors[field as keyof CreateClientData] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched(new Set(Object.keys(formData) as (keyof CreateClientData)[]));

    if (!validateForm()) {
      return;
    }

    // Clean up data before saving
    const cleanedData: CreateClientData = {
      ...formData,
      name: formData.name.trim(),
      email: formData.email?.trim() || undefined,
      phone: formData.phone?.trim() || undefined,
      address: formData.address?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
    };

    // Remove empty optional fields
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key as keyof CreateClientData] === '') {
        delete cleanedData[key as keyof CreateClientData];
      }
    });

    await onSave(cleanedData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold">
            {client ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
          <DialogDescription className="text-xs mt-1">
            {client
              ? 'Update the client information below'
              : 'Fill in the details to add a new client to your database'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name - Required */}
          <div>
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              onBlur={() => handleFieldBlur('name')}
              placeholder="John Doe"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email and Phone - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                placeholder="john@example.com"
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={() => handleFieldBlur('phone')}
                placeholder="(555) 123-4567"
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-xs text-destructive mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Date of Birth and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                onBlur={() => handleFieldBlur('date_of_birth')}
                max={new Date().toISOString().split('T')[0]}
                className={errors.date_of_birth ? 'border-destructive' : ''}
              />
              {errors.date_of_birth && (
                <p className="text-xs text-destructive mt-1">{errors.date_of_birth}</p>
              )}
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: ClientStatus) => handleFieldChange('status', value)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              placeholder="123 Main St, City, State 12345"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Additional information about this client..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Footer */}
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>{client ? 'Update Client' : 'Create Client'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}