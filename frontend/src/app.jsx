import { useState } from "react";
import { SearchBar }      from "./components/search/SearchBar";
import { UserProfile }    from "./components/profile/UserProfile";
import { LanguageChart }  from "./components/profile/LanguageChart";
import { RepoList }       from "./components/repos/RepoList";
import { useUser }           from "./hooks/useUser";
import { useLanguageStats }  from "./hooks/useLanguageStats";
import { useRecentSearches } from "./hooks/useRecentSearches";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ui/ErrorBoundary"; 
import styles from "./App.module.css";
import "./index.css";
import App from "./App.jsx";

export default function App() {
  const { user, loading: userLoading, error: userError, fetchUser }          = useUser();
  const { stats, loading: statsLoading, fetchStats, reset: resetStats }      = useLanguageStats();
  const { recents, addRecent, removeRecent, clearAll }                       = useRecentSearches();
  const [, setCurrentUsername] = useState(null);

  async function handleSearch(username) {
    setCurrentUsername(username);
    resetStats();
    const { data } = await fetchUser(username);
    if (data) {
      addRecent(data.login);
      fetchStats(data.login);   // fire-and-forget — chart loads independently
    }
  }

  createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <svg width="24" height="24" viewBox="0 0 98 96" fill="var(--text)" aria-hidden="true">
              <path d="M49 1C22.3 1 1 22.3 1 49c0 21.2 13.7 39.1 32.8 45.5 2.4.4 3.3-1 3.3-2.3v-8c-13.3 2.9-16.1-6.4-16.1-6.4-2.2-5.5-5.3-7-5.3-7-4.4-3 .3-2.9.3-2.9 4.8.3 7.4 5 7.4 5 4.3 7.3 11.2 5.2 13.9 4 .4-3.1 1.7-5.2 3-6.4-10.6-1.2-21.8-5.3-21.8-23.6 0-5.2 1.9-9.5 4.9-12.8-.5-1.2-2.1-6.1.5-12.6 0 0 4-.3 13 4.8 3.8-1.1 7.8-1.6 11.8-1.6s8 .5 11.8 1.6c9-5.1 13-4.8 13-4.8 2.6 6.5 1 11.4.5 12.6 3.1 3.3 4.9 7.6 4.9 12.8 0 18.3-11.2 22.3-21.8 23.5 1.7 1.5 3.2 4.4 3.2 8.9v13.2c0 1.3.9 2.8 3.3 2.3C83.3 88.1 97 70.2 97 49 97 22.3 75.7 1 49 1z" />
            </svg>
            <span>GitHub Explorer</span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Explore GitHub Profiles</h1>
          <p className={styles.heroSub}>Search any GitHub user to view their profile and repositories.</p>
        </section>

        <div className={styles.searchSection}>
          <SearchBar
            onSearch={handleSearch}
            loading={userLoading}
            recents={recents}
            onRemoveRecent={removeRecent}
            onClearAll={clearAll}
          />
        </div>

        {(user || userLoading || userError) && (
          <div className={styles.results}>
            <UserProfile user={user} loading={userLoading} error={userError} />

            {/* Language chart — shows skeleton while profile loads, then real data */}
            {(user || userLoading) && !userError && (
              <LanguageChart stats={stats} loading={userLoading || statsLoading} />
            )}

            {user && <RepoList user={user} />}
          </div>
        )}

        {!user && !userLoading && !userError && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔭</div>
            <p>Enter a GitHub username above to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}