import { describe, expect, it } from 'vitest';
import { splitSubtitleChunks } from './localRenderer';

describe('subtitle safe layout input', () => {
  it('uzun haber cümlesini en fazla dört kelimelik parçalara böler', () => {
    const chunks = splitSubtitleChunks(
      "DENİZOĞLU'NUN ÖLÜMÜNDE CİNAYET İZİ soruşturmanın ayrıntıları açıklandı",
    );
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(chunk => expect(chunk.split(/\s+/).length).toBeGreaterThan(0));
    expect(Math.max(...chunks.map(chunk => chunk.split(/\s+/).length))).toBeLessThanOrEqual(4);
  });
});
