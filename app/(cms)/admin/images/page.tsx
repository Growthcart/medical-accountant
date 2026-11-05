'use client';
/* eslint-disable @next/next/no-img-element -- admin-only tooling renders arbitrary user-uploaded / preview URLs (incl. data: URLs) where next/image's domain allowlist and optimisation are the wrong fit */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@/lib/db/client';
import { uploadPostImage } from '@/lib/storage';
import {
  ImageIcon,
  Trash2,
  Loader2,
  HardDrive,
  Copy,
  Check,
  Upload,
} from 'lucide-react';

interface StorageFile {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminImagesPage() {
  const db = useMemo(() => createClient(), []);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 100;

  const fetchImages = useCallback(
    async (loadOffset: number = 0, append: boolean = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const { data, error } = await db.storage
        .from('post-images')
        .list('', {
          limit: PAGE_SIZE,
          offset: loadOffset,
        });

      if (!error && data) {
        const filtered: StorageFile[] = data
          .filter((f) => f.name !== '.emptyFolderPlaceholder')
          .map((f) => ({
            name: f.name,
            id: f.id,
            created_at: f.created_at,
            metadata: f.metadata as Record<string, unknown> | null,
          }));

        if (append) setFiles((prev) => [...prev, ...filtered]);
        else setFiles(filtered);
        setHasMore(data.length >= PAGE_SIZE);
        setOffset(loadOffset + data.length);
      }

      if (append) setLoadingMore(false);
      else setLoading(false);
    },
    [db]
  );

  useEffect(() => { fetchImages(0, false); }, [fetchImages]);

  const handleLoadMore = () => { fetchImages(offset, true); };

  const getPublicUrl = (fileName: string): string => {
    return db.storage.from('post-images').getPublicUrl(fileName).data.publicUrl;
  };

  const handleCopyUrl = async (fileName: string) => {
    const url = getPublicUrl(fileName);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(fileName);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      // Fallback: silently fail
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This cannot be undone and may break posts using this image.`)) return;
    setDeleting(fileName);
    const { error } = await db.storage.from('post-images').remove([fileName]);
    if (!error) setFiles((prev) => prev.filter((f) => f.name !== fileName));
    setDeleting(null);
  };

  const handleUpload = async (filesToUpload: FileList | File[]) => {
    setUploadError(null);
    setUploading(true);
    const filesArray = Array.from(filesToUpload);
    const errors: string[] = [];
    for (const file of filesArray) {
      try { await uploadPostImage(file); }
      catch (err) { errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`); }
    }
    if (errors.length > 0) setUploadError(errors.join('\n'));
    setUploading(false);
    fetchImages(0, false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };

  const totalSize = useMemo(() => {
    return files.reduce((acc, f) => acc + (Number(f.metadata?.size) || 0), 0);
  }, [files]);

  const SkeletonCard = () => (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Images</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage uploaded images in the post-images bucket</p>
              </div>
            </div>
            <label className={`inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Images'}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple onChange={handleFileInputChange} disabled={uploading} className="sr-only" />
            </label>
          </div>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`mb-6 border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}`}
        >
          <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-sm text-gray-600 mb-1">Drag and drop images here, or click to browse</p>
          <p className="text-xs text-gray-400">JPEG, PNG, or WebP up to 5MB. Images are automatically converted to WebP.</p>
          {uploading && (
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading and converting...
            </div>
          )}
          {uploadError && <div className="mt-3 text-sm text-red-600 whitespace-pre-line">{uploadError}</div>}
        </div>

        {!loading && (
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ImageIcon className="w-4 h-4 text-gray-400" />
              <span><strong className="text-gray-900">{files.length}</strong> image{files.length !== 1 ? 's' : ''}{hasMore && '+'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <HardDrive className="w-4 h-4 text-gray-400" />
              <span><strong className="text-gray-900">{formatFileSize(totalSize)}</strong> total</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : files.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <ImageIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">No images uploaded yet</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">Images uploaded through the post editor will appear here. You can manage and delete them from this page.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map((file) => {
                const publicUrl = getPublicUrl(file.name);
                const isDeleting = deleting === file.name;
                const isCopied = copiedUrl === file.name;
                return (
                  <div key={file.id || file.name} className={`bg-white rounded-lg shadow-sm overflow-hidden group transition-opacity ${isDeleting ? 'opacity-50' : ''}`}>
                    <div className="aspect-square relative bg-gray-100">
                      <img src={publicUrl} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button onClick={() => handleCopyUrl(file.name)} className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors" title="Copy URL">
                          {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-700" />}
                        </button>
                        <button onClick={() => handleDelete(file.name)} disabled={isDeleting} className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors disabled:opacity-50" title="Delete image">
                          {isDeleting ? <Loader2 className="w-4 h-4 text-red-600 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-600" />}
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium text-gray-900 truncate" title={file.name}>{file.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">{file.metadata?.size ? formatFileSize(Number(file.metadata.size)) : '--'}</span>
                        <span className="text-xs text-gray-400">{file.created_at ? formatDate(file.created_at) : '--'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <div className="text-center mt-8">
                <button onClick={handleLoadMore} disabled={loadingMore} className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {loadingMore ? (<><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>) : 'Load More Images'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
