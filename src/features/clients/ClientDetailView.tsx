// ClientDetailView.tsx - Individual client detail page with policies and statistics
import { useParams, useNavigate } from '@tanstack/react-router';
import { useClientWithPolicies } from '../../hooks/clients/useClientWithPolicies';
import { useUpdateClient } from '../../hooks/clients/useUpdateClient';
import { useDeleteClient } from '../../hooks/clients/useDeleteClient';
import { formatCurrency } from '../../lib/format';
import { format } from 'date-fns';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { ClientDialog } from './components/ClientDialog';
import { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Edit2,
  Trash2,
  DollarSign,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  calculateAge,
  formatPhoneNumber,
  getAgeGroup,
  calculateClientSegment,
  type ClientStatus
} from '../../types/client.types';

export const ClientDetailView = () => {
  const { clientId } = useParams({ from: '/clients/$clientId' });
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: client, isLoading, error } = useClientWithPolicies(clientId);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const handleDelete = async () => {
    try {
      await deleteClient.mutateAsync(clientId);
      navigate({ to: '/clients' });
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-96" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Client not found</h2>
          <p className="text-muted-foreground mb-4">The client you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => navigate({ to: '/clients' })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  const age = calculateAge(client.date_of_birth);
  const segment = calculateClientSegment({
    ...client,
    policy_count: client.stats.total,
    active_policy_count: client.stats.active,
    total_premium: client.stats.totalPremium,
    avg_premium: client.stats.avgPremium,
    last_policy_date: client.stats.lastPolicyDate
  });

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'lead': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'high_value': return 'bg-purple-100 text-purple-800';
      case 'medium_value': return 'bg-blue-100 text-blue-800';
      case 'low_value': return 'bg-yellow-100 text-yellow-800';
      case 'at_risk': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/clients' })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <Badge className={getStatusColor(client.status)}>
              {client.status}
            </Badge>
            <Badge className={getSegmentColor(segment)}>
              {segment.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Client since {format(new Date(client.created_at), 'MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {client.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${client.email}`} className="text-sm hover:underline">
                      {client.email}
                    </a>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${client.phone}`} className="text-sm hover:underline">
                      {formatPhoneNumber(client.phone)}
                    </a>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{client.address}</span>
                  </div>
                )}
                {client.date_of_birth && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(client.date_of_birth), 'MMMM d, yyyy')}
                      {age && ` (${age} years old, ${getAgeGroup(age)})`}
                    </span>
                  </div>
                )}
                {!client.email && !client.phone && !client.address && !client.date_of_birth && (
                  <p className="text-sm text-muted-foreground">No contact information available</p>
                )}
              </div>
              {client.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Policies */}
          <Card>
            <CardHeader>
              <CardTitle>Policies</CardTitle>
              <CardDescription>
                {client.stats.total} total policies ({client.stats.active} active)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {client.policies.length > 0 ? (
                <div className="space-y-3">
                  {client.policies.map((policy) => (
                    <div
                      key={policy.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate({ to: '/policies' })}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{policy.policyNumber}</span>
                          <Badge variant={policy.status === 'active' ? 'default' : 'secondary'}>
                            {policy.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {policy.carrierId} • {policy.product}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Effective: {format(new Date(policy.effectiveDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(policy.annualPremium)}</div>
                        <div className="text-xs text-muted-foreground">Annual Premium</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No policies found for this client</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Total Policies</span>
                  </div>
                  <span className="font-semibold">{client.stats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Active Policies</span>
                  </div>
                  <span className="font-semibold">{client.stats.active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Total Premium</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(client.stats.totalPremium)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Avg Premium</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(client.stats.avgPremium)}</span>
                </div>
                {client.stats.avgPolicyAge > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Avg Policy Age</span>
                    </div>
                    <span className="font-semibold">{client.stats.avgPolicyAge} months</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Policy Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Policy Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">Active</span>
                  <span className="font-semibold">{client.stats.active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-orange-600">Lapsed</span>
                  <span className="font-semibold">{client.stats.lapsed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-600">Cancelled</span>
                  <span className="font-semibold">{client.stats.cancelled}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <ClientDialog
          client={client}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={async (data) => {
            await updateClient.mutateAsync({ id: clientId, data });
            setIsEditDialogOpen(false);
          }}
          isSubmitting={updateClient.isPending}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {client.name}? This action cannot be undone.
              {client.stats.total > 0 && (
                <span className="block mt-2 font-semibold text-red-600">
                  Warning: This client has {client.stats.total} associated policies.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};