import { formatCount } from "../../utils/formatters";
import { ProfileSkeleton } from "../ui/Skeleton";
import styles from "./UserProfile.module.css";

export function UserProfile({ user, loading, error }) {
  if (loading) return <ProfileSkeleton />;

  if (error) {
    return (
      <div className={styles.errorBox} role="alert">
        <p>{error.message}</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.card}>
      <div className={styles.left}>
        <img
          className={styles.avatar}
          src={user.avatar_url}
          alt={`${user.login}'s avatar`}
        />
      </div>

      <div className={styles.right}>
        <h2 className={styles.name}>
          {user.name || user.login}
        </h2>

        <p className={styles.login}>@{user.login}</p>

        {user.bio && (
          <p className={styles.bio}>{user.bio}</p>
        )}

        <div className={styles.stats}>
          <Stat
            label="Followers"
            value={formatCount(user.followers)}
          />
          <Stat
            label="Following"
            value={formatCount(user.following)}
          />
          <Stat
            label="Repos"
            value={formatCount(user.public_repos)}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span>{label}</span>
    </div>
  );
}