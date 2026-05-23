export interface TutorialHeading {
  depth: 1 | 2 | 3;
  id: string;
  text: string;
}

const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

function stripScripts(markdown: string) {
  return markdown.replace(scriptPattern, '');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripInlineMarkdown(value: string) {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, '$1')
    .trim();
}

function baseSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'section';
}

function uniqueSlug(value: string, counts: Map<string, number>) {
  const slug = baseSlug(value);
  const count = counts.get(slug) ?? 0;
  counts.set(slug, count + 1);
  return count === 0 ? slug : `${slug}-${count + 1}`;
}

function renderText(value: string) {
  const chunks = value.split(/(`[^`]+`)/g);

  return chunks
    .map((chunk) => {
      if (chunk.startsWith('`') && chunk.endsWith('`')) {
        return `<code>${escapeHtml(chunk.slice(1, -1))}</code>`;
      }

      return renderLinks(chunk);
    })
    .join('');
}

function renderLinks(value: string) {
  let html = '';
  let lastIndex = 0;
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

  for (const match of value.matchAll(linkPattern)) {
    const index = match.index ?? 0;
    html += escapeHtml(value.slice(lastIndex, index));
    html += `<a href="${escapeHtml(match[2] ?? '')}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[1] ?? '')}</a>`;
    lastIndex = index + match[0].length;
  }

  html += escapeHtml(value.slice(lastIndex));
  return html;
}

export function extractHeadings(markdown: string): TutorialHeading[] {
  const headings: TutorialHeading[] = [];
  const counts = new Map<string, number>();
  let inCodeBlock = false;

  for (const line of stripScripts(markdown).replaceAll('\r\n', '\n').split('\n')) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

    const match = /^(#{1,3})\s+(.+)$/.exec(line);
    if (!match) continue;

    const text = stripInlineMarkdown(match[2] ?? '');
    const depth = match[1]!.length as TutorialHeading['depth'];
    headings.push({
      depth,
      id: uniqueSlug(text, counts),
      text,
    });
  }

  return headings;
}

export function markdownToTutorialHtml(markdown: string) {
  const lines = stripScripts(markdown).replaceAll('\r\n', '\n').split('\n');
  const html: string[] = [];
  const paragraph: string[] = [];
  const headingCounts = new Map<string, number>();
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${renderText(paragraph.join(' '))}</p>`);
    paragraph.length = 0;
  };

  const flushCode = () => {
    const languageClass = codeLanguage
      ? ` class="language-${escapeHtml(codeLanguage)}"`
      : '';
    html.push(`<pre><code${languageClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLanguage = '';
    codeLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushParagraph();
        codeLanguage = trimmed.slice(3).trim().replace(/[^\w-]/g, '');
        codeLines = [];
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      const text = stripInlineMarkdown(headingMatch[2] ?? '');
      const depth = headingMatch[1]!.length;
      const id = uniqueSlug(text, headingCounts);
      html.push(`<h${depth} id="${escapeHtml(id)}">${renderText(text)}</h${depth}>`);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    paragraph.push(line);
  }

  if (inCodeBlock) {
    flushCode();
  }
  flushParagraph();

  return html.join('\n');
}
