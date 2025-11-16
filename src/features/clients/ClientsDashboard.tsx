// ClientsDashboard.tsx - Main clients management page
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from '../../hooks/clients';
import {
  ClientTable,
  ClientDialog,
  ClientPageHeader,
  ClientDeleteDialog,
  ClientStatsCards,
  ClientFilters,
} from './components';
import type { ClientWithStats, ClientFilters as Filters, CreateClientData } from '../../types/client.types';

export function ClientsDashboard() {
  const navigate = useNavigate();

  // State management
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const [filters, setFilters] = useState<Filters>({});

  // Data fetching and mutations
  const { data: clients = [], isLoading } = useClients({ filters, withStats: true });
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  // Handler functions
  const handleAddClient = () => {
    setSelectedClient(null);
    setIsAddDialogOpen(true);
  };

  const handleEditClient = (client: ClientWithStats) => {
    setSelectedClient(client);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClient = (client: ClientWithStats) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  const handleViewClient = (clientId: string) => {
    navigate({ to: `/clients/${clientId}` });
  };

  const handleAddPolicy = (clientId: string) => {
    // Navigate to policies page with client pre-selected
    navigate({ to: '/policies' });
  };

  const handleSaveNewClient = async (data: CreateClientData) => {
    try {
      await createClient.mutateAsync(data);
      setIsAddDialogOpen(false);
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to create client:', error);
    }
  };

  const handleSaveEditClient = async (data: CreateClientData) => {
    if (!selectedClient) return;

    try {
      await updateClient.mutateAsync({ id: selectedClient.id, data });
      setIsEditDialogOpen(false);
      setSelectedClient(null);
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to update client:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedClient) return;

    try {
      await deleteClient.mutateAsync(selectedClient.id);
      setIsDeleteDialogOpen(false);
      setSelectedClient(null);
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to delete client:', error);
    }
  };

  // Cast clients data to ClientWithStats[] for TypeScript
  const typedClients = clients as ClientWithStats[];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <ClientPageHeader onAddClient={handleAddClient} />

      {/* Stats Cards */}
      <ClientStatsCards clients={typedClients} isLoading={isLoading} />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Filter Clients
            </h2>
            <span className="text-xs text-muted-foreground">
              {typedClients.length} {typedClients.length === 1 ? 'client' : 'clients'} found
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <ClientFilters filters={filters} onFiltersChange={setFilters} />
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              All Clients
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <ClientTable
            clients={typedClients}
            isLoading={isLoading}
            onViewClient={handleViewClient}
            onEditClient={handleEditClient}
            onDeleteClient={handleDeleteClient}
            onAddClient={handleAddClient}
            onAddPolicy={handleAddPolicy}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ClientDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleSaveNewClient}
        isSubmitting={createClient.isPending}
      />

      <ClientDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        client={selectedClient}
        onSave={handleSaveEditClient}
        isSubmitting={updateClient.isPending}
      />

      <ClientDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        client={selectedClient}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteClient.isPending}
      />
    </div>
  );
}