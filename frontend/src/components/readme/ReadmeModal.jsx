import { useEffect, useRef } from "react";
import { useReadme } from "../../hooks/useReadme";
import { ReadmeViewer } from "./ReadmeViewer";
import { Skeleton } from "../ui/Skeleton";
import styles from "./Readme.module.css";

export function ReadmeModal({ owner, repo, onClose }) {
  const { data, loading, error } = useReadme(owner, repo);
  const dialogRef = useRef(null);

  // Esc to close, lock page scroll while open, move focus into the dialog
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`README for ${owner}/${repo}`}
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.fileName}>{data?.name || "README"}</span>
            <span className={styles.repoName}>{owner}/{repo}</span>
          </div>
          <div className={styles.headerActions}>
            {data?.htmlUrl && (
              <a className={styles.ghLink} href={data.htmlUrl} target="_blank" rel="noopener noreferrer">
                Open on GitHub ↗
              </a>
            )}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close README">
              ×
            </button>
          </div>
        </header>

        <div className={styles.scroll}>
          {loading && (
            <div className={styles.skeletons}>
              <Skeleton height={28} width="45%" />
              {[100, 92, 96, 70].map((w, i) => <Skeleton key={i} height={14} width={`${w}%`} />)}
              <Skeleton height={120} radius={8} />
            </div>
          )}

          {error && !loading && (
            <div className={styles.error} role="alert">⚠️ {error.message}</div>
          )}

          {data && (
            <>
              {data.truncated && (
                <p className={styles.note}>
                  This README is very long, so only the first part is shown. Use “Open on GitHub” for the rest.
                </p>
              )}
              <ReadmeViewer readme={data} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
