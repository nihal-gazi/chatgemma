import React, { useEffect, useRef } from "react";
import { marked } from "marked";
import hljs from "highlight.js";
import katex from "katex";
import { copyToClipboard } from "../../utils/index.js";

// Common programming language list for auto-highlighting to prevent false positives (like 'dust', 'gauss')
const COMMON_LANGUAGES = [
  "javascript", "js", "typescript", "ts", "python", "py", "html", "xml", "css",
  "json", "bash", "sh", "c", "cpp", "csharp", "cs", "java", "rust",
  "go", "sql", "yaml", "yml", "markdown", "md", "latex", "tex", "diff"
];

// Configure marked custom renderer
const renderer = new marked.Renderer();

renderer.code = function (tokenOrText, langArg) {
  const isObj = typeof tokenOrText === "object" && tokenOrText !== null;
  const text = isObj ? tokenOrText.text : tokenOrText;
  const lang = (isObj ? tokenOrText.lang : langArg) || "";
  const raw = isObj ? tokenOrText.raw : "";
  const codeBlockStyle = isObj ? tokenOrText.codeBlockStyle : "";

  // If this was an indented block (4 spaces) rather than a fenced (```) block,
  // do NOT render a code block container. Render as regular markdown.
  if (
    codeBlockStyle === "indented" ||
    (raw && !raw.trim().startsWith("```") && !raw.trim().startsWith("~~~"))
  ) {
    return marked.parse(text);
  }

  // Real fenced code block (```)
  let highlighted = "";
  let detectedLang = lang.trim();

  if (detectedLang && hljs.getLanguage(detectedLang)) {
    try {
      highlighted = hljs.highlight(text, {
        language: detectedLang,
        ignoreIllegals: true,
      }).value;
    } catch (e) {
      highlighted = text;
    }
  } else if (!detectedLang) {
    try {
      const auto = hljs.highlightAuto(text, COMMON_LANGUAGES);
      if (auto && auto.language && auto.relevance > 4) {
        highlighted = auto.value;
        detectedLang = auto.language;
      } else {
        highlighted = text;
        detectedLang = "text";
      }
    } catch (e) {
      highlighted = text;
      detectedLang = "text";
    }
  } else {
    highlighted = text;
  }

  const langBadge = detectedLang
    ? `<span class="code-lang-badge">${detectedLang}</span>`
    : `<span class="code-lang-badge">code</span>`;

  return `
    <div class="code-block-container">
      <div class="code-block-header">
        ${langBadge}
      </div>
      <pre><code class="hljs ${detectedLang}">${highlighted}</code></pre>
    </div>
  `;
};

// Custom table renderer to wrap all tables in a scrollable container
const defaultTableRenderer = marked.Renderer.prototype.table;
renderer.table = function (...args) {
  const html = defaultTableRenderer.apply(this, args);
  return `<div class="table-container">${html}</div>`;
};

// 1. Block Math Extension: $$...$$ or \[...\]
const blockMathExtension = {
  name: "blockMath",
  level: "block",
  start(src) {
    const idx1 = src.indexOf("$$");
    const idx2 = src.indexOf("\\[");
    if (idx1 === -1) return idx2;
    if (idx2 === -1) return idx1;
    return Math.min(idx1, idx2);
  },
  tokenizer(src) {
    const match = src.match(/^\$\$([\s\S]+?)\$\$/);
    if (match) {
      return {
        type: "blockMath",
        raw: match[0],
        text: match[1].trim(),
      };
    }
    const matchBracket = src.match(/^\\\[([\s\S]+?)\\\]/);
    if (matchBracket) {
      return {
        type: "blockMath",
        raw: matchBracket[0],
        text: matchBracket[1].trim(),
      };
    }
  },
  renderer(token) {
    try {
      const mathHtml = katex.renderToString(token.text, {
        displayMode: true,
        throwOnError: false,
      });
      return `<div class="katex-display-wrapper">${mathHtml}</div>`;
    } catch (e) {
      return token.raw;
    }
  },
};

// 2. Inline Math Extension: $...$ or \(...\)
const inlineMathExtension = {
  name: "inlineMath",
  level: "inline",
  start(src) {
    const idx1 = src.indexOf("$");
    const idx2 = src.indexOf("\\(");
    if (idx1 === -1) return idx2;
    if (idx2 === -1) return idx1;
    return Math.min(idx1, idx2);
  },
  tokenizer(src) {
    // Matches $formula$ where formula doesn't start/end with whitespace or another $
    const match = src.match(/^\$([^\$\n\s][^\$\n]*?[^\$\n\s]|\S)\$/);
    if (match) {
      return {
        type: "inlineMath",
        raw: match[0],
        text: match[1].trim(),
      };
    }
    const matchParen = src.match(/^\\\(([\s\S]+?)\\\)/);
    if (matchParen) {
      return {
        type: "inlineMath",
        raw: matchParen[0],
        text: matchParen[1].trim(),
      };
    }
  },
  renderer(token) {
    try {
      const mathHtml = katex.renderToString(token.text, {
        displayMode: false,
        throwOnError: false,
      });
      return `<span class="katex-inline-wrapper">${mathHtml}</span>`;
    } catch (e) {
      return token.raw;
    }
  },
};

// Register configuration with marked
marked.use({
  renderer,
  gfm: true,
  breaks: true,
  extensions: [blockMathExtension, inlineMathExtension],
});

export default function MarkdownRenderer({ content, className = "" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Attach copy button to code blocks
    const codeContainers = containerRef.current.querySelectorAll(".code-block-container");
    codeContainers.forEach((block) => {
      if (block.querySelector(".code-copy-action")) return;

      const codeEl = block.querySelector("code");
      const headerEl = block.querySelector(".code-block-header");
      const copyBtn = document.createElement("button");
      copyBtn.className = "code-copy-action";
      copyBtn.type = "button";
      copyBtn.innerText = "Copy";
      copyBtn.addEventListener("click", async () => {
        if (codeEl) {
          const ok = await copyToClipboard(codeEl.innerText);
          if (ok) {
            copyBtn.innerText = "Copied!";
            setTimeout(() => {
              copyBtn.innerText = "Copy";
            }, 2000);
          }
        }
      });

      if (headerEl) {
        headerEl.appendChild(copyBtn);
      } else {
        block.appendChild(copyBtn);
      }
    });
  }, [content]);

  if (!content) return null;

  const html = marked.parse(content);

  return (
    <div
      ref={containerRef}
      className={`gemini-markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
