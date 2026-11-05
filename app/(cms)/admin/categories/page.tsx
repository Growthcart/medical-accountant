'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/db/client';
import { notifySiteChange } from '@/lib/admin/notifySiteChange';
import { isReservedCategorySlug } from '@/lib/blog/reservedSlugs';
import {
  PlusCircle,
  Edit,
  Trash2,
  FolderOpen,
  Check,
  X,
} from 'lucide-react';
import { AdminInput } from '@/components/admin/ui';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  post_count: number;
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

export default function AdminCategoriesPage() {
  const db = useMemo(() => createClient(), []);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategorySlug, setEditCategorySlug] = useState('');
  const [editCategoryDescription, setEditCategoryDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);

    // Fetch categories and post counts in parallel (2 queries total, not N+1)
    const [{ data: catData }, { data: postCounts }] = await Promise.all([
      db
        .from('categories')
        .select('id, name, slug, description, created_at')
        .order('name', { ascending: true }),
      db
        .from('posts')
        .select('category_id')
        .not('category_id', 'is', null),
    ]);

    if (catData) {
      const countMap: Record<string, number> = {};
      if (postCounts) {
        for (const post of postCounts) {
          if (post.category_id) {
            countMap[post.category_id] = (countMap[post.category_id] || 0) + 1;
          }
        }
      }
      setCategories(catData.map((cat: any) => ({
        ...cat,
        post_count: countMap[cat.id] || 0,
      })));
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const name = newCategoryName.trim();
    const slug = newCategorySlug.trim() || generateSlug(name);

    if (!name) {
      setAddError('Category name is required.');
      return;
    }
    if (!slug) {
      setAddError('Category slug is required.');
      return;
    }
    if (isReservedCategorySlug(slug)) {
      setAddError(`"${slug}" is used by the site itself; choose another slug.`);
      return;
    }

    setAdding(true);
    const { error } = await db.from('categories').insert({
      name,
      slug,
      description: newCategoryDescription.trim() || null,
    });

    if (error) {
      setAddError(
        error.message.includes('duplicate')
          ? 'A category with that name or slug already exists.'
          : error.message
      );
      setAdding(false);
      return;
    }

    setNewCategoryName('');
    setNewCategorySlug('');
    setNewCategoryDescription('');
    setAdding(false);
    fetchCategories();
  };

  const handleStartEdit = (cat: CategoryRow) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setEditCategorySlug(cat.slug);
    setEditCategoryDescription(cat.description || '');
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditError(null);
  };

  const handleSaveEdit = async (catId: string) => {
    setEditError(null);
    const name = editCategoryName.trim();
    const slug = editCategorySlug.trim();

    if (!name || !slug) {
      setEditError('Name and slug are required.');
      return;
    }
    const currentSlug = categories.find((c) => c.id === catId)?.slug;
    if (slug !== currentSlug && isReservedCategorySlug(slug)) {
      setEditError(`"${slug}" is used by the site itself; choose another slug.`);
      return;
    }

    setSaving(true);
    const previousSlug = categories.find((c) => c.id === catId)?.slug;
    const { error } = await db
      .from('categories')
      .update({
        name,
        slug,
        description: editCategoryDescription.trim() || null,
      })
      .eq('id', catId);

    if (error) {
      setEditError(
        error.message.includes('duplicate')
          ? 'A category with that name or slug already exists.'
          : error.message
      );
      setSaving(false);
      return;
    }

    // The category name shows on every post in it, and a new slug moves the
    // archive and every post URL: the server adds 301s for moved URLs and
    // refreshes the cached pages.
    await notifySiteChange({ category: { id: catId, oldSlug: previousSlug || slug, newSlug: slug } });

    setEditingCategoryId(null);
    setSaving(false);
    fetchCategories();
  };

  const handleDeleteCategory = async (catId: string, name: string, postCount: number) => {
    if (postCount > 0) {
      alert(
        `Cannot delete "${name}" because it has ${postCount} post(s) assigned. Remove posts from this category first.`
      );
      return;
    }
    if (!confirm(`Are you sure you want to delete the category "${name}"?`)) return;

    setDeletingId(catId);
    const { error } = await db.from('categories').delete().eq('id', catId);
    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== catId));
    }
    setDeletingId(null);
  };

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-6 h-6 text-purple-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Categories</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage blog categories ({categories.length} total)
              </p>
            </div>
          </div>
        </div>

        {/* Add Category Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Category</h2>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="cat-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name
                </label>
                <AdminInput
                  id="cat-name"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    setNewCategorySlug(generateSlug(e.target.value));
                  }}
                  placeholder="Category name"
                />
              </div>
              <div>
                <label
                  htmlFor="cat-slug"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Slug
                </label>
                <AdminInput
                  id="cat-slug"
                  type="text"
                  value={newCategorySlug}
                  onChange={(e) => setNewCategorySlug(e.target.value)}
                  placeholder="category-slug"
                />
              </div>
              <div>
                <label
                  htmlFor="cat-desc"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <AdminInput
                  id="cat-desc"
                  type="text"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-4 h-4" />
              {adding ? 'Adding...' : 'Add Category'}
            </button>
          </form>
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No categories yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Use the form above to create your first category.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                        Name
                      </th>
                      <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3">
                        Slug
                      </th>
                      <th className="text-left text-xs uppercase text-gray-500 font-medium px-6 py-3 hidden sm:table-cell">
                        Description
                      </th>
                      <th className="text-center text-xs uppercase text-gray-500 font-medium px-6 py-3">
                        Posts
                      </th>
                      <th className="text-right text-xs uppercase text-gray-500 font-medium px-6 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-gray-50">
                        {editingCategoryId === cat.id ? (
                          <>
                            <td className="px-6 py-3">
                              <AdminInput
                                type="text"
                                value={editCategoryName}
                                onChange={(e) => {
                                  setEditCategoryName(e.target.value);
                                  setEditCategorySlug(generateSlug(e.target.value));
                                }}
                                size="sm"
                              />
                            </td>
                            <td className="px-6 py-3">
                              <AdminInput
                                type="text"
                                value={editCategorySlug}
                                onChange={(e) => setEditCategorySlug(e.target.value)}
                                size="sm"
                              />
                            </td>
                            <td className="px-6 py-3 hidden sm:table-cell">
                              <AdminInput
                                type="text"
                                value={editCategoryDescription}
                                onChange={(e) => setEditCategoryDescription(e.target.value)}
                                size="sm"
                              />
                            </td>
                            <td className="px-6 py-3 text-center text-sm text-gray-500">
                              {cat.post_count}
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleSaveEdit(cat.id)}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                  title="Save"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {cat.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                {cat.slug}
                              </code>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                              {cat.description || (
                                <span className="text-gray-300">--</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {cat.post_count > 0 ? (
                                <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {cat.post_count}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-300">0</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleStartEdit(cat)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteCategory(cat.id, cat.name, cat.post_count)
                                  }
                                  disabled={deletingId === cat.id}
                                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50 disabled:opacity-50"
                                  title={
                                    cat.post_count > 0
                                      ? `Cannot delete: ${cat.post_count} post(s) assigned`
                                      : 'Delete'
                                  }
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
              </div>
              {editError && editingCategoryId && (
                <div className="px-6 py-3 bg-red-50 border-t border-red-200">
                  <p className="text-sm text-red-600">{editError}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
