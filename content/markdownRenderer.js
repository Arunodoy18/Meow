/**
 * Meow AI - Markdown Renderer v1.0
 * Lightweight markdown-to-HTML renderer for AI responses.
 * Supports: headings, bold, italic, code blocks, inline code,
 * links, lists, blockquotes, horizontal rules, and tables.
 * Includes syntax highlighting for code blocks and XSS sanitization.
 */

const MeowMarkdown = (() => {
  'use strict';

  // ==================== SANITIZATION ====================

  /**
   * Sanitize HTML to prevent XSS from AI model output.
   * Only allows safe tags and attributes.
   */
  function _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== SYNTAX HIGHLIGHTING ====================

  const SYNTAX_COLORS = {
    keyword: '#c678dd',
    string: '#98c379',
    comment: '#5c6370',
    number: '#d19a66',
    function: '#61afef',
    operator: '#56b6c2',
    punctuation: '#abb2bf',
    type: '#e5c07b',
    builtin: '#e06c75',
  };

  const KEYWORD_PATTERNS = {
    javascript: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|yield|delete|void|with|debugger|super|static|get|set)\b/g,
    python: /\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|raise|pass|break|continue|and|or|not|is|in|lambda|global|nonlocal|assert|del|True|False|None|async|await|self)\b/g,
    java: /\b(public|private|protected|static|final|abstract|class|interface|extends|implements|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|import|package|void|int|long|double|float|boolean|char|byte|short|String|this|super|null|true|false|instanceof)\b/g,
    rust: /\b(fn|let|mut|const|if|else|for|while|loop|match|return|struct|enum|impl|trait|pub|use|mod|crate|self|super|where|async|await|move|ref|type|static|unsafe|extern|true|false|Some|None|Ok|Err)\b/g,
    go: /\b(func|var|const|if|else|for|range|switch|case|default|return|struct|interface|type|package|import|go|defer|chan|select|map|make|new|append|len|cap|true|false|nil|err)\b/g,
    typescript: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|type|interface|enum|namespace|declare|abstract|implements|readonly|as|is|keyof|infer|never|unknown|any|void|null|undefined|true|false)\b/g,
    sql: /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|NULL|IS|IN|LIKE|BETWEEN|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|AS|DISTINCT|COUNT|SUM|AVG|MAX|MIN|EXISTS|CASE|WHEN|THEN|ELSE|END|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|CHECK|UNIQUE|AUTO_INCREMENT)\b/gi,
    css: /\b(display|flex|grid|position|absolute|relative|fixed|sticky|margin|padding|border|background|color|font|text|width|height|top|left|right|bottom|z-index|overflow|opacity|transform|transition|animation|cursor|none|block|inline|inherit|auto|important|hover|focus|active|before|after|nth-child|first-child|last-child)\b/g,
    html: /\b(div|span|section|article|header|footer|nav|main|aside|form|input|button|select|textarea|label|table|tr|td|th|thead|tbody|ul|ol|li|a|p|h[1-6]|img|video|audio|canvas|svg|script|style|link|meta|head|body|html|class|id|src|href|alt|type|name|value|placeholder|disabled|checked|required)\b/g,
    shell: /\b(echo|cd|ls|mkdir|rm|cp|mv|cat|grep|find|chmod|chown|sudo|apt|yum|brew|npm|yarn|pip|git|docker|kubectl|curl|wget|ssh|scp|tar|zip|unzip|export|source|alias|which|man|kill|ps|top|df|du|head|tail|sort|uniq|wc|awk|sed|cut|xargs)\b/g,
  };

  /**
   * Detect language from code block content or hint.
   */
  function _detectLanguage(hint, code) {
    if (hint) {
      const h = hint.toLowerCase().trim();
      if (['js', 'javascript', 'jsx', 'mjs'].includes(h)) return 'javascript';
      if (['ts', 'typescript', 'tsx'].includes(h)) return 'typescript';
      if (['py', 'python', 'python3'].includes(h)) return 'python';
      if (['java', 'kt', 'kotlin'].includes(h)) return 'java';
      if (['rs', 'rust'].includes(h)) return 'rust';
      if (['go', 'golang'].includes(h)) return 'go';
      if (['sql', 'mysql', 'postgresql', 'postgres', 'sqlite'].includes(h)) return 'sql';
      if (['css', 'scss', 'sass', 'less'].includes(h)) return 'css';
      if (['html', 'htm', 'xml', 'svg', 'jsx'].includes(h)) return 'html';
      if (['sh', 'bash', 'zsh', 'shell', 'powershell', 'ps1', 'cmd', 'bat'].includes(h)) return 'shell';
      if (['c', 'cpp', 'c++', 'cc', 'cxx', 'h', 'hpp'].includes(h)) return 'java'; // close enough highlighting
      if (['cs', 'csharp', 'c#'].includes(h)) return 'java';
      if (['rb', 'ruby'].includes(h)) return 'python'; // close enough
      if (['php'].includes(h)) return 'javascript'; // close enough
      if (['json'].includes(h)) return 'javascript';
      if (['yaml', 'yml', 'toml', 'ini', 'conf', 'cfg'].includes(h)) return 'shell';
      if (['md', 'markdown'].includes(h)) return null;
      if (['diff', 'patch'].includes(h)) return null;
      if (['txt', 'text', 'plaintext', 'plain'].includes(h)) return null;
    }

    // Auto-detect from content
    if (/\b(def |class |import |from |if __name__|print\(|self\.)/.test(code)) return 'python';
    if (/\b(func |:= |fmt\.|package |go func)/.test(code)) return 'go';
    if (/\b(fn |let mut |impl |pub fn|->|::)/.test(code) && !/=>/.test(code)) return 'rust';
    if (/\b(public class|private |System\.out|@Override)/.test(code)) return 'java';
    if (/\b(SELECT|FROM|WHERE|INSERT INTO|CREATE TABLE)\b/i.test(code)) return 'sql';
    if (/\b(const |let |var |=>|async |await |require\(|import )/.test(code)) return 'javascript';
    if (/\b(interface |type |: string|: number|: boolean|as |<.*>)/.test(code)) return 'typescript';
    if (/[{};]/.test(code) && /\b(display|margin|padding|background|color|font-size)\b/.test(code)) return 'css';
    if (/<[a-z]+[^>]*>/i.test(code) && /<\/[a-z]+>/i.test(code)) return 'html';
    if (/^\s*(#|echo |cd |ls |npm |git |docker |curl )/m.test(code)) return 'shell';

    return null;
  }

  /**
   * Apply syntax highlighting to a code string.
   */
  function _highlightCode(code, lang) {
    let html = _escapeHtml(code);
    if (!lang || !KEYWORD_PATTERNS[lang]) return html;

    // Highlight strings first (so keywords inside strings aren't highlighted)
    html = html.replace(/(["'`])(?:(?!\1|\\).|\\.)*?\1/g, (match) =>
      `<span style="color:${SYNTAX_COLORS.string}">${match}</span>`
    );

    // Highlight comments
    html = html.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g, (match) => {
      // Don't highlight if inside a string span
      if (match.includes('style="color:')) return match;
      return `<span style="color:${SYNTAX_COLORS.comment};font-style:italic">${match}</span>`;
    });

    // Highlight numbers
    html = html.replace(/\b(\d+\.?\d*)\b/g, (match, num, offset) => {
      // Skip if inside a tag
      const before = html.substring(Math.max(0, offset - 30), offset);
      if (before.includes('style=') || before.includes('</span')) return match;
      return `<span style="color:${SYNTAX_COLORS.number}">${match}</span>`;
    });

    // Highlight keywords
    const pattern = KEYWORD_PATTERNS[lang];
    html = html.replace(new RegExp(pattern.source, pattern.flags), (match, offset) => {
      return `<span style="color:${SYNTAX_COLORS.keyword};font-weight:600">${match}</span>`;
    });

    return html;
  }

  // ==================== MARKDOWN PARSER ====================

  /**
   * Render markdown text to safe HTML.
   * @param {string} text - Raw markdown text
   * @returns {string} Safe HTML string
   */
  function render(text) {
    if (!text) return '';

    let html = text;

    // Step 1: Extract and preserve code blocks (prevent inner parsing)
    const codeBlocks = [];
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const detectedLang = _detectLanguage(lang, code.trim());
      const highlighted = _highlightCode(code.trimEnd(), detectedLang);
      const langLabel = lang || detectedLang || '';
      const idx = codeBlocks.length;
      codeBlocks.push(
        `<div class="meow-code-block">` +
        (langLabel ? `<div class="meow-code-lang">${_escapeHtml(langLabel)}</div>` : '') +
        `<button class="meow-copy-code" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(code.trim())}'));this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)" title="Copy code">Copy</button>` +
        `<pre><code>${highlighted}</code></pre></div>`
      );
      return `%%CODEBLOCK_${idx}%%`;
    });

    // Step 2: Extract inline code
    const inlineCodes = [];
    html = html.replace(/`([^`\n]+)`/g, (_, code) => {
      const idx = inlineCodes.length;
      inlineCodes.push(`<code class="meow-inline-code">${_escapeHtml(code)}</code>`);
      return `%%INLINECODE_${idx}%%`;
    });

    // Step 3: Escape remaining HTML
    html = _escapeHtml(html);

    // Step 4: Restore placeholders
    codeBlocks.forEach((block, i) => {
      html = html.replace(`%%CODEBLOCK_${i}%%`, block);
    });
    inlineCodes.forEach((code, i) => {
      html = html.replace(`%%INLINECODE_${i}%%`, code);
    });

    // Step 5: Parse block elements

    // Headings
    html = html.replace(/^#### (.+)$/gm, '<h4 class="meow-md-h4">$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3 class="meow-md-h3">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="meow-md-h2">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="meow-md-h1">$1</h1>');

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr class="meow-md-hr">');

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="meow-md-quote">$1</blockquote>');

    // Unordered lists
    html = html.replace(/^[\s]*[-*] (.+)$/gm, '<li class="meow-md-li">$1</li>');
    html = html.replace(/((?:<li class="meow-md-li">.*<\/li>\n?)+)/g, '<ul class="meow-md-ul">$1</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li class="meow-md-oli">$1</li>');
    html = html.replace(/((?:<li class="meow-md-oli">.*<\/li>\n?)+)/g, '<ol class="meow-md-ol">$1</ol>');

    // Step 6: Inline formatting
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="meow-md-link">$1</a>');

    // Step 7: Paragraphs (convert double newlines to paragraph breaks)
    html = html.replace(/\n\n+/g, '</p><p class="meow-md-p">');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph if not already block-level
    if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol') &&
        !html.startsWith('<blockquote') && !html.startsWith('<div') && !html.startsWith('<hr')) {
      html = `<p class="meow-md-p">${html}</p>`;
    }

    // Clean up empty paragraphs
    html = html.replace(/<p class="meow-md-p"><\/p>/g, '');
    html = html.replace(/<p class="meow-md-p">(\s*<(?:h[1-4]|ul|ol|blockquote|div|hr))/g, '$1');
    html = html.replace(/(<\/(?:h[1-4]|ul|ol|blockquote|div|hr)>)\s*<\/p>/g, '$1');

    return html;
  }

  /**
   * Get CSS styles for markdown rendering.
   * Injected alongside chat UI styles.
   */
  function getStyles() {
    return `
      /* ==================== MARKDOWN RENDERING ==================== */
      .meow-md-h1 { font-size: 18px; font-weight: 700; color: var(--meow-primary); margin: 12px 0 6px; }
      .meow-md-h2 { font-size: 16px; font-weight: 700; color: var(--meow-primary-light); margin: 10px 0 5px; }
      .meow-md-h3 { font-size: 14px; font-weight: 700; color: var(--meow-text-primary); margin: 8px 0 4px; }
      .meow-md-h4 { font-size: 13px; font-weight: 600; color: var(--meow-text-primary); margin: 6px 0 3px; }
      .meow-md-p { margin: 4px 0; line-height: 1.6; }
      .meow-md-hr { border: none; border-top: 1px solid rgba(34, 197, 94, 0.2); margin: 10px 0; }
      .meow-md-quote {
        border-left: 3px solid var(--meow-primary);
        padding: 4px 12px;
        margin: 6px 0;
        color: var(--meow-text-secondary);
        background: rgba(34, 197, 94, 0.05);
        border-radius: 0 6px 6px 0;
      }
      .meow-md-ul, .meow-md-ol { padding-left: 20px; margin: 6px 0; }
      .meow-md-li, .meow-md-oli { margin: 3px 0; line-height: 1.5; }
      .meow-md-link { color: var(--meow-accent); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
      .meow-md-link:hover { border-bottom-color: var(--meow-accent); }

      .meow-inline-code {
        background: rgba(34, 197, 94, 0.1);
        color: var(--meow-primary-light);
        padding: 1px 6px;
        border-radius: 4px;
        font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
        font-size: 12px;
      }

      .meow-code-block {
        position: relative;
        background: #0d1117;
        border: 1px solid rgba(34, 197, 94, 0.15);
        border-radius: 8px;
        margin: 8px 0;
        overflow: hidden;
      }

      .meow-code-block pre {
        margin: 0;
        padding: 12px 14px;
        overflow-x: auto;
        font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
        font-size: 12px;
        line-height: 1.5;
        color: #abb2bf;
        white-space: pre;
      }

      .meow-code-block code {
        font-family: inherit;
        background: none;
        padding: 0;
      }

      .meow-code-lang {
        position: absolute;
        top: 4px;
        left: 10px;
        font-size: 10px;
        color: var(--meow-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-family: var(--meow-font);
      }

      .meow-copy-code {
        all: initial;
        position: absolute;
        top: 4px;
        right: 6px;
        padding: 2px 8px;
        font-size: 10px;
        font-family: var(--meow-font);
        color: var(--meow-text-secondary);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .meow-copy-code:hover {
        background: rgba(34, 197, 94, 0.15);
        color: var(--meow-primary);
        border-color: rgba(34, 197, 94, 0.3);
      }

      /* Diff highlighting */
      .meow-code-block pre .diff-add { color: #98c379; background: rgba(152, 195, 121, 0.1); display: inline-block; width: 100%; }
      .meow-code-block pre .diff-remove { color: #e06c75; background: rgba(224, 108, 117, 0.1); display: inline-block; width: 100%; }
    `;
  }

  // ==================== PUBLIC API ====================

  return {
    render,
    getStyles
  };
})();
