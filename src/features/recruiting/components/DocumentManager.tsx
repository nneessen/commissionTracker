// src/features/recruiting/components/DocumentManager.tsx
// Document management with modern zinc palette styling

import React, { useState } from 'react';
import {UserDocument} from '@/types/recruiting.types';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card} from '@/components/ui/card';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {FileText, Download, Trash2, CheckCircle2, XCircle, MoreVertical, Upload, Eye, FolderOpen} from 'lucide-react';
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

const DOCUMENT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  received: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
  rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  expired: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
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
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {documents && documents.length > 0 ? `${documents.length} document${documents.length > 1 ? 's' : ''}` : 'No documents'}
        </p>
        <Button size="sm" onClick={() => setIsUploadDialogOpen(true)} className="h-9">
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Document List */}
      {documents && documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <FileText className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {doc.document_name}
                      </h4>
                      {doc.required && (
                        <Badge variant="outline" className="text-xs border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
                          Required
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                      <span className="text-zinc-300 dark:text-zinc-600">•</span>
                      <span>{formatFileSize(doc.file_size || 0)}</span>
                      <span className="text-zinc-300 dark:text-zinc-600">•</span>
                      <span>Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      {doc.expires_at && (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-600">•</span>
                          <span className={new Date(doc.expires_at) < new Date() ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                            Expires {new Date(doc.expires_at).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                    {doc.notes && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 italic">{doc.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className={`text-xs capitalize ${DOCUMENT_STATUS_STYLES[doc.status]}`}>
                    {doc.status}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                            <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
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
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <FolderOpen className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <p className="text-base text-zinc-600 dark:text-zinc-400 mb-1">No documents uploaded yet</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Click "Upload Document" to add documents
          </p>
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
