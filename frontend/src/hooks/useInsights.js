import { useState, useCallback } from "react";
import { githubApi } from "../api/client";

export function useInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInsights = useCallback(async (username) => {
    setLoading(true);
    setError(null);
    setInsights(null);
    const { data, error: err } = await githubApi.getInsights(username);
    if (err) setError(err);
    else setInsights(data);
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    setInsights(null);
    setError(null);
    setLoading(false);
  }, []);

  return { insights, loading, error, fetchInsights, reset };
}
