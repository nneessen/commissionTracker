// src/features/hierarchy/components/AgentDetailModal.tsx

import React, { useState } from 'react';
import {X, User, Mail, Phone, Calendar, TrendingUp, DollarSign, AlertCircle, Target, Award, Activity, FileText, Users, BarChart3, Clock, ChevronRight} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Progress} from '@/components/ui/progress';
import {formatCurrency, formatDate, formatPercent} from '@/lib/format';

// Safe formatters that handle null/undefined/invalid values
const safeFormatDate = (date: any): string => {
  if (!date) return 'N/A';

  // Handle undefined, null, or empty string
  if (date === undefined || date === null || date === '') return 'N/A';

  try {
    const formatted = formatDate(date);
    // Check if the result is valid
    if (formatted === 'Invalid Date' || formatted.includes('NaN')) {
      console.warn('Invalid date format:', date);
      return 'N/A';
    }
    return formatted;
  } catch (error) {
    console.warn('Error formatting date:', date, error);
    return 'N/A';
  }
};

const safeFormatCurrency = (amount: any): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0';
  return formatCurrency(Number(amount));
};

const safeFormatPercent = (value: any, decimals?: number): string => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return formatPercent(Number(value), decimals);
};
import {useAgentDetails} from '@/hooks/hierarchy/useAgentDetails';
import {useAgentPolicies} from '@/hooks/hierarchy/useAgentPolicies';
import {useAgentCommissions} from '@/hooks/hierarchy/useAgentCommissions';
import {useAgentOverrides} from '@/hooks/hierarchy/useAgentOverrides';
import {useTeamComparison} from '@/hooks/hierarchy/useTeamComparison';
import {cn} from '@/lib/utils';
import type {HierarchyNode} from '@/types/hierarchy.types';

