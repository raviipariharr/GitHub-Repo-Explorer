import { useState, useRef, useEffect } from "react";
import styles from "./SearchBar.module.css";

export function SearchBar({ onSearch, loading, recents, onRemoveRecent, onClearAll }) {
  const [value, setValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    setShowDropdown(false);
    onSearch(trimmed);
  }

  function handleRecentClick(username) {
    setValue(username);
    setShowDropdown(false);
    onSearch(username);
  }

  const filteredRecents = value.trim()
    ? recents.filter((r) => r.toLowerCase().startsWith(value.toLowerCase()))
    : recents;

  const showMenu = showDropdown && filteredRecents.length > 0;

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <form className={styles.form} onSubmit={handleSubmit} role="search">
        <div className={styles.inputWrap}>
          <svg className={styles.icon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Search GitHub username…"
            value={value}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => { setValue(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            aria-label="GitHub username"
            aria-autocomplete="list"
            aria-expanded={showMenu}
          />
          {value && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => { setValue(""); inputRef.current?.focus(); }}
              aria-label="Clear input"
            >
              ×
            </button>
          )}
        </div>
        <button type="submit" className={styles.searchBtn} disabled={!value.trim() || loading}>
          {loading ? <span className={styles.spinner} /> : "Search"}
        </button>
      </form>

      {showMenu && (
        <div className={styles.dropdown} role="listbox" aria-label="Recent searches">
          <div className={styles.dropdownHeader}>
            <span>Recent</span>
            <button className={styles.clearAllBtn} onClick={onClearAll}>Clear all</button>
          </div>
          {filteredRecents.map((username) => (
            <div key={username} className={styles.dropdownItem} role="option">
              <button
                className={styles.recentBtn}
                onClick={() => handleRecentClick(username)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {username}
              </button>
              <button
                className={styles.removeBtn}
                onClick={(e) => { e.stopPropagation(); onRemoveRecent(username); }}
                aria-label={`Remove ${username}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}