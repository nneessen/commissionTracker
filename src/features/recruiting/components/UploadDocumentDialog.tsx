// src/features/recruiting/components/UploadDocumentDialog.tsx
// Compact styled upload document dialog with insurance document type categories

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileText, X, Calendar } from "lucide-react";
import { useUploadDocument } from "../hooks/useRecruitDocuments";
import { DocumentTypeCategorySelector } from "@/features/documents";
import type { InsuranceDocumentType } from "@/types/documents.types";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  uploadedBy: string;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  userId,
  uploadedBy,
}: UploadDocumentDialogProps) {
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState<InsuranceDocumentType | "">(
    "",
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadDocument = useUploadDocument();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill document name from filename if empty
      if (!documentName) {
        setDocumentName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    // Reset file input
    const fileInput = document.getElementById(
      "file-upload",
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleDocumentTypeChange = (type: InsuranceDocumentType) => {
    setDocumentType(type);
  };

  const handleExpirationSuggested = (date: Date | null) => {
    if (date && !expirationDate) {
      // Only auto-fill if no date is already set
      setExpirationDate(date.toISOString().split("T")[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentName || !documentType) {
      alert("Please fill in all required fields");
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
        expiresAt: expirationDate || undefined,
      });

      setUploadProgress(100);

      // Reset form and close
      setTimeout(() => {
        setDocumentName("");
        setDocumentType("");
        setSelectedFile(null);
        setExpirationDate("");
        setUploadProgress(0);
        onOpenChange(false);
      }, 500);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload document");
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
      setDocumentName("");
      setDocumentType("");
      setSelectedFile(null);
      setExpirationDate("");
      setUploadProgress(0);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-3">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-sm font-semibold">
            Upload Document
          </DialogTitle>
          <DialogDescription className="text-[10px]">
            Select a file and provide details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* File Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="file-upload" className="text-[11px] font-medium">
              File *
            </Label>
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
            <Label htmlFor="document-name" className="text-[11px] font-medium">
              Document Name *
            </Label>
            <Input
              id="document-name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g., State License - John Doe"
              className="h-7 text-[11px]"
              disabled={uploadDocument.isPending}
            />
          </div>

          {/* Document Type - Using Category Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="document-type" className="text-[11px] font-medium">
              Document Type *
            </Label>
            <DocumentTypeCategorySelector
              value={documentType || undefined}
              onValueChange={handleDocumentTypeChange}
              onExpirationSuggested={handleExpirationSuggested}
              placeholder="Select type"
              disabled={uploadDocument.isPending}
              className="h-7 text-[11px]"
            />
          </div>

          {/* Expiration Date */}
          <div className="space-y-1.5">
            <Label
              htmlFor="expiration-date"
              className="text-[11px] font-medium flex items-center gap-1"
            >
              <Calendar className="h-3 w-3" />
              Expiration Date
              <span className="text-[10px] text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="expiration-date"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="h-7 text-[11px]"
              disabled={uploadDocument.isPending}
              min={new Date().toISOString().split("T")[0]}
            />
            {expirationDate && (
              <p className="text-[10px] text-muted-foreground">
                You&apos;ll be notified before this document expires
              </p>
            )}
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
            disabled={
              !selectedFile ||
              !documentName ||
              !documentType ||
              uploadDocument.isPending
            }
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
