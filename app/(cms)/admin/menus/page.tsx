'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/db/client';
import {
  PlusCircle,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Menu,
} from 'lucide-react';

interface MenuItem {
  id: string;
  menu_text: string;
  menu_link: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function MenusPage() {
  const db = useMemo(() => createClient(), []);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [newText, setNewText] = useState('');
  const [newLink, setNewLink] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const fetchMenus = useCallback(async () => {
    const { data } = await db
      .from('header_menus')
      .select('*')
      .order('display_order', { ascending: true });

    if (data) setMenus(data);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const text = newText.trim();
    const link = newLink.trim();

    if (!text) {
      setAddError('Menu text is required.');
      return;
    }
    if (!link) {
      setAddError('Menu link is required.');
      return;
    }

    const maxOrder = menus.length > 0 ? Math.max(...menus.map((m) => m.display_order)) : -1;

    const { error } = await db.from('header_menus').insert({
      menu_text: text,
      menu_link: link,
      display_order: maxOrder + 1,
      is_active: true,
    });

    if (error) {
      setAddError(error.message);
      return;
    }

    setNewText('');
    setNewLink('');
    fetchMenus();
  };

  const handleDelete = async (id: string, text: string) => {
    if (!confirm(`Are you sure you want to delete "${text}"?`)) return;
    const { error } = await db.from('header_menus').delete().eq('id', id);
    if (!error) {
      setMenus((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    const { error } = await db
      .from('header_menus')
      .update({ is_active: !currentValue, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setMenus((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_active: !currentValue } : m))
      );
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const current = menus[index];
    const above = menus[index - 1];

    await Promise.all([
      db
        .from('header_menus')
        .update({ display_order: above.display_order, updated_at: new Date().toISOString() })
        .eq('id', current.id),
      db
        .from('header_menus')
        .update({ display_order: current.display_order, updated_at: new Date().toISOString() })
        .eq('id', above.id),
    ]);

    fetchMenus();
  };

  const handleMoveDown = async (index: number) => {
    if (index >= menus.length - 1) return;
    const current = menus[index];
    const below = menus[index + 1];

    await Promise.all([
      db
        .from('header_menus')
        .update({ display_order: below.display_order, updated_at: new Date().toISOString() })
        .eq('id', current.id),
      db
        .from('header_menus')
        .update({ display_order: current.display_order, updated_at: new Date().toISOString() })
        .eq('id', below.id),
    ]);

    fetchMenus();
  };

  const handleStartEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditText(item.menu_text);
    setEditLink(item.menu_link);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSaveEdit = async (id: string) => {
    setEditError(null);
    const text = editText.trim();
    const link = editLink.trim();

    if (!text || !link) {
      setEditError('Text and link are both required.');
      return;
    }

    const { error } = await db
      .from('header_menus')
      .update({
        menu_text: text,
        menu_link: link,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      setEditError(error.message);
      return;
    }

    setEditingId(null);
    fetchMenus();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Header Menus</h1>
          <p className="text-sm text-gray-500 mt-1">Manage navigation menu items</p>
        </div>

        {/* Add Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Menu Item</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="menu-text" className="block text-sm font-medium text-gray-700 mb-1">
                  Menu Text
                </label>
                <input
                  id="menu-text"
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="About Us"
                />
              </div>
              <div>
                <label htmlFor="menu-link" className="block text-sm font-medium text-gray-700 mb-1">
                  Menu Link
                </label>
                <input
                  id="menu-link"
                  type="text"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="/about/ or https://medicalaccountant.ie"
                />
              </div>
            </div>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Add Menu Item
            </button>
          </form>
        </div>

        {/* Menus Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading menus...</div>
          ) : menus.length === 0 ? (
            <div className="text-center py-12">
              <Menu className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No menu items yet. Add one above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3 w-16">
                      Order
                    </th>
                    <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                      Text
                    </th>
                    <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                      Link
                    </th>
                    <th className="text-center text-xs uppercase text-gray-500 font-medium px-6 py-3">
                      Active
                    </th>
                    <th className="text-right text-xs uppercase text-gray-500 font-medium px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {menus.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {editingId === item.id ? (
                        <>
                          <td className="px-6 py-3 text-sm text-gray-500 text-center">
                            {item.display_order}
                          </td>
                          <td className="px-6 py-3">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <input
                              type="text"
                              value={editLink}
                              onChange={(e) => setEditLink(e.target.value)}
                              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                            />
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {item.is_active ? 'Active' : 'Inactive'}
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
                          <td className="px-6 py-4 text-sm text-gray-500 text-center">
                            {item.display_order}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {item.menu_text}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                            {item.menu_link}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleActive(item.id, item.is_active)}
                              className="focus:outline-none"
                              title={item.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.is_active}
                                  onChange={() => handleToggleActive(item.id, item.is_active)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleMoveUp(index)}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move up"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveDown(index)}
                                disabled={index === menus.length - 1}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move down"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStartEdit(item)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id, item.menu_text)}
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
      </div>
    </div>
  );
}
