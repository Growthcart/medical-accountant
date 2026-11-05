'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/db/client';
import { notifySiteChange } from '@/lib/admin/notifySiteChange';
import {
  Settings,
  BarChart3,
  Code,
  Cookie,
  Monitor,
  Save,
  CheckCircle,
  AlertCircle,
  Link2,
} from 'lucide-react';
import { normaliseStructure, postPath, type PostUrlStructure } from '@/lib/blog/postUrl';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

interface SiteSettings {
  header_banner_enabled: boolean;
  header_banner_content: string;
  header_banner_bg_color: string;
  ga4_measurement_id: string;
  meta_pixel_id: string;
  gtm_id: string;
  twitter_pixel_id: string;
  linkedin_partner_id: string;
  tiktok_pixel_id: string;
  google_search_console_id: string;
  custom_head_scripts: string;
  custom_body_scripts: string;
  cookie_consent_enabled: boolean;
  cookie_banner_message: string;
  cookie_policy_content: string;
  cookie_uk_consent_required: boolean;
  post_html_block_enabled: boolean;
  post_html_block_content: string;
  footer_banner_enabled: boolean;
  footer_banner_content: string;
  footer_banner_bg_color: string;
  post_url_structure: PostUrlStructure;
}

const defaultSettings: SiteSettings = {
  header_banner_enabled: false,
  header_banner_content: '',
  header_banner_bg_color: '#1e1b4b',
  ga4_measurement_id: '',
  meta_pixel_id: '',
  gtm_id: '',
  twitter_pixel_id: '',
  linkedin_partner_id: '',
  tiktok_pixel_id: '',
  google_search_console_id: '',
  custom_head_scripts: '',
  custom_body_scripts: '',
  cookie_consent_enabled: true,
  cookie_banner_message: 'We use cookies to enhance your browsing experience and analyze site traffic.',
  cookie_policy_content: '',
  cookie_uk_consent_required: true,
  post_html_block_enabled: false,
  post_html_block_content: '',
  footer_banner_enabled: false,
  footer_banner_content: '',
  footer_banner_bg_color: '#1e1b4b',
  post_url_structure: 'category',
};

