import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  getNewspaperVisionCompositeLayout,
  getNewspaperVisionViewSpecs,
} from './newspaperVisionViews';

describe('newspaper Vision views', () => {
  it('ilk keşif görünümünü yalnız orijinal tam sayfa olarak tanımlar', () => {
    const views = getNewspaperVisionViewSpecs();

    expect(views).toHaveLength(1);
    expect(views[0]).toEqual(expect.objectContaining({
      label: 'tam sayfa',
      topRatio: 0,
      heightRatio: 1,
      maxEdge: 2600,
    }));
  });

  it('eski birleşik layout yardımcısını geriye uyumluluk için korur', () => {
    const layout = getNewspaperVisionCompositeLayout();

    expect(layout.width).toBe(2200);
    expect(layout.height).toBe(1900);
    expect(layout.fullPage.x + layout.fullPage.width).toBeLessThan(layout.upperZoom.x);
  });

  it('sağlayıcıya tek orijinal tam sayfa JPEG gönderir ve kolajı keşif akışında kullanmaz', () => {
    const source = fs.readFileSync(new URL('./newspaperVisionViews.ts', import.meta.url), 'utf8');
    expect(source).toContain('return [await prepareNewspaperDiscoveryPage(blob, sourceName)]');
    expect(source).toContain('koordinatları doğrudan orijinal gazete sayfasına aittir');
    expect(source).not.toContain('return [await prepareNewspaperVisionComposite(blob, sourceName)]');
  });
});
