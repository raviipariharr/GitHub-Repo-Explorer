import { useState } from "react";
import { useCompare } from "../../hooks/useCompare";
import { formatCount, formatDate } from "../../utils/formatters";
import { langColour } from "../../utils/langColours";
import styles from "./CompareView.module.css";

/**
 * Row config = the "data transformation" layer.
 * `rank` turns a raw value into a number where HIGHER wins (or null = not comparable).
 * Rows without `rank` are shown but never highlighted.
 * Open issues is deliberately unranked: fewer issues often means fewer users, not better health.
 */
const NA = "N/A";
const ROWS = [
  { key: "stars",        label: "Stars",            fmt: formatCount, rank: (v) => v },
  { key: "forks",        label: "Forks",            fmt: formatCount, rank: (v) => v },
  { key: "openIssues",   label: "Open issues",      fmt: formatCount },
  { key: "contributors", label: "Contributors",     fmt: (v) => (v == null ? NA : formatCount(v)), rank: (v) => v },
  { key: "language",     label: "Primary language", fmt: (v) => v || "—", render: "language" },
  { key: "lastUpdated",  label: "Last updated",     fmt: formatDate, rank: (v) => (v ? new Date(v).getTime() : null) },
  { key: "license",      label: "License",          fmt: (v) => v || "None" },
  { key: "commits",      label: "Commits",          fmt: (v) => (v == null ? NA : formatCount(v)), rank: (v) => v },
];

/** Returns "left" | "right" | null */
function winner(row, left, right) {
  if (!row.rank) return null;
  const l = row.rank(left[row.key]);
  const r = row.rank(right[row.key]);
  if (l == null || r == null || l === r) return null;
  return l > r ? "left" : "right";
}

function Cell({ row, value, isWinner }) {
  return (
    <td className={`${styles.cell} ${isWinner ? styles.win : ""}`}>
      {row.render === "language" && value && (
        <span className={styles.dot} style={{ background: langColour(value) }} />
      )}
      {row.fmt(value)}
    </td>
  );
}

export function CompareView() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const { result, loading, error, compare } = useCompare();

  function handleSubmit(e) {
    e.preventDefault();
    if (a.trim() && b.trim() && !loading) compare(a.trim(), b.trim());
  }

  return (
    <section className={styles.wrap} aria-label="Compare repositories">
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          value={a}
          onChange={(e) => setA(e.target.value)}
          placeholder="owner/repo  e.g. facebook/react"
          spellCheck={false}
          aria-label="First repository"
        />
        <span className={styles.vs}>vs</span>
        <input
          className={styles.input}
          value={b}
          onChange={(e) => setB(e.target.value)}
          placeholder="owner/repo  e.g. vuejs/core"
          spellCheck={false}
          aria-label="Second repository"
        />
        <button className={styles.btn} type="submit" disabled={!a.trim() || !b.trim() || loading}>
          {loading ? "Comparing…" : "Compare"}
        </button>
      </form>

      {error && (
        <div className={styles.error} role="alert">
          ⚠️ {error.message}
        </div>
      )}

      {result && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th />
                <th>
                  <a href={result.left.htmlUrl} target="_blank" rel="noopener noreferrer">
                    {result.left.fullName}
                  </a>
                </th>
                <th>
                  <a href={result.right.htmlUrl} target="_blank" rel="noopener noreferrer">
                    {result.right.fullName}
                  </a>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const w = winner(row, result.left, result.right);
                return (
                  <tr key={row.key}>
                    <th scope="row" className={styles.label}>{row.label}</th>
                    <Cell row={row} value={result.left[row.key]} isWinner={w === "left"} />
                    <Cell row={row} value={result.right[row.key]} isWinner={w === "right"} />
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className={styles.note}>
            Highlight = higher / more recent. Open issues includes pull requests (GitHub quirk) and is not ranked.
            N/A = GitHub didn't return a count (empty repo or contributor list too large).
          </p>
        </div>
      )}
    </section>
  );
}