import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { ReadmeViewer } from "./ReadmeViewer";

const META = {
  rawBase: "https://raw.githubusercontent.com/octocat/hello/main/",
  blobBase: "https://github.com/octocat/hello/blob/main/",
  dir: "",
};

function renderMd(markdown, meta = META) {
  const { container } = render(<ReadmeViewer readme={{ markdown, ...meta }} />);
  return container;
}

const attributeNames = (root) =>
  [...root.querySelectorAll("*")].flatMap((el) => [...el.attributes].map((a) => a.name.toLowerCase()));

beforeAll(() => {
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("README sanitisation (README content is untrusted)", () => {
  it("removes <script> elements", () => {
    const c = renderMd('Hello\n\n<script>window.__pwned = true</script>\n\nWorld');
    expect(c.querySelector("script")).toBeNull();
    expect(window.__pwned).toBeUndefined();
    expect(c.textContent).toContain("Hello");
    expect(c.textContent).toContain("World");
  });

  it("strips inline event handlers from every element", () => {
    const c = renderMd(
      [
        '<img src="x" onerror="alert(1)">',
        '<a href="https://example.com" onclick="alert(1)">link</a>',
        '<div onmouseover="alert(1)">hover</div>',
        '<details open ontoggle="alert(1)"><summary>s</summary>body</details>',
        '<body onload="alert(1)">',
        '<svg onload="alert(1)"><circle/></svg>',
        '<input autofocus onfocus="alert(1)">',
      ].join("\n\n")
    );
    expect(attributeNames(c).filter((n) => n.startsWith("on"))).toEqual([]);
  });

  it.each([
    ["markdown link", "[click](javascript:alert(1))"],
    ["raw HTML link", '<a href="javascript:alert(1)">click</a>'],
    ["mixed-case scheme", '<a href="JaVaScRiPt:alert(1)">click</a>'],
    ["leading whitespace", '<a href=" javascript:alert(1)">click</a>'],
    ["entity-encoded scheme", '<a href="jav&#x61;script:alert(1)">click</a>'],
    ["data: URL", '<a href="data:text/html,<script>alert(1)</script>">click</a>'],
    ["vbscript: URL", '<a href="vbscript:msgbox(1)">click</a>'],
  ])("neutralises a dangerous href (%s)", (_label, md) => {
    const c = renderMd(md);
    for (const a of c.querySelectorAll("a")) {
      const href = (a.getAttribute("href") || "").replace(/[\s\u0000-\u001f]/g, "").toLowerCase();
      expect(href).not.toMatch(/^(javascript|data|vbscript):/);
    }
  });

  it("neutralises dangerous image sources", () => {
    const c = renderMd('![x](javascript:alert(1))\n\n<img src="javascript:alert(1)">\n\n<img src="data:text/html;base64,PHNjcmlwdD4=">');
    for (const img of c.querySelectorAll("img")) {
      expect((img.getAttribute("src") || "").toLowerCase()).not.toMatch(/^(javascript|data:text\/html)/);
    }
  });

  it.each(["iframe", "object", "embed", "form", "style", "link", "meta", "base", "frame", "applet"])(
    "removes <%s>",
    (tag) => {
      const html = tag === "form" ? '<form action="https://evil.example"><input name="q"></form>' : `<${tag} src="https://evil.example" href="https://evil.example"></${tag}>`;
      const c = renderMd(`before\n\n${html}\n\nafter`);
      expect(c.querySelector(tag)).toBeNull();
    }
  );

  it("strips style attributes from README content (no click-jacking overlays)", () => {
    const c = renderMd('<div style="position:fixed;inset:0;z-index:9999;background:red">cover</div>');
    // The only element allowed to carry a style is the viewer's own wrapper.
    const styled = [...c.querySelectorAll("[style]")].filter((el) => !el.classList.contains("markdown-body"));
    expect(styled).toEqual([]);
    expect(c.textContent).toContain("cover"); // the text survives, the styling does not
  });

  it("prefixes ids that come from raw HTML so they cannot clobber page globals", () => {
    const c = renderMd('<div id="cookie">x</div>\n\n<a name="location">y</a>');
    expect(c.querySelector('[id="cookie"]')).toBeNull();
    expect(c.querySelector('[name="location"]')).toBeNull();
  });

  it("an XSS payload inside a heading is shown as text in both the heading and the contents list", () => {
    const c = renderMd('# One\n\n## <img src=x onerror=alert(1)> Two\n\n## Three');
    expect(attributeNames(c).filter((n) => n.startsWith("on"))).toEqual([]);
    expect(c.querySelector("nav")).not.toBeNull();
  });

  it("external links open in a new tab without leaking window.opener", () => {
    const c = renderMd("[site](https://example.com)");
    const a = c.querySelector('a[href="https://example.com"]');
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer");
  });
});

describe("README rendering (the safe subset still works)", () => {
  it("renders GitHub-flavoured tables, task lists and strikethrough", () => {
    const c = renderMd("| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n~~gone~~");
    expect(c.querySelector("table th").textContent).toBe("a");
    expect(c.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
    expect(c.querySelector("del").textContent).toBe("gone");
  });

  it("keeps safe inline HTML: <details>, <kbd>, aligned <p>", () => {
    const c = renderMd('<details><summary>More</summary>hidden</details>\n\n<p align="center"><kbd>Ctrl</kbd></p>');
    expect(c.querySelector("details summary").textContent).toBe("More");
    expect(c.querySelector("kbd").textContent).toBe("Ctrl");
    expect(c.querySelector("p[align]")).not.toBeNull();
  });

  it("highlights fenced code AFTER sanitising (hljs classes survive)", () => {
    const c = renderMd("```js\nconst x = 1;\n```");
    const code = c.querySelector("pre code");
    expect(code.className).toMatch(/hljs/);
    expect(code.querySelector(".hljs-keyword")).not.toBeNull();
  });

  it("an unknown language does not crash the page", () => {
    const c = renderMd("```not-a-real-language\nhello\n```");
    expect(c.querySelector("pre code").textContent).toContain("hello");
  });

  it("gives headings GitHub-style ids so #links work", () => {
    const c = renderMd("# Getting Started\n\n## Install & Run");
    expect(c.querySelector("h1").id).toBe("getting-started");
    expect(c.querySelector("h2").id).toBe("install--run");
  });

  it("resolves relative images and links against the repository", () => {
    const c = renderMd("![logo](./img/logo.png)\n\n[contributing](CONTRIBUTING.md)", {
      ...META,
      dir: "docs/",
    });
    expect(c.querySelector("img").getAttribute("src")).toBe(
      "https://raw.githubusercontent.com/octocat/hello/main/docs/img/logo.png"
    );
    expect(c.querySelector('a[href*="CONTRIBUTING"]').getAttribute("href")).toBe(
      "https://github.com/octocat/hello/blob/main/docs/CONTRIBUTING.md"
    );
  });

  it("resolves relative URLs written as raw HTML too", () => {
    const c = renderMd('<img src="logo.png" width="100">');
    expect(c.querySelector("img").getAttribute("src")).toBe(
      "https://raw.githubusercontent.com/octocat/hello/main/logo.png"
    );
  });

  it("leaves absolute image URLs alone and lazy-loads images", () => {
    const c = renderMd("![badge](https://img.shields.io/badge/a-b-green.svg)");
    const img = c.querySelector("img");
    expect(img.getAttribute("src")).toBe("https://img.shields.io/badge/a-b-green.svg");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("alt")).toBe("badge");
  });

  it("gives images without alt text an empty alt (decorative)", () => {
    const c = renderMd('<img src="https://example.com/a.png">');
    expect(c.querySelector("img").getAttribute("alt")).toBe("");
  });

  it("renders an empty README without crashing", () => {
    const c = renderMd("");
    expect(c.querySelector(".markdown-body")).not.toBeNull();
    expect(c.querySelector("nav")).toBeNull();
  });
});

describe("table of contents", () => {
  const md = "# Title\n\n## Install\n\n### Windows\n\n## Usage";

  it("lists every heading, indented by level", () => {
    const c = renderMd(md);
    const items = [...c.querySelectorAll("nav li")];
    expect(items.map((li) => li.textContent)).toEqual(["Title", "Install", "Windows", "Usage"]);
    expect(items[0].style.paddingLeft).toBe("0px");
    expect(items[1].style.paddingLeft).toBe("12px");
    expect(items[2].style.paddingLeft).toBe("24px");
  });

  it("is hidden when there is one heading or none", () => {
    expect(renderMd("# Only one").querySelector("nav")).toBeNull();
    cleanup();
    expect(renderMd("just text").querySelector("nav")).toBeNull();
  });

  it("clicking an entry scrolls to that heading", () => {
    const c = renderMd(md);
    const button = [...c.querySelectorAll("nav button")].find((b) => b.textContent === "Usage");
    fireEvent.click(button);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(Element.prototype.scrollIntoView.mock.contexts[0].id).toBe("usage");
  });

  it("an in-page #link scrolls inside the viewer instead of navigating", () => {
    const c = renderMd("[go](#usage)\n\n## Usage\n\ntext");
    const a = c.querySelector('a[href="#usage"]');
    expect(a.getAttribute("target")).toBeNull(); // not opened in a new tab
    const notPrevented = fireEvent.click(a); // false when preventDefault() was called
    expect(notPrevented).toBe(false);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("a malformed percent-encoded anchor does not throw", () => {
    const c = renderMd("[bad](#%E0%A4%A)\n\n## Heading");
    expect(() => fireEvent.click(c.querySelector('a[href^="#"]'))).not.toThrow();
  });
});