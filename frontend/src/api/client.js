import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

/**
 * Normalise axios errors into a consistent shape the UI can render.
 */
function normaliseError(error) {
  if (error.response?.data?.message) {
    return {
      message: error.response.data.message,
      status: error.response.status,
      resetAt: error.response.data.resetAt || null,
    };
  }
  if (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK") {
    return {
      message: "Cannot reach the server. Is the backend running?",
      status: 0,
    };
  }
  return { message: error.message || "An unexpected error occurred.", status: 0 };
}

export const githubApi = {
  /** Fetch a user profile */
  getUser: async (username) => {
    try {
      const { data } = await client.get(`/users/${username}`);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: normaliseError(err) };
    }
  },

  /** Fetch one page of repositories */
  getRepos: async (username, { page = 1, sort = "updated", direction = "desc" } = {}) => {
    try {
      const { data } = await client.get(`/users/${username}/repos`, {
        params: { page, sort, direction },
      });
      return { data, error: null };
    } catch (err) {
      return { data: null, error: normaliseError(err) };
    }
  },

  /** Fetch language breakdown for a single repo */
  getRepoLanguages: async (username, repoName) => {
    try {
      const { data } = await client.get(`/users/${username}/repos/${repoName}/languages`);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: normaliseError(err) };
    }
  },

  /** Fetch aggregated language stats across all repos */
  getLanguageStats: async (username) => {
    try {
      const { data } = await client.get(`/users/${username}/language-stats`);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: normaliseError(err) };
    }
  },
};