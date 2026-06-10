/**
 * Format a GitHub ISO date string into a human-friendly relative or absolute label.
 */
export function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Compact number: 12345 → "12.3k"
 */
export function formatCount(n) {
  if (n === undefined || n === null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/**
 * Ensure a URL has a protocol prefix.
 */
export function normaliseUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `https://${url}`;
}