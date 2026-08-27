import { describe, expect, it } from 'vitest';
import {
  applyVerifiedNewspaperText,
  computeNewspaperVerificationCrop,
} from './newspaperEvidenceVerification';

const discovered = [
  {
    id: 'H1',
    text: 'Aşın saçılar öfkeyi çaldı',
    detail: 'Yanlış komşu haber metni.',
    confidence: 100,
    score: 100,
    x: 68,
    y: 20,
    w: 27,
    h: 12,
  },
  {
    id: 'H2',
    text: 'Banka takipte üretici dertli',
    detail: 'İlk okuma detayı.',
    confidence: 100,
    score: 90,
    x: 34,
    y: 60,
    w: 30,
    h: 14,
  },
];

describe('newspaper evidence verification', () => {
  it('başlık ve açıklamayı yalnız aynı H kimliğinin ikinci Vision okumasından değiştirir', () => {
    const verified = applyVerifiedNewspaperText(discovered, [
      {
        sourceHeadlineId: 'H1',
        baslik: 'Aşırı sağcılar öfkeyi çaldı',
        aciklama: 'Meloni’nin aşırı sağcı hükümeti var olmayan bir gerçeklik inşa ediyor.',
      },
      {
        sourceHeadlineId: 'H2',
        baslik: 'Banka takipte üretici dertli',
        aciklama: 'Üreticiler kredi faizlerini ödemekte zorlanıyor.',
      },
    ]);

    expect(verified[0].text).toBe('Aşırı sağcılar öfkeyi çaldı');
    expect(verified[0].detail).not.toContain('komşu');
    expect(verified[0].x).toBe(68);
    expect(verified[1].text).toBe('Banka takipte üretici dertli');
  });

  it('H kimliği olmayan veya açıklaması olmayan ikinci okuma sonucunu yayın adayı yapmaz', () => {
    const verified = applyVerifiedNewspaperText(discovered, [
      { sourceHeadlineId: 'H1', baslik: 'Aşırı sağcılar öfkeyi çaldı', aciklama: '' },
      { sourceHeadlineId: 'H9', baslik: 'Başka haber', aciklama: 'Başka açıklama.' },
    ]);

    expect(verified).toEqual([]);
  });

  it('kanıt kırpımını sayfa sınırları içinde ve açıklama bağlamını kapsayacak yükseklikte tutar', () => {
    const crop = computeNewspaperVerificationCrop({
      imageWidth: 1600,
      imageHeight: 2400,
      candidate: discovered[0],
    });

    expect(crop.left).toBeGreaterThanOrEqual(0);
    expect(crop.top).toBeGreaterThanOrEqual(0);
    expect(crop.left + crop.width).toBeLessThanOrEqual(1600);
    expect(crop.top + crop.height).toBeLessThanOrEqual(2400);
    expect(crop.height).toBeGreaterThan(2400 * 0.12 - 2);
  });
});
