import { useState, useCallback } from "react";
import { githubApi } from "../api/client";

export function useLanguageStats() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchStats = useCallback(async (username) => {
    setLoading(true);
    setError(null);
    setStats(null);

    const { data, error: err } = await githubApi.getLanguageStats(username);
    if (err) setError(err);
    else     setStats(data);

    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    setStats(null);
    setError(null);
    setLoading(false);
  }, []);

  return { stats, loading, error, fetchStats, reset };
}