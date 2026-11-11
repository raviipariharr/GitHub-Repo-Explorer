import { describe, it, expect } from "vitest";
import { resolveRelativeUrl } from "./readmeUrls";

const meta = {
  rawBase: "https://raw.githubusercontent.com/octocat/hello/main/",
  blobBase: "https://github.com/octocat/hello/blob/main/",
  dir: "",
};
const docsMeta = { ...meta, dir: "docs/" };

describe("resolveRelativeUrl", () => {
  it("images resolve against raw.githubusercontent.com", () => {
    expect(resolveRelativeUrl("img/logo.png", "src", meta)).toBe(
      "https://raw.githubusercontent.com/octocat/hello/main/img/logo.png"
    );
  });

  it("links resolve against github.com/.../blob/<ref>/", () => {
    expect(resolveRelativeUrl("CONTRIBUTING.md", "href", meta)).toBe(
      "https://github.com/octocat/hello/blob/main/CONTRIBUTING.md"
    );
  });

  it("'./' and bare paths are relative to the README's own folder", () => {
    const expected = "https://raw.githubusercontent.com/octocat/hello/main/docs/a.png";
    expect(resolveRelativeUrl("./a.png", "src", docsMeta)).toBe(expected);
    expect(resolveRelativeUrl("a.png", "src", docsMeta)).toBe(expected);
  });

  it("'../' climbs out of the README's folder", () => {
    expect(resolveRelativeUrl("../assets/a.png", "src", docsMeta)).toBe(
      "https://raw.githubusercontent.com/octocat/hello/main/assets/a.png"
    );
  });

  it("a leading '/' is relative to the repo root, not the README folder", () => {
    expect(resolveRelativeUrl("/assets/a.png", "src", docsMeta)).toBe(
      "https://raw.githubusercontent.com/octocat/hello/main/assets/a.png"
    );
  });

  it("query strings and fragments are preserved", () => {
    expect(resolveRelativeUrl("a.png?raw=true", "src", meta)).toMatch(/a\.png\?raw=true$/);
    expect(resolveRelativeUrl("guide.md#install", "href", meta)).toMatch(/guide\.md#install$/);
  });

  it("never leaves the raw/blob host, even with excessive '../'", () => {
    expect(resolveRelativeUrl("../../../../../x.png", "src", docsMeta)).toMatch(
      /^https:\/\/raw\.githubusercontent\.com\//
    );
    expect(resolveRelativeUrl("../../../../../x", "href", docsMeta)).toMatch(/^https:\/\/github\.com\//);
  });

  it.each([
    ["absolute https URL", "https://example.com/a.png"],
    ["absolute http URL", "http://example.com/a.png"],
    ["protocol-relative URL", "//example.com/a.png"],
    ["mailto link", "mailto:me@example.com"],
    ["javascript: URL (left for the sanitiser)", "javascript:alert(1)"],
    ["data: URL", "data:image/png;base64,AAAA"],
    ["in-page #fragment", "#install"],
  ])("returns null for %s so the default safe transform handles it", (_label, url) => {
    expect(resolveRelativeUrl(url, "src", meta)).toBeNull();
  });

  it("returns null for empty input or when the backend gave no bases", () => {
    expect(resolveRelativeUrl("", "src", meta)).toBeNull();
    expect(resolveRelativeUrl(undefined, "src", meta)).toBeNull();
    expect(resolveRelativeUrl("a.png", "src", { rawBase: null, blobBase: null, dir: "" })).toBeNull();
    expect(resolveRelativeUrl("a.png", "src")).toBeNull();
  });
});