// src/features/recruiting/components/UploadDocumentDialog.tsx
// Compact styled upload document dialog

import React, { useState } from 'react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Upload, Loader2, FileText, X} from 'lucide-react';
import {useUploadDocument} from '../hooks/useRecruitDocuments';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  uploadedBy: string;
}

const DOCUMENT_TYPES = [
  { value: 'application', label: 'Application Form' },
  { value: 'background_check', label: 'Background Check' },
  { value: 'license', label: 'State License' },
  { value: 'contract', label: 'Carrier Contract' },
  { value: 'resume', label: 'Resume' },
  { value: 'identification', label: 'ID/Driver\'s License' },
  { value: 'certification', label: 'Certification' },
  { value: 'other', label: 'Other Document' },
];

export function UploadDocumentDialog({ open, onOpenChange, userId, uploadedBy }: UploadDocumentDialogProps) {
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadDocument = useUploadDocument();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill document name from filename if empty
      if (!documentName) {
        setDocumentName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentName || !documentType) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setUploadProgress(10);

      await uploadDocument.mutateAsync({
        recruitId: userId,
        file: selectedFile,
        documentType,
        documentName,
        uploadedBy,
      });

      setUploadProgress(100);

      // Reset form and close
      setTimeout(() => {
        setDocumentName('');
        setDocumentType('');
        setSelectedFile(null);
        setUploadProgress(0);
        onOpenChange(false);
      }, 500);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload document');
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form on close
      setDocumentName('');
      setDocumentType('');
      setSelectedFile(null);
      setUploadProgress(0);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-3">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-sm font-semibold">Upload Document</DialogTitle>
          <DialogDescription className="text-[10px]">
            Select a file and provide details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* File Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="file-upload" className="text-[11px] font-medium">File *</Label>
            {!selectedFile ? (
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-md cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <Upload className="h-4 w-4 text-zinc-400" />
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Click to select file
                </span>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-zinc-200 dark:border-zinc-700">
                <FileText className="h-4 w-4 text-zinc-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleRemoveFile}
                  disabled={uploadDocument.isPending}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Document Name */}
          <div className="space-y-1.5">
            <Label htmlFor="document-name" className="text-[11px] font-medium">Document Name *</Label>
            <Input
              id="document-name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g., State License - John Doe"
              className="h-7 text-[11px]"
              disabled={uploadDocument.isPending}
            />
          </div>

          {/* Document Type */}
          <div className="space-y-1.5">
            <Label htmlFor="document-type" className="text-[11px] font-medium">Document Type *</Label>
            <Select
              value={documentType}
              onValueChange={setDocumentType}
              disabled={uploadDocument.isPending}
            >
              <SelectTrigger id="document-type" className="h-7 text-[11px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-[11px]">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-1">
              <p className="text-[10px] text-zinc-500">Uploading...</p>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-1.5 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => handleOpenChange(false)}
            disabled={uploadDocument.isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px]"
            onClick={handleUpload}
            disabled={!selectedFile || !documentName || !documentType || uploadDocument.isPending}
          >
            {uploadDocument.isPending ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3 w-3 mr-1.5" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
