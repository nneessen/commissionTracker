// src/features/recruiting/components/DocumentManager.tsx

import React, { useState } from 'react';
import {UserDocument} from '@/types/recruiting.types';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card} from '@/components/ui/card';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {FileText, Download, Trash2, CheckCircle2, XCircle, MoreVertical, Upload, Eye} from 'lucide-react';
import {useUploadDocument, useDeleteDocument, useUpdateDocumentStatus} from '../hooks/useRecruitDocuments';
import {recruitingService} from '@/services/recruiting';
import {UploadDocumentDialog} from './UploadDocumentDialog';
import {DocumentViewerDialog} from './DocumentViewerDialog';

interface DocumentManagerProps {
  userId: string;
  documents?: UserDocument[];
  isUpline?: boolean;
  currentUserId?: string;
}

const DOCUMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950',
  received: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-950',
  approved: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950',
  rejected: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950',
  expired: 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-950',
};

export function DocumentManager({ userId, documents, isUpline = false, currentUserId }: DocumentManagerProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const _uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const updateDocumentStatus = useUpdateDocumentStatus();

  const handleDownload = async (doc: UserDocument) => {
    try {
      const blob = await recruitingService.downloadDocument(doc.storage_path);
      const url = window.URL.createObjectURL(blob);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      globalThis.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      globalThis.document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document');
    }
  };

  const handleDelete = async (doc: UserDocument) => {
    if (!confirm(`Are you sure you want to delete "${doc.document_name}"?`)) return;

    try {
      await deleteDocument.mutateAsync({
        id: doc.id,
        storagePath: doc.storage_path,
        recruitId: userId,
      });
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
  };

  const handleApprove = async (doc: UserDocument) => {
    try {
      await updateDocumentStatus.mutateAsync({
        id: doc.id,
        status: 'approved',
        approvalNotes: 'Approved by upline',
        recruitId: userId,
      });
    } catch (error) {
      console.error('Failed to approve document:', error);
      alert('Failed to approve document');
    }
  };

  const handleReject = async (doc: UserDocument) => {
    const reason = prompt('Please enter the reason for rejection:');
    if (!reason) return;

    try {
      await updateDocumentStatus.mutateAsync({
        id: doc.id,
        status: 'rejected',
        approvalNotes: reason,
        recruitId: userId,
      });
    } catch (error) {
      console.error('Failed to reject document:', error);
      alert('Failed to reject document');
    }
  };

  const handleView = (doc: UserDocument) => {
    setSelectedDocument(doc);
    setIsViewerOpen(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Header with Upload Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {documents && documents.length > 0 ? `${documents.length} documents` : 'No documents'}
        </h3>
        <Button size="sm" onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Document List */}
      {documents && documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4 hover:border-muted-foreground/30 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{doc.document_name}</h4>
                      {doc.required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span>{doc.document_type.replace(/_/g, ' ')}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size || 0)}</span>
                      <span>•</span>
                      <span>Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      {doc.expires_at && (
                        <>
                          <span>•</span>
                          <span className={new Date(doc.expires_at) < new Date() ? 'text-red-600' : ''}>
                            Expires {new Date(doc.expires_at).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                    {doc.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">{doc.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={DOCUMENT_STATUS_COLORS[doc.status]}>
                    {doc.status}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(doc)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(doc)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      {isUpline && doc.status === 'pending' && (
                        <>
                          <DropdownMenuItem onClick={() => handleApprove(doc)}>
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReject(doc)}>
                            <XCircle className="h-4 w-4 mr-2 text-red-600" />
                            Reject
                          </DropdownMenuItem>
                        </>
                      )}
                      {isUpline && (
                        <DropdownMenuItem
                          onClick={() => handleDelete(doc)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No documents uploaded yet</p>
          <p className="text-sm mt-1">Click "Upload Document" to add documents</p>
        </div>
      )}

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        userId={userId}
        uploadedBy={currentUserId || ''}
      />

      {/* Document Viewer */}
      {selectedDocument && (
        <DocumentViewerDialog
          open={isViewerOpen}
          onOpenChange={setIsViewerOpen}
          document={selectedDocument}
        />
      )}
    </div>
  );
}
