const cache = require("./cache");
const { githubClient, parseGitHubError } = require("./github");

const MAX_CHARS = 300_000; // protect the browser from megabyte-sized READMEs

async function getReadme(owner, repo) {
  const key = `readme:${owner}/${repo}`.toLowerCase();
  const cached = cache.get(key);
  if (cached) return { data: cached, fromCache: true };

  let file;
  try {
    ({ data: file } = await githubClient.get(`/repos/${owner}/${repo}/readme`));
  } catch (err) {
    if (err.response?.status === 404) {
      throw { status: 404, message: "This repository has no README." };
    }
    throw parseGitHubError(err);
  }

  if (file.encoding !== "base64" || !file.content) {
    throw { status: 413, message: "README is too large to display here." };
  }

  let markdown = Buffer.from(file.content, "base64").toString("utf8");
  const truncated = markdown.length > MAX_CHARS;
  if (truncated) markdown = markdown.slice(0, MAX_CHARS);

  // download_url = https://raw.githubusercontent.com/<owner>/<repo>/<ref>/<path>
  // We need owner/repo/ref so the browser can resolve relative images and links.
  let rawBase = null;
  let blobBase = null;
  const m = /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(.+)$/.exec(file.download_url || "");
  if (m) {
    const [, o, r, rest] = m;
    const ref = rest.slice(0, rest.length - file.path.length - 1); // strip "/<path>"
    rawBase = `https://raw.githubusercontent.com/${o}/${r}/${ref}/`;
    blobBase = `https://github.com/${o}/${r}/blob/${ref}/`;
  }

  const dir = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/") + 1) : "";

  const data = {
    name: file.name,
    path: file.path,
    htmlUrl: file.html_url,
    markdown,
    truncated,
    rawBase,
    blobBase,
    dir,
  };

  cache.set(key, data);
  return { data, fromCache: false };
}

module.exports = { getReadme };