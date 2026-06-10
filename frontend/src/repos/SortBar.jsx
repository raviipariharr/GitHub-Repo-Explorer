import styles from "./SortBar.module.css";

const SORT_OPTIONS = [
  { value: "updated",   label: "Last Updated" },
  { value: "stars",     label: "Stars"        },
  { value: "full_name", label: "Name"         },
  { value: "created",   label: "Created"      },
];

export function SortBar({ sort, direction, onChange, total }) {
  function handleSortClick(value) {
    if (value === sort) {
      onChange(value, direction === "desc" ? "asc" : "desc");
    } else {
      onChange(value, value === "full_name" ? "asc" : "desc");
    }
  }

  return (
    <div className={styles.bar}>
      <span className={styles.count}>
        {total !== undefined ? <><strong>{total}</strong> repositories</> : "Repositories"}
      </span>
      <div className={styles.controls}>
        <span className={styles.label}>Sort:</span>
        {SORT_OPTIONS.map(({ value, label }) => {
          const active = sort === value;
          return (
            <button
              key={value}
              className={`${styles.btn} ${active ? styles.active : ""}`}
              onClick={() => handleSortClick(value)}
              aria-pressed={active}
            >
              {label}
              {active && (
                <span className={styles.arrow}>
                  {direction === "desc" ? " ↓" : " ↑"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}