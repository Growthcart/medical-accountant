'use client';

import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Admin Error</h1>
        <p className="text-gray-600 mb-6">{error.message || 'Something went wrong in the admin panel.'}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Try again
          </button>
          <Link
            href="/admin/"
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