interface AgentDetailModalProps {
  agent: HierarchyNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Comprehensive agent detail modal showing all relevant data for a manager
 */
export function AgentDetailModal({ agent, open, onOpenChange }: AgentDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch all agent data
  const { data: details } = useAgentDetails(agent?.id, { enabled: !!agent });
  const { data: policies } = useAgentPolicies(agent?.id, { enabled: !!agent });
  const { data: commissions } = useAgentCommissions(agent?.id, { enabled: !!agent });
  const { data: overrides } = useAgentOverrides(agent?.id, { enabled: !!agent });
  const { data: comparison } = useTeamComparison(agent?.id, { enabled: !!agent });

  if (!agent) return null;

  // Performance indicators
  const performanceScore = details?.performanceScore || 0;
  const performanceColor = performanceScore >= 90 ? 'text-emerald-600' :
                          performanceScore >= 70 ? 'text-amber-600' : 'text-red-600';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                {agent.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-xl">{agent.email}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Comprehensive agent performance and activity details
                </DialogDescription>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <Badge variant="outline" className="text-xs">Level {agent.hierarchy_depth}</Badge>
                  {details?.joinDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {safeFormatDate(details?.joinDate)}
                    </span>
                  )}
                  <span className={cn("flex items-center gap-1 font-medium", performanceColor)}>
                    <TrendingUp className="h-3 w-3" />
                    {performanceScore}% Performance
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start px-6 bg-muted/30">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="commissions">Commissions</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="comparison">Team Comparison</TabsTrigger>
            </TabsList>

            <div className="p-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0 space-y-6">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg p-4 bg-blue-50/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <p className="text-xs font-medium text-muted-foreground">Total Policies</p>
                    </div>
                    <p className="text-2xl font-bold">{details?.totalPolicies || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {details?.activePolicies || 0} active
                    </p>
                  </div>

                  <div className="rounded-lg p-4 bg-emerald-50/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <p className="text-xs font-medium text-muted-foreground">Total Premium</p>
                    </div>
                    <p className="text-2xl font-bold">{safeFormatCurrency(details?.totalPremium)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {safeFormatCurrency(details?.avgPremium)} avg
                    </p>
                  </div>

                  <div className="rounded-lg p-4 bg-amber-50/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-amber-600" />
                      <p className="text-xs font-medium text-muted-foreground">Persistency</p>
                    </div>
                    <p className="text-2xl font-bold">{safeFormatPercent(details?.persistencyRate)}</p>
                    <Progress value={details?.persistencyRate || 0} className="mt-2 h-1" />
                  </div>

                  <div className="rounded-lg p-4 bg-violet-50/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-4 w-4 text-violet-600" />
                      <p className="text-xs font-medium text-muted-foreground">Overrides Gen.</p>
                    </div>
                    <p className="text-2xl font-bold">{safeFormatCurrency(details?.overridesGenerated)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This month
                    </p>
                  </div>
                </div>

                {/* Contact & Hierarchy Info */}
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          Email
                        </span>
                        <span className="text-sm font-medium">{agent.email}</span>
                      </div>
                      {details?.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            Phone
                          </span>
                          <span className="text-sm font-medium">{details.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <User className="h-3 w-3" />
                          Status
                        </span>
                        <Badge variant={details?.isActive ? "default" : "secondary"}>
                          {details?.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Hierarchy Position</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Level</span>
                        <span className="text-sm font-medium">Level {agent.hierarchy_depth}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Reports To</span>
                        <span className="text-sm font-medium">{details?.uplineEmail || 'None (Root)'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Direct Reports</span>
                        <span className="text-sm font-medium">{agent.direct_downline_count || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Downline</span>
                        <span className="text-sm font-medium">{agent.downline_count || 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {details?.recentActivity?.map((activity: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center text-xs",
                            activity.type === 'policy' ? 'bg-blue-100 text-blue-600' :
                            activity.type === 'commission' ? 'bg-emerald-100 text-emerald-600' :
                            'bg-amber-100 text-amber-600'
                          )}>
                            {activity.type === 'policy' ? <FileText className="h-3 w-3" /> :
                             activity.type === 'commission' ? <DollarSign className="h-3 w-3" /> :
                             <AlertCircle className="h-3 w-3" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">{activity.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {safeFormatDate(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      )) || (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No recent activity
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="mt-0 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Monthly Trends */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Monthly Performance Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {details?.monthlyTrends?.map((month: any) => (
                          <div key={month.month} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{month.month}</span>
                              <span className="font-medium">{safeFormatCurrency(month.premium)}</span>
                            </div>
                            <Progress value={month.percentOfBest} className="h-2" />
                          </div>
                        )) || <p className="text-sm text-muted-foreground">No data available</p>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Product Mix */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Product Mix</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {details?.productMix?.map((product: any) => (
                          <div key={product.name} className="flex justify-between items-center">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.count} policies • {safeFormatCurrency(product.premium)}
                              </p>
                            </div>
                            <Badge variant="outline">{product.percentage}%</Badge>
                          </div>
                        )) || <p className="text-sm text-muted-foreground">No data available</p>}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* KPI Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">KPI Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Annual Premium Target</span>
                          <span className="text-sm font-medium">
                            {safeFormatCurrency(details?.ytdPremium)} / {safeFormatCurrency(details?.annualTarget)}
                          </span>
                        </div>
                        <Progress value={((details?.ytdPremium || 0) / (details?.annualTarget || 1)) * 100} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Policy Count Target</span>
                          <span className="text-sm font-medium">
                            {details?.ytdPolicies || 0} / {details?.policyTarget || 0}
                          </span>
                        </div>
                        <Progress value={((details?.ytdPolicies || 0) / (details?.policyTarget || 1)) * 100} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Persistency Target</span>
                          <span className="text-sm font-medium">
                            {safeFormatPercent(details?.persistencyRate)} / 85%
                          </span>
                        </div>
                        <Progress value={(details?.persistencyRate || 0)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Commissions Tab */}
              <TabsContent value="commissions" className="mt-0 space-y-6">
                {/* Commission Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg p-3 bg-emerald-50/50 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
                    <p className="text-xl font-bold">{safeFormatCurrency(commissions?.totalEarned)}</p>
                  </div>
                  <div className="rounded-lg p-3 bg-blue-50/50 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1">Pending</p>
                    <p className="text-xl font-bold">{safeFormatCurrency(commissions?.pending)}</p>
                  </div>
                  <div className="rounded-lg p-3 bg-amber-50/50 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1">Advances</p>
                    <p className="text-xl font-bold">{safeFormatCurrency(commissions?.advances)}</p>
                  </div>
                  <div className="rounded-lg p-3 bg-red-50/50 shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1">Chargebacks</p>
                    <p className="text-xl font-bold">{safeFormatCurrency(commissions?.chargebacks)}</p>
                  </div>
                </div>

                {/* Recent Commissions Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recent Commissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Policy</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissions?.recent?.map((comm: any) => (
                          <TableRow key={comm.id}>
                            <TableCell className="text-sm">{safeFormatDate(comm.date)}</TableCell>
                            <TableCell className="text-sm">{comm.policyNumber}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{comm.type}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {safeFormatCurrency(comm.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                comm.status === 'paid' ? 'default' :
                                comm.status === 'pending' ? 'secondary' : 'destructive'
                              }>
                                {comm.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )) || (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No commission data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Override Income */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Override Income Generated</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">This Month</p>
                          <p className="text-xs text-muted-foreground">Based on team production</p>
                        </div>
                        <p className="text-xl font-bold">{safeFormatCurrency(overrides?.mtd)}</p>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">Year to Date</p>
                          <p className="text-xs text-muted-foreground">Total overrides generated</p>
                        </div>
                        <p className="text-xl font-bold">{safeFormatCurrency(overrides?.ytd)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Policies Tab */}
              <TabsContent value="policies" className="mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Policy Portfolio</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {policies?.total || 0} Total
                        </Badge>
                        <Badge variant="default">
                          {policies?.active || 0} Active
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Policy #</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Carrier</TableHead>
                          <TableHead className="text-right">Premium</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Issue Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {policies?.policies?.map((policy: any) => (
                          <TableRow key={policy.id}>
                            <TableCell className="font-medium text-sm">{policy.policyNumber}</TableCell>
                            <TableCell className="text-sm">{policy.clientName}</TableCell>
                            <TableCell className="text-sm">{policy.product}</TableCell>
                            <TableCell className="text-sm">{policy.carrier}</TableCell>
                            <TableCell className="text-right font-medium">
                              {safeFormatCurrency(policy.annualPremium)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                policy.status === 'active' ? 'default' :
                                policy.status === 'lapsed' ? 'destructive' : 'secondary'
                              }>
                                {policy.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{safeFormatDate(policy.issueDate)}</TableCell>
                          </TableRow>
                        )) || (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              No policies found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Complete Activity History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {details?.activityHistory?.map((activity: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 pb-4 border-b last:border-0">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center",
                            activity.category === 'policy' ? 'bg-blue-100' :
                            activity.category === 'commission' ? 'bg-emerald-100' :
                            activity.category === 'override' ? 'bg-violet-100' :
                            'bg-amber-100'
                          )}>
                            {activity.category === 'policy' ? <FileText className="h-4 w-4 text-blue-600" /> :
                             activity.category === 'commission' ? <DollarSign className="h-4 w-4 text-emerald-600" /> :
                             activity.category === 'override' ? <Users className="h-4 w-4 text-violet-600" /> :
                             <Activity className="h-4 w-4 text-amber-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{activity.title}</p>
                              <p className="text-sm text-muted-foreground">{safeFormatDate(activity.date)}</p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                            {activity.metadata && (
                              <div className="mt-2 p-2 rounded bg-muted/30">
                                <pre className="text-xs">{JSON.stringify(activity.metadata, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )) || (
                        <p className="text-center text-muted-foreground py-8">
                          No activity history available
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Team Comparison Tab */}
              <TabsContent value="comparison" className="mt-0 space-y-6">
                {/* Rankings */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Premium Ranking</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <p className="text-3xl font-bold">#{comparison?.premiumRank || '-'}</p>
                        <p className="text-sm text-muted-foreground">
                          of {comparison?.totalAgents || 0} agents
                        </p>
                        <Badge className="mt-2" variant={
                          comparison?.premiumPercentile >= 90 ? 'default' :
                          comparison?.premiumPercentile >= 70 ? 'secondary' : 'outline'
                        }>
                          Top {100 - (comparison?.premiumPercentile || 0)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Policy Count Ranking</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <p className="text-3xl font-bold">#{comparison?.policyRank || '-'}</p>
                        <p className="text-sm text-muted-foreground">
                          of {comparison?.totalAgents || 0} agents
                        </p>
                        <Badge className="mt-2" variant={
                          comparison?.policyPercentile >= 90 ? 'default' :
                          comparison?.policyPercentile >= 70 ? 'secondary' : 'outline'
                        }>
                          Top {100 - (comparison?.policyPercentile || 0)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Persistency Ranking</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <p className="text-3xl font-bold">#{comparison?.persistencyRank || '-'}</p>
                        <p className="text-sm text-muted-foreground">
                          of {comparison?.totalAgents || 0} agents
                        </p>
                        <Badge className="mt-2" variant={
                          comparison?.persistencyPercentile >= 90 ? 'default' :
                          comparison?.persistencyPercentile >= 70 ? 'secondary' : 'outline'
                        }>
                          Top {100 - (comparison?.persistencyPercentile || 0)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Comparison vs Team Average */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Performance vs Team Average</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Premium Production</span>
                          <div className="text-sm text-right">
                            <span className="font-medium">{safeFormatCurrency(details?.totalPremium)}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="text-muted-foreground">{safeFormatCurrency(comparison?.avgPremium)} avg</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(((details?.totalPremium || 0) / (comparison?.avgPremium || 1)) * 100, 100)} className="flex-1" />
                          <Badge variant={
                            (details?.totalPremium || 0) > (comparison?.avgPremium || 0) ? 'default' : 'secondary'
                          }>
                            {(((details?.totalPremium || 0) / (comparison?.avgPremium || 1)) * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Policy Count</span>
                          <div className="text-sm text-right">
                            <span className="font-medium">{details?.totalPolicies || 0}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="text-muted-foreground">{comparison?.avgPolicies || 0} avg</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(((details?.totalPolicies || 0) / (comparison?.avgPolicies || 1)) * 100, 100)} className="flex-1" />
                          <Badge variant={
                            (details?.totalPolicies || 0) > (comparison?.avgPolicies || 0) ? 'default' : 'secondary'
                          }>
                            {(((details?.totalPolicies || 0) / (comparison?.avgPolicies || 1)) * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Persistency Rate</span>
                          <div className="text-sm text-right">
                            <span className="font-medium">{safeFormatPercent(details?.persistencyRate)}</span>
                            <span className="text-muted-foreground"> / </span>
                            <span className="text-muted-foreground">{safeFormatPercent(comparison?.avgPersistency)} avg</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(((details?.persistencyRate || 0) / (comparison?.avgPersistency || 1)) * 100, 100)} className="flex-1" />
                          <Badge variant={
                            (details?.persistencyRate || 0) > (comparison?.avgPersistency || 0) ? 'default' : 'secondary'
                          }>
                            {(((details?.persistencyRate || 0) / (comparison?.avgPersistency || 1)) * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Peer Group Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Top Performers at Level {agent.hierarchy_depth}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Agent</TableHead>
                          <TableHead className="text-right">Premium</TableHead>
                          <TableHead className="text-right">Policies</TableHead>
                          <TableHead className="text-right">Persistency</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison?.topPeers?.map((peer: any, idx: number) => (
                          <TableRow key={peer.id} className={peer.id === agent.id ? 'bg-muted/50' : ''}>
                            <TableCell className="font-medium">{idx + 1}</TableCell>
                            <TableCell>
                              {peer.email}
                              {peer.id === agent.id && <Badge className="ml-2" variant="outline">You</Badge>}
                            </TableCell>
                            <TableCell className="text-right">{safeFormatCurrency(peer.premium)}</TableCell>
                            <TableCell className="text-right">{peer.policies}</TableCell>
                            <TableCell className="text-right">{safeFormatPercent(peer.persistency)}</TableCell>
                          </TableRow>
                        )) || (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No peer data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Action Footer */}
        <div className="border-t p-6 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Email Agent
              </Button>
              <Button variant="outline" size="sm">
                <Phone className="h-4 w-4 mr-2" />
                Call Agent
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              <Button size="sm">
                <ChevronRight className="h-4 w-4 mr-2" />
                Manage Hierarchy
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}