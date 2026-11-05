import Link from 'next/link';
import { ChevronRight, Globe, Linkedin } from 'lucide-react';
import AuthorAvatar from './AuthorAvatar';

interface AuthorBoxProps {
  name: string;
  photo: string | null;
  bio: string | null;
  // Job title, e.g. "Co-Founder"; falls back to a generic label.
  title: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  // Author archive URL, when the author has one.
  href: string | null;
}

function safeHttpUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

// Author card at the end of an article: photo, name, title and one social
// link, a two-line bio and a link to the author's archive.
export default function AuthorBox({ name, photo, bio, title, linkedinUrl, websiteUrl, href }: AuthorBoxProps) {
  const linkedinHref = safeHttpUrl(linkedinUrl);
  const websiteHref = safeHttpUrl(websiteUrl);
  const socialUrl = linkedinHref || websiteHref;
  const socialIsLinkedin = !!linkedinHref;
  const avatar = <AuthorAvatar src={photo} name={name} size={44} className="rounded" fallbackClassName="bg-gray-200 text-gray-500" />;

  return (
    <div className="mt-12 border-t border-gray-200 pt-6">
      {/* Row 1: photo + name + title/social */}
      <div className="flex items-start gap-3.5">
        {href ? (
          <Link href={href} className="flex-shrink-0" aria-label={name}>
            {avatar}
          </Link>
        ) : (
          <span className="flex-shrink-0">{avatar}</span>
        )}

        <div className="min-w-0">
          {href ? (
            <Link href={href} className="text-[18px] font-bold leading-tight text-gray-900 transition hover:text-[#ff642d]">
              {name}
            </Link>
          ) : (
            <span className="text-[18px] font-bold leading-tight text-gray-900">{name}</span>
          )}

          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>{title || 'Author, MedicalAccountant.ie'}</span>
            {socialUrl && (
              <>
                <span className="h-3.5 w-px bg-gray-300" aria-hidden="true" />
                <a
                  href={socialUrl}
                  target="_blank"
                  rel="me noopener noreferrer"
                  className="inline-flex items-center text-gray-500 transition hover:text-gray-900"
                  aria-label={socialIsLinkedin ? `${name} on LinkedIn` : `${name}'s website`}
                >
                  {socialIsLinkedin ? <Linkedin className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: bio, truncated to two lines */}
      {bio && <p className="mt-3 line-clamp-2 text-[15px] leading-relaxed text-gray-700">{bio}</p>}

      {/* Row 3: view bio link */}
      {href && (
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-0.5 text-sm font-semibold text-gray-900 transition hover:text-[#ff642d]"
        >
          View Bio
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
