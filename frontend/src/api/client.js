import axios from "axios";

// In dev, Vite proxies /api → http://localhost:4000/api (no env var needed).
// In production, set VITE_API_URL to your deployed backend origin.
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

function normaliseError(error) {
  if (error.response?.data?.message) {
    return {
      message: error.response.data.message,
      status: error.response.status,
      resetAt: error.response.data.resetAt || null,
    };
  }
  if (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK") {
    return { message: "Cannot reach the server. Is the backend running?", status: 0 };
  }
  return { message: error.message || "An unexpected error occurred.", status: 0 };
}

export const githubApi = {
  getUser: async (username) => {
    try {
      const { data } = await client.get(`/users/${username}`);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: normaliseError(err) };
    }
  },

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

  getRepoLanguages: async (username, repoName) => {
    try {
      const { data } = await client.get(`/users/${username}/repos/${repoName}/languages`);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: normaliseError(err) };
    }
  },

  getLanguageStats: async (username) => {
    try {
      const { data } = await client.get(`/users/${username}/language-stats`);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: normaliseError(err) };
    }
  },
};