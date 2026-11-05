'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/db/client';
import type { FormFieldDefinition } from '@/lib/database.types';
import {
  PlusCircle,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Eye,
  EyeOff,
  Inbox,
  Mail,
  MailOpen,
  FileText,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Loader2,
  Download,
  Code,
} from 'lucide-react';

type View = 'list' | 'editor' | 'submissions';

interface ContactForm {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fields: FormFieldDefinition[];
  recipient_email: string;
  success_message: string;
  is_active: boolean;
  admin_email_subject: string | null;
  admin_email_template: string | null;
  user_email_enabled: boolean;
  user_email_field: string | null;
  user_email_subject: string | null;
  user_email_template: string | null;
  created_at: string;
  updated_at: string;
}

interface Submission {
  id: string;
  form_id: string;
  data: Record<string, string>;
  ip_address: string | null;
  user_agent: string | null;
  is_read: boolean;
  created_at: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateFieldName(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const FIELD_TYPES: { value: FormFieldDefinition['type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'phone', label: 'Phone' },
  { value: 'select', label: 'Dropdown' },
  { value: 'url', label: 'URL' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File Upload' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox_group', label: 'Checkbox Group' },
];

const DEFAULT_ACCEPTED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

const emptyField = (): FormFieldDefinition => ({
  id: crypto.randomUUID(),
  name: '',
  label: '',
  type: 'text',
  placeholder: '',
  is_required: false,
  options: [],
  display_order: 0,
});

export default function AdminFormsPage() {
  const db = useMemo(() => createClient(), []);
  const [view, setView] = useState<View>('list');
  const [loading, setLoading] = useState(true);

  // Forms list state
  const [forms, setForms] = useState<ContactForm[]>([]);
  const [formSubmissionCounts, setFormSubmissionCounts] = useState<Record<string, { total: number; unread: number }>>({});

  // Editor state
  const [editingForm, setEditingForm] = useState<ContactForm | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRecipientEmail, setFormRecipientEmail] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState('Thank you! We will get back to you soon.');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formFields, setFormFields] = useState<FormFieldDefinition[]>([]);
  const [adminEmailSubject, setAdminEmailSubject] = useState('');
  const [adminEmailTemplate, setAdminEmailTemplate] = useState('');
  const [userEmailEnabled, setUserEmailEnabled] = useState(false);
  const [userEmailField, setUserEmailField] = useState('');
  const [userEmailSubject, setUserEmailSubject] = useState('');
  const [userEmailTemplate, setUserEmailTemplate] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState<'admin' | 'user' | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Submissions state
  const [selectedFormForSubmissions, setSelectedFormForSubmissions] = useState<ContactForm | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from('contact_forms')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setForms(data as ContactForm[]);

      // Fetch submission counts for each form
      const counts: Record<string, { total: number; unread: number }> = {};
      await Promise.all(
        data.map(async (form: any) => {
          const [totalRes, unreadRes] = await Promise.all([
            db
              .from('form_submissions')
              .select('id', { count: 'exact', head: true })
              .eq('form_id', form.id),
            db
              .from('form_submissions')
              .select('id', { count: 'exact', head: true })
              .eq('form_id', form.id)
              .eq('is_read', false),
          ]);
          counts[form.id] = {
            total: totalRes.count ?? 0,
            unread: unreadRes.count ?? 0,
          };
        })
      );
      setFormSubmissionCounts(counts);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // === FORM EDITOR ===

  const handleNewForm = () => {
    setEditingForm(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormRecipientEmail('');
    setFormSuccessMessage('Thank you! We will get back to you soon.');
    setFormIsActive(true);
    setFormFields([]);
    setAdminEmailSubject('');
    setAdminEmailTemplate('');
    setUserEmailEnabled(false);
    setUserEmailField('');
    setUserEmailSubject('');
    setUserEmailTemplate('');
    setShowEmailPreview(null);
    setFormError(null);
    setView('editor');
  };

  const handleEditForm = (form: ContactForm) => {
    setEditingForm(form);
    setFormName(form.name);
    setFormSlug(form.slug);
    setFormDescription(form.description || '');
    setFormRecipientEmail(form.recipient_email);
    setFormSuccessMessage(form.success_message);
    setFormIsActive(form.is_active);
    setFormFields([...form.fields]);
    setAdminEmailSubject(form.admin_email_subject || '');
    setAdminEmailTemplate(form.admin_email_template || '');
    setUserEmailEnabled(form.user_email_enabled);
    setUserEmailField(form.user_email_field || '');
    setUserEmailSubject(form.user_email_subject || '');
    setUserEmailTemplate(form.user_email_template || '');
    setShowEmailPreview(null);
    setFormError(null);
    setView('editor');
  };

  const handleSaveForm = async () => {
    setFormError(null);
    const name = formName.trim();
    const slug = formSlug.trim() || generateSlug(name);
    const recipientEmail = formRecipientEmail.trim();

    if (!name) {
      setFormError('Form name is required.');
      return;
    }
    if (!slug) {
      setFormError('Form slug is required.');
      return;
    }
    if (!recipientEmail) {
      setFormError('Recipient email is required.');
      return;
    }
    if (formFields.length === 0) {
      setFormError('Add at least one field to the form.');
      return;
    }

    // Validate fields
    for (const field of formFields) {
      if (!field.label.trim()) {
        setFormError('All fields must have a label.');
        return;
      }
      if (!field.name.trim()) {
        setFormError(`Field "${field.label}" must have a name.`);
        return;
      }
      if (['select', 'radio', 'checkbox_group'].includes(field.type) && (!field.options || field.options.length === 0)) {
        setFormError(`${field.type === 'select' ? 'Dropdown' : field.type === 'radio' ? 'Radio' : 'Checkbox Group'} field "${field.label}" must have at least one option.`);
        return;
      }
    }

    // Check for duplicate field names
    const fieldNames = formFields.map((f) => f.name);
    const duplicates = fieldNames.filter((n, i) => fieldNames.indexOf(n) !== i);
    if (duplicates.length > 0) {
      setFormError(`Duplicate field name: "${duplicates[0]}". Each field must have a unique name.`);
      return;
    }

    setSaving(true);

    const orderedFields = formFields.map((f, i) => ({ ...f, display_order: i }));

    const payload = {
      name,
      slug,
      description: formDescription.trim() || null,
      fields: orderedFields,
      recipient_email: recipientEmail,
      success_message: formSuccessMessage.trim() || 'Thank you! We will get back to you soon.',
      is_active: formIsActive,
      admin_email_subject: adminEmailSubject.trim() || null,
      admin_email_template: adminEmailTemplate.trim() || null,
      user_email_enabled: userEmailEnabled,
      user_email_field: userEmailField.trim() || null,
      user_email_subject: userEmailSubject.trim() || null,
      user_email_template: userEmailTemplate.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingForm) {
      const { error } = await db
        .from('contact_forms')
        .update(payload)
        .eq('id', editingForm.id);
      if (error) {
        setFormError(error.message.includes('duplicate') ? 'A form with that slug already exists.' : error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await db
        .from('contact_forms')
        .insert(payload);
      if (error) {
        setFormError(error.message.includes('duplicate') ? 'A form with that slug already exists.' : error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setView('list');
    fetchForms();
  };

  const handleDeleteForm = async (formId: string, formName: string) => {
    if (!confirm(`Are you sure you want to delete the form "${formName}"? All submissions will be lost.`)) return;
    const { error } = await db.from('contact_forms').delete().eq('id', formId);
    if (!error) {
      setForms((prev) => prev.filter((f) => f.id !== formId));
    }
  };

  const handleToggleActive = async (formId: string, currentValue: boolean) => {
    const { error } = await db
      .from('contact_forms')
      .update({ is_active: !currentValue, updated_at: new Date().toISOString() })
      .eq('id', formId);
    if (!error) {
      setForms((prev) =>
        prev.map((f) => (f.id === formId ? { ...f, is_active: !currentValue } : f))
      );
    }
  };

  // === FIELD BUILDER ===

  const handleAddField = () => {
    setFormFields((prev) => [...prev, emptyField()]);
  };

  const handleUpdateField = (fieldId: string, updates: Partial<FormFieldDefinition>) => {
    setFormFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  const handleRemoveField = (fieldId: string) => {
    setFormFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formFields.length) return;
    const updated = [...formFields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setFormFields(updated);
  };

  // === SUBMISSIONS ===

  const handleViewSubmissions = async (form: ContactForm) => {
    setSelectedFormForSubmissions(form);
    setSubmissionsLoading(true);
    setView('submissions');

    const { data } = await db
      .from('form_submissions')
      .select('*')
      .eq('form_id', form.id)
      .order('created_at', { ascending: false });

    setSubmissions((data as Submission[]) || []);
    setSubmissionsLoading(false);
  };

  const handleToggleRead = async (submissionId: string, currentValue: boolean) => {
    const { error } = await db
      .from('form_submissions')
      .update({ is_read: !currentValue })
      .eq('id', submissionId);
    if (!error) {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, is_read: !currentValue } : s))
      );
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm('Delete this submission?')) return;
    const { error } = await db.from('form_submissions').delete().eq('id', submissionId);
    if (!error) {
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    }
  };

  const handleBackToList = () => {
    setView('list');
    setExpandedSubmission(null);
    setShowEmailPreview(null);
    fetchForms();
  };

  const handleExportCsv = async (formId: string) => {
    setExporting(true);
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session?.access_token) {
        alert('Not authenticated. Please log in again.');
        setExporting(false);
        return;
      }

      const res = await fetch(`/api/forms/export/?form_id=${formId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Export failed');
        setExporting(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('content-disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      a.download = filenameMatch?.[1] || 'submissions.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. Please try again.');
    }
    setExporting(false);
  };

  const getEmailPreviewHtml = (type: 'admin' | 'user'): string => {
    const sampleData: Record<string, string> = {};
    formFields.forEach((f) => {
      if (f.type === 'email') sampleData[f.name] = 'user@example.com';
      else if (f.type === 'phone') sampleData[f.name] = '+44 7700 900000';
      else if (f.type === 'checkbox') sampleData[f.name] = 'true';
      else if (f.type === 'url') sampleData[f.name] = 'https://example.com';
      else if (f.type === 'date') sampleData[f.name] = '2026-01-15';
      else if (f.type === 'number') sampleData[f.name] = '42';
      else if (f.type === 'textarea') sampleData[f.name] = 'This is a sample message for preview purposes.';
      else if (f.type === 'select' || f.type === 'radio') sampleData[f.name] = f.options?.[0] || 'Option 1';
      else if (f.type === 'checkbox_group') sampleData[f.name] = (f.options || []).slice(0, 2).join(', ');
      else if (f.type === 'file') sampleData[f.name] = 'https://example.com/file.pdf';
      else sampleData[f.name] = `Sample ${f.label}`;
    });

    const template = type === 'admin' ? adminEmailTemplate : userEmailTemplate;

    if (!template.trim()) {
      return type === 'admin'
        ? '<p style="color: #6b7280; text-align: center; padding: 24px;">Using default admin email template. Add custom HTML above to override.</p>'
        : '<p style="color: #6b7280; text-align: center; padding: 24px;">Using default user confirmation template. Add custom HTML above to override.</p>';
    }

    // Simple template rendering for preview
    let rendered = template;
    for (const field of formFields) {
      const value = sampleData[field.name] || '';
      rendered = rendered.replace(new RegExp(`\\{\\{${field.name}\\}\\}`, 'g'), value);
    }
    rendered = rendered.replace(/\{\{form_name\}\}/g, formName || 'Form Name');
    rendered = rendered.replace(/\{\{submitted_at\}\}/g, new Date().toISOString());
    rendered = rendered.replace(/\{\{ip_address\}\}/g, '192.168.1.1');

    // Build a simple all_fields table
    const allFieldsRows = formFields
      .filter((f) => sampleData[f.name])
      .map((f) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151;width:30%">${f.label}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#111827">${sampleData[f.name]}</td></tr>`)
      .join('');
    rendered = rendered.replace(/\{\{all_fields\}\}/g, `<table style="width:100%;border-collapse:collapse">${allFieldsRows}</table>`);

    return rendered;
  };

  // === RENDER ===

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {view !== 'list' && (
              <button
                onClick={handleBackToList}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {view === 'list' && 'Contact Forms'}
                {view === 'editor' && (editingForm ? 'Edit Form' : 'New Form')}
                {view === 'submissions' && `Submissions: ${selectedFormForSubmissions?.name}`}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {view === 'list' && 'Create and manage contact forms'}
                {view === 'editor' && 'Configure form fields and settings'}
                {view === 'submissions' && 'View and manage form submissions'}
              </p>
            </div>
          </div>
          {view === 'list' && (
            <button
              onClick={handleNewForm}
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              New Form
            </button>
          )}
          {view === 'submissions' && selectedFormForSubmissions && (
            <button
              onClick={() => handleExportCsv(selectedFormForSubmissions.id)}
              disabled={exporting || submissions.length === 0}
              className="inline-flex items-center gap-2 bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download CSV
            </button>
          )}
        </div>

        {/* === LIST VIEW === */}
        {view === 'list' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading forms...</div>
            ) : forms.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No forms yet. Create your first contact form.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">Form</th>
                      <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">Slug</th>
                      <th className="text-center text-xs uppercase text-gray-500 font-medium px-6 py-3">Fields</th>
                      <th className="text-center text-xs uppercase text-gray-500 font-medium px-6 py-3">Submissions</th>
                      <th className="text-center text-xs uppercase text-gray-500 font-medium px-6 py-3">Active</th>
                      <th className="text-right text-xs uppercase text-gray-500 font-medium px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {forms.map((form) => {
                      const counts = formSubmissionCounts[form.id];
                      return (
                        <tr key={form.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">{form.name}</p>
                            <p className="text-xs text-gray-500">{form.recipient_email}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-mono">{form.slug}</td>
                          <td className="px-6 py-4 text-center text-sm text-gray-500">
                            {form.fields.length}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleViewSubmissions(form)}
                              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            >
                              {counts?.total || 0}
                              {counts && counts.unread > 0 && (
                                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                                  {counts.unread}
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleActive(form.id, form.is_active)}
                              className="focus:outline-none"
                            >
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={form.is_active}
                                  onChange={() => handleToggleActive(form.id, form.is_active)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleViewSubmissions(form)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="View submissions"
                              >
                                <Inbox className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditForm(form)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteForm(form.id, form.name)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* === EDITOR VIEW === */}
        {view === 'editor' && (
          <div className="space-y-6">
            {/* Form Settings */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Form Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="form-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Form Name *
                  </label>
                  <input
                    id="form-name"
                    type="text"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!editingForm) setFormSlug(generateSlug(e.target.value));
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Contact Us"
                  />
                </div>
                <div>
                  <label htmlFor="form-slug" className="block text-sm font-medium text-gray-700 mb-1">
                    Slug *
                  </label>
                  <input
                    id="form-slug"
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="contact-us"
                  />
                  <p className="text-xs text-gray-400 mt-1">Embed with: &lt;EmbeddableForm slug=&quot;{formSlug || 'your-slug'}&quot; /&gt;</p>
                </div>
                <div>
                  <label htmlFor="form-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email *
                  </label>
                  <input
                    id="form-email"
                    type="email"
                    value={formRecipientEmail}
                    onChange={(e) => setFormRecipientEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="form-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    id="form-description"
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="A short description shown above the form"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="form-success" className="block text-sm font-medium text-gray-700 mb-1">
                    Success Message
                  </label>
                  <input
                    id="form-success"
                    type="text"
                    value={formSuccessMessage}
                    onChange={(e) => setFormSuccessMessage(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Thank you! We will get back to you soon."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={() => setFormIsActive(!formIsActive)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm text-gray-700">Form is active</span>
                </div>
              </div>
            </div>

            {/* Field Builder */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Form Fields</h2>
                <button
                  onClick={handleAddField}
                  className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Field
                </button>
              </div>

              {formFields.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No fields yet. Click &quot;Add Field&quot; to start building your form.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        {/* Label */}
                        <div className="md:col-span-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Label *</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => {
                              handleUpdateField(field.id, {
                                label: e.target.value,
                                name: generateFieldName(e.target.value),
                              });
                            }}
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            placeholder="Full Name"
                          />
                        </div>

                        {/* Name */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => handleUpdateField(field.id, { name: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            placeholder="full_name"
                          />
                        </div>

                        {/* Type */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                          <select
                            value={field.type}
                            onChange={(e) =>
                              handleUpdateField(field.id, {
                                type: e.target.value as FormFieldDefinition['type'],
                              })
                            }
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Placeholder */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Placeholder</label>
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            placeholder="Enter..."
                          />
                        </div>

                        {/* Required + Actions */}
                        <div className="md:col-span-3 flex items-end gap-2">
                          <label className="flex items-center gap-1.5 cursor-pointer pb-1">
                            <input
                              type="checkbox"
                              checked={field.is_required}
                              onChange={(e) =>
                                handleUpdateField(field.id, { is_required: e.target.checked })
                              }
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                            />
                            <span className="text-xs text-gray-600">Required</span>
                          </label>
                          <div className="flex items-center gap-0.5 ml-auto">
                            <button
                              onClick={() => handleMoveField(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveField(index, 'down')}
                              disabled={index === formFields.length - 1}
                              className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveField(field.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Remove field"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Options for select / radio / checkbox_group */}
                      {['select', 'radio', 'checkbox_group'].includes(field.type) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Options (one per line)
                          </label>
                          <textarea
                            value={field.options?.join('\n') || ''}
                            onChange={(e) =>
                              handleUpdateField(field.id, {
                                options: e.target.value.split('\n').filter((o) => o.trim()),
                              })
                            }
                            rows={3}
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                          />
                        </div>
                      )}

                      {/* Settings for file upload */}
                      {field.type === 'file' && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Accepted file types
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {['.pdf', '.doc', '.docx', '.jpg', '.png', '.webp'].map((ext) => {
                                const accepted = field.acceptedFileTypes || DEFAULT_ACCEPTED_FILE_TYPES;
                                const isChecked = accepted.includes(ext);
                                return (
                                  <label key={ext} className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const current = field.acceptedFileTypes || [...DEFAULT_ACCEPTED_FILE_TYPES];
                                        const updated = e.target.checked
                                          ? [...current, ext]
                                          : current.filter((t) => t !== ext);
                                        handleUpdateField(field.id, { acceptedFileTypes: updated });
                                      }}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                    />
                                    <span className="text-xs text-gray-600">{ext.toUpperCase().replace('.', '')}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Max file size
                            </label>
                            <select
                              value={field.maxFileSize || DEFAULT_MAX_FILE_SIZE}
                              onChange={(e) => handleUpdateField(field.id, { maxFileSize: Number(e.target.value) })}
                              className="border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            >
                              <option value={1048576}>1 MB</option>
                              <option value={2097152}>2 MB</option>
                              <option value={5242880}>5 MB</option>
                              <option value={10485760}>10 MB</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Email Templates */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Templates</h2>
              <p className="text-xs text-gray-500 mb-3">
                Customise the HTML email sent to admin and user. Leave blank to use the default template.
              </p>

              {/* Placeholder Reference Guide */}
              <div className="mb-5 border border-blue-200 bg-blue-50/50 rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 bg-blue-100/60 border-b border-blue-200">
                  <p className="text-xs font-semibold text-blue-800">Available Placeholders</p>
                  <p className="text-[11px] text-blue-600 mt-0.5">Use these inside your HTML templates. They will be replaced with actual values when the email is sent.</p>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  {/* System placeholders */}
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">System Placeholders</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <div className="flex items-start gap-2">
                        <code className="bg-white border border-blue-200 px-1.5 py-0.5 rounded text-xs text-blue-700 font-mono shrink-0">{'{{form_name}}'}</code>
                        <span className="text-[11px] text-gray-600 pt-0.5">Name of the form</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="bg-white border border-blue-200 px-1.5 py-0.5 rounded text-xs text-blue-700 font-mono shrink-0">{'{{submitted_at}}'}</code>
                        <span className="text-[11px] text-gray-600 pt-0.5">Submission date &amp; time</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="bg-white border border-blue-200 px-1.5 py-0.5 rounded text-xs text-blue-700 font-mono shrink-0">{'{{ip_address}}'}</code>
                        <span className="text-[11px] text-gray-600 pt-0.5">Submitter&apos;s IP (admin only)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="bg-white border border-blue-200 px-1.5 py-0.5 rounded text-xs text-blue-700 font-mono shrink-0">{'{{all_fields}}'}</code>
                        <span className="text-[11px] text-gray-600 pt-0.5">Auto table of all fields &amp; values</span>
                      </div>
                    </div>
                  </div>

                  {/* Field placeholders */}
                  {formFields.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Your Form Fields</p>
                      <div className="flex flex-wrap gap-1.5">
                        {formFields.map((f) => (
                          <div key={f.id} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded px-2 py-1">
                            <code className="text-xs text-blue-700 font-mono">{`{{${f.name}}}`}</code>
                            <span className="text-[11px] text-gray-400">{f.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {formFields.length === 0 && (
                    <p className="text-[11px] text-gray-400 italic">Add form fields above to see field-specific placeholders here.</p>
                  )}
                </div>
              </div>

              {/* Admin Email */}
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Admin Notification Email
                </h3>
                <div>
                  <label htmlFor="admin-email-subject" className="block text-xs font-medium text-gray-500 mb-1">
                    Subject Line
                  </label>
                  <input
                    id="admin-email-subject"
                    type="text"
                    value={adminEmailSubject}
                    onChange={(e) => setAdminEmailSubject(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder={`Default: New submission: ${formName || 'Form Name'}`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="admin-email-template" className="block text-xs font-medium text-gray-500">
                      HTML Template
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowEmailPreview(showEmailPreview === 'admin' ? null : 'admin')}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      {showEmailPreview === 'admin' ? <Code className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showEmailPreview === 'admin' ? 'Editor' : 'Preview'}
                    </button>
                  </div>
                  {showEmailPreview === 'admin' ? (
                    <div
                      className="w-full border border-gray-300 rounded-md p-4 min-h-[200px] bg-white overflow-auto text-sm"
                      dangerouslySetInnerHTML={{ __html: getEmailPreviewHtml('admin') }}
                    />
                  ) : (
                    <textarea
                      id="admin-email-template"
                      value={adminEmailTemplate}
                      onChange={(e) => setAdminEmailTemplate(e.target.value)}
                      rows={8}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      placeholder="Leave blank for default template. Use HTML with {{field_name}} placeholders."
                    />
                  )}
                </div>
              </div>

              {/* User Confirmation Email */}
              <div className="space-y-3 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <MailOpen className="w-4 h-4" />
                    User Confirmation Email
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userEmailEnabled}
                      onChange={() => setUserEmailEnabled(!userEmailEnabled)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {userEmailEnabled && (
                  <>
                    <div>
                      <label htmlFor="user-email-field" className="block text-xs font-medium text-gray-500 mb-1">
                        Email field (which form field contains the user&apos;s email?) *
                      </label>
                      <select
                        id="user-email-field"
                        value={userEmailField}
                        onChange={(e) => setUserEmailField(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      >
                        <option value="">Select an email field...</option>
                        {formFields
                          .filter((f) => f.type === 'email')
                          .map((f) => (
                            <option key={f.id} value={f.name}>
                              {f.label} ({f.name})
                            </option>
                          ))}
                      </select>
                      {formFields.filter((f) => f.type === 'email').length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          Add an &quot;Email&quot; type field above first.
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="user-email-subject" className="block text-xs font-medium text-gray-500 mb-1">
                        Subject Line
                      </label>
                      <input
                        id="user-email-subject"
                        type="text"
                        value={userEmailSubject}
                        onChange={(e) => setUserEmailSubject(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        placeholder={`Default: Thank you for your submission (${formName || 'Form Name'})`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="user-email-template" className="block text-xs font-medium text-gray-500">
                          HTML Template
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowEmailPreview(showEmailPreview === 'user' ? null : 'user')}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          {showEmailPreview === 'user' ? <Code className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {showEmailPreview === 'user' ? 'Editor' : 'Preview'}
                        </button>
                      </div>
                      {showEmailPreview === 'user' ? (
                        <div
                          className="w-full border border-gray-300 rounded-md p-4 min-h-[200px] bg-white overflow-auto text-sm"
                          dangerouslySetInnerHTML={{ __html: getEmailPreviewHtml('user') }}
                        />
                      ) : (
                        <textarea
                          id="user-email-template"
                          value={userEmailTemplate}
                          onChange={(e) => setUserEmailTemplate(e.target.value)}
                          rows={8}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          placeholder="Leave blank for default template. Use HTML with {{field_name}} placeholders."
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Save / Error */}
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveForm}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingForm ? 'Update Form' : 'Create Form'}
              </button>
              <button
                onClick={handleBackToList}
                className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* === SUBMISSIONS VIEW === */}
        {view === 'submissions' && selectedFormForSubmissions && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {submissionsLoading ? (
              <div className="text-center py-12 text-gray-500">Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No submissions yet for this form.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {submissions.map((submission) => {
                  const isExpanded = expandedSubmission === submission.id;
                  const fields = selectedFormForSubmissions.fields;
                  return (
                    <div key={submission.id} className={`${!submission.is_read ? 'bg-blue-50/50' : ''}`}>
                      <div
                        className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setExpandedSubmission(isExpanded ? null : submission.id);
                          if (!submission.is_read) {
                            handleToggleRead(submission.id, false);
                          }
                        }}
                      >
                        <div className="flex-shrink-0">
                          {submission.is_read ? (
                            <MailOpen className="w-5 h-5 text-gray-400" />
                          ) : (
                            <Mail className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!submission.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {/* Show first 2 field values as preview */}
                            {fields.slice(0, 2).map((f) => submission.data[f.name]).filter(Boolean).join(' — ') || 'Empty submission'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(submission.created_at)}
                            {submission.ip_address && ` · ${submission.ip_address}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleRead(submission.id, submission.is_read);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title={submission.is_read ? 'Mark as unread' : 'Mark as read'}
                          >
                            {submission.is_read ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSubmission(submission.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded submission details */}
                      {isExpanded && (
                        <div className="px-6 pb-4 border-t border-gray-100 bg-gray-50/50">
                          <div className="pt-4 space-y-3">
                            {fields.map((field) => {
                              const value = submission.data[field.name];
                              if (!value) return null;
                              return (
                                <div key={field.id}>
                                  <p className="text-xs font-medium text-gray-500 uppercase">{field.label}</p>
                                  {field.type === 'file' && value.startsWith('http') ? (
                                    <a
                                      href={value}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 underline mt-0.5 inline-block"
                                    >
                                      View uploaded file
                                    </a>
                                  ) : field.type === 'checkbox' ? (
                                    <p className="text-sm text-gray-900 mt-0.5">{value === 'true' ? 'Yes' : 'No'}</p>
                                  ) : (
                                    <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{value}</p>
                                  )}
                                </div>
                              );
                            })}
                            {submission.ip_address && (
                              <div className="pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-400">
                                  IP: {submission.ip_address} · Submitted: {formatDate(submission.created_at)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
