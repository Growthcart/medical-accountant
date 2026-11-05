'use client';
/* eslint-disable @next/next/no-img-element -- admin-only tooling renders arbitrary user-uploaded / preview URLs (incl. data: URLs) where next/image's domain allowlist and optimisation are the wrong fit */

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/db/client';
import { User, Save, ArrowLeft, Upload, Loader2, Camera } from 'lucide-react';
import Link from 'next/link';

export default function AccountPage() {
  const { profile, refreshProfile } = useAuth();
  const db = createClient();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(profile?.profile_photo_url || '');
  const [jobTitle, setJobTitle] = useState(profile?.job_title || '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url || '');
  const [twitterHandle, setTwitterHandle] = useState(profile?.twitter_handle || '');
  const [websiteUrl, setWebsiteUrl] = useState(profile?.website_url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Only JPEG, PNG, and WebP images are allowed.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be under 5MB.' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `profile-${profile?.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await db.storage
        .from('post-images')
        .upload(filename, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        setMessage({ type: 'error', text: `Upload failed: ${uploadError.message}` });
        setUploading(false);
        return;
      }

      const { data } = db.storage.from('post-images').getPublicUrl(filename);
      setProfilePhotoUrl(data.publicUrl);
      setMessage({ type: 'success', text: 'Photo uploaded. Click Save to apply.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload photo.' });
    }

    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage(null);

    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setMessage({ type: 'error', text: 'Full name is required.' });
      setSaving(false);
      return;
    }

    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) {
        setMessage({ type: 'error', text: 'Session expired. Please sign in again.' });
        setSaving(false);
        return;
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: trimmedName,
          username: username.trim() || null,
          bio: bio.trim() || null,
          profile_photo_url: profilePhotoUrl.trim() || null,
          job_title: jobTitle.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          twitter_handle: twitterHandle.trim() || null,
          website_url: websiteUrl.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update profile.' });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully.' });
        await refreshProfile();
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Update your profile and author information</p>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Profile Photo */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
            <div className="relative group">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt={fullName || 'Profile'}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 border-2 border-gray-200">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-medium text-gray-900">{profile?.full_name || 'Admin'}</p>
              <p className="text-sm text-gray-500">Administrator</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-1 text-xs text-blue-600 hover:text-blue-700"
              >
                {uploading ? 'Uploading...' : 'Change photo'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="Optional username"
              />
              <p className="mt-1 text-xs text-gray-400">Optional. Must be unique if provided.</p>
            </div>

            {/* Author Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Author Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-y"
                placeholder="Write a short bio that appears on your blog posts..."
              />
              <p className="mt-1 text-xs text-gray-400">Displayed on blog post pages alongside your name and photo.</p>
            </div>

            {/* Profile Photo URL (manual) */}
            <div>
              <label htmlFor="photo-url" className="block text-sm font-medium text-gray-700 mb-1">
                Profile Photo URL
              </label>
              <input
                id="photo-url"
                type="url"
                value={profilePhotoUrl}
                onChange={(e) => setProfilePhotoUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="https://... or upload using the photo above"
              />
              <p className="mt-1 text-xs text-gray-400">Auto-filled when you upload a photo, or paste a URL manually.</p>
            </div>

            {/* Author entity (E-E-A-T) — surfaces in schema.org Person on every post by this author. */}
            <div className="pt-6 mt-2 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Author identity</h2>
              <p className="text-xs text-gray-500 mb-4">
                Fields below appear in JSON-LD on each blog post you write. They power knowledge-panel
                eligibility and AI search attribution.
              </p>
            </div>

            <div>
              <label htmlFor="job-title" className="block text-sm font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <input
                id="job-title"
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="e.g. Co-Founder, Head of SEO"
              />
            </div>

            <div>
              <label htmlFor="linkedin-url" className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn Profile URL
              </label>
              <input
                id="linkedin-url"
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="https://www.linkedin.com/in/yourhandle/"
              />
            </div>

            <div>
              <label htmlFor="twitter-handle" className="block text-sm font-medium text-gray-700 mb-1">
                X (Twitter) Handle
              </label>
              <input
                id="twitter-handle"
                type="text"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="MedicalAccountant.ie (no @ needed)"
              />
              <p className="mt-1 text-xs text-gray-400">Just the handle. The @ is optional and will be stripped.</p>
            </div>

            <div>
              <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-1">
                Personal Website URL
              </label>
              <input
                id="website-url"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                placeholder="https://..."
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
