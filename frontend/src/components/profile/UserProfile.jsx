import { formatCount, normaliseUrl } from "../../utils/formatters";
import { ProfileSkeleton } from "../ui/Skeleton";
import styles from "./UserProfile.module.css";

export function UserProfile({ user, loading, error }) {
  if (loading) return <ProfileSkeleton />;

  if (error) {
    return (
      <div className={styles.errorBox} role="alert">
        <span className={styles.errorIcon}>
          {error.status === 404 ? "🔍" : error.status === 429 ? "⏱" : "⚠️"}
        </span>
        <div>
          <p className={styles.errorMsg}>{error.message}</p>
          {error.resetAt && (
            <p className={styles.errorSub}>
              Rate limit resets at {new Date(error.resetAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!user) return null;

  const blog = normaliseUrl(user.blog);

  return (
    <div className={styles.card}>
      <div className={styles.left}>
        <a href={user.html_url} target="_blank" rel="noopener noreferrer">
          <img
            className={styles.avatar}
            src={user.avatar_url}
            alt={`${user.login}'s avatar`}
            loading="lazy"
          />
        </a>
      </div>

      <div className={styles.right}>
        <div className={styles.nameRow}>
          <div>
            <h2 className={styles.name}>{user.name || user.login}</h2>
            <a
              className={styles.login}
              href={user.html_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              @{user.login}
            </a>
          </div>
        </div>

        {user.bio && <p className={styles.bio}>{user.bio}</p>}

        <div className={styles.stats}>
          <Stat icon="👥" label="Followers" value={formatCount(user.followers)} />
          <Stat icon="➡️" label="Following" value={formatCount(user.following)} />
          <Stat icon="📦" label="Repos" value={formatCount(user.public_repos)} />
        </div>

        <div className={styles.meta}>
          {user.location && <MetaItem icon="📍">{user.location}</MetaItem>}
          {user.company && <MetaItem icon="🏢">{user.company}</MetaItem>}
          {blog && (
            <MetaItem icon="🔗">
              <a href={blog} target="_blank" rel="noopener noreferrer" className={styles.link}>
                {user.blog}
              </a>
            </MetaItem>
          )}
          {user.twitter_username && (
            <MetaItem icon="𝕏">
              <a
                href={`https://twitter.com/${user.twitter_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                @{user.twitter_username}
              </a>
            </MetaItem>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>
        {icon} {label}
      </span>
    </div>
  );
}

function MetaItem({ icon, children }) {
  return (
    <span className={styles.metaItem}>
      <span aria-hidden="true">{icon}</span>
      {children}
    </span>
  );
}