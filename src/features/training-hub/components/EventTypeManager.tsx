// File: /home/nneessen/projects/commissionTracker/src/features/training-hub/components/EventTypeManager.tsx

import { useState, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Power,
  PowerOff,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEventTypes, useCreateEventType, useUpdateEventType, useDeleteEventType } from '@/hooks/workflows';
import type { TriggerEventType } from '@/types/workflow.types';

interface EditableEventType extends Partial<TriggerEventType> {
  isNew?: boolean;
}

const EVENT_CATEGORIES = [
  'recruit',
  'policy',
  'commission',
  'user',
  'email',
  'system',
  'custom'
];

const CATEGORY_COLORS: Record<string, string> = {
  recruit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  policy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  commission: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  user: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  email: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  system: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  custom: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
};

export default function EventTypeManager() {
  const { data: eventTypes = [], isLoading } = useEventTypes();
  const createEvent = useCreateEventType();
  const updateEvent = useUpdateEventType();
  const deleteEvent = useDeleteEventType();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditableEventType | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Start editing an event
  const handleEdit = useCallback((event: TriggerEventType) => {
    setEditingId(event.id);
    setEditData({
      ...event,
      availableVariables: event.availableVariables || {}
    });
    setErrors({});
  }, []);

  // Start creating a new event
  const handleCreate = useCallback(() => {
    const newEvent: EditableEventType = {
      id: 'new',
      eventName: '',
      category: 'custom',
      description: '',
      availableVariables: {},
      isActive: true,
      isNew: true
    };
    setEditingId('new');
    setEditData(newEvent);
    setErrors({});
  }, []);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setEditingId(null);
    setEditData(null);
    setErrors({});
  }, []);

  // Validate event data
  const validateEvent = (data: EditableEventType): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.eventName?.trim()) {
      newErrors.eventName = 'Event name is required';
    } else if (!/^[a-z]+\.[a-z_]+$/.test(data.eventName)) {
      newErrors.eventName = 'Event name must be in format: category.action_name';
    }

    if (!data.category) {
      newErrors.category = 'Category is required';
    }

    if (!data.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    // Validate JSON for availableVariables
    if (data.availableVariables) {
      try {
        if (typeof data.availableVariables === 'string') {
          JSON.parse(data.availableVariables);
        }
      } catch (_e) {
        newErrors.availableVariables = 'Invalid JSON format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save event (create or update)
  const handleSave = useCallback(async () => {
    if (!editData || !validateEvent(editData)) {
      return;
    }

    try {
      const eventData = {
        eventName: editData.eventName!,
        category: editData.category!,
        description: editData.description || '',
        availableVariables: editData.availableVariables || {},
        isActive: editData.isActive ?? true
      };

      if (editData.isNew) {
        await createEvent.mutateAsync(eventData);
      } else {
        await updateEvent.mutateAsync({
          id: editData.id!,
          ...eventData
        });
      }

      handleCancel();
    } catch (error) {
      console.error('Failed to save event:', error);
      setErrors({ submit: 'Failed to save event. Please try again.' });
    }
  }, [editData, createEvent, updateEvent, handleCancel]);

  // Delete event
  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event type? Workflows using this event will no longer trigger.')) {
      return;
    }

    try {
      await deleteEvent.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  }, [deleteEvent]);

  // Toggle event active status
  const handleToggleActive = useCallback(async (event: TriggerEventType) => {
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        isActive: !event.isActive
      });
    } catch (error) {
      console.error('Failed to toggle event status:', error);
    }
  }, [updateEvent]);

  // Update edit data field
  const updateEditField = (field: keyof EditableEventType, value: any) => {
    if (editData) {
      setEditData({ ...editData, [field]: value });
      // Clear error for this field
      if (errors[field]) {
        setErrors(prev => {
          const { [field]: _, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  if (isLoading) {
    return <div className="p-3 text-xs text-muted-foreground">Loading event types...</div>;
  }

  // Group events by category
  const groupedEvents = eventTypes.reduce((acc, event) => {
    const category = event.category || 'custom';
    if (!acc[category]) acc[category] = [];
    acc[category].push(event);
    return acc;
  }, {} as Record<string, typeof eventTypes>);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
        <div>
          <h3 className="text-sm font-medium">Event Type Management</h3>
          <p className="text-xs text-muted-foreground">Define events that can trigger workflows</p>
        </div>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={editingId === 'new'}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Event
        </Button>
      </div>

      {/* New Event Form */}
      {editingId === 'new' && editData && (
        <div className="p-3 space-y-2 bg-muted/20 rounded border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium">Create New Event Type</h4>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSave}
                className="h-6 px-2"
                disabled={createEvent.isPending}
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="h-6 px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Event Name</Label>
              <Input
                className={cn("h-7 text-xs", errors.eventName && "border-destructive")}
                placeholder="category.action_name"
                value={editData.eventName}
                onChange={(e) => updateEditField('eventName', e.target.value)}
              />
              {errors.eventName && (
                <p className="text-[10px] text-destructive mt-1">{errors.eventName}</p>
              )}
            </div>
            <div>
              <Label className="text-[10px]">Category</Label>
              <Select
                value={editData.category}
                onValueChange={(value) => updateEditField('category', value)}
              >
                <SelectTrigger className={cn("h-7 text-xs", errors.category && "border-destructive")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[10px]">Description</Label>
            <Input
              className={cn("h-7 text-xs", errors.description && "border-destructive")}
              placeholder="Brief description of when this event fires"
              value={editData.description}
              onChange={(e) => updateEditField('description', e.target.value)}
            />
            {errors.description && (
              <p className="text-[10px] text-destructive mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <Label className="text-[10px]">Available Variables (JSON)</Label>
            <Textarea
              className={cn("min-h-[60px] text-xs font-mono", errors.availableVariables && "border-destructive")}
              placeholder='{"userId": "UUID", "userName": "string"}'
              value={JSON.stringify(editData.availableVariables, null, 2)}
              onChange={(e) => {
                try {
                  updateEditField('availableVariables', JSON.parse(e.target.value));
                } catch {
                  updateEditField('availableVariables', e.target.value);
                }
              }}
            />
            {errors.availableVariables && (
              <p className="text-[10px] text-destructive mt-1">{errors.availableVariables}</p>
            )}
          </div>

          {errors.submit && (
            <p className="text-xs text-destructive">{errors.submit}</p>
          )}
        </div>
      )}

      {/* Event Categories */}
      {Object.entries(groupedEvents).map(([category, events]) => (
        <div key={category} className="space-y-2">
          <div className="flex items-center gap-2 px-2">
            <Badge className={cn("text-[10px] px-2 py-0", CATEGORY_COLORS[category])}>
              {category}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="h-7">
                <TableHead className="text-[10px] font-medium">Event Name</TableHead>
                <TableHead className="text-[10px] font-medium">Description</TableHead>
                <TableHead className="text-[10px] font-medium">Variables</TableHead>
                <TableHead className="text-[10px] font-medium text-center">Status</TableHead>
                <TableHead className="text-[10px] font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} className="h-8">
                  {editingId === event.id && editData ? (
                    <>
                      <TableCell className="py-1">
                        <Input
                          className="h-6 text-xs"
                          value={editData.eventName}
                          onChange={(e) => updateEditField('eventName', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          className="h-6 text-xs"
                          value={editData.description}
                          onChange={(e) => updateEditField('description', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Textarea
                          className="h-6 text-xs font-mono p-1"
                          value={JSON.stringify(editData.availableVariables, null, 0)}
                          onChange={(e) => {
                            try {
                              updateEditField('availableVariables', JSON.parse(e.target.value));
                            } catch {
                              updateEditField('availableVariables', e.target.value);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <Switch
                          checked={editData.isActive ?? false}
                          onCheckedChange={(checked) => updateEditField('isActive', checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right py-1">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSave}
                            className="h-5 px-1"
                            disabled={updateEvent.isPending}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                            className="h-5 px-1"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-xs font-mono">
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-amber-500" />
                          {event.eventName}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {event.description}
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground">
                        {event.availableVariables ?
                          Object.keys(event.availableVariables as object).length + ' vars' :
                          'None'
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(event)}
                          className={cn(
                            "h-5 px-1",
                            event.isActive ? "text-green-600" : "text-gray-400"
                          )}
                        >
                          {event.isActive ? (
                            <Power className="h-3 w-3" />
                          ) : (
                            <PowerOff className="h-3 w-3" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(event)}
                            className="h-5 px-1"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(event.id)}
                            className="h-5 px-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}