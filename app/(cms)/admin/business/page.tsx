'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/db/client';
import {
  Building2,
  MapPin,
  Phone,
  Share2,
  Save,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

const BUSINESS_ID = '00000000-0000-0000-0000-000000000002';

interface BusinessInfo {
  business_name: string;
  business_category: string;
  logo_url: string;
  description: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  address_country: string;
  contact_phone: string;
  contact_email: string;
  social_facebook: string;
  social_twitter: string;
  social_instagram: string;
  social_linkedin: string;
  social_youtube: string;
  social_tiktok: string;
  social_github: string;
}

const defaultBusiness: BusinessInfo = {
  business_name: '',
  business_category: '',
  logo_url: '',
  description: '',
  address_street: '',
  address_city: '',
  address_state: '',
  address_postal_code: '',
  address_country: '',
  contact_phone: '',
  contact_email: '',
  social_facebook: '',
  social_twitter: '',
  social_instagram: '',
  social_linkedin: '',
  social_youtube: '',
  social_tiktok: '',
  social_github: '',
};

export default function BusinessInfoPage() {
  const db = useMemo(() => createClient(), []);
  const [business, setBusiness] = useState<BusinessInfo>(defaultBusiness);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function fetchBusiness() {
      const { data } = await db
        .from('business_info')
        .select('*')
        .eq('id', BUSINESS_ID)
        .maybeSingle();

      if (data) {
        setBusiness({
          business_name: data.business_name || '',
          business_category: data.business_category || '',
          logo_url: data.logo_url || '',
          description: data.description || '',
          address_street: data.address_street || '',
          address_city: data.address_city || '',
          address_state: data.address_state || '',
          address_postal_code: data.address_postal_code || '',
          address_country: data.address_country || '',
          contact_phone: data.contact_phone || '',
          contact_email: data.contact_email || '',
          social_facebook: data.social_facebook || '',
          social_twitter: data.social_twitter || '',
          social_instagram: data.social_instagram || '',
          social_linkedin: data.social_linkedin || '',
          social_youtube: data.social_youtube || '',
          social_tiktok: data.social_tiktok || '',
          social_github: data.social_github || '',
        });
      }
      setLoading(false);
    }
    fetchBusiness();
  }, [db]);

  const handleSave = async () => {
    setSaving(true);
    setToast(null);

    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch('/api/admin/business', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(business),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save.');

      setToast({ type: 'success', message: 'Business information saved successfully.' });
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof BusinessInfo, value: string) => {
    setBusiness((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 text-sm">Loading business info...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Information</h1>
              <p className="text-sm text-gray-500 mt-1">
                This data is used to generate structured data (schema markup) for your website.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-xl p-4 ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={`text-sm ${toast.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className={`ml-auto text-sm ${toast.type === 'success' ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'}`}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Business Identity */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Business Identity</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="business-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  id="business-name"
                  type="text"
                  value={business.business_name}
                  onChange={(e) => update('business_name', e.target.value)}
                  placeholder="Your business name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <div>
                <label htmlFor="business-category" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Category
                </label>
                <input
                  id="business-category"
                  type="text"
                  value={business.business_category}
                  onChange={(e) => update('business_category', e.target.value)}
                  placeholder="e.g., Restaurant, Web Design, etc."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <div>
                <label htmlFor="logo-url" className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  id="logo-url"
                  type="url"
                  value={business.logo_url}
                  onChange={(e) => update('logo_url', e.target.value)}
                  placeholder="https://medicalaccountant.ie/logo.png"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={business.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Brief description of your business..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Address</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="address-street" className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  id="address-street"
                  type="text"
                  value={business.address_street}
                  onChange={(e) => update('address_street', e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="address-city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    id="address-city"
                    type="text"
                    value={business.address_city}
                    onChange={(e) => update('address_city', e.target.value)}
                    placeholder="London"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="address-state" className="block text-sm font-medium text-gray-700 mb-1">
                    State / Region
                  </label>
                  <input
                    id="address-state"
                    type="text"
                    value={business.address_state}
                    onChange={(e) => update('address_state', e.target.value)}
                    placeholder="England"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="address-postal" className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    id="address-postal"
                    type="text"
                    value={business.address_postal_code}
                    onChange={(e) => update('address_postal_code', e.target.value)}
                    placeholder="SW1A 1AA"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="address-country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    id="address-country"
                    type="text"
                    value={business.address_country}
                    onChange={(e) => update('address_country', e.target.value)}
                    placeholder="United Kingdom"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  value={business.contact_phone}
                  onChange={(e) => update('contact_phone', e.target.value)}
                  placeholder="+44 20 1234 5678"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={business.contact_email}
                  onChange={(e) => update('contact_email', e.target.value)}
                  placeholder="info@medicalaccountant.ie"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Social Media</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Enter full profile URLs. These will be included in structured data as sameAs links.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="social-facebook" className="block text-sm font-medium text-gray-700 mb-1">
                    Facebook
                  </label>
                  <input
                    id="social-facebook"
                    type="url"
                    value={business.social_facebook}
                    onChange={(e) => update('social_facebook', e.target.value)}
                    placeholder="https://facebook.com/yourbusiness"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="social-twitter" className="block text-sm font-medium text-gray-700 mb-1">
                    Twitter / X
                  </label>
                  <input
                    id="social-twitter"
                    type="url"
                    value={business.social_twitter}
                    onChange={(e) => update('social_twitter', e.target.value)}
                    placeholder="https://x.com/yourbusiness"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="social-instagram" className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram
                  </label>
                  <input
                    id="social-instagram"
                    type="url"
                    value={business.social_instagram}
                    onChange={(e) => update('social_instagram', e.target.value)}
                    placeholder="https://instagram.com/yourbusiness"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="social-linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                    LinkedIn
                  </label>
                  <input
                    id="social-linkedin"
                    type="url"
                    value={business.social_linkedin}
                    onChange={(e) => update('social_linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/yourbusiness"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="social-youtube" className="block text-sm font-medium text-gray-700 mb-1">
                    YouTube
                  </label>
                  <input
                    id="social-youtube"
                    type="url"
                    value={business.social_youtube}
                    onChange={(e) => update('social_youtube', e.target.value)}
                    placeholder="https://youtube.com/@yourbusiness"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="social-tiktok" className="block text-sm font-medium text-gray-700 mb-1">
                    TikTok
                  </label>
                  <input
                    id="social-tiktok"
                    type="url"
                    value={business.social_tiktok}
                    onChange={(e) => update('social_tiktok', e.target.value)}
                    placeholder="https://tiktok.com/@yourbusiness"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="social-github" className="block text-sm font-medium text-gray-700 mb-1">
                  GitHub
                </label>
                <input
                  id="social-github"
                  type="url"
                  value={business.social_github}
                  onChange={(e) => update('social_github', e.target.value)}
                  placeholder="https://github.com/yourbusiness"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
