import { useEffect, useState } from "react";
import { githubApi } from "../../api/client";
import { formatDate } from "../../utils/formatters";
import { langColour } from "../../utils/langColours";
import styles from "./RepoDetails.module.css";

export function RepoDetails({ repo, username }) {
  const [langs, setLangs] = useState(null);
  const [langsLoading, setLangsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLangsLoading(true);
      const { data } = await githubApi.getRepoLanguages(username, repo.name);
      if (!cancelled) {
        setLangs(data || {});
        setLangsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [username, repo.name]);

  const totalBytes = langs ? Object.values(langs).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className={styles.panel}>
      {/* ── Extra stats grid ─────────────────────────────────────────── */}
      <div className={styles.grid}>
        <Stat label="Watchers" value={repo.watchers_count ?? "—"} />
        <Stat label="Open Issues" value={repo.open_issues_count ?? "—"} />
        <Stat label="Forks" value={repo.forks_count ?? "—"} />
        <Stat label="Size" value={repo.size ? formatSize(repo.size) : "—"} />
        <Stat label="Default Branch" value={repo.default_branch ?? "—"} />
        <Stat label="Created" value={formatDate(repo.created_at)} />
        <Stat label="Last Push" value={formatDate(repo.pushed_at)} />
        {repo.license && <Stat label="License" value={repo.license} />}
      </div>

      {/* ── Homepage ─────────────────────────────────────────────────── */}
      {repo.homepage && (
        <div className={styles.homepage}>
          <span className={styles.homeLabel}>🌐 Homepage:</span>
          <a
            href={repo.homepage.startsWith("http") ? repo.homepage : `https://${repo.homepage}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.homeLink}
          >
            {repo.homepage}
          </a>
        </div>
      )}

      {/* ── Language breakdown ───────────────────────────────────────── */}
      <div className={styles.langsSection}>
        <h4 className={styles.langsTitle}>Languages</h4>

        {langsLoading ? (
          <div className={styles.langsSkeleton}>
            <div className={styles.barSkeleton} />
            <div className={styles.langListSkeleton}>
              {[80, 55, 65].map((w, i) => (
                <span key={i} className={styles.langItemSkeleton} style={{ width: w }} />
              ))}
            </div>
          </div>
        ) : totalBytes === 0 ? (
          <p className={styles.noLangs}>No language data available.</p>
        ) : (
          <>
            {/* Stacked bar */}
            <div className={styles.langBar} role="img" aria-label="Language breakdown bar">
              {Object.entries(langs)
                .sort((a, b) => b[1] - a[1])
                .map(([lang, bytes]) => (
                  <div
                    key={lang}
                    className={styles.langSegment}
                    style={{
                      width: `${((bytes / totalBytes) * 100).toFixed(2)}%`,
                      background: langColour(lang),
                    }}
                    title={`${lang}: ${((bytes / totalBytes) * 100).toFixed(1)}%`}
                  />
                ))}
            </div>

            {/* Legend */}
            <div className={styles.langList}>
              {Object.entries(langs)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([lang, bytes]) => (
                  <span key={lang} className={styles.langItem}>
                    <span
                      className={styles.langDot}
                      style={{ background: langColour(lang) }}
                    />
                    <span className={styles.langName}>{lang}</span>
                    <span className={styles.langPct}>
                      {((bytes / totalBytes) * 100).toFixed(1)}%
                    </span>
                  </span>
                ))}
            </div>
          </>
        )}
      </div>

      {/* ── View on GitHub ───────────────────────────────────────────── */}
      <a
        className={styles.ghLink}
        href={repo.html_url}
        target="_blank"
        rel="noopener noreferrer"
      >
        View on GitHub ↗
      </a>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

function formatSize(kb) {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}