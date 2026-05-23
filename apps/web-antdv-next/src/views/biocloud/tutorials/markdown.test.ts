import { describe, expect, it } from 'vitest';

import { extractHeadings, markdownToTutorialHtml } from './markdown';

describe('tutorial markdown', () => {
  it('renders headings, code, links, paragraphs, and strips script tags', () => {
    const html = markdownToTutorialHtml(
      '# 标题\n\n## 小节\n\n### 细节\n\n普通段落 with `inline` code.\n\n```r\nprint(1)\n```\n\n[link](https://example.com)\n<script>x</script>',
    );
    expect(html).toContain('<h1');
    expect(html).toContain('<h2');
    expect(html).toContain('<h3');
    expect(html).toContain('<p>普通段落 with <code>inline</code> code.</p>');
    expect(html).toContain('<code');
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain('<script>');
  });

  it('extracts heading anchors for a table of contents', () => {
    expect(extractHeadings('# A\n\n## B\n\n### C')).toEqual([
      { depth: 1, id: 'a', text: 'A' },
      { depth: 2, id: 'b', text: 'B' },
      { depth: 3, id: 'c', text: 'C' },
    ]);
  });
});
