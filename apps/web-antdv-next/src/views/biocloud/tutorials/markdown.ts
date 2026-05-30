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

function renderEmphasis(value: string) {
  return escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function renderLinks(value: string) {
  let html = '';
  let lastIndex = 0;
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

  for (const match of value.matchAll(linkPattern)) {
    const index = match.index ?? 0;
    html += renderEmphasis(value.slice(lastIndex, index));
    html += `<a href="${escapeHtml(match[2] ?? '')}" target="_blank" rel="noopener noreferrer">${renderEmphasis(match[1] ?? '')}</a>`;
    lastIndex = index + match[0].length;
  }

  html += renderEmphasis(value.slice(lastIndex));
  return html;
}

function parseImageDestination(value: string) {
  let destination = value.trim();
  let title = '';
  const titleMatch = /\s+(['"])([^'"]*)\1\s*$/.exec(destination);

  if (titleMatch) {
    title = titleMatch[2] ?? '';
    destination = destination.slice(0, titleMatch.index).trim();
  }

  if (destination.startsWith('<') && destination.endsWith('>')) {
    destination = destination.slice(1, -1).trim();
  }

  if (!/^(?:https?:\/\/|\/)/.test(destination)) {
    return null;
  }

  return {
    destination,
    title,
  };
}

function parseImageLine(line: string) {
  const imageMatch = /^!\[([^\]]*)\]\((.+)\)\s*$/.exec(line.trim());
  if (!imageMatch) return null;

  const parsedDestination = parseImageDestination(imageMatch[2] ?? '');
  if (!parsedDestination) return null;

  return {
    alt: imageMatch[1] ?? '',
    ...parsedDestination,
  };
}

function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableLine(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|');
}

function isTableSeparator(line: string) {
  return tableCells(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isHorizontalRule(line: string) {
  return /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line);
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
  const listItems: string[] = [];
  const tableRows: string[][] = [];
  const headingCounts = new Map<string, number>();
  let inCodeBlock = false;
  let inCallout = false;
  let codeLanguage = '';
  let codeLines: string[] = [];
  let listType: 'ol' | 'ul' | '' = '';

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${renderText(paragraph.join(' '))}</p>`);
    paragraph.length = 0;
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    html.push(`<${listType}>${listItems.map((item) => `<li>${renderText(item)}</li>`).join('')}</${listType}>`);
    listItems.length = 0;
    listType = '';
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const [head, ...body] = tableRows;
    html.push([
      '<table>',
      '<thead>',
      `<tr>${(head ?? []).map((cell) => `<th>${renderText(cell)}</th>`).join('')}</tr>`,
      '</thead>',
      '<tbody>',
      ...body.map((row) => `<tr>${row.map((cell) => `<td>${renderText(cell)}</td>`).join('')}</tr>`),
      '</tbody>',
      '</table>',
    ].join(''));
    tableRows.length = 0;
  };

  const flushBlocks = () => {
    flushParagraph();
    flushList();
    flushTable();
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

    const calloutMatch = /^:::\s*\{\.(callout-[\w-]+)\}\s*$/.exec(trimmed);
    if (calloutMatch) {
      flushBlocks();
      html.push(`<aside class="callout ${escapeHtml(calloutMatch[1] ?? 'callout-note')}">`);
      inCallout = true;
      continue;
    }

    if (inCallout && trimmed === ':::') {
      flushBlocks();
      html.push('</aside>');
      inCallout = false;
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flushBlocks();
      const text = stripInlineMarkdown(headingMatch[2] ?? '');
      const depth = headingMatch[1]!.length;
      const id = uniqueSlug(text, headingCounts);
      html.push(`<h${depth} id="${escapeHtml(id)}">${renderText(text)}</h${depth}>`);
      continue;
    }

    if (!trimmed) {
      flushBlocks();
      continue;
    }

    if (isHorizontalRule(line)) {
      flushBlocks();
      html.push('<hr>');
      continue;
    }

    const imageMatch = parseImageLine(trimmed);
    if (imageMatch) {
      flushBlocks();
      const titleAttribute = imageMatch.title
        ? ` title="${escapeHtml(imageMatch.title)}"`
        : '';
      html.push(
        `<figure><img src="${escapeHtml(imageMatch.destination)}" alt="${escapeHtml(imageMatch.alt)}"${titleAttribute} loading="lazy"></figure>`,
      );
      continue;
    }

    if (isTableLine(line)) {
      flushParagraph();
      flushList();
      if (!isTableSeparator(line)) {
        tableRows.push(tableCells(line));
      }
      continue;
    }

    const unorderedMatch = /^\s*[-*]\s+(.+)$/.exec(line);
    const orderedMatch = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      flushTable();
      const nextType = unorderedMatch ? 'ul' : 'ol';
      if (listType && listType !== nextType) {
        flushList();
      }
      listType = nextType;
      listItems.push((unorderedMatch?.[1] ?? orderedMatch?.[1] ?? '').trim());
      continue;
    }

    flushList();
    flushTable();
    paragraph.push(line);
  }

  if (inCodeBlock) {
    flushCode();
  }
  flushBlocks();
  if (inCallout) {
    html.push('</aside>');
  }

  return html.join('\n');
}
