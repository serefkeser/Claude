import { describe, expect, it } from 'vitest';
import { getNewspaperVisionViewSpecs } from './newspaperVisionViews';

describe('newspaper Vision views', () => {
  it('aynı sayfayı tam görünüm ve örtüşen iki yakın plan olarak hazırlar', () => {
    const views = getNewspaperVisionViewSpecs();

    expect(views).toHaveLength(3);
    expect(views.map(view => view.label)).toEqual(['tam sayfa', 'üst yakın plan', 'alt yakın plan']);
    expect(views[0]).toEqual(expect.objectContaining({ topRatio: 0, heightRatio: 1 }));
    expect(views[1].topRatio + views[1].heightRatio).toBeGreaterThan(views[2].topRatio);
    expect(views[2].topRatio).toBeLessThan(0.5);
    expect(views[2].topRatio + views[2].heightRatio).toBe(1);
  });

  it('yakın planları tam sayfadan daha yüksek JPEG kalitesinde tutar', () => {
    const [full, upper, lower] = getNewspaperVisionViewSpecs();
    expect(upper.quality).toBeGreaterThan(full.quality);
    expect(lower.quality).toBeGreaterThan(full.quality);
    expect(upper.maxEdge).toBeGreaterThanOrEqual(full.maxEdge);
  });
});
