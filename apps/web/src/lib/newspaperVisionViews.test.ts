import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  getNewspaperVisionCompositeLayout,
  getNewspaperVisionViewSpecs,
} from './newspaperVisionViews';

describe('newspaper Vision views', () => {
  it('aynı sayfayı tam görünüm ve örtüşen iki yakın plan mantığıyla korur', () => {
    const views = getNewspaperVisionViewSpecs();

    expect(views).toHaveLength(3);
    expect(views.map(view => view.label)).toEqual(['tam sayfa', 'üst yakın plan', 'alt yakın plan']);
    expect(views[0]).toEqual(expect.objectContaining({ topRatio: 0, heightRatio: 1 }));
    expect(views[1].topRatio + views[1].heightRatio).toBeGreaterThan(views[2].topRatio);
    expect(views[2].topRatio).toBeLessThan(0.5);
    expect(views[2].topRatio + views[2].heightRatio).toBe(1);
  });

  it('birleşik Vision görselinde tam sayfayı solda, yakın planları sağda ayrı panellerde tutar', () => {
    const layout = getNewspaperVisionCompositeLayout();

    expect(layout.width).toBe(2600);
    expect(layout.height).toBe(2200);
    expect(layout.fullPage.x + layout.fullPage.width).toBeLessThan(layout.upperZoom.x);
    expect(layout.upperZoom.x).toBe(layout.lowerZoom.x);
    expect(layout.upperZoom.y + layout.upperZoom.height).toBeLessThan(layout.lowerZoom.y);
    expect(layout.upperZoom.topRatio).toBe(0);
    expect(layout.lowerZoom.topRatio).toBe(0.38);
  });

  it('sağlayıcıya üç ayrı image[] yerine tek birleşik JPEG döndürür', () => {
    const source = fs.readFileSync(new URL('./newspaperVisionViews.ts', import.meta.url), 'utf8');
    expect(source).toContain('return [await prepareNewspaperVisionComposite(blob, sourceName)]');
    expect(source).toContain('image[1]/image[2]');
  });
});
