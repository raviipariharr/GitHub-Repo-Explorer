/**
 * Colours sourced from github-linguist — the same palette GitHub uses.
 */
const LANG_COLOURS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Lua: "#000080",
  R: "#198CE7",
  Scala: "#c22d40",
  Clojure: "#db5855",
  Perl: "#0298c3",
  Nix: "#7e7eff",
  Dockerfile: "#384d54",
  Makefile: "#427819",
  "Jupyter Notebook": "#DA5B0B",
};

const FALLBACK_COLOURS = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b",
  "#10b981", "#3b82f6", "#a855f7", "#ef4444",
];

const _cache = {};

export function langColour(language) {
  if (!language) return "#94a3b8";
  if (LANG_COLOURS[language]) return LANG_COLOURS[language];
  if (!_cache[language]) {
    // Deterministic fallback based on name hash
    let hash = 0;
    for (let i = 0; i < language.length; i++) {
      hash = (hash * 31 + language.charCodeAt(i)) >>> 0;
    }
    _cache[language] = FALLBACK_COLOURS[hash % FALLBACK_COLOURS.length];
  }
  return _cache[language];
}