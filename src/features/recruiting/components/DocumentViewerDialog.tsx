// src/features/recruiting/components/DocumentViewerDialog.tsx

import React, { useEffect, useState } from 'react';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Download, Loader2, FileText} from 'lucide-react';
import {UserDocument} from '@/types/recruiting';
import {recruitingService} from '@/services/recruiting';

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: UserDocument;
}

export function DocumentViewerDialog({ open, onOpenChange, document: userDocument }: DocumentViewerDialogProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && userDocument) {
      loadDocument();
    }

    return () => {
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [open, userDocument]);

  const loadDocument = async () => {
    setIsLoading(true);
    try {
      const blob = await recruitingService.downloadDocument(userDocument.storage_path);
      const url = URL.createObjectURL(blob);
      setDocumentUrl(url);
    } catch (error) {
      console.error('Failed to load document:', error);
      alert('Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!documentUrl) return;

    const a = globalThis.document.createElement('a');
    a.href = documentUrl;
    a.download = userDocument.file_name;
    globalThis.document.body.appendChild(a);
    a.click();
    globalThis.document.body.removeChild(a);
  };

  const isImage = userDocument.file_type?.startsWith('image/');
  const isPdf = userDocument.file_type === 'application/pdf';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{userDocument.document_name}</DialogTitle>
          <DialogDescription>
            {userDocument.document_type.replace(/_/g, ' ')} • {userDocument.file_name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : documentUrl ? (
            <div className="space-y-4">
              {isImage && (
                <img
                  src={documentUrl}
                  alt={userDocument.document_name}
                  className="w-full h-auto rounded-lg border"
                />
              )}

              {isPdf && (
                <embed
                  src={documentUrl}
                  type="application/pdf"
                  width="100%"
                  height="600px"
                  className="rounded-lg border"
                />
              )}

              {!isImage && !isPdf && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Preview not available for this file type</p>
                  <p className="text-sm mt-1">Click "Download" to view the file</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Failed to load document</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownload} disabled={!documentUrl}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
