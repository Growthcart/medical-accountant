'use client';

import { useState, useRef } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2, Upload, X } from 'lucide-react';
import type { FormFieldDefinition } from '@/lib/database.types';

interface FormRendererProps {
  form: {
    id: string;
    name: string;
    description: string | null;
    fields: FormFieldDefinition[];
    success_message: string;
  };
}

const INPUT_CLASS = 'w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600';

// Field types that are short / single-line and should pair up 2-per-row on desktop
const INLINE_TYPES = new Set(['text', 'email', 'phone', 'url', 'number', 'date']);

export default function FormRenderer({ form }: FormRendererProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [fileObjects, setFileObjects] = useState<Record<string, File>>({});
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const sortedFields = [...form.fields].sort((a, b) => a.display_order - b.display_order);

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleCheckboxGroupChange = (fieldName: string, option: string, checked: boolean) => {
    const current = formData[fieldName] ? formData[fieldName].split(', ').filter(Boolean) : [];
    const updated = checked
      ? [...current, option]
      : current.filter((v) => v !== option);
    handleChange(fieldName, updated.join(', '));
  };

  const handleFileSelect = (fieldName: string, file: File | null, field: FormFieldDefinition) => {
    if (!file) {
      setFileObjects((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
      handleChange(fieldName, '');
      return;
    }

    const maxSize = field.maxFileSize || 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size exceeds ${Math.round(maxSize / (1024 * 1024))} MB limit`);
      return;
    }

    setFileObjects((prev) => ({ ...prev, [fieldName]: file }));
    handleChange(fieldName, file.name); // placeholder until upload
    if (error) setError(null);
  };

  const uploadFile = async (fieldName: string, file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('form_id', form.id);

    const res = await fetch('/api/forms/upload/', { method: 'POST', body: fd });
    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'File upload failed');
    }

    return result.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Client-side validation
    for (const field of sortedFields) {
      const value = formData[field.name]?.trim() || '';

      if (field.is_required) {
        if (field.type === 'checkbox') {
          if (value !== 'true') {
            setError(`${field.label} must be checked`);
            setSubmitting(false);
            return;
          }
        } else if (field.type === 'file') {
          if (!fileObjects[field.name] && !value) {
            setError(`${field.label} is required`);
            setSubmitting(false);
            return;
          }
        } else if (!value) {
          setError(`${field.label} is required`);
          setSubmitting(false);
          return;
        }
      }

      if (field.type === 'email' && value) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          setError(`Please enter a valid email for ${field.label}`);
          setSubmitting(false);
          return;
        }
      }
    }

    try {
      // Upload files first
      const submitData = { ...formData };
      const fileFields = sortedFields.filter((f) => f.type === 'file' && fileObjects[f.name]);

      for (const field of fileFields) {
        setUploadingFile(field.name);
        const url = await uploadFile(field.name, fileObjects[field.name]);
        submitData[field.name] = url;
      }
      setUploadingFile(null);

      // Submit form data
      const res = await fetch('/api/forms/submit/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: form.id,
          data: submitData,
          honeypot,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadingFile(null);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Submitted!</h2>
        <p className="text-gray-600 max-w-md mx-auto">{form.success_message}</p>
      </div>
    );
  }

  /* ------- helper: render a single field (without wrapper div) ------- */
  const renderField = (field: FormFieldDefinition) => (
    <>
      {/* Label — skip for checkbox (label is inline) */}
      {field.type !== 'checkbox' && (
        <label
          htmlFor={`field-${field.name}`}
          className="block text-sm font-bold text-gray-900 mb-1.5"
        >
          {field.label}
          {field.is_required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Textarea */}
      {field.type === 'textarea' && (
        <textarea
          id={`field-${field.name}`}
          value={formData[field.name] || ''}
          onChange={(e) => handleChange(field.name, e.target.value)}
          placeholder={field.placeholder || ''}
          required={field.is_required}
          rows={5}
          maxLength={5000}
          className={INPUT_CLASS}
        />
      )}

      {/* Select / Dropdown */}
      {field.type === 'select' && (
        <select
          id={`field-${field.name}`}
          value={formData[field.name] || ''}
          onChange={(e) => handleChange(field.name, e.target.value)}
          required={field.is_required}
          className={INPUT_CLASS}
        >
          <option value="">{field.placeholder || 'Select an option...'}</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {/* File Upload */}
      {field.type === 'file' && (
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRefs.current[field.name]?.click()}
              className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 rounded-md px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </button>
            {fileObjects[field.name] && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="truncate max-w-xs">{fileObjects[field.name].name}</span>
                <span className="text-gray-400">
                  ({(fileObjects[field.name].size / 1024).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => handleFileSelect(field.name, null, field)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {!fileObjects[field.name] && (
              <span className="text-sm text-gray-400">No file selected</span>
            )}
          </div>
          <input
            ref={(el) => { fileInputRefs.current[field.name] = el; }}
            type="file"
            accept={field.acceptedFileTypes?.join(',') || '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp'}
            onChange={(e) => handleFileSelect(field.name, e.target.files?.[0] || null, field)}
            className="hidden"
          />
          {uploadingFile === field.name && (
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Uploading...
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Max {Math.round((field.maxFileSize || 5242880) / (1024 * 1024))} MB.
            Accepted: {field.acceptedFileTypes?.join(', ') || 'PDF, DOC, DOCX, JPG, PNG, WebP'}
          </p>
        </div>
      )}

      {/* Checkbox (single) */}
      {field.type === 'checkbox' && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            id={`field-${field.name}`}
            type="checkbox"
            checked={formData[field.name] === 'true'}
            onChange={(e) => handleChange(field.name, e.target.checked ? 'true' : 'false')}
            className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
          />
          <span className="text-sm text-gray-700">
            {field.label}
            {field.is_required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
      )}

      {/* Radio Buttons */}
      {field.type === 'radio' && (
        <div className="space-y-2">
          {field.options?.map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`field-${field.name}`}
                value={opt}
                checked={formData[field.name] === opt}
                onChange={() => handleChange(field.name, opt)}
                className="border-gray-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {/* Checkbox Group (multi-select) */}
      {field.type === 'checkbox_group' && (
        <div className="space-y-2">
          {field.options?.map((opt) => {
            const selectedValues = formData[field.name] ? formData[field.name].split(', ').filter(Boolean) : [];
            return (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt)}
                  onChange={(e) => handleCheckboxGroupChange(field.name, opt, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* Standard inputs: text, email, phone, url, number, date */}
      {['text', 'email', 'phone', 'url', 'number', 'date'].includes(field.type) && (
        <input
          id={`field-${field.name}`}
          type={field.type === 'phone' ? 'tel' : field.type}
          value={formData[field.name] || ''}
          onChange={(e) => handleChange(field.name, e.target.value)}
          placeholder={field.placeholder || ''}
          required={field.is_required}
          maxLength={500}
          className={INPUT_CLASS}
        />
      )}
    </>
  );

  /* ------- Group fields into rows: inline pairs + full-width ------- */
  const rows: { fields: FormFieldDefinition[]; inline: boolean }[] = [];
  let i = 0;
  while (i < sortedFields.length) {
    const field = sortedFields[i];
    if (
      INLINE_TYPES.has(field.type) &&
      i + 1 < sortedFields.length &&
      INLINE_TYPES.has(sortedFields[i + 1].type)
    ) {
      rows.push({ fields: [field, sortedFields[i + 1]], inline: true });
      i += 2;
    } else {
      rows.push({ fields: [field], inline: false });
      i += 1;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {form.description && (
        <h4 className="text-lg font-semibold text-gray-900">{form.description}</h4>
      )}

      {/* Honeypot — hidden from real users, bots fill it */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
      >
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {rows.map((row, rowIdx) =>
        row.inline ? (
          <div key={rowIdx} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {row.fields.map((field) => (
              <div key={field.id}>{renderField(field)}</div>
            ))}
          </div>
        ) : (
          <div key={row.fields[0].id}>{renderField(row.fields[0])}</div>
        )
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-6 py-3 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {uploadingFile ? 'Uploading file...' : 'Submitting...'}
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Submit
          </>
        )}
      </button>
    </form>
  );
}
