import styles from "./Skeleton.module.css";

export function Skeleton({ width, height, radius, className = "" }) {
  return (
    <span
      className={`${styles.skeleton} ${className}`}
      style={{
        width: width || "100%",
        height: height || "1em",
        borderRadius: radius || 6,
      }}
      aria-hidden="true"
    />
  );
}

export function ProfileSkeleton() {
  return (
    <div className={styles.profileSkeleton}>
      <Skeleton width={96} height={96} radius={48} />
      <div className={styles.profileSkeletonLines}>
        <Skeleton width="40%" height={24} />
        <Skeleton width="60%" height={16} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="75%" height={14} />
        <div className={styles.skeletonRow}>
          <Skeleton width={80} height={14} />
          <Skeleton width={80} height={14} />
          <Skeleton width={80} height={14} />
        </div>
      </div>
    </div>
  );
}

export function RepoCardSkeleton() {
  return (
    <div className={styles.repoSkeleton}>
      <Skeleton width="55%" height={18} />
      <Skeleton width="90%" height={13} />
      <Skeleton width="70%" height={13} />
      <div className={styles.skeletonRow}>
        <Skeleton width={60} height={12} />
        <Skeleton width={50} height={12} />
        <Skeleton width={80} height={12} />
      </div>
    </div>
  );
}