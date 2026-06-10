import { useState } from "react";
import { formatDate, formatCount } from "../../utils/formatters";
import { langColour } from "../../utils/langColours";
import { RepoDetails } from "./RepoDetails";
import styles from "./RepoCard.module.css";

export function RepoCard({ repo, username }) {
  const [expanded, setExpanded] = useState(false);

  const langColor = langColour(repo.language);

  return (
    <article className={`${styles.card} ${expanded ? styles.expanded : ""}`}>
      {/* ── Main row ─────────────────────────────────────────────────── */}
      <div className={styles.main}>
        <div className={styles.top}>
          <div className={styles.titleRow}>
            <a
              className={styles.name}
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              title={repo.full_name}
            >
              {repo.name}
            </a>
            {repo.is_fork && <span className={styles.badge}>Fork</span>}
            {repo.visibility === "private" && <span className={styles.badgePrivate}>Private</span>}
          </div>

          <button
            className={styles.expandBtn}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            <svg
              className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`}
              width="16" height="16" viewBox="0 0 16 16" fill="none"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {repo.description && (
          <p className={styles.description}>{repo.description}</p>
        )}

        {/* Topics */}
        {repo.topics?.length > 0 && (
          <div className={styles.topics}>
            {repo.topics.slice(0, 5).map((t) => (
              <span key={t} className={styles.topic}>{t}</span>
            ))}
            {repo.topics.length > 5 && (
              <span className={styles.topicMore}>+{repo.topics.length - 5}</span>
            )}
          </div>
        )}

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <div className={styles.meta}>
          {repo.language && (
            <span className={styles.lang}>
              <span className={styles.langDot} style={{ background: langColor }} />
              {repo.language}
            </span>
          )}

          {repo.stargazers_count > 0 && (
            <span className={styles.metaItem} title="Stars">
              <StarIcon /> {formatCount(repo.stargazers_count)}
            </span>
          )}

          {repo.forks_count > 0 && (
            <span className={styles.metaItem} title="Forks">
              <ForkIcon /> {formatCount(repo.forks_count)}
            </span>
          )}

          <span className={styles.metaItem} title={`Updated ${new Date(repo.updated_at).toLocaleDateString()}`}>
            <ClockIcon /> {formatDate(repo.updated_at)}
          </span>

          {repo.license && (
            <span className={styles.metaItem} title="License">
              <LicenseIcon /> {repo.license}
            </span>
          )}
        </div>
      </div>

      {/* ── Expanded details ─────────────────────────────────────────── */}
      {expanded && (
        <RepoDetails repo={repo} username={username} />
      )}
    </article>
  );
}

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"/>
    </svg>
  );
}

function LicenseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8.75.75V2h.985c.304 0 .603.08.867.231l1.29.736c.038.022.08.033.124.033h2.234a.75.75 0 0 1 0 1.5h-.427l2.111 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.006.005-.01.01-.045.04c-.21.199-.52.451-.94.681C14.895 10.013 14.280 10.25 13.5 10.25c-.78 0-1.395-.237-1.895-.51a4.14 4.14 0 0 1-.94-.68l-.045-.04-.016-.015-.006-.006-.004-.004v-.001a.75.75 0 0 1-.154-.838L12.557 4.5h-.166c-.376 0-.745-.106-1.062-.3L10.041 3.5H9.5V13h2.25a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5H7.5V3.5h-.542L5.67 4.2c-.317.194-.686.3-1.062.3h-.166l2.111 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.016.015-.045.04c-.21.199-.52.451-.94.681-.5.273-1.116.51-1.895.51-.78 0-1.395-.237-1.895-.51a4.138 4.138 0 0 1-.94-.68l-.045-.04-.016-.015-.006-.006-.004-.004v-.001a.75.75 0 0 1-.154-.838L2.557 4.5H2.25a.75.75 0 0 1 0-1.5h2.234a.266.266 0 0 0 .124-.033l1.29-.736A1.749 1.749 0 0 1 6.765 2H7.25V.75a.75.75 0 0 1 1.5 0Z"/>
    </svg>
  );
}