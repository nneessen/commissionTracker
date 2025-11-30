// src/features/reports/components/BundleExportDialog.tsx

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  ReportType,
  ReportFilters,
  BundleTemplateId,
  BundleCoverPage,
} from '../../../types/reports.types';
import { ReportBundleService, BUNDLE_TEMPLATES } from '../../../services/reports/reportBundleService';
import { ReportGenerationService } from '../../../services/reports/reportGenerationService';
import { supabase } from '../../../services/base/supabase';
import { FileText, FileSpreadsheet, Package, Loader2, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface BundleExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ReportFilters;
}

const ALL_REPORT_TYPES: { type: ReportType; name: string; icon: string }[] = [
  { type: 'executive-dashboard', name: 'Executive Dashboard', icon: '📊' },
  { type: 'commission-performance', name: 'Commission Performance', icon: '💵' },
  { type: 'policy-performance', name: 'Policy Performance', icon: '📋' },
  { type: 'client-relationship', name: 'Client Relationship', icon: '👥' },
  { type: 'financial-health', name: 'Financial Health', icon: '💰' },
  { type: 'predictive-analytics', name: 'Predictive Analytics', icon: '📈' },
];

type ExportFormat = 'pdf' | 'excel';

export function BundleExportDialog({ open, onOpenChange, filters }: BundleExportDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<BundleTemplateId | null>('monthly-comprehensive');
  const [selectedReports, setSelectedReports] = useState<ReportType[]>([]);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [coverPage, setCoverPage] = useState<BundleCoverPage>({
    title: 'Business Report Bundle',
    businessName: '',
    confidential: true,
  });

  // Get report types based on template or custom selection
  const getReportTypes = useCallback((): ReportType[] => {
    if (selectedTemplate === 'custom') {
      return selectedReports;
    }
    const template = BUNDLE_TEMPLATES.find(t => t.id === selectedTemplate);
    return template?.reportTypes || [];
  }, [selectedTemplate, selectedReports]);

  const handleTemplateSelect = (templateId: BundleTemplateId) => {
    setSelectedTemplate(templateId);
    if (templateId !== 'custom') {
      const template = BUNDLE_TEMPLATES.find(t => t.id === templateId);
      if (template) {
        setSelectedReports(template.reportTypes);
      }
    }
  };

  const handleReportToggle = (type: ReportType) => {
    setSelectedTemplate('custom');
    setSelectedReports(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleExport = async () => {
    const reportTypes = getReportTypes();
    if (reportTypes.length === 0) return;

    setIsExporting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate all selected reports
      const reports = await Promise.all(
        reportTypes.map(type =>
          ReportGenerationService.generateReport({
            userId: user.id,
            type,
            filters,
          })
        )
      );

      // Export bundle
      await ReportBundleService.exportBundle(reports, {
        format,
        reportTypes,
        filters,
        coverPage,
        includeTableOfContents: true,
        includeInsights: true,
        includeSummary: true,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to export bundle:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const reportTypes = getReportTypes();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Export Report Bundle
          </DialogTitle>
          <DialogDescription>
            Export multiple reports as one professional document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Bundle Templates */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              Bundle Template
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {BUNDLE_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    selectedTemplate === template.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{template.icon}</span>
                    <span className="font-medium text-sm">{template.name}</span>
                    {selectedTemplate === template.id && (
                      <Check className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {template.reportTypes.length} reports
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Report Selection */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              Reports to Include
              {selectedTemplate !== 'custom' && (
                <span className="text-[10px] font-normal ml-2">(click to customize)</span>
              )}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_REPORT_TYPES.map(report => {
                const isSelected = reportTypes.includes(report.type);
                return (
                  <label
                    key={report.type}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors',
                      isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleReportToggle(report.type)}
                    />
                    <span className="text-base">{report.icon}</span>
                    <span className="text-xs font-medium">{report.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Cover Page Configuration */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              Cover Page
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="title" className="text-xs text-muted-foreground">
                  Title
                </Label>
                <Input
                  id="title"
                  value={coverPage.title}
                  onChange={e => setCoverPage(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Report Bundle"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="businessName" className="text-xs text-muted-foreground">
                  Business Name
                </Label>
                <Input
                  id="businessName"
                  value={coverPage.businessName || ''}
                  onChange={e => setCoverPage(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Your Agency"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="subtitle" className="text-xs text-muted-foreground">
                  Subtitle (optional)
                </Label>
                <Input
                  id="subtitle"
                  value={coverPage.subtitle || ''}
                  onChange={e => setCoverPage(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Monthly Performance Review"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={coverPage.confidential}
                    onCheckedChange={checked =>
                      setCoverPage(prev => ({ ...prev, confidential: !!checked }))
                    }
                  />
                  <span className="text-xs">Mark as Confidential</span>
                </label>
              </div>
            </div>
          </div>

          {/* Export Format */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              Export Format
            </Label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('pdf')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all',
                  format === 'pdf'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <FileText className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-sm">PDF</div>
                  <div className="text-xs text-muted-foreground">Professional document</div>
                </div>
                {format === 'pdf' && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
              <button
                onClick={() => setFormat('excel')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all',
                  format === 'excel'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <FileSpreadsheet className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-sm">Excel</div>
                  <div className="text-xs text-muted-foreground">Workbook with sheets</div>
                </div>
                {format === 'excel' && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {reportTypes.length} report{reportTypes.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={reportTypes.length === 0 || isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Export Bundle
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
