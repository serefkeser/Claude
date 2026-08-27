import { describe, expect, it } from 'vitest';
import {
  applyVerifiedNewspaperText,
  computeNewspaperVerificationCrop,
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
  it('Vision-2 başlığı Vision-1 ile birebir uyuşmuyorsa düzeltme diye yayınlamaz', () => {
    const verified = applyVerifiedNewspaperText(discovered, [
      {
        sourceHeadlineId: 'H1',
        baslik: "FİBA'DA TUR GECESİ",
        aciklama: 'Fenerbahçe Avrupa kupalarında tur için sahaya çıkıyor. Temsilcimiz avantajlı skor arıyor.',
      },
      {
        sourceHeadlineId: 'H2',
        baslik: 'Banka takipte üretici dertli',
        aciklama: 'Üreticiler kredi faizlerini ödemekte zorlanıyor. Bankaların takibi artıyor.',
      },
    ]);

    expect(verified).toHaveLength(1);
    expect(verified[0].id).toBe('H2');
    expect(JSON.stringify(verified)).not.toContain("FİBA'DA TUR GECESİ");
  });

  it('videoda görülen promosyon yeniden-yazımını mutabakat kapısında reddeder', () => {
    const result = reconcileVerifiedNewspaperText([
      {
        id: 'H1', text: 'EMEKLİLERE YÜKSEK PROMOSYON FORMÜLÜ',
        detail: 'Bankalar emekliler için yeni promosyon formüllerini değerlendiriyor.',
        confidence: 100, score: 100, x: 5, y: 5, w: 25, h: 10,
      },
    ], [{
      sourceHeadlineId: 'H1',
      baslik: 'EMEKLİLERE PROMOSYON FIRSATI',
      aciklama: 'Bankalar emekliler için yeni promosyon formüllerini değerlendiriyor.',
    }]);

    expect(result.candidates).toEqual([]);
    expect(result.rejections[0].reason).toContain('birebir uyuşmuyor');
  });

  it('yerel OCR başlığı destekliyorsa Vision metnini değiştirmeden geçirir', () => {
    expect(hasLocalOcrHeadlineSupport(
      "AVRUPA'DA TUR GECESİ",
      "Avrupa'da tur gecesi\nFenerbahçe bu akşam sahaya çıkacak",
    )).toBe(true);
    expect(hasLocalOcrHeadlineSupport(
      "FİBA'DA TUR GECESİ",
      "Avrupa'da tur gecesi\nFenerbahçe bu akşam sahaya çıkacak",
    )).toBe(false);
    expect(hasLocalOcrHeadlineSupport(
      "DENİZOĞLU'NUN ÖLÜMÜNDE CİNAYET",
      "Denizoğlu'nun ölümünde cinayet izi\nsoruşturması sürüyor",
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
    expect(crop.height).toBeGreaterThan(2400 * 0.12 - 2);
  });
});
