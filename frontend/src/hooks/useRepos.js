import { useState, useCallback, useRef } from "react";
import { githubApi } from "../api/client";

const DEFAULT_SORT = "updated";
const DEFAULT_DIR  = "desc";

export function useRepos(username) {
  const [repos, setRepos]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState(null);
  const [hasMore, setHasMore]         = useState(false);
  const [page, setPage]               = useState(1);
  const [sort, setSort]               = useState(DEFAULT_SORT);
  const [direction, setDirection]     = useState(DEFAULT_DIR);

  const lastUsername = useRef(null);

  const fetchPage = useCallback(
    async ({ targetPage = 1, newSort = sort, newDirection = direction, append = false } = {}) => {
      if (append) setLoadingMore(true);
      else        setLoading(true);
      setError(null);

      const { data, error: err } = await githubApi.getRepos(username, {
        page: targetPage,
        sort: newSort,
        direction: newDirection,
      });

      if (err) {
        setError(err);
      } else {
        setRepos((prev) => (append ? [...prev, ...data.repos] : data.repos));
        setHasMore(data.hasMore);
        setPage(targetPage);
      }

      if (append) setLoadingMore(false);
      else        setLoading(false);
    },
    [username, sort, direction]
  );

  const init = useCallback(async (user) => {
    if (lastUsername.current === user) return;
    lastUsername.current = user;
    setSort(DEFAULT_SORT);
    setDirection(DEFAULT_DIR);
    setRepos([]);
    setPage(1);
    setHasMore(false);
    await fetchPage({ targetPage: 1, newSort: DEFAULT_SORT, newDirection: DEFAULT_DIR });
  }, [fetchPage]);

  const changeSort = useCallback(async (newSort, newDirection) => {
    setSort(newSort);
    setDirection(newDirection);
    setRepos([]);
    await fetchPage({ targetPage: 1, newSort, newDirection });
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    await fetchPage({ targetPage: page + 1, append: true });
  }, [fetchPage, page]);

  return { repos, loading, loadingMore, error, hasMore, sort, direction, init, changeSort, loadMore };
}