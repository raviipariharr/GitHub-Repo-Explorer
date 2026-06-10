import { useState, useCallback } from "react";
import { githubApi } from "../api/client";

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async (username) => {
    setLoading(true);
    setError(null);
    setUser(null);

    const { data, error: err } = await githubApi.getUser(username);

    if (err) {
      setError(err);
    } else {
      setUser(data);
    }
    setLoading(false);
    return { data, error: err };
  }, []);

  const reset = useCallback(() => {
    setUser(null);
    setError(null);
    setLoading(false);
  }, []);

  return { user, loading, error, fetchUser, reset };
}