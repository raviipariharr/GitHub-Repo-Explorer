import { useState, useCallback } from "react";
import { githubApi } from "../api/client";

export function useCompare() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const compare = useCallback(async (a, b) => {
    setLoading(true);
    setError(null);
    setResult(null);
    const { data, error: err } = await githubApi.compareRepos(a, b);
    if (err) setError(err);
    else setResult(data);
    setLoading(false);
  }, []);

  return { result, loading, error, compare };
}