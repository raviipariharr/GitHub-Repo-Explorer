import { useState, useCallback } from "react";
import { githubApi } from "../api/client";

export function useDiscover() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const discover = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setResult(null);
    const { data, error: err } = await githubApi.discover(params);
    if (err) setError(err);
    else setResult(data);
    setLoading(false);
  }, []);

  return { result, loading, error, discover };
}