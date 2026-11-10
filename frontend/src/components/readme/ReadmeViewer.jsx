import { useEffect, useRef, useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import "github-markdown-css/github-markdown-dark.css";
import "highlight.js/styles/github-dark.css";
import { resolveRelativeUrl } from "../../utils/readmeUrls";
import styles from "./Readme.module.css";

/**
 * Plugin ORDER MATTERS (README content is untrusted):
 *  1. rehypeRaw       parse inline HTML (<p align="center">, <details>, badges…)
 *  2. rehypeSanitize  strip scripts, on* handlers, javascript: URLs (GitHub-style allowlist)
 *  3. rehypeSlug      heading ids (github-slugger, so "#install" links match)
 *  4. rehypeHighlight syntax colours; runs AFTER sanitize because it adds hljs-* classes
 */
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [
  rehypeRaw,
  rehypeSanitize,
  rehypeSlug,
  [rehypeHighlight, { detect: false, ignoreMissing: true }],
];

const COMPONENTS = {
  a({ node, href, children, ...props }) {
    const internal = href?.startsWith("#");
    return (
      <a href={href} {...props} {...(!internal && { target: "_blank", rel: "noopener noreferrer" })}>
        {children}
      </a>
    );
  },
  img({ node, alt, ...props }) {
    return <img alt={alt || ""} loading="lazy" {...props} />;
  },
};

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function ReadmeViewer({ readme }) {
  const bodyRef = useRef(null);
  const [toc, setToc] = useState([]);

  // Build the table of contents from the rendered headings (ids come from rehype-slug)
  useEffect(() => {
    const headings = bodyRef.current?.querySelectorAll("h1, h2, h3, h4") ?? [];
    setToc(
      Array.from(headings)
        .filter((h) => h.id)
        .map((h) => ({ id: h.id, text: h.textContent.trim(), level: Number(h.tagName[1]) }))
    );
  }, [readme.markdown]);

  function scrollToId(id) {
    const el = Array.from(bodyRef.current?.querySelectorAll("[id]") ?? []).find((n) => n.id === id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // In-page links (#section) scroll inside the modal instead of changing the URL
  function handleClick(e) {
    const href = e.target.closest("a")?.getAttribute("href");
    if (href?.startsWith("#")) {
      e.preventDefault();
      scrollToId(safeDecode(href.slice(1)));
    }
  }

  const urlTransform = (url, key) =>
    resolveRelativeUrl(url, key, readme) ?? defaultUrlTransform(url);

  const minLevel = toc.length ? Math.min(...toc.map((t) => t.level)) : 1;

  return (
    <div className={styles.layout}>
      {toc.length > 1 && (
        <nav className={styles.toc} aria-label="Table of contents">
          <h4 className={styles.tocTitle}>Contents</h4>
          <ul>
            {toc.map((t) => (
              <li key={t.id} style={{ paddingLeft: (t.level - minLevel) * 12 }}>
                <button className={styles.tocLink} onClick={() => scrollToId(t.id)}>
                  {t.text}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        ref={bodyRef}
        className={`markdown-body ${styles.body}`}
        style={{ background: "transparent" }}
        onClick={handleClick}
      >
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          components={COMPONENTS}
          urlTransform={urlTransform}
        >
          {readme.markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}