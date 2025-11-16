// ClientStatsCards.tsx - Summary statistics cards for clients dashboard
import { Users, UserCheck, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import type { ClientWithStats } from '@/types/client.types';

interface ClientStatsCardsProps {
  clients: ClientWithStats[];
  isLoading: boolean;
}

export function ClientStatsCards({ clients, isLoading }: ClientStatsCardsProps) {
  // Calculate statistics
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  const clientsWithPolicies = clients.filter(c => c.policy_count > 0).length;
  const totalPremium = clients.reduce((sum, c) => sum + c.total_premium, 0);
  const avgPremiumPerClient = totalClients > 0 ? totalPremium / totalClients : 0;

  const stats = [
    {
      title: 'Total Clients',
      value: totalClients,
      icon: Users,
      description: `${activeClients} active`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10',
    },
    {
      title: 'With Policies',
      value: clientsWithPolicies,
      icon: UserCheck,
      description: `${((clientsWithPolicies / Math.max(1, totalClients)) * 100).toFixed(0)}% of total`,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10',
    },
    {
      title: 'Total Premium',
      value: formatCurrency(totalPremium),
      icon: DollarSign,
      description: 'Annual premium',
      color: 'text-purple-600',
      bgColor: 'bg-purple-600/10',
    },
    {
      title: 'Avg Value',
      value: formatCurrency(avgPremiumPerClient),
      icon: TrendingUp,
      description: 'Per client',
      color: 'text-orange-600',
      bgColor: 'bg-orange-600/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`${stat.bgColor} p-2 rounded-lg`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}