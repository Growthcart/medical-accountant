export type Database = {
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          content: string | null;
          excerpt: string | null;
          featured_image_url: string | null;
          featured_image_alt: string | null;
          category_id: string | null;
          author_id: string | null;
          status: 'draft' | 'published';
          is_featured: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          og_title: string | null;
          og_description: string | null;
          og_image: string | null;
          media_type: 'image' | 'video' | 'audio' | null;
          media_url: string | null;
          media_caption: string | null;
          media_credit: string | null;
          featured_image_credit: string | null;
          canonical_url: string | null;
          schema_type: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          content?: string | null;
          excerpt?: string | null;
          featured_image_url?: string | null;
          featured_image_alt?: string | null;
          category_id?: string | null;
          author_id?: string | null;
          status?: 'draft' | 'published';
          is_featured?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          og_title?: string | null;
          og_description?: string | null;
          og_image?: string | null;
          media_type?: 'image' | 'video' | 'audio' | null;
          media_url?: string | null;
          media_caption?: string | null;
          media_credit?: string | null;
          featured_image_credit?: string | null;
          canonical_url?: string | null;
          schema_type?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          content?: string | null;
          excerpt?: string | null;
          featured_image_url?: string | null;
          featured_image_alt?: string | null;
          category_id?: string | null;
          author_id?: string | null;
          status?: 'draft' | 'published';
          is_featured?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
          og_title?: string | null;
          og_description?: string | null;
          og_image?: string | null;
          media_type?: 'image' | 'video' | 'audio' | null;
          media_url?: string | null;
          media_caption?: string | null;
          media_credit?: string | null;
          featured_image_credit?: string | null;
          canonical_url?: string | null;
          schema_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      post_tags: {
        Row: {
          post_id: string;
          tag_id: string;
        };
        Insert: {
          post_id: string;
          tag_id: string;
        };
        Update: {
          post_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_tags_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          profile_photo_url: string | null;
          bio: string | null;
          role: string;
          job_title: string | null;
          linkedin_url: string | null;
          twitter_handle: string | null;
          website_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          profile_photo_url?: string | null;
          bio?: string | null;
          role?: string;
          job_title?: string | null;
          linkedin_url?: string | null;
          twitter_handle?: string | null;
          website_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          profile_photo_url?: string | null;
          bio?: string | null;
          role?: string;
          job_title?: string | null;
          linkedin_url?: string | null;
          twitter_handle?: string | null;
          website_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: string;
          header_banner_enabled: boolean;
          header_banner_content: string;
          header_banner_bg_color: string;
          ga4_measurement_id: string | null;
          meta_pixel_id: string | null;
          gtm_id: string | null;
          twitter_pixel_id: string | null;
          linkedin_partner_id: string | null;
          tiktok_pixel_id: string | null;
          google_search_console_id: string | null;
          custom_head_scripts: string | null;
          custom_body_scripts: string | null;
          cookie_consent_enabled: boolean;
          cookie_banner_message: string;
          cookie_policy_content: string | null;
          cookie_uk_consent_required: boolean;
          post_html_block_enabled: boolean;
          post_html_block_content: string;
          footer_banner_enabled: boolean;
          footer_banner_content: string;
          footer_banner_bg_color: string;
          post_url_structure: 'category' | 'flat';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          header_banner_enabled?: boolean;
          header_banner_content?: string;
          header_banner_bg_color?: string;
          ga4_measurement_id?: string | null;
          meta_pixel_id?: string | null;
          gtm_id?: string | null;
          twitter_pixel_id?: string | null;
          linkedin_partner_id?: string | null;
          tiktok_pixel_id?: string | null;
          google_search_console_id?: string | null;
          custom_head_scripts?: string | null;
          custom_body_scripts?: string | null;
          cookie_consent_enabled?: boolean;
          cookie_banner_message?: string;
          cookie_policy_content?: string | null;
          cookie_uk_consent_required?: boolean;
          post_html_block_enabled?: boolean;
          post_html_block_content?: string;
          footer_banner_enabled?: boolean;
          footer_banner_content?: string;
          footer_banner_bg_color?: string;
          post_url_structure?: 'category' | 'flat';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          header_banner_enabled?: boolean;
          header_banner_content?: string;
          header_banner_bg_color?: string;
          ga4_measurement_id?: string | null;
          meta_pixel_id?: string | null;
          gtm_id?: string | null;
          twitter_pixel_id?: string | null;
          linkedin_partner_id?: string | null;
          tiktok_pixel_id?: string | null;
          google_search_console_id?: string | null;
          custom_head_scripts?: string | null;
          custom_body_scripts?: string | null;
          cookie_consent_enabled?: boolean;
          cookie_banner_message?: string;
          cookie_policy_content?: string | null;
          cookie_uk_consent_required?: boolean;
          post_html_block_enabled?: boolean;
          post_html_block_content?: string;
          footer_banner_enabled?: boolean;
          footer_banner_content?: string;
          footer_banner_bg_color?: string;
          post_url_structure?: 'category' | 'flat';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      header_menus: {
        Row: {
          id: string;
          menu_text: string;
          menu_link: string;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          menu_text: string;
          menu_link: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          menu_text?: string;
          menu_link?: string;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      url_redirects: {
        Row: {
          id: string;
          from_path: string;
          to_path: string;
          status_code: number;
          notes: string | null;
          is_automatic: boolean;
          redirect_type: string | null;
          hit_count: number;
          last_hit_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          from_path: string;
          to_path: string;
          status_code?: number;
          notes?: string | null;
          is_automatic?: boolean;
          redirect_type?: string | null;
          hit_count?: number;
          last_hit_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          from_path?: string;
          to_path?: string;
          status_code?: number;
          notes?: string | null;
          is_automatic?: boolean;
          redirect_type?: string | null;
          hit_count?: number;
          last_hit_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'url_redirects_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      cookie_consents: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string | null;
          consent_given: boolean;
          consent_type: string;
          analytics_consent: boolean;
          marketing_consent: boolean;
          essential_consent: boolean;
          ip_address: string | null;
          country: string | null;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          consent_given?: boolean;
          consent_type?: string;
          analytics_consent?: boolean;
          marketing_consent?: boolean;
          essential_consent?: boolean;
          ip_address?: string | null;
          country?: string | null;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          consent_given?: boolean;
          consent_type?: string;
          analytics_consent?: boolean;
          marketing_consent?: boolean;
          essential_consent?: boolean;
          ip_address?: string | null;
          country?: string | null;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cookie_consents_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      contact_forms: {
        Row: {
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
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          fields: FormFieldDefinition[];
          recipient_email: string;
          success_message?: string;
          is_active?: boolean;
          admin_email_subject?: string | null;
          admin_email_template?: string | null;
          user_email_enabled?: boolean;
          user_email_field?: string | null;
          user_email_subject?: string | null;
          user_email_template?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          fields?: FormFieldDefinition[];
          recipient_email?: string;
          success_message?: string;
          is_active?: boolean;
          admin_email_subject?: string | null;
          admin_email_template?: string | null;
          user_email_enabled?: boolean;
          user_email_field?: string | null;
          user_email_subject?: string | null;
          user_email_template?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      form_submissions: {
        Row: {
          id: string;
          form_id: string;
          data: Record<string, string>;
          ip_address: string | null;
          user_agent: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          data: Record<string, string>;
          ip_address?: string | null;
          user_agent?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          form_id?: string;
          data?: Record<string, string>;
          ip_address?: string | null;
          user_agent?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'form_submissions_form_id_fkey';
            columns: ['form_id'];
            isOneToOne: false;
            referencedRelation: 'contact_forms';
            referencedColumns: ['id'];
          },
        ];
      };
      business_info: {
        Row: {
          id: string;
          business_name: string;
          business_category: string | null;
          logo_url: string | null;
          description: string | null;
          address_street: string | null;
          address_city: string | null;
          address_state: string | null;
          address_postal_code: string | null;
          address_country: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          social_facebook: string | null;
          social_twitter: string | null;
          social_instagram: string | null;
          social_linkedin: string | null;
          social_youtube: string | null;
          social_tiktok: string | null;
          social_github: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_name?: string;
          business_category?: string | null;
          logo_url?: string | null;
          description?: string | null;
          address_street?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_postal_code?: string | null;
          address_country?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          social_facebook?: string | null;
          social_twitter?: string | null;
          social_instagram?: string | null;
          social_linkedin?: string | null;
          social_youtube?: string | null;
          social_tiktok?: string | null;
          social_github?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          business_category?: string | null;
          logo_url?: string | null;
          description?: string | null;
          address_street?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_postal_code?: string | null;
          address_country?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          social_facebook?: string | null;
          social_twitter?: string | null;
          social_instagram?: string | null;
          social_linkedin?: string | null;
          social_youtube?: string | null;
          social_tiktok?: string | null;
          social_github?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          review_date: string;
          spoiler: string | null;
          review: string;
          reviewer_name: string;
          designation: string | null;
          business_name: string | null;
          website_url: string | null;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          review_date?: string;
          spoiler?: string | null;
          review: string;
          reviewer_name: string;
          designation?: string | null;
          business_name?: string | null;
          website_url?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          review_date?: string;
          spoiler?: string | null;
          review?: string;
          reviewer_name?: string;
          designation?: string | null;
          business_name?: string | null;
          website_url?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      review_settings: {
        Row: {
          id: string;
          google_reviews_text: string | null;
          google_reviews_link: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          google_reviews_text?: string | null;
          google_reviews_link?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          google_reviews_text?: string | null;
          google_reviews_link?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      time_entries: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          started_at: string;
          ended_at: string | null;
          duration_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          started_at?: string;
          ended_at?: string | null;
          duration_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          started_at?: string;
          ended_at?: string | null;
          duration_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'time_entries_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {};
    Functions: {
      check_rate_limit: {
        Args: {
          p_key: string;
          p_max_requests: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
    };
    Enums: {};
  };
};

export interface FormFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'textarea' | 'phone' | 'select' | 'url' | 'number' | 'date' | 'file' | 'checkbox' | 'radio' | 'checkbox_group';
  placeholder?: string;
  is_required: boolean;
  options?: string[];
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  display_order: number;
}

export interface Review {
  id: string;
  review_date: string;
  spoiler: string | null;
  review: string;
  reviewer_name: string;
  designation: string | null;
  business_name: string | null;
  website_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewSettings {
  id: string;
  google_reviews_text: string | null;
  google_reviews_link: string | null;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

// A time entry joined with its project name, returned by the entries API.
export interface TimeEntryWithProject extends TimeEntry {
  project_name: string | null;
}