export default function SiteSettingsPage() {
  const db = useMemo(() => createClient(), []);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await db
        .from('site_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .maybeSingle();

      if (data) {
        setSettings({
          header_banner_enabled: data.header_banner_enabled ?? false,
          header_banner_content: data.header_banner_content ?? '',
          header_banner_bg_color: data.header_banner_bg_color ?? '#1e1b4b',
          ga4_measurement_id: data.ga4_measurement_id ?? '',
          meta_pixel_id: data.meta_pixel_id ?? '',
          gtm_id: data.gtm_id ?? '',
          twitter_pixel_id: data.twitter_pixel_id ?? '',
          linkedin_partner_id: data.linkedin_partner_id ?? '',
          tiktok_pixel_id: data.tiktok_pixel_id ?? '',
          google_search_console_id: data.google_search_console_id ?? '',
          custom_head_scripts: data.custom_head_scripts ?? '',
          custom_body_scripts: data.custom_body_scripts ?? '',
          cookie_consent_enabled: data.cookie_consent_enabled ?? true,
          cookie_banner_message: data.cookie_banner_message ?? '',
          cookie_policy_content: data.cookie_policy_content ?? '',
          cookie_uk_consent_required: data.cookie_uk_consent_required ?? true,
          post_html_block_enabled: data.post_html_block_enabled ?? false,
          post_html_block_content: data.post_html_block_content ?? '',
          footer_banner_enabled: data.footer_banner_enabled ?? false,
          footer_banner_content: data.footer_banner_content ?? '',
          footer_banner_bg_color: data.footer_banner_bg_color ?? '#1e1b4b',
          post_url_structure: normaliseStructure(data.post_url_structure),
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [db]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleChange = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await db.from('site_settings').upsert({
      id: SETTINGS_ID,
      header_banner_enabled: settings.header_banner_enabled,
      header_banner_content: settings.header_banner_content,
      header_banner_bg_color: settings.header_banner_bg_color,
      ga4_measurement_id: settings.ga4_measurement_id || null,
      meta_pixel_id: settings.meta_pixel_id || null,
      gtm_id: settings.gtm_id || null,
      twitter_pixel_id: settings.twitter_pixel_id || null,
      linkedin_partner_id: settings.linkedin_partner_id || null,
      tiktok_pixel_id: settings.tiktok_pixel_id || null,
      google_search_console_id: settings.google_search_console_id || null,
      custom_head_scripts: settings.custom_head_scripts || null,
      custom_body_scripts: settings.custom_body_scripts || null,
      cookie_consent_enabled: settings.cookie_consent_enabled,
      cookie_banner_message: settings.cookie_banner_message,
      cookie_policy_content: settings.cookie_policy_content || null,
      cookie_uk_consent_required: settings.cookie_uk_consent_required,
      post_html_block_enabled: settings.post_html_block_enabled,
      post_html_block_content: settings.post_html_block_content || '',
      footer_banner_enabled: settings.footer_banner_enabled,
      footer_banner_content: settings.footer_banner_content || '',
      footer_banner_bg_color: settings.footer_banner_bg_color || '#1e1b4b',
      post_url_structure: settings.post_url_structure,
      updated_at: new Date().toISOString(),
    });

    // Banners and the verification tag are rendered into cached pages.
    if (!error) await notifySiteChange({ site: true });
    setSaving(false);

    if (error) {
      setToast({ type: 'error', message: `Failed to save settings: ${error.message}` });
    } else {
      setToast({ type: 'success', message: 'Settings saved successfully.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {toast.message}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure analytics, banners, scripts, and cookie consent
          </p>
        </div>

        <div className="space-y-6">
          {/* Post URLs */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Link2 className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Post URLs</h2>
            </div>
            <fieldset className="space-y-3">
              <legend className="sr-only">Post URL structure</legend>
              {([
                ['category', 'With category', postPath('blog-name', 'category-name', 'category')],
                ['flat', 'Without category', postPath('blog-name', 'category-name', 'flat')],
              ] as const).map(([value, label, example]) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer ${
                    settings.post_url_structure === value ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="post_url_structure"
                    value={value}
                    checked={settings.post_url_structure === value}
                    onChange={() => handleChange('post_url_structure', value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">{label}</span>
                    <code className="block text-sm text-gray-600">{example}</code>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="mt-3 text-sm text-gray-500">
              Changing this moves every post to its new address. Old addresses redirect automatically (301), but
              links you pasted elsewhere will pass through one redirect. In the flat layout a post slug must be
              unique across the whole blog, which it already is.
            </p>
          </div>

          {/* Header Banner */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Monitor className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Header Banner</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.header_banner_enabled}
                    onChange={(e) => handleChange('header_banner_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">Enable Header Banner</span>
              </div>
              <div>
                <label htmlFor="banner-content" className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Content (HTML)
                </label>
                <textarea
                  id="banner-content"
                  rows={3}
                  value={settings.header_banner_content}
                  onChange={(e) => handleChange('header_banner_content', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono"
                  placeholder="<p>Banner message here</p>"
                />
              </div>
              <div>
                <label htmlFor="banner-color" className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="banner-color"
                    value={settings.header_banner_bg_color}
                    onChange={(e) => handleChange('header_banner_bg_color', e.target.value)}
                    className="w-10 h-10 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.header_banner_bg_color}
                    onChange={(e) => handleChange('header_banner_bg_color', e.target.value)}
                    className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Post HTML Block */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Code className="w-5 h-5 text-gray-400" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Post HTML Block</h2>
                <p className="text-xs text-gray-500 mt-0.5">Displays a custom HTML block below the featured image on all blog posts</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.post_html_block_enabled}
                    onChange={(e) => handleChange('post_html_block_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">Enable Post HTML Block</span>
              </div>
              <div>
                <label htmlFor="post-html-block" className="block text-sm font-medium text-gray-700 mb-1">
                  HTML Content
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  This HTML will be rendered below the featured image on every blog post. Use for CTAs, promotions, newsletter signups, etc.
                </p>
                <textarea
                  id="post-html-block"
                  rows={6}
                  value={settings.post_html_block_content}
                  onChange={(e) => handleChange('post_html_block_content', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono"
                  placeholder='<div style="padding: 20px; background: #f8f9fa; border-radius: 8px;">Your content here</div>'
                />
              </div>
            </div>
          </div>

          {/* Footer Banner */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Monitor className="w-5 h-5 text-gray-400" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Footer Banner</h2>
                <p className="text-xs text-gray-500 mt-0.5">A sticky banner that stays fixed at the bottom of the page</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.footer_banner_enabled}
                    onChange={(e) => handleChange('footer_banner_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">Enable Footer Banner</span>
              </div>
              <div>
                <label htmlFor="footer-banner-content" className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Content (HTML)
                </label>
                <textarea
                  id="footer-banner-content"
                  rows={3}
                  value={settings.footer_banner_content}
                  onChange={(e) => handleChange('footer_banner_content', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono"
                  placeholder="<p>Footer banner message here</p>"
                />
              </div>
              <div>
                <label htmlFor="footer-banner-color" className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="footer-banner-color"
                    value={settings.footer_banner_bg_color}
                    onChange={(e) => handleChange('footer_banner_bg_color', e.target.value)}
                    className="w-10 h-10 border border-gray-300 rounded-md cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.footer_banner_bg_color}
                    onChange={(e) => handleChange('footer_banner_bg_color', e.target.value)}
                    className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Analytics IDs */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Analytics & Tracking</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ga4" className="block text-sm font-medium text-gray-700 mb-1">
                  GA4 Measurement ID
                </label>
                <input
                  id="ga4"
                  type="text"
                  value={settings.ga4_measurement_id}
                  onChange={(e) => handleChange('ga4_measurement_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
              <div>
                <label htmlFor="meta-pixel" className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Pixel ID
                </label>
                <input
                  id="meta-pixel"
                  type="text"
                  value={settings.meta_pixel_id}
                  onChange={(e) => handleChange('meta_pixel_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="XXXXXXXXXXXXXXX"
                />
              </div>
              <div>
                <label htmlFor="gtm" className="block text-sm font-medium text-gray-700 mb-1">
                  GTM Container ID
                </label>
                <input
                  id="gtm"
                  type="text"
                  value={settings.gtm_id}
                  onChange={(e) => handleChange('gtm_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="GTM-XXXXXXX"
                />
              </div>
              <div>
                <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 mb-1">
                  Twitter Pixel ID
                </label>
                <input
                  id="twitter"
                  type="text"
                  value={settings.twitter_pixel_id}
                  onChange={(e) => handleChange('twitter_pixel_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="XXXXX"
                />
              </div>
              <div>
                <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn Partner ID
                </label>
                <input
                  id="linkedin"
                  type="text"
                  value={settings.linkedin_partner_id}
                  onChange={(e) => handleChange('linkedin_partner_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="XXXXXXX"
                />
              </div>
              <div>
                <label htmlFor="tiktok" className="block text-sm font-medium text-gray-700 mb-1">
                  TikTok Pixel ID
                </label>
                <input
                  id="tiktok"
                  type="text"
                  value={settings.tiktok_pixel_id}
                  onChange={(e) => handleChange('tiktok_pixel_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="XXXXXXXXXXXXX"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="gsc" className="block text-sm font-medium text-gray-700 mb-1">
                  Google Search Console Verification ID
                </label>
                <input
                  id="gsc"
                  type="text"
                  value={settings.google_search_console_id}
                  onChange={(e) => handleChange('google_search_console_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="Verification string"
                />
              </div>
            </div>
          </div>

          {/* Custom Scripts */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Code className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Custom Scripts</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="head-scripts" className="block text-sm font-medium text-gray-700 mb-1">
                  Head Scripts
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Injected into the &lt;head&gt; section of every page. Use for meta tags, schema markup, etc.
                </p>
                <textarea
                  id="head-scripts"
                  rows={5}
                  value={settings.custom_head_scripts}
                  onChange={(e) => handleChange('custom_head_scripts', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono"
                  placeholder="<!-- Custom head scripts -->"
                />
              </div>
              <div>
                <label htmlFor="body-scripts" className="block text-sm font-medium text-gray-700 mb-1">
                  Body Scripts
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Injected at the end of the &lt;body&gt; section. Use for chat widgets, noscript fallbacks, etc.
                </p>
                <textarea
                  id="body-scripts"
                  rows={5}
                  value={settings.custom_body_scripts}
                  onChange={(e) => handleChange('custom_body_scripts', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono"
                  placeholder="<!-- Custom body scripts -->"
                />
              </div>
            </div>
          </div>

          {/* Cookie Consent */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Cookie className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Cookie Consent</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.cookie_consent_enabled}
                    onChange={(e) => handleChange('cookie_consent_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">Enable Cookie Consent Banner</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.cookie_uk_consent_required}
                    onChange={(e) => handleChange('cookie_uk_consent_required', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">Require UK Consent (GB geo-detection)</span>
              </div>
              <div>
                <label htmlFor="cookie-message" className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Message
                </label>
                <textarea
                  id="cookie-message"
                  rows={3}
                  value={settings.cookie_banner_message}
                  onChange={(e) => handleChange('cookie_banner_message', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="We use cookies to enhance your browsing experience..."
                />
              </div>
              <div>
                <label htmlFor="cookie-policy" className="block text-sm font-medium text-gray-700 mb-1">
                  Cookie Policy Content
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Detailed cookie policy text. Supports plain text or HTML.
                </p>
                <textarea
                  id="cookie-policy"
                  rows={8}
                  value={settings.cookie_policy_content}
                  onChange={(e) => handleChange('cookie_policy_content', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  placeholder="Enter your cookie policy content here..."
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-6 py-2.5 font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
