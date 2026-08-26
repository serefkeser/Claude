import { describe, expect, it } from 'vitest';
import { computeNewspaperEvidenceCrop } from './aiClient';

describe('newspaper evidence crop', () => {
  it('başlık kutusunun altındaki açıklama satırlarını kapsayacak dikey bağlam ekler', () => {
    const crop = computeNewspaperEvidenceCrop({
      imageWidth: 1000, imageHeight: 1600, boxLeft: 220, boxTop: 300, boxWidth: 520, boxHeight: 80,
    });
    expect(crop.height).toBeGreaterThan(220);
    expect(crop.width).toBeLessThan(580);
    expect(crop.left).toBeGreaterThanOrEqual(0);
    expect(crop.top).toBeLessThanOrEqual(300);
  });

  it('çok küçük Vision kutusunda da en az gazete yüksekliğinin yüzde 7.5 kadar bağlam alır', () => {
    const crop = computeNewspaperEvidenceCrop({
      imageWidth: 1000, imageHeight: 1600, boxLeft: 700, boxTop: 900, boxWidth: 220, boxHeight: 24,
    });
    expect(crop.height).toBeGreaterThanOrEqual(120);
  });

  it('sayfa altına taşmaz', () => {
    const crop = computeNewspaperEvidenceCrop({
      imageWidth: 1000, imageHeight: 1600, boxLeft: 100, boxTop: 1540, boxWidth: 400, boxHeight: 80,
    });
    expect(crop.top + crop.height).toBeLessThanOrEqual(1600);
  });
});
