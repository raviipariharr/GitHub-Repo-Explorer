const NOT_RELATIVE = /^([a-z][a-z0-9+.-]*:|\/\/|#)/i;

/**
 * Resolve a README-relative URL the way GitHub does.
 *  - images (key "src")  -> raw.githubusercontent.com/<o>/<r>/<ref>/...
 *  - links  (key "href") -> github.com/<o>/<r>/blob/<ref>/...
 *  - "./a.png" and "a.png" are relative to the README's own folder (dir)
 *  - "/a.png" is relative to the repo root
 *
 * Returns null when the URL is absolute, a #fragment, or can't be resolved,
 * so the caller can fall back to react-markdown's default sanitising transform.
 */
export function resolveRelativeUrl(url, key, { rawBase, blobBase, dir = "" } = {}) {
  if (!url || !rawBase || NOT_RELATIVE.test(url)) return null;

  const base = key === "src" ? rawBase : blobBase;
  const rel = url.startsWith("/") ? url.slice(1) : dir + url;

  try {
    return new URL(rel, base).href;
  } catch {
    return null;
  }
}