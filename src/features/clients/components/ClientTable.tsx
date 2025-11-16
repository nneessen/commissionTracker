// ClientTable.tsx - Data grid for displaying clients with actions
import { Edit, Trash2, Eye, FileText, UserPlus, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import type { ClientWithStats, ClientStatus } from '@/types/client.types';
import { calculateAge, formatPhoneNumber, getClientInitials } from '@/types/client.types';

interface ClientTableProps {
  clients: ClientWithStats[];
  isLoading: boolean;
  onViewClient: (clientId: string) => void;
  onEditClient: (client: ClientWithStats) => void;
  onDeleteClient: (client: ClientWithStats) => void;
  onAddClient: () => void;
  onAddPolicy?: (clientId: string) => void;
}

const STATUS_STYLES: Record<ClientStatus, { bg: string; text: string; label: string }> = {
  active: {
    bg: 'bg-green-500/10',
    text: 'text-green-700 dark:text-green-400',
    label: 'Active',
  },
  inactive: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-700 dark:text-gray-400',
    label: 'Inactive',
  },
  lead: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Lead',
  },
};

function ClientTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Policies</TableHead>
            <TableHead className="text-right">Total Premium</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-16" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-12 ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-4 w-20 ml-auto" />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ClientTable({
  clients,
  isLoading,
  onViewClient,
  onEditClient,
  onDeleteClient,
  onAddClient,
  onAddPolicy,
}: ClientTableProps) {
  if (isLoading) {
    return <ClientTableSkeleton />;
  }

  if (clients.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No clients found</EmptyTitle>
          <EmptyDescription>
            Get started by adding your first client to track their insurance policies
          </EmptyDescription>
        </EmptyHeader>
        <Button onClick={onAddClient}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add First Client
        </Button>
      </Empty>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Policies</TableHead>
            <TableHead className="text-right">Total Premium</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const age = calculateAge(client.date_of_birth);
            const statusStyle = STATUS_STYLES[client.status];
            const initials = getClientInitials(client.name);

            return (
              <TableRow key={client.id}>
                {/* Name with Avatar */}
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials}
                    </div>
                    <button
                      onClick={() => onViewClient(client.id)}
                      className="font-medium hover:underline text-left"
                    >
                      {client.name}
                    </button>
                  </div>
                </TableCell>

                {/* Contact Info */}
                <TableCell>
                  <div className="text-xs space-y-1">
                    {client.email && (
                      <a
                        href={`mailto:${client.email}`}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </a>
                    )}
                    {client.phone && (
                      <a
                        href={`tel:${client.phone}`}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        {formatPhoneNumber(client.phone)}
                      </a>
                    )}
                    {!client.email && !client.phone && (
                      <span className="text-muted-foreground">No contact info</span>
                    )}
                  </div>
                </TableCell>

                {/* Age */}
                <TableCell>
                  {age !== null ? (
                    <span className="text-sm">{age} yrs</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge className={`${statusStyle.bg} ${statusStyle.text} capitalize`}>
                    {statusStyle.label}
                  </Badge>
                </TableCell>

                {/* Policy Count */}
                <TableCell className="text-right">
                  {client.policy_count > 0 ? (
                    <div className="text-sm">
                      <span className="font-medium">{client.policy_count}</span>
                      {client.active_policy_count > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({client.active_policy_count} active)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </TableCell>

                {/* Total Premium */}
                <TableCell className="text-right">
                  {client.total_premium > 0 ? (
                    <span className="font-medium">{formatCurrency(client.total_premium)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewClient(client.id)}
                      title="View Details"
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {onAddPolicy && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onAddPolicy(client.id)}
                        title="Add Policy"
                        className="h-8 w-8 p-0"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditClient(client)}
                      title="Edit Client"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteClient(client)}
                      title="Delete Client"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={client.policy_count > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}