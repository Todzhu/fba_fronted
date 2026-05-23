import { describe, expect, it } from 'vitest';

import { extractHeadings, markdownToTutorialHtml } from './markdown';

describe('tutorial markdown', () => {
  it('renders headings, code, links, and strips script tags', () => {
    const html = markdownToTutorialHtml(
      '# 标题\n\n```r\nprint(1)\n```\n\n[link](https://example.com)\n<script>x</script>',
    );
    expect(html).toContain('<h1');
    expect(html).toContain('<code');
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain('<script>');
  });

  it('extracts heading anchors for a table of contents', () => {
    expect(extractHeadings('# A\n\n## B')).toEqual([
      { depth: 1, id: 'a', text: 'A' },
      { depth: 2, id: 'b', text: 'B' },
    ]);
  });
});
