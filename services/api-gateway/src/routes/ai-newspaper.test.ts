import { describe, expect, it } from 'vitest';
import { normalizeNewspaperScript, normalizeNewspaperVerificationScript } from './ai';

describe('AI newspaper compact second-pass verification', () => {
  it('yalnız H kimliği + başlık + açıklama gelen sonucu sahne sözleşmesi için güvenli varsayımlarla tamamlar', () => {
    const normalized = normalizeNewspaperVerificationScript({
      gazeteBasliklari: Array.from({ length: 5 }, (_, index) => ({
        sourceHeadlineId: `H${index + 1}`,
        baslik: `Birebir başlık ${index + 1}`,
        aciklama: `Birebir açıklama ${index + 1}.`,
      })),
    });

    expect(normalized.isContentUnreadable).toBe(false);
    expect(normalized.gazeteBasliklari).toHaveLength(5);
    expect(normalized.gazeteBasliklari[0]).toEqual(expect.objectContaining({
      sourceHeadlineId: 'H1',
      baslik: 'Birebir başlık 1',
      aciklama: 'Birebir açıklama 1.',
      onem: 100,
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    }));
  });
});

describe('AI newspaper normalization — Hermes 10 Vision-first', () => {
  it('yerel OCR bozuk olsa bile tam görseldeki 5+ haber başlıklarını ana kaynak olarak korur', () => {
    const visionHeadlines = Array.from({ length: 6 }, (_, index) => ({
      sourceHeadlineId: `V${index + 1}`,
      baslik: `Gerçek gazete başlığı ${index + 1}`,
      aciklama: `Gazete görselinde bu başlığa bağlı doğru açıklama cümlesi ${index + 1}.`,
      onem: 100 - index,
      x: index * 5, y: index * 10, w: 40, h: 10,
    }));
    const normalized = normalizeNewspaperScript({
      videoSlides: [],
      gazeteBasliklari: visionHeadlines,
    }, [{
      id: 'H1', text: 'SÜYÜK MN AYLIK', detail: 'bozuk ocr cümlesi',
      confidence: 95, score: 9000, x: 1, y: 2, w: 300, h: 80,
    }]);

    expect(normalized.gazeteBasliklari).toHaveLength(6);
    expect(normalized.visionGazeteBasliklari).toEqual(visionHeadlines);
    expect(normalized.videoSlides).toHaveLength(6);
    expect(normalized.videoSlides[0].sourceHeadline).toBe('Gerçek gazete başlığı 1');
    expect(normalized.videoSlides[0].spokenText).toContain('doğru açıklama cümlesi 1');
    expect(JSON.stringify(normalized)).not.toContain('SÜYÜK');
    expect(JSON.stringify(normalized)).not.toContain('MN AYLIK');
  });

  it('her görsel haberini tek sahneye başlık + açıklama sırasıyla dönüştürür ve AI görseli istemez', () => {
    const visionHeadlines = Array.from({ length: 5 }, (_, index) => ({
      sourceHeadlineId: `V${index + 1}`,
      baslik: `Bağımsız haber başlığı ${index + 1}`,
      aciklama: `Bağlı haber açıklaması burada tamamlandı ${index + 1}.`,
      onem: 100 - index,
      x: 0, y: index * 10, w: 50, h: 10,
    }));
    const normalized = normalizeNewspaperScript({
      videoSlides: [{ topText: 'AI TASLAĞI', spokenText: 'AI tarafından değiştirilmiş metin', imagePrompts: ['fake'] }],
      gazeteBasliklari: visionHeadlines,
    }, []);

    expect(normalized.videoSlides).toHaveLength(5);
    normalized.videoSlides.forEach((slide, index) => {
      expect(slide.sourceHeadlineId).toBe(`H${index + 1}`);
      expect(slide.sourceHeadline).toBe(visionHeadlines[index].baslik);
      expect(slide.topText).toBe(visionHeadlines[index].baslik);
      expect(slide.spokenText).toBe(`${visionHeadlines[index].baslik}. ${visionHeadlines[index].aciklama}`);
      expect(slide.imagePrompts).toEqual([]);
    });
  });

  it('beşten az okunabilir Vision haberi varsa eksik video üretilebilir saymaz', () => {
    const visionHeadlines = Array.from({ length: 4 }, (_, index) => ({
      baslik: `Başlık ${index + 1}`,
      aciklama: `Tam açıklama cümlesi ${index + 1}.`,
      onem: 100 - index,
      x: 0, y: index * 10, w: 50, h: 10,
    }));
    const normalized = normalizeNewspaperScript({
      videoSlides: [],
      gazeteBasliklari: visionHeadlines,
    }, []);

    expect(normalized.isContentUnreadable).toBe(true);
    expect(normalized.gazeteBasliklari).toHaveLength(4);
  });
});
