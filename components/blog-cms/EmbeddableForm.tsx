'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/db/client';
import FormRenderer from './FormRenderer';
import type { FormFieldDefinition } from '@/lib/database.types';

interface EmbeddableFormProps {
  slug: string;
  // Form definition fetched on the server, so the fields are in the page
  // HTML. When omitted the form is loaded in the browser.
  initialForm?: FormData | null;
}

export interface FormData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fields: FormFieldDefinition[];
  success_message: string;
}

export default function EmbeddableForm({ slug, initialForm }: EmbeddableFormProps) {
  const [form, setForm] = useState<FormData | null>(initialForm ?? null);
  const [loading, setLoading] = useState(!initialForm);

  useEffect(() => {
    if (initialForm) return;
    const db = createClient();
    db
      .from('contact_forms')
      .select('id, name, slug, description, fields, success_message')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        setForm(data as FormData | null);
        setLoading(false);
      });
  }, [slug, initialForm]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!form) return null;

  return <FormRenderer form={form} />;
}
