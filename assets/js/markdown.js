(function (root) {
  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeHref(value) {
    const href = String(value || '').trim();
    return /^(https?:|mailto:|tel:|\/|#)/i.test(href) ? href : '';
  }

  function renderInline(value) {
    const codeTokens = [];
    const linkTokens = [];
    let text = String(value || '');

    text = text.replace(/`([^`\n]+)`/g, function (_, code) {
      const index = codeTokens.push('<code>' + escapeHtml(code) + '</code>') - 1;
      return '\uE000CODE' + index + '\uE001';
    });

    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, function (_, label, href) {
      const safe = safeHref(href);
      const rendered = safe
        ? '<a href="' + escapeHtml(safe) + '" target="_blank" rel="noopener noreferrer">' + renderInline(label) + '</a>'
        : escapeHtml(label);
      const index = linkTokens.push(rendered) - 1;
      return '\uE000LINK' + index + '\uE001';
    });

    text = escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/_([^_\n]+)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    text = text.replace(/\uE000LINK(\d+)\uE001/g, function (_, index) {
      return linkTokens[Number(index)] || '';
    });
    return text.replace(/\uE000CODE(\d+)\uE001/g, function (_, index) {
      return codeTokens[Number(index)] || '';
    });
  }

  function render(markdown) {
    const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
    const output = [];
    let paragraph = [];
    let listType = '';
    let listItems = [];
    let quoteLines = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      output.push('<p>' + renderInline(paragraph.join('\n')) + '</p>');
      paragraph = [];
    }

    function flushList() {
      if (!listItems.length) return;
      output.push('<' + listType + '>' + listItems.map(function (item) {
        return '<li>' + renderInline(item) + '</li>';
      }).join('') + '</' + listType + '>');
      listType = '';
      listItems = [];
    }

    function flushQuote() {
      if (!quoteLines.length) return;
      output.push('<blockquote>' + render(quoteLines.join('\n')) + '</blockquote>');
      quoteLines = [];
    }

    function flushTextBlocks() {
      flushParagraph();
      flushList();
      flushQuote();
    }

    lines.forEach(function (line) {
      const fence = line.match(/^\s*```\s*([a-z0-9_-]*)\s*$/i);
      if (fence) {
        if (inCodeBlock) {
          const languageClass = codeLanguage ? ' class="language-' + escapeHtml(codeLanguage) + '"' : '';
          output.push('<pre><code' + languageClass + '>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
          inCodeBlock = false;
          codeLanguage = '';
          codeLines = [];
        } else {
          flushTextBlocks();
          inCodeBlock = true;
          codeLanguage = fence[1] || '';
        }
        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      if (!line.trim()) {
        flushTextBlocks();
        return;
      }

      const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (heading) {
        flushTextBlocks();
        const level = Math.min(4, heading[1].length + 1);
        output.push('<h' + level + '>' + renderInline(heading[2]) + '</h' + level + '>');
        return;
      }

      if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
        flushTextBlocks();
        output.push('<hr>');
        return;
      }

      const quote = line.match(/^\s*>\s?(.*)$/);
      if (quote) {
        flushParagraph();
        flushList();
        quoteLines.push(quote[1]);
        return;
      }
      flushQuote();

      const unordered = line.match(/^\s*[-+*]\s+(.+)$/);
      const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (unordered || ordered) {
        flushParagraph();
        const nextType = ordered ? 'ol' : 'ul';
        if (listType && listType !== nextType) flushList();
        listType = nextType;
        listItems.push((ordered || unordered)[1]);
        return;
      }

      flushList();
      paragraph.push(line.trim());
    });

    if (inCodeBlock) {
      output.push('<pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
    }
    flushTextBlocks();
    return output.join('');
  }

  root.JobsMarkdown = { render: render };
})(typeof window === 'undefined' ? globalThis : window);
