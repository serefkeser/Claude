import { describe, expect, it } from 'vitest';
import { buildNewspaperNarration } from './newspaperCopy';
import { buildLockedNewspaperScript, type NewspaperScriptContract, type VerifiedNewspaperCandidate } from './newspaperPipeline';

function story(id: string, text: string, detail: string, score: number): VerifiedNewspaperCandidate {
  return { id, text, detail, confidence: 100, score, x: 10, y: 10, w: 500, h: 100 };
}

const cumhuriyetFrontPage: VerifiedNewspaperCandidate[] = [
  story(
    'H1',
    'TARİHİN AKIŞI DEĞİŞTİ',
    'Büyük Atatürk’ün başkomutanlığında Türk ordusu, Sakarya Zaferi’nin ardından 11 aylık hazırlıkla 26 Ağustos 1922’de Büyük Taarruz’a başladı.',
    9000,
  ),
  story(
    'H2',
    'HSK nerede?',
    'Yeni Parti lideri Özgür Özel, Aziz İhsan Aktaş davasında örgüt suçlaması nedeniyle sanıklara zulüm yapıldığını belirtti.',
    8000,
  ),
  story(
    'H3',
    'İran’a yeni kuşatma',
    'ABD, İran’ın dijital varlıklar, teknoloji, altın, havacılık ve deniz taşımacılığı sektörlerini hedef alan yaptırımları açıkladı.',
    7000,
  ),
  story(
    'H4',
    'ADD’den manifesto',
    'Atatürkçü Düşünce Derneği, üç devlet, laiklik, Cumhuriyet ve tam bağımsızlık manifestosu yayımladı.',
    6000,
  ),
  story(
    'H5',
    'Gaziler: Direncimizi KIRAMAZLAR!',
    'Özlük hakları için 45 gündür eylem yapan er gaziler ve şehit er yakınları, Milli Savunma Bakanlığı’na gitti.',
    5000,
  ),
  story(
    'H6',
    'Sendikalar dava açtı',
    'Çalışma ve Sosyal Güvenlik Bakanlığı, belediye şirketleri bünyesinde toplu taşıma işlerinde çalışan işçilerin genel işler işkolundan ayrıştırıldığını açıkladı.',
    4000,
  ),
  story(
    'H7',
    'Kadın katliamı hız kesmiyor',
    'Son 24 saatte iki kadın şüpheli şekilde ölü bulundu, bir kadın ise ağır yaralandı.',
    3000,
  ),
];

function script(): NewspaperScriptContract {
  return {
    sourceName: 'Cumhuriyet',
    thumbnailText: 'Tarihin akışı değişti',
    videoSlides: [],
  };
}

describe('Cumhuriyet gerçek ön sayfa regresyonu', () => {
  it('Vision’dan temiz gelen gerçek başlık+açıklamaları OCR filtresinde kaybetmeden sahneye alır', () => {
    const result = buildLockedNewspaperScript({
      script: script(),
      candidates: cumhuriyetFrontPage,
      configuredSourceName: 'Cumhuriyet',
    });

    expect(result.videoSlides).toHaveLength(7);
    expect(result.videoSlides.map(slide => slide.sourceHeadline)).toEqual(cumhuriyetFrontPage.map(item => item.text));
    expect(JSON.stringify(result)).not.toContain('SÜYÜK');
    expect(JSON.stringify(result)).not.toContain('MN aylık');
    expect(result.videoSlides[0].spokenText).toContain('11 aylık hazırlıkla 26 Ağustos 1922');
    expect(result.videoSlides[0].imagePrompts).toEqual([]);
    expect(result.videoSlides.every(slide => slide.topText === slide.sourceHeadline)).toBe(true);
  });

  it('her haberi yalnız bir kez, kendi doğrulanmış açıklamasından üretilen TTS metniyle okur', () => {
    const result = buildLockedNewspaperScript({ script: script(), candidates: cumhuriyetFrontPage });
    const ids = result.videoSlides.map(slide => slide.sourceHeadlineId);
    expect(new Set(ids).size).toBe(ids.length);
    result.videoSlides.forEach((slide, index) => {
      const candidate = cumhuriyetFrontPage[index];
      expect(slide.spokenText).toBe(buildNewspaperNarration({
        sourceName: 'Cumhuriyet',
        headline: candidate.text,
        detail: candidate.detail,
      }));
    });
  });
});
