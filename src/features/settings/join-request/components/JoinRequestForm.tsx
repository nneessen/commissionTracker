import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Send, Building2, Users } from 'lucide-react';
import {
  useAvailableImos,
  useAgenciesForImo,
  useCreateJoinRequest,
} from '@/hooks/join-request';

interface JoinRequestFormProps {
  onSuccess?: () => void;
}

export function JoinRequestForm({ onSuccess }: JoinRequestFormProps) {
  const [selectedImoId, setSelectedImoId] = useState<string>('');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [message, setMessage] = useState('');

  const { data: imos, isLoading: imosLoading } = useAvailableImos();
  const { data: agencies, isLoading: agenciesLoading } = useAgenciesForImo(
    selectedImoId || null
  );
  const createRequest = useCreateJoinRequest();

  const handleImoChange = (value: string) => {
    setSelectedImoId(value);
    setSelectedAgencyId('__none__'); // Reset agency when IMO changes
  };

  const handleAgencyChange = (value: string) => {
    setSelectedAgencyId(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedImoId) {
      toast.error('Please select an IMO');
      return;
    }

    try {
      await createRequest.mutateAsync({
        imo_id: selectedImoId,
        agency_id: selectedAgencyId === '__none__' ? null : selectedAgencyId || null,
        message: message.trim() || null,
      });

      toast.success('Join request submitted successfully');
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit request'
      );
    }
  };

  const selectedImo = imos?.find((i) => i.id === selectedImoId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4" />
          Request to Join
        </CardTitle>
        <CardDescription className="text-xs">
          Select an organization to join. Your request will be reviewed by an administrator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* IMO Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="imo" className="text-xs font-medium">
              <Building2 className="h-3 w-3 inline mr-1" />
              Select IMO *
            </Label>
            <Select value={selectedImoId} onValueChange={handleImoChange}>
              <SelectTrigger id="imo" className="h-8 text-sm">
                <SelectValue placeholder={imosLoading ? 'Loading...' : 'Select an IMO'} />
              </SelectTrigger>
              <SelectContent>
                {imos?.map((imo) => (
                  <SelectItem key={imo.id} value={imo.id} className="text-sm">
                    <span className="font-medium">{imo.name}</span>
                    <span className="text-muted-foreground ml-2">({imo.code})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedImo?.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedImo.description}
              </p>
            )}
          </div>

          {/* Agency Selection (Optional) */}
          {selectedImoId && (
            <div className="space-y-1.5">
              <Label htmlFor="agency" className="text-xs font-medium">
                <Users className="h-3 w-3 inline mr-1" />
                Select Agency (Optional)
              </Label>
              <Select value={selectedAgencyId} onValueChange={handleAgencyChange}>
                <SelectTrigger id="agency" className="h-8 text-sm">
                  <SelectValue
                    placeholder={
                      agenciesLoading
                        ? 'Loading...'
                        : agencies?.length
                        ? 'Select an agency'
                        : 'No agencies available'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-sm text-muted-foreground">
                    No specific agency
                  </SelectItem>
                  {agencies?.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id} className="text-sm">
                      <span className="font-medium">{agency.name}</span>
                      <span className="text-muted-foreground ml-2">({agency.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Message */}
          <div className="space-y-1.5">
            <Label htmlFor="message" className="text-xs font-medium">
              Message (Optional)
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell them a bit about yourself..."
              className="text-sm resize-none"
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!selectedImoId || createRequest.isPending}
            className="w-full h-8 text-sm"
          >
            {createRequest.isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-3 w-3 mr-1" />
                Submit Request
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
