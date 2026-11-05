'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/db/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  PlusCircle,
  Edit,
  Trash2,
  ArrowRightLeft,
  Check,
  X,
} from 'lucide-react';
import { AdminInput, AdminSelect } from '@/components/admin/ui';

type FilterType = 'all' | 'manual' | 'automatic';

interface RedirectRow {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  notes: string | null;
  is_automatic: boolean;
  redirect_type: string | null;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
  updated_at: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function RedirectsPage() {
  const db = useMemo(() => createClient(), []);
  const { profile } = useAuth();
  const [redirects, setRedirects] = useState<RedirectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFromPath, setNewFromPath] = useState('');
  const [newToPath, setNewToPath] = useState('');
  const [newStatusCode, setNewStatusCode] = useState<number>(301);
  const [newNotes, setNewNotes] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFromPath, setEditFromPath] = useState('');
  const [editToPath, setEditToPath] = useState('');
  const [editStatusCode, setEditStatusCode] = useState<number>(301);
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const fetchRedirects = useCallback(async () => {
    const { data } = await db
      .from('url_redirects')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setRedirects(data);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    fetchRedirects();
  }, [fetchRedirects]);

  const filteredRedirects = useMemo(() => {
    if (filter === 'all') return redirects;
    if (filter === 'manual') return redirects.filter((r) => !r.is_automatic);
    return redirects.filter((r) => r.is_automatic);
  }, [redirects, filter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const fromPath = newFromPath.trim();
    const toPath = newToPath.trim();

    if (!fromPath) {
      setAddError('From path is required.');
      return;
    }
    if (!toPath) {
      setAddError('To path is required.');
      return;
    }
    if (fromPath === toPath) {
      setAddError('From and to paths cannot be the same.');
      return;
    }

    const { error } = await db.from('url_redirects').insert({
      from_path: fromPath,
      to_path: toPath,
      status_code: newStatusCode,
      notes: newNotes.trim() || null,
      is_automatic: false,
      created_by: profile?.id || null,
    });

    if (error) {
      setAddError(error.message);
      return;
    }

    setNewFromPath('');
    setNewToPath('');
    setNewStatusCode(301);
    setNewNotes('');
    setShowAddForm(false);
    fetchRedirects();
  };

  const handleDelete = async (id: string, fromPath: string) => {
    if (!confirm(`Are you sure you want to delete the redirect from "${fromPath}"?`)) return;
    const { error } = await db.from('url_redirects').delete().eq('id', id);
    if (!error) {
      setRedirects((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleStartEdit = (item: RedirectRow) => {
    setEditingId(item.id);
    setEditFromPath(item.from_path);
    setEditToPath(item.to_path);
    setEditStatusCode(item.status_code);
    setEditNotes(item.notes || '');
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSaveEdit = async (id: string) => {
    setEditError(null);
    const fromPath = editFromPath.trim();
    const toPath = editToPath.trim();

    if (!fromPath || !toPath) {
      setEditError('From and to paths are both required.');
      return;
    }
    if (fromPath === toPath) {
      setEditError('From and to paths cannot be the same.');
      return;
    }

    const { error } = await db
      .from('url_redirects')
      .update({
        from_path: fromPath,
        to_path: toPath,
        status_code: editStatusCode,
        notes: editNotes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      setEditError(error.message);
      return;
    }

    setEditingId(null);
    fetchRedirects();
  };

  const statusCodeLabel = (code: number) => {
    switch (code) {
      case 301:
        return '301 Permanent';
      case 302:
        return '302 Found';
      case 307:
        return '307 Temporary';
      case 308:
        return '308 Permanent';
      default:
        return String(code);
    }
  };

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'manual', label: 'Manual' },
    { key: 'automatic', label: 'Automatic' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">URL Redirects</h1>
            <p className="text-sm text-gray-500 mt-1">Manage URL redirect rules</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Add Redirect
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Redirect</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="from-path" className="block text-sm font-medium text-gray-700 mb-1">
                    From Path
                  </label>
                  <AdminInput
                    id="from-path"
                    type="text"
                    value={newFromPath}
                    onChange={(e) => setNewFromPath(e.target.value)}
                    className="font-mono"
                    placeholder="/old-page/"
                  />
                </div>
                <div>
                  <label htmlFor="to-path" className="block text-sm font-medium text-gray-700 mb-1">
                    To Path
                  </label>
                  <AdminInput
                    id="to-path"
                    type="text"
                    value={newToPath}
                    onChange={(e) => setNewToPath(e.target.value)}
                    className="font-mono"
                    placeholder="/new-page/"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="status-code" className="block text-sm font-medium text-gray-700 mb-1">
                    Status Code
                  </label>
                  <AdminSelect
                    id="status-code"
                    value={newStatusCode}
                    onChange={(e) => setNewStatusCode(Number(e.target.value))}
                  >
                    <option value={301}>301 - Permanent Redirect</option>
                    <option value={302}>302 - Found (Temporary)</option>
                    <option value={307}>307 - Temporary Redirect</option>
                    <option value={308}>308 - Permanent Redirect</option>
                  </AdminSelect>
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <AdminInput
                    id="notes"
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Reason for redirect"
                  />
                </div>
              </div>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Redirect
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddError(null);
                  }}
                  className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Redirects Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading redirects...</div>
          ) : filteredRedirects.length === 0 ? (
            <div className="text-center py-12">
              <ArrowRightLeft className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {filter === 'all'
                  ? 'No redirects configured.'
                  : `No ${filter} redirects.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                      From
                    </th>
                    <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                      To
                    </th>
                    <th className="text-center text-xs uppercase text-gray-500 font-medium px-6 py-3">
                      Code
                    </th>
                    <th className="text-center text-xs uppercase text-gray-500 font-medium px-6 py-3">
                      Hits
                    </th>
                    <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                      Last Hit
                    </th>
                    <th className="text-center text-xs uppercase text-gray-500 font-medium px-6 py-3">
                      Type
                    </th>
                    <th className="text-right text-xs uppercase text-gray-500 font-medium px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRedirects.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {editingId === item.id ? (
                        <>
                          <td className="px-6 py-3">
                            <AdminInput
                              type="text"
                              value={editFromPath}
                              onChange={(e) => setEditFromPath(e.target.value)}
                              size="sm"
                              className="font-mono"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <AdminInput
                              type="text"
                              value={editToPath}
                              onChange={(e) => setEditToPath(e.target.value)}
                              size="sm"
                              className="font-mono"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <select
                              value={editStatusCode}
                              onChange={(e) => setEditStatusCode(Number(e.target.value))}
                              className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            >
                              <option value={301}>301</option>
                              <option value={302}>302</option>
                              <option value={307}>307</option>
                              <option value={308}>308</option>
                            </select>
                          </td>
                          <td className="px-6 py-3 text-center text-sm text-gray-500">
                            {formatNumber(item.hit_count)}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500">
                            {formatDate(item.last_hit_at)}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.is_automatic
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {item.is_automatic ? 'Auto' : 'Manual'}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                className="p-1 text-green-600 hover:text-green-800 transition-colors"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 text-sm font-mono text-gray-900 max-w-[200px] truncate" title={item.from_path}>
                            {item.from_path}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-gray-500 max-w-[200px] truncate" title={item.to_path}>
                            {item.to_path}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {statusCodeLabel(item.status_code)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-500 font-medium">
                            {formatNumber(item.hit_count)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(item.last_hit_at)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.is_automatic
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {item.is_automatic ? 'Auto' : 'Manual'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleStartEdit(item)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id, item.from_path)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {editError && (
                <div className="px-6 py-3 bg-red-50 border-t border-red-200">
                  <p className="text-sm text-red-600">{editError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes section for redirects with notes */}
        {filteredRedirects.some((r) => r.notes) && (
          <div className="mt-4 bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Redirect Notes</h3>
            <div className="space-y-2">
              {filteredRedirects
                .filter((r) => r.notes)
                .map((r) => (
                  <div key={r.id} className="flex items-start gap-2 text-sm">
                    <span className="font-mono text-gray-500 flex-shrink-0">{r.from_path}</span>
                    <span className="text-gray-400">-</span>
                    <span className="text-gray-600">{r.notes}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
