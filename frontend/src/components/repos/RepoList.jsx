import { useEffect } from "react";
import { useRepos } from "../../hooks/useRepos";
import { RepoCard } from "./RepoCard";
import { SortBar } from "./SortBar";
import { RepoCardSkeleton } from "../ui/Skeleton";
import styles from "./RepoList.module.css";

const SKELETON_COUNT = 5;

export function RepoList({ user }) {
  const {
    repos, loading, loadingMore, error, hasMore,
    sort, direction, init, changeSort, loadMore,
  } = useRepos(user.login);

  // Kick off first fetch when user changes
  useEffect(() => {
    init(user.login);
  }, [user.login, init]);

  return (
    <section className={styles.section} aria-label="Repositories">
      <SortBar
        sort={sort}
        direction={direction}
        onChange={changeSort}
        total={user.public_repos}
      />

      {/* Error state */}
      {error && !loading && (
        <div className={styles.errorBox} role="alert">
          <span>⚠️</span>
          <span>{error.message}</span>
        </div>
      )}

      {/* Loading skeletons — first page only */}
      {loading && (
        <div className={styles.list}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <RepoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Repo cards */}
      {!loading && repos.length > 0 && (
        <div className={styles.list}>
          {repos.map((repo, i) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              username={user.login}
              style={{ animationDelay: `${Math.min(i, 9) * 30}ms` }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && repos.length === 0 && (
        <div className={styles.empty}>
          <p>This user has no public repositories.</p>
        </div>
      )}

      {/* Load More */}
      {!loading && hasMore && (
        <div className={styles.loadMoreWrap}>
          <button
            className={styles.loadMoreBtn}
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <span className={styles.spinner} />
                Loading…
              </>
            ) : (
              "Load more repositories"
            )}
          </button>
        </div>
      )}

      {/* Inline skeletons appended during load-more */}
      {loadingMore && (
        <div className={styles.list} style={{ marginTop: 0 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <RepoCardSkeleton key={`more-${i}`} />
          ))}
        </div>
      )}
    </section>
  );
}