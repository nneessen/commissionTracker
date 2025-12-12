// src/features/recruiting/components/UploadDocumentDialog.tsx

import React, { useState } from 'react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Upload, Loader2} from 'lucide-react';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Select a file and provide details about the document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file">File *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          {/* Document Name */}
          <div className="space-y-2">
            <Label htmlFor="document-name">Document Name *</Label>
            <Input
              id="document-name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g., State License - John Doe"
            />
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger id="document-type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <Label>Uploading...</Label>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploadDocument.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !documentName || !documentType || uploadDocument.isPending}
          >
            {uploadDocument.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
