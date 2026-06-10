import { useState, useCallback } from "react";

const STORAGE_KEY = "gh_explorer_recent";
const MAX_ENTRIES = 8;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage full — ignore */
  }
}

export function useRecentSearches() {
  const [recents, setRecents] = useState(load);

  const addRecent = useCallback((username) => {
    setRecents((prev) => {
      const deduped = [username, ...prev.filter((u) => u.toLowerCase() !== username.toLowerCase())];
      const next = deduped.slice(0, MAX_ENTRIES);
      save(next);
      return next;
    });
  }, []);

  const removeRecent = useCallback((username) => {
    setRecents((prev) => {
      const next = prev.filter((u) => u !== username);
      save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    save([]);
    setRecents([]);
  }, []);

  return { recents, addRecent, removeRecent, clearAll };
}