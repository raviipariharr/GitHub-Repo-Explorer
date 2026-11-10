import { useState } from "react";
import { useDiscover } from "../../hooks/useDiscover";
import { formatCount, formatDate } from "../../utils/formatters";
import { langColour } from "../../utils/langColours";
import { Skeleton } from "../ui/Skeleton";
import styles from "./DiscoverView.module.css";

const SIGNALS = [
  { key: "topics", label: "Topics" },
  { key: "language", label: "Language" },
  { key: "stars", label: "Stars" },
  { key: "recency", label: "Recent" },
];

function Breakdown({ breakdown, hasLanguage }) {
  return (
    <div className={styles.breakdown}>
      {SIGNALS.filter((s) => s.key !== "language" || hasLanguage).map(({ key, label }) => (
        <div key={key} className={styles.signal} title={`${label}: ${breakdown[key]}%`}>
          <span className={styles.signalLabel}>{label}</span>
          <span className={styles.bar}>
            <span className={styles.barFill} style={{ width: `${breakdown[key]}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function ResultCard({ repo, profile, onFindSimilar }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <a className={styles.name} href={repo.htmlUrl} target="_blank" rel="noopener noreferrer">
          {repo.fullName}
        </a>
        <span className={styles.score} title="Match score (0–100)">{repo.score}</span>
      </div>

      {repo.description && <p className={styles.desc}>{repo.description}</p>}

      <div className={styles.topics}>
        {repo.topics.slice(0, 6).map((t) => (
          <span key={t} className={repo.sharedTopics.includes(t) ? styles.topicShared : styles.topic}>
            {t}
          </span>
        ))}
      </div>

      <div className={styles.meta}>
        {repo.language && (
          <span className={styles.metaItem}>
            <span className={styles.dot} style={{ background: langColour(repo.language) }} />
            {repo.language}
          </span>
        )}
        <span className={styles.metaItem}>★ {formatCount(repo.stars)}</span>
        <span className={styles.metaItem}>Pushed {formatDate(repo.pushedAt)}</span>
        {repo.license && <span className={styles.metaItem}>{repo.license}</span>}
        <button className={styles.similarBtn} onClick={() => onFindSimilar(repo.fullName)}>
          Find similar
        </button>
      </div>

      <Breakdown breakdown={repo.breakdown} hasLanguage={Boolean(profile.language)} />
    </article>
  );
}

export function DiscoverView() {
  const [mode, setMode] = useState("keyword");
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("");
  const [seed, setSeed] = useState("");
  const { result, loading, error, discover } = useDiscover();

  function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    if (mode === "keyword" && query.trim()) {
      discover({ q: query.trim(), language: language.trim() });
    } else if (mode === "similar" && seed.trim()) {
      discover({ similarTo: seed.trim() });
    }
  }

  function handleFindSimilar(fullName) {
    setMode("similar");
    setSeed(fullName);
    discover({ similarTo: fullName });
  }

  const canSubmit = mode === "keyword" ? query.trim() : seed.trim();

  return (
    <section className={styles.wrap} aria-label="Discover repositories">
      <div className={styles.modes} role="group" aria-label="Discovery mode">
        <button className={mode === "keyword" ? styles.modeActive : styles.mode} onClick={() => setMode("keyword")}>
          Keyword
        </button>
        <button className={mode === "similar" ? styles.modeActive : styles.mode} onClick={() => setMode("similar")}>
          Similar to a repo
        </button>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {mode === "keyword" ? (
          <>
            <input
              className={styles.input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. react, machine-learning, cli"
              aria-label="Keywords"
              spellCheck={false}
            />
            <input
              className={`${styles.input} ${styles.langInput}`}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="Language (optional)"
              aria-label="Language filter"
              spellCheck={false}
            />
          </>
        ) : (
          <input
            className={styles.input}
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="owner/repo  e.g. facebook/react"
            aria-label="Seed repository"
            spellCheck={false}
          />
        )}
        <button className={styles.btn} type="submit" disabled={!canSubmit || loading}>
          {loading ? "Searching…" : "Discover"}
        </button>
      </form>

      {error && <div className={styles.error} role="alert">⚠️ {error.message}</div>}

      {loading && (
        <div className={styles.list}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={130} radius={12} />)}
        </div>
      )}

      {result && (
        <>
          <p className={styles.summary}>
            {result.mode === "similar" ? (
              <>Similar to <strong>{result.seed}</strong></>
            ) : (
              <>Results for <strong>{result.profile.topics.join(", ")}</strong>{result.profile.language && <> in {result.profile.language}</>}</>
            )}
            {" · "}matching on topics: {result.profile.topics.slice(0, 6).join(", ")}
            {result.mode === "similar" && result.profile.language && <> · language: {result.profile.language}</>}
          </p>

          {result.results.length === 0 ? (
            <p className={styles.empty}>No matching repositories. Try broader keywords.</p>
          ) : (
            <div className={styles.list}>
              {result.results.map((repo) => (
                <ResultCard key={repo.id} repo={repo} profile={result.profile} onFindSimilar={handleFindSimilar} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}