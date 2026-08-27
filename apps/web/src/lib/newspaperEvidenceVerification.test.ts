import { describe, expect, it } from 'vitest';
import {
  applyVerifiedNewspaperText,
  computeNewspaperVerificationCrop,
  hasLocalOcrDetailSupport,
  hasLocalOcrHeadlineSupport,
  reconcileVerifiedNewspaperText,
} from './newspaperEvidenceVerification';

const discovered = [
  {
    id: 'H1',
    text: "AVRUPA'DA TUR GECESİ",
    detail: 'Fenerbahçe Avrupa kupalarında tur için sahaya çıkıyor. Temsilcimiz avantajlı skor arıyor.',
    confidence: 100,
    score: 100,
    x: 35,
    y: 8,
    w: 28,
    h: 10,
  },
  {
    id: 'H2',
    text: 'Banka takipte üretici dertli',
    detail: 'Üreticiler kredi faizlerini ödemekte zorlanıyor. Bankaların takibi artıyor.',
    confidence: 100,
    score: 90,
    x: 34,
    y: 60,
    w: 30,
    h: 14,
  },
];

describe('newspaper evidence verification', () => {
  it('Vision-1 yalnız konum keşfidir; Vision-2 başlığı aynı kırpım OCR kanıtı destekliyorsa yayın adayı olur', () => {
    const consensus = reconcileVerifiedNewspaperText(discovered, [
      {
        sourceHeadlineId: 'H1',
        baslik: "AVRUPA'DA TUR GECESİ",
        aciklama: 'Fenerbahçe Avrupa kupalarında tur için sahaya çıkıyor. Temsilcimiz avantajlı skor arıyor.',
      },
      {
        sourceHeadlineId: 'H2',
        baslik: 'Banka takipte üretici dertli',
        aciklama: 'Üreticiler kredi faizlerini ödemekte zorlanıyor. Bankaların takibi artıyor.',
      },
    ], new Map([
      ['H1', "Avrupa'da tur gecesi\nFenerbahçe Avrupa kupalarında tur için sahaya çıkıyor.\nTemsilcimiz avantajlı skor arıyor."],
      ['H2', 'Banka takipte üretici dertli\nÜreticiler kredi faizlerini ödemekte zorlanıyor.\nBankaların takibi artıyor.'],
    ]));

    expect(consensus.candidates).toHaveLength(2);
    expect(consensus.rejections).toEqual([]);
  });

  it('Vision-2 yanlış başlığı aynı kırpım OCR kanıtı desteklemiyorsa reddeder', () => {
    const result = reconcileVerifiedNewspaperText([discovered[0]], [{
      sourceHeadlineId: 'H1',
      baslik: "FİBA'DA TUR GECESİ",
      aciklama: 'Fenerbahçe Avrupa kupalarında tur için sahaya çıkıyor. Temsilcimiz avantajlı skor arıyor.',
    }], new Map([
      ['H1', "Avrupa'da tur gecesi\nFenerbahçe Avrupa kupalarında tur için sahaya çıkıyor.\nTemsilcimiz avantajlı skor arıyor."],
    ]));

    expect(result.candidates).toEqual([]);
    expect(result.rejections[0].reason).toContain('başlığını yeterince desteklemiyor');
  });

  it('Vision-2 açıklaması OCR kanıtıyla uyuşmuyorsa doğru başlığa rağmen reddeder', () => {
    const result = reconcileVerifiedNewspaperText([discovered[0]], [{
      sourceHeadlineId: 'H1',
      baslik: "AVRUPA'DA TUR GECESİ",
      aciklama: 'Bambaşka bir haberin açıklaması bu karta yanlışlıkla taşındı ve burada yer almıyor.',
    }], new Map([
      ['H1', "Avrupa'da tur gecesi\nFenerbahçe Avrupa kupalarında tur için sahaya çıkıyor.\nTemsilcimiz avantajlı skor arıyor."],
    ]));

    expect(result.candidates).toEqual([]);
    expect(result.rejections[0].reason).toContain('açıklamasını yeterince desteklemiyor');
  });

  it('yerel OCR başlığı ve açıklamayı ayrı ayrı destekler', () => {
    const evidence = "Avrupa'da tur gecesi\nFenerbahçe Avrupa kupalarında tur için sahaya çıkıyor.\nTemsilcimiz avantajlı skor arıyor.";
    expect(hasLocalOcrHeadlineSupport("AVRUPA'DA TUR GECESİ", evidence)).toBe(true);
    expect(hasLocalOcrHeadlineSupport("FİBA'DA TUR GECESİ", evidence)).toBe(false);
    expect(hasLocalOcrDetailSupport(
      'Fenerbahçe Avrupa kupalarında tur için sahaya çıkıyor. Temsilcimiz avantajlı skor arıyor.',
      evidence,
    )).toBe(true);
    expect(hasLocalOcrDetailSupport(
      'Başka bir haberin açıklaması burada yer almıyor ve doğrulanmamalı.',
      evidence,
    )).toBe(false);
  });

  it('H kimliği olmayan veya açıklaması olmayan ikinci okuma sonucunu yayın adayı yapmaz', () => {
    const verified = applyVerifiedNewspaperText(discovered, [
      { sourceHeadlineId: 'H1', baslik: "AVRUPA'DA TUR GECESİ", aciklama: '' },
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
    expect(crop.height).toBeGreaterThan(2400 * 0.16 - 2);
  });
});
