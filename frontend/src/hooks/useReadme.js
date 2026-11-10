import { useEffect, useState } from "react";
import { githubApi } from "../api/client";

export function useReadme(owner, repo) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    githubApi.getReadme(owner, repo).then(({ data, error }) => {
      if (!cancelled) setState({ data, loading: false, error });
    });

    return () => {
      cancelled = true;
    };
  }, [owner, repo]);

  return state;
}