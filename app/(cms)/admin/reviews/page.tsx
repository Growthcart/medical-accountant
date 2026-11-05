'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/db/client';
import { ArrowLeft, Plus, Pencil, Trash2, Star, ExternalLink } from 'lucide-react';
import type { Review, ReviewSettings } from '@/lib/database.types';

type ViewMode = 'list' | 'editor';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

const emptyReview = {
  review_date: new Date().toISOString().split('T')[0],
  spoiler: '',
  review: '',
  reviewer_name: '',
  designation: '',
  business_name: '',
  website_url: '',
  is_active: true,
  display_order: 0,
};

export default function AdminReviewsPage() {
  const db = useMemo(() => createClient(), []);

  // State
  const [view, setView] = useState<ViewMode>('list');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyReview);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<ReviewSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [googleReviewsText, setGoogleReviewsText] = useState('');
  const [googleReviewsLink, setGoogleReviewsLink] = useState('');

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from('reviews')
      .select('*')
      .order('display_order', { ascending: true })
      .order('review_date', { ascending: false });
    setReviews((data as Review[]) || []);
    setLoading(false);
  }, [db]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    const { data } = await db
      .from('review_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .maybeSingle();
    if (data) {
      const s = data as ReviewSettings;
      setSettings(s);
      setGoogleReviewsText(s.google_reviews_text || '');
      setGoogleReviewsLink(s.google_reviews_link || '');
    }
  }, [db]);

  useEffect(() => {
    fetchReviews();
    fetchSettings();
  }, [fetchReviews, fetchSettings]);

  // Save settings
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    await db
      .from('review_settings')
      .upsert({
        id: SETTINGS_ID,
        google_reviews_text: googleReviewsText,
        google_reviews_link: googleReviewsLink,
        updated_at: new Date().toISOString(),
      });
    await fetchSettings();
    setSettingsSaving(false);
  };

  // Open editor
  const openEditor = (review?: Review) => {
    if (review) {
      setEditingId(review.id);
      setForm({
        review_date: review.review_date,
        spoiler: review.spoiler || '',
        review: review.review,
        reviewer_name: review.reviewer_name,
        designation: review.designation || '',
        business_name: review.business_name || '',
        website_url: review.website_url || '',
        is_active: review.is_active,
        display_order: review.display_order,
      });
    } else {
      setEditingId(null);
      setForm({
        ...emptyReview,
        review_date: new Date().toISOString().split('T')[0],
        display_order: reviews.length + 1,
      });
    }
    setView('editor');
  };

  // Save review
  const handleSave = async () => {
    if (!form.reviewer_name.trim() || !form.review.trim()) return;
    setSaving(true);

    const payload = {
      review_date: form.review_date || new Date().toISOString().split('T')[0],
      spoiler: form.spoiler || null,
      review: form.review,
      reviewer_name: form.reviewer_name,
      designation: form.designation || null,
      business_name: form.business_name || null,
      website_url: form.website_url || null,
      is_active: form.is_active,
      display_order: form.display_order,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      await db.from('reviews').update(payload).eq('id', editingId);
    } else {
      await db.from('reviews').insert(payload);
    }

    await fetchReviews();
    setSaving(false);
    setView('list');
  };

  // Delete review
  const handleDelete = async (id: string) => {
    await db.from('reviews').delete().eq('id', id);
    setDeleteConfirm(null);
    await fetchReviews();
  };

  // Toggle active
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await db.from('reviews').update({ is_active: !currentActive }).eq('id', id);
    await fetchReviews();
  };

  // ===================== EDITOR VIEW =====================
  if (view === 'editor') {
    return (
      <div>
        <button
          onClick={() => setView('list')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reviews
        </button>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {editingId ? 'Edit Review' : 'Add Review'}
          </h1>

          <div className="space-y-5 max-w-2xl">
            {/* Review Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review Date
              </label>
              <input
                type="date"
                value={form.review_date}
                onChange={(e) => setForm({ ...form, review_date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">Defaults to today if left empty</p>
            </div>

            {/* Spoiler / Short Quote */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spoiler / Short Quote
              </label>
              <input
                type="text"
                value={form.spoiler}
                onChange={(e) => setForm({ ...form, spoiler: e.target.value })}
                placeholder="e.g. Exceeding our expectations"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">A short teaser shown as a badge on the review card</p>
            </div>

            {/* Full Review */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.review}
                onChange={(e) => setForm({ ...form, review: e.target.value })}
                placeholder="Full review text..."
                rows={5}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Reviewer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reviewer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.reviewer_name}
                onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })}
                placeholder="e.g. John Smith"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Designation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation
              </label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="e.g. Managing Director"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                placeholder="e.g. Acme Ltd"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website Link
              </label>
              <input
                type="url"
                value={form.website_url}
                onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                placeholder="https://medicalaccountant.ie"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                className="w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">Lower numbers appear first</p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.is_active ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700">
                {form.is_active ? 'Active (visible on site)' : 'Inactive (hidden from site)'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving || !form.reviewer_name.trim() || !form.review.trim()}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : editingId ? 'Update Review' : 'Add Review'}
              </button>
              <button
                onClick={() => setView('list')}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== LIST VIEW =====================
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">Manage client reviews displayed on the homepage</p>
        </div>
        <button
          onClick={() => openEditor()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Review
        </button>
      </div>

      {/* Settings Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-900">Google Reviews Badge</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Configure the text and link shown above the reviews section (e.g. &quot;150+ 5 star reviews on Google&quot;)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
            <input
              type="text"
              value={googleReviewsText}
              onChange={(e) => setGoogleReviewsText(e.target.value)}
              placeholder="e.g. 150+ 5 star reviews on Google"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
            <input
              type="url"
              value={googleReviewsLink}
              onChange={(e) => setGoogleReviewsLink(e.target.value)}
              placeholder="https://g.page/r/..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={settingsSaving}
          className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {settingsSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No reviews yet</p>
            <button
              onClick={() => openEditor()}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first review
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Reviewer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Business</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Spoiler</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Date</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Active</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{review.display_order}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{review.reviewer_name}</p>
                        {review.designation && (
                          <p className="text-xs text-gray-500">{review.designation}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        {review.business_name || '—'}
                        {review.website_url && (
                          <a href={review.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell max-w-[200px] truncate">
                      {review.spoiler || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell whitespace-nowrap">
                      {new Date(review.review_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(review.id, review.is_active)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          review.is_active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            review.is_active ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditor(review)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteConfirm === review.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(review.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(review.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
