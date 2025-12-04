// src/features/hierarchy/AgentDetailPage.tsx

import React, { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  DollarSign,
  TrendingUp,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileCheck,
  AlertCircle,
  ChevronRight,
  Shield,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { hierarchyService } from '@/services/hierarchy/hierarchyService';
import { formatCurrency, formatPercent, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import showToast from '@/utils/toast';
import { EditAgentModal } from './components/EditAgentModal';

export function AgentDetailPage() {
  const { agentId } = useParams({ from: '/hierarchy/agent/$agentId' });
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch comprehensive agent data
  const { data: agentData, isLoading: loadingAgent } = useQuery({
    queryKey: ['agent-details', agentId],
    queryFn: () => hierarchyService.getAgentDetails(agentId),
  });

  const { data: policies, isLoading: loadingPolicies } = useQuery({
    queryKey: ['agent-policies', agentId],
    queryFn: () => hierarchyService.getAgentPolicies(agentId),
    enabled: !!agentId,
  });

  const { data: commissions, isLoading: loadingCommissions } = useQuery({
    queryKey: ['agent-commissions', agentId],
    queryFn: () => hierarchyService.getAgentCommissions(agentId),
    enabled: !!agentId,
  });

  const { data: overrides, isLoading: loadingOverrides } = useQuery({
    queryKey: ['agent-overrides', agentId],
    queryFn: () => hierarchyService.getAgentOverrides(agentId),
    enabled: !!agentId,
  });

  const { data: teamComparison } = useQuery({
    queryKey: ['team-comparison', agentId],
    queryFn: () => hierarchyService.getTeamComparison(agentId),
    enabled: !!agentId,
  });

  if (loadingAgent) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-muted-foreground">Loading agent details...</div>
      </div>
    );
  }

  if (!agentData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">Agent not found</div>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: '/hierarchy' })}>
          Back to Team
        </Button>
      </div>
    );
  }

  // Calculate additional metrics
  const policyList = policies?.policies || [];
  const mtdMetrics = {
    policies: policyList.filter((p: any) => {
      const pDate = new Date(p.issueDate);
      const now = new Date();
      return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
    }).length,
    premium: policyList.filter((p: any) => {
      const pDate = new Date(p.issueDate);
      const now = new Date();
      return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
    }).reduce((sum: number, p: any) => sum + (p.annualPremium || 0), 0),
  };

  const ytdMetrics = {
    policies: policyList.filter((p: any) => {
      const pDate = new Date(p.issueDate);
      const now = new Date();
      return pDate.getFullYear() === now.getFullYear();
    }).length,
    premium: policyList.filter((p: any) => {
      const pDate = new Date(p.issueDate);
      const now = new Date();
      return pDate.getFullYear() === now.getFullYear();
    }).reduce((sum: number, p: any) => sum + (p.annualPremium || 0), 0),
  };

  const commissionMetrics = {
    total: commissions?.totalEarned || 0,
    earned: commissions?.paid || 0,
    unearned: commissions?.pending || 0,
    chargebacks: commissions?.chargebacks || 0,
  };

  const overrideMetrics = {
    total: overrides?.mtd || 0,
    ytd: overrides?.ytd || 0,
  };

  return (
    <div className="container mx-auto p-2 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/hierarchy' })}
            className="h-7 px-2"
          >
            <ArrowLeft className="h-3 w-3 mr-0.5" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <h1 className="text-sm font-semibold">Agent Details</h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => {
            // TODO: Integrate with email system when ready
            showToast.success(`Message feature coming soon for ${agentData.email}`);
          }}>
            <Mail className="h-3 w-3 mr-1" />
            Send Message
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsEditModalOpen(true)}>
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Agent Info Card */}
      <Card>
        <CardContent className="p-2">
          <div className="flex items-start justify-between">
            <div className="flex gap-2">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold">
                  {agentData.first_name && agentData.last_name
                    ? `${agentData.first_name} ${agentData.last_name}`
                    : agentData.email}
                </h2>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {agentData.email}
                  </span>
                  {agentData.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {agentData.phone}
                    </span>
                  )}
                  {agentData.state && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {agentData.state}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-[10px]">
                    Contract Level {agentData.contract_level || 100}
                  </Badge>
                  {agentData.current_onboarding_phase && (
                    <Badge variant="outline" className="text-[10px]">
                      {agentData.current_onboarding_phase}
                    </Badge>
                  )}
                  {agentData.approval_status === 'approved' ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/10 text-yellow-600 text-[10px]">
                      {agentData.approval_status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-xs text-muted-foreground">
                Joined {formatDate(agentData.created_at)}
              </div>
              {agentData.uplineEmail && (
                <div className="text-xs text-muted-foreground">
                  Upline: {agentData.uplineEmail}
                </div>
              )}
              {agentData.license_number && (
                <div className="text-xs text-muted-foreground">
                  License: {agentData.license_number}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">MTD Policies</p>
                <p className="text-sm font-bold">{mtdMetrics.policies}</p>
              </div>
              <FileCheck className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">MTD Premium</p>
                <p className="text-sm font-bold">{formatCurrency(mtdMetrics.premium)}</p>
              </div>
              <DollarSign className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">YTD Policies</p>
                <p className="text-sm font-bold">{ytdMetrics.policies}</p>
              </div>
              <Target className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">YTD Premium</p>
                <p className="text-sm font-bold">{formatCurrency(ytdMetrics.premium)}</p>
              </div>
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="policies" className="space-y-2">
        <TabsList className="grid grid-cols-4 w-full max-w-md h-8">
          <TabsTrigger value="policies" className="text-[10px]">Policies</TabsTrigger>
          <TabsTrigger value="commissions" className="text-[10px]">Commissions</TabsTrigger>
          <TabsTrigger value="overrides" className="text-[10px]">Overrides</TabsTrigger>
          <TabsTrigger value="team" className="text-[10px]">Team</TabsTrigger>
        </TabsList>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-2">
          <Card>
            <CardHeader className="pb-2 pt-2">
              <CardTitle className="text-xs">Policy History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Policy #</TableHead>
                      <TableHead className="text-[10px]">Product</TableHead>
                      <TableHead className="text-[10px]">Carrier</TableHead>
                      <TableHead className="text-[10px]">Effective</TableHead>
                      <TableHead className="text-[10px]">Premium</TableHead>
                      <TableHead className="text-[10px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPolicies ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                          Loading policies...
                        </TableCell>
                      </TableRow>
                    ) : policyList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                          No policies found
                        </TableCell>
                      </TableRow>
                    ) : (
                      policyList.slice(0, 10).map((policy: any) => (
                        <TableRow key={policy.id}>
                          <TableCell className="text-[11px] font-mono">
                            {policy.policyNumber}
                          </TableCell>
                          <TableCell className="text-[11px]">{policy.product}</TableCell>
                          <TableCell className="text-[11px]">{policy.carrier}</TableCell>
                          <TableCell className="text-[11px]">
                            {formatDate(policy.issueDate)}
                          </TableCell>
                          <TableCell className="text-[11px] font-semibold">
                            {formatCurrency(policy.annualPremium)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px]',
                                policy.status === 'active' && 'text-emerald-600',
                                policy.status === 'lapsed' && 'text-yellow-600',
                                policy.status === 'cancelled' && 'text-red-600'
                              )}
                            >
                              {policy.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
            <Card>
              <CardContent className="p-1.5">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold">{formatCurrency(commissionMetrics.total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-1.5">
                <p className="text-[10px] text-muted-foreground">Earned</p>
                <p className="text-sm font-bold text-emerald-600">
                  {formatCurrency(commissionMetrics.earned)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-1.5">
                <p className="text-[10px] text-muted-foreground">Unearned</p>
                <p className="text-sm font-bold text-yellow-600">
                  {formatCurrency(commissionMetrics.unearned)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-1.5">
                <p className="text-[10px] text-muted-foreground">Chargebacks</p>
                <p className="text-sm font-bold text-red-600">
                  {formatCurrency(commissionMetrics.chargebacks)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2 pt-2">
              <CardTitle className="text-xs">Commission History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Date</TableHead>
                      <TableHead className="text-[10px]">Type</TableHead>
                      <TableHead className="text-[10px]">Policy</TableHead>
                      <TableHead className="text-[10px]">Amount</TableHead>
                      <TableHead className="text-[10px]">Earned</TableHead>
                      <TableHead className="text-[10px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingCommissions ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                          Loading commissions...
                        </TableCell>
                      </TableRow>
                    ) : !commissions?.recent || commissions.recent.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                          No commissions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      commissions.recent.map((commission: any) => (
                        <TableRow key={commission.id}>
                          <TableCell className="text-[11px]">
                            {formatDate(commission.date)}
                          </TableCell>
                          <TableCell className="text-[11px]">{commission.type}</TableCell>
                          <TableCell className="text-[11px] font-mono">
                            {commission.policyNumber}
                          </TableCell>
                          <TableCell className="text-[11px] font-semibold">
                            {formatCurrency(commission.amount)}
                          </TableCell>
                          <TableCell className="text-[11px]">
                            {formatCurrency(commission.amount * 0.2)} {/* Estimate 20% earned */}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[9px]',
                                commission.status === 'paid' && 'text-emerald-600',
                                commission.status === 'pending' && 'text-yellow-600'
                              )}
                            >
                              {commission.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overrides Tab */}
        <TabsContent value="overrides" className="space-y-2">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Card>
              <CardContent className="p-2">
                <p className="text-[10px] text-muted-foreground">MTD Overrides</p>
                <p className="text-sm font-bold text-emerald-600">
                  {formatCurrency(overrideMetrics.total)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <p className="text-[10px] text-muted-foreground">YTD Overrides</p>
                <p className="text-sm font-bold text-emerald-600">
                  {formatCurrency(overrideMetrics.ytd)}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2 pt-2">
              <CardTitle className="text-xs">Override Commission Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {overrideMetrics.total > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    This agent has earned override commissions from their downline's production.
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span>MTD Override Income:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(overrideMetrics.total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>YTD Override Income:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(overrideMetrics.ytd)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No override commissions earned yet. This agent will earn overrides when their downline agents write business.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-2">
          {teamComparison ? (
            <div className="space-y-2">
              <Card>
                <CardHeader className="pb-2 pt-2">
                  <CardTitle className="text-xs">Performance vs Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Policies Rank</span>
                      <span className="font-semibold">
                        #{teamComparison.policies_rank} of {teamComparison.team_size}
                      </span>
                    </div>
                    <Progress
                      value={((teamComparison.team_size - teamComparison.policies_rank + 1) / teamComparison.team_size) * 100}
                      className="h-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Premium Rank</span>
                      <span className="font-semibold">
                        #{teamComparison.premium_rank} of {teamComparison.team_size}
                      </span>
                    </div>
                    <Progress
                      value={((teamComparison.team_size - teamComparison.premium_rank + 1) / teamComparison.team_size) * 100}
                      className="h-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Commission Rank</span>
                      <span className="font-semibold">
                        #{teamComparison.commission_rank} of {teamComparison.team_size}
                      </span>
                    </div>
                    <Progress
                      value={((teamComparison.team_size - teamComparison.commission_rank + 1) / teamComparison.team_size) * 100}
                      className="h-1"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-2">
                <Card>
                  <CardContent className="p-2">
                    <p className="text-[10px] text-muted-foreground">vs Team Avg Policies</p>
                    <p className="text-xs font-bold">
                      {teamComparison.policies_vs_avg > 0 ? '+' : ''}
                      {teamComparison.policies_vs_avg}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-2">
                    <p className="text-[10px] text-muted-foreground">vs Team Avg Premium</p>
                    <p className="text-xs font-bold">
                      {teamComparison.premium_vs_avg > 0 ? '+' : ''}
                      {teamComparison.premium_vs_avg}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No team comparison data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Agent Modal */}
      <EditAgentModal
        agent={agentData}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
}