import { describe, expect, it } from 'vitest';
import type { VerifiedNewspaperCandidate } from './newspaperPipeline';
import {
  recoverNewspaperCandidatesFromVision,
  type VisionNewspaperCandidate,
} from './newspaperVisionRecovery';

const fullOcrText = `OCR_HEADLINE_CANDIDATES (kimlikler ve sıralama sabittir):
H1|score=9000|confidence=94|x=10|y=20|w=800|h=120|text=Devlet ibadet dayatamaz|detail=Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.

OCR TAM METİN:
Devlet ibadet DAYATAMAZ
Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.
Baskın seçim planı
Ortak liste için yeni kurallar getirilmesi beklendiği belirtildi.
Transferle kazanamazsın
Belediyelerin rekabetle kazanılır transferle seçim kazanılmaz dedi.
Tarihin yönü Sakarya'da değişti
Mustafa Kemal hattı müdafaa yoktur sathı müdafaa vardır emrini yayımladı.
Netanyahu Türkleri kışkırtmaya çalışıyor
Barrack saldırı Türkiye'yi kışkırtma veya seçim hamlesiydi dedi.
Fenerbahçe 4-2 ile gol oldu yağdı
Sarı lacivertli ekip karşılaşmada dört golle galip geldi.`;

const visionCandidates: VisionNewspaperCandidate[] = [
  {
    sourceHeadlineId: 'V1', baslik: 'Devlet ibadet dayatamaz',
    aciklama: 'Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',
    onem: 100, x: 20, y: 10, w: 75, h: 25,
    localCropEvidence: 'Devlet ibadet DAYATAMAZ Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',
  },
  {
    sourceHeadlineId: 'V2', baslik: 'Baskın seçim planı',
    aciklama: 'Ortak liste için yeni kurallar getirilmesi beklendiği belirtildi.',
    onem: 90, x: 25, y: 40, w: 70, h: 20,
    localCropEvidence: 'Baskın seçim planı Ortak liste için yeni kurallar getirilmesi beklendiği belirtildi.',
  },
  {
    sourceHeadlineId: 'V3', baslik: 'Transferle kazanamazsın',
    aciklama: 'Belediyelerin rekabetle kazanılır transferle seçim kazanılmaz dedi.',
    onem: 80, x: 25, y: 60, w: 60, h: 15,
    localCropEvidence: 'Transferle kazanamazsın Belediyelerin rekabetle kazanılır transferle seçim kazanılmaz dedi.',
  },
  {
    sourceHeadlineId: 'V4', baslik: "Tarihin yönü Sakarya'da değişti",
    aciklama: 'Mustafa Kemal hattı müdafaa yoktur sathı müdafaa vardır emrini yayımladı.',
    onem: 70, x: 0, y: 20, w: 24, h: 20,
    localCropEvidence: "Tarihin yönü Sakarya'da değişti Mustafa Kemal hattı müdafaa yoktur sathı müdafaa vardır emrini yayımladı.",
  },
  {
    sourceHeadlineId: 'V5', baslik: 'Netanyahu Türkleri kışkırtmaya çalışıyor',
    aciklama: "Barrack saldırı Türkiye'yi kışkırtma veya seçim hamlesiydi dedi.",
    onem: 60, x: 0, y: 70, w: 24, h: 16,
    localCropEvidence: "Netanyahu Türkleri kışkırtmaya çalışıyor Barrack saldırı Türkiye'yi kışkırtma veya seçim hamlesiydi dedi.",
  },
];

function localCandidate(): VerifiedNewspaperCandidate {
  return {
    id: 'H1', text: 'Devlet ibadet dayatamaz',
    detail: 'Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',
    confidence: 94, score: 9000, x: 10, y: 20, w: 800, h: 120,
  };
}

describe('newspaper full-vision recovery', () => {
  it('yerel OCR tek haber bulsa da tam görsel önerilerini OCR metniyle çapraz doğrulayıp beşe tamamlar', () => {
    const result = recoverNewspaperCandidatesFromVision({
      localCandidates: [localCandidate()],
      visionCandidates,
      localOcrText: fullOcrText,
      maximumStories: 9,
    });

    expect(result.candidates).toHaveLength(5);
    expect(result.recoveredCount).toBe(4);
    expect(result.candidates.map(candidate => candidate.id)).toEqual(['H1', 'H2', 'H3', 'H4', 'H5']);
    expect(result.candidates.map(candidate => candidate.text)).toEqual(visionCandidates.map(candidate => candidate.baslik));
    expect(result.candidates[0]).toMatchObject(localCandidate());
  });

  it('görsel modelin değiştirdiği skoru yerel OCR kanıtıyla uyuşmadığı için reddeder', () => {
    const result = recoverNewspaperCandidatesFromVision({
      localCandidates: [],
      visionCandidates: [{
        sourceHeadlineId: 'V1',
        baslik: 'Fenerbahçe 4-1 ile gol oldu yağdı',
        aciklama: 'Sarı lacivertli ekip karşılaşmada dört golle galip geldi.',
        onem: 90,
      }],
      localOcrText: fullOcrText,
      maximumStories: 9,
    });

    expect(result.candidates).toHaveLength(0);
    expect(result.rejected[0]?.reason).toBe('aynı haber kutusundan bağımsız OCR kanıtı yok');
  });

  it('OCR metninde bulunmayan AI özetini veya uydurma açıklamayı sahneye almaz', () => {
    const result = recoverNewspaperCandidatesFromVision({
      localCandidates: [],
      visionCandidates: [{
        sourceHeadlineId: 'V1',
        baslik: 'Baskın seçim planı',
        aciklama: 'Muhalefet erken seçim için kesin olarak anlaşmaya vardı.',
        onem: 90,
      }],
      localOcrText: fullOcrText,
      maximumStories: 9,
    });

    expect(result.candidates).toHaveLength(0);
    expect(result.rejected[0]?.reason).toBe('aynı haber kutusundan bağımsız OCR kanıtı yok');
  });

  it('aynı haberi yerel OCR ve görsel analizden iki kez eklemez; doğrulanmış temiz görsel metnini kullanır', () => {
    const local = localCandidate();
    const result = recoverNewspaperCandidatesFromVision({
      localCandidates: [local],
      visionCandidates: [visionCandidates[0], visionCandidates[0]],
      localOcrText: fullOcrText,
      maximumStories: 9,
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.recoveredCount).toBe(0);
    expect(result.candidates[0]).toMatchObject({
      text: visionCandidates[0].baslik,
      detail: visionCandidates[0].aciklama,
      confidence: 94,
    });
  });

  it('görsel okuma OCR yazım hatasını düzeltir ama sayısal olguyu değiştiremez', () => {
    const local: VerifiedNewspaperCandidate = {
      id: 'H1',
      text: 'Tarihin akışı değişti',
      detail: "SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.",
      confidence: 88, score: 12000, x: 10, y: 20, w: 900, h: 140,
    };
    const cleanProposal: VisionNewspaperCandidate = {
      baslik: 'Tarihin akışı değişti',
      aciklama: "Büyük Atatürk'ün ardından 11 aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.",
      onem: 100,
      localCropEvidence: "Tarihin akışı değişti Büyük Atatürk'ün ardından 11 aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.",
    };
    const corrected = recoverNewspaperCandidatesFromVision({
      localCandidates: [local],
      visionCandidates: [cleanProposal],
      localOcrText: "OCR TAM METİN: Tarihin akışı değişti SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.",
      maximumStories: 9,
    });
    expect(corrected.candidates[0].detail).toBe(cleanProposal.aciklama);

    const wrongNumber = recoverNewspaperCandidatesFromVision({
      localCandidates: [local],
      visionCandidates: [{ ...cleanProposal, aciklama: "Büyük Atatürk'ün ardından 12 aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı." }],
      localOcrText: "OCR TAM METİN: Tarihin akışı değişti SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.",
      maximumStories: 9,
    });
    expect(wrongNumber.candidates).toHaveLength(0);
  });

  it('anlamı benzer olsa bile gazetedeki cümleyi yeniden yazan AI açıklamasını reddeder', () => {
    const local = localCandidate();
    const result = recoverNewspaperCandidatesFromVision({
      localCandidates: [local],
      visionCandidates: [{
        baslik: 'Devlet ibadet dayatamaz',
        aciklama: 'Danıştay yöneticilerin uygulamasının zorlayıcı sonuç doğurabileceğini açıkladı.',
        localCropEvidence: 'Devlet ibadet DAYATAMAZ Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',
      }],
      localOcrText: fullOcrText,
      maximumStories: 9,
    });
    expect(result.candidates).toHaveLength(0);
  });

  it('Cumhuriyet örneğindeki SÜYÜK ve MN aylık gibi ham OCR bozulmalarını asla seslendirme adayına sokmaz', () => {
    const result = recoverNewspaperCandidatesFromVision({
      localCandidates: [{
        id: 'H1',
        text: 'Tarihin akışı değişti',
        detail: "SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.",
        confidence: 88, score: 12000, x: 10, y: 20, w: 900, h: 140,
      }],
      visionCandidates: [{
        baslik: 'Tarihin akışı değişti',
        aciklama: "Büyük Atatürk'ün başkomutanlığında Türk ordusu, Sakarya Zaferi'nin ardından 11 aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başladı.",
        localCropEvidence: "Tarihin akışı değişti SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.",
      }],
      localOcrText: "OCR TAM METİN: Tarihin akışı değişti SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.",
      maximumStories: 9,
    });
    expect(result.candidates).toHaveLength(0);
  });

  it('Vision ile eşleşmeyen ham yerel OCR adayını fallback olarak geri eklemez', () => {
    const result = recoverNewspaperCandidatesFromVision({
      localCandidates: [{
        id: 'H1', text: 'Tarihin akışı değişti',
        detail: "SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.",
        confidence: 88, score: 12000, x: 10, y: 20, w: 900, h: 140,
      }],
      visionCandidates: [],
      localOcrText: "OCR TAM METİN: Tarihin akışı değişti SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.",
      maximumStories: 9,
    });
    expect(result.candidates).toHaveLength(0);
  });

  it('aynı haber kutusundan yakın OCR yoksa AI metniyle kelime düzeltmez', () => {
    const result = recoverNewspaperCandidatesFromVision({
      localCandidates: [localCandidate()],
      visionCandidates: [{
        baslik: 'Devlet ibadet dayatamaz',
        aciklama: 'Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',
      }],
      localOcrText: fullOcrText,
      maximumStories: 9,
    });
    expect(result.candidates).toHaveLength(0);
  });

  it('tam sayfa OCR sütunu parçalasa bile aynı haber kutusunun yerel yakın okumasıyla doğrular', () => {
    const result = recoverNewspaperCandidatesFromVision({
      localCandidates: [],
      visionCandidates: [{
        sourceHeadlineId: 'V1',
        baslik: 'Devlet ibadet dayatamaz',
        aciklama: 'Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',
        onem: 100,
        localCropEvidence: 'Devlet ibadet DAYATAMAZ Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',
      }],
      localOcrText: 'OCR TAM METİN: Devlet ibadet DAYATAMAZ nıştay in yön eliyle yapı in zor ıcı olacaj belirtildi.',
      maximumStories: 9,
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.recoveredCount).toBe(1);
  });
});
