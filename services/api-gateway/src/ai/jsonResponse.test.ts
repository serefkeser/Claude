import { describe, expect, it } from 'vitest';
import { parseAiJsonObject, validateHermesNewspaperResponse, validateHermesScriptResponse } from './jsonResponse';

describe('AI JSON response parser', () => {
  it('Markdown ve think metni içindeki dengeli JSON nesnesini çıkarır', () => {
    const result = parseAiJsonObject(`<think>uzun analiz {geçersiz}</think>
      İşte sonuç:
      \`\`\`json
      {"videoSlides":[{"topText":"GÜNDEM","spokenText":"Haber hazır.","imagePrompts":[]}],"sonSoz":"Söz."}
      \`\`\`
      Ek açıklama.`);
    expect(result.videoSlides).toHaveLength(1);
    expect(result.sonSoz).toBe('Söz.');
  });

  it('birden fazla JSON bloğunda tam video senaryosunu seçer', () => {
    const result = parseAiJsonObject(`{"status":"ok"}
      {"videoSlides":[{"topText":"SONUÇ","spokenText":"Gerçek sonuç.","imagePrompts":[]}],"thumbnailText":"MANŞET"}`);
    expect(result.thumbnailText).toBe('MANŞET');
  });

  it('string içeriğini bozmadan sondaki virgülleri temizler', () => {
    const result = parseAiJsonObject('{"videoSlides":[{"topText":"A,}","spokenText":"Haber.","imagePrompts":[],},],}');
    expect((result.videoSlides as Array<{ topText: string }>)[0].topText).toBe('A,}');
  });

  it('videoSlides içermeyen nesneyi geçerli Hermes yanıtı saymaz', () => {
    expect(() => validateHermesScriptResponse('{"message":"tamam"}')).toThrow('videoSlides');
  });

  it('yarıda kesilmiş dış JSON içindeki tamamlanmış sahneleri kurtarır', () => {
    const result = parseAiJsonObject(`{"isContentUnreadable":false,"videoSlides":[
      {"topText":"BİRİNCİ HABER","spokenText":"Birinci haber doğrulandı.","imagePrompts":[]},
      {"topText":"İKİNCİ HABER","spokenText":"İkinci haber doğrulandı.","imagePrompts":[]},
      {"topText":"YARIM","spokenText":"Yanıt burada kesildi`);
    expect(result.videoSlides).toHaveLength(2);
    expect((result.videoSlides as Array<{ topText: string }>)[1].topText).toBe('İKİNCİ HABER');
  });

  it('OpenRouter yarıda kesse bile tamamlanmış 5 gazete haberini kurtarır', () => {
    const headlines = Array.from({ length: 5 }, (_, index) => ({
      sourceHeadlineId: `V${index + 1}`,
      baslik: `Gerçek gazete başlığı ${index + 1}`,
      aciklama: `Gazetede basılı tam açıklama ${index + 1}.`,
      onem: 100 - index,
      x: 5,
      y: index * 12,
      w: 45,
      h: 10,
    }));
    const truncated = `{"isContentUnreadable":false,"videoSlides":[],"thumbnailText":"GÜNDEM","sourceName":"Cumhuriyet","gazeteBasliklari":[${headlines.map(item => JSON.stringify(item)).join(',')}, {"baslik":"YARIM`;

    const result = parseAiJsonObject(truncated);

    expect(result.gazeteBasliklari).toHaveLength(5);
    expect((result.gazeteBasliklari as Array<{ baslik: string }>)[4].baslik).toBe('Gerçek gazete başlığı 5');
    expect(() => validateHermesNewspaperResponse(truncated)).not.toThrow();
  });

  it('model doğrudan gazete haber dizisi döndürürse güvenli biçimde sarar', () => {
    const response = JSON.stringify(Array.from({ length: 5 }, (_, index) => ({
      baslik: `Başlık ${index + 1}`,
      aciklama: `Basılı açıklama ${index + 1}.`,
      onem: 100 - index,
      x: 1,
      y: index * 10,
      w: 40,
      h: 8,
    })));

    const result = parseAiJsonObject(response);
    expect(result.gazeteBasliklari).toHaveLength(5);
    expect(() => validateHermesNewspaperResponse(response)).not.toThrow();
  });

  it('headlines zarfındaki gerçek gazete dizisini kabul eder', () => {
    const response = JSON.stringify({
      sourceName: 'Cumhuriyet',
      headlines: Array.from({ length: 5 }, (_, index) => ({
        baslik: `Gazete haberi ${index + 1}`,
        aciklama: `Gazetede görülen açıklama ${index + 1}.`,
      })),
    });

    const result = parseAiJsonObject(response);
    expect(result.sourceName).toBe('Cumhuriyet');
    expect(result.gazeteBasliklari).toHaveLength(5);
  });

  it('başlığı var ama açıklaması olmayan ham diziyi geçerli gazete yanıtı saymaz', () => {
    const response = JSON.stringify(Array.from({ length: 5 }, (_, index) => ({ baslik: `Eksik ${index + 1}` })));
    expect(() => validateHermesNewspaperResponse(response)).toThrow('5 yeni tam-görsel haber bölgesi');
  });

  it('gazete yanıtında en az 5 farklı kaynak başlığı ister', () => {
    const repeatedStory = JSON.stringify({
      videoSlides: Array.from({ length: 6 }, (_, index) => ({
        sourceHeadline: 'Kuzey Ormanları demir yolu projesi',
        topText: `AÇI ${index + 1}`,
        spokenText: 'Aynı haber farklı açıdan anlatılıyor.',
        imagePrompts: [],
      })),
      gazeteBasliklari: [{ baslik: 'Kuzey Ormanları demir yolu projesi' }],
    });
    expect(() => validateHermesNewspaperResponse(repeatedStory)).toThrow('5 yeni tam-görsel haber bölgesi');
  });

  it('birbirinden farklı 5 gazete haberini kabul eder', () => {
    const headlines = ['Adli yargıda alarm', 'Yarımız borçlu', 'Ağaç kesimi', 'Dolum tesisi patladı', 'Transfer mutabakatı'];
    const response = JSON.stringify({
      videoSlides: headlines.map(sourceHeadline => ({ sourceHeadline, topText: sourceHeadline, spokenText: `${sourceHeadline}.`, imagePrompts: [] })),
      gazeteBasliklari: headlines.map((baslik, index) => ({ baslik, aciklama: 'Açıklama', onem: 100 - index * 10, x: 0, y: 0, w: 1, h: 1 })),
    });
    expect(() => validateHermesNewspaperResponse(response)).not.toThrow();
  });

  it('beş yerel OCR haberi varsa AI sahne eşleştirmesini zorunlu tutmaz', () => {
    const ids = ['H1', 'H2', 'H3', 'H4', 'H5'];
    const response = JSON.stringify({
      videoSlides: [{ topText: 'GAZETE', spokenText: 'Gazete görüntüsü incelendi.', imagePrompts: [] }],
      gazeteBasliklari: [],
    });
    expect(() => validateHermesNewspaperResponse(response, ids)).not.toThrow();
  });

  it('kesin OCR yalnız üç haber doğrularsa tam görselden iki ayrı haber bölgesi daha ister', () => {
    const ids = ['H1', 'H2', 'H3'];
    const response = JSON.stringify({
      videoSlides: [{ topText: 'GAZETE', spokenText: 'Gazete görüntüsü incelendi.', imagePrompts: [] }],
      gazeteBasliklari: ids.map(sourceHeadlineId => ({ sourceHeadlineId, baslik: sourceHeadlineId, aciklama: '' })),
    });
    expect(() => validateHermesNewspaperResponse(response, ids)).toThrow('2 yeni tam-görsel haber bölgesi');
  });

  it('üç yerel OCR haberi ile iki tam-görsel haber bölgesini birlikte kabul eder', () => {
    const ids = ['H1', 'H2', 'H3'];
    const combinedIds = [...ids, 'V1', 'V2'];
    const response = JSON.stringify({
      videoSlides: [{ topText: 'GAZETE', spokenText: 'Gazete görüntüsü incelendi.', imagePrompts: [] }],
      gazeteBasliklari: combinedIds.map(sourceHeadlineId => ({
        sourceHeadlineId,
        baslik: `${sourceHeadlineId} bağımsız haber`,
        aciklama: 'Görselde basılı açıklama.',
      })),
    });
    expect(() => validateHermesNewspaperResponse(response, ids)).not.toThrow();
  });

  it('yerel OCR tekrarlarını yeni tam-görsel haber saymaz', () => {
    const candidates = [
      { id: 'H1', text: 'Aynı haber' },
      { id: 'H2', text: 'İkinci yerel haber' },
      { id: 'H3', text: 'Üçüncü yerel haber' },
    ];
    const response = JSON.stringify({
      videoSlides: Array.from({ length: 6 }, () => ({ sourceHeadlineId: 'H1', sourceHeadline: 'Aynı haber', topText: 'AÇI', spokenText: 'Aynı haber.', imagePrompts: [] })),
      gazeteBasliklari: [{ sourceHeadlineId: 'V1', baslik: 'Aynı haber', aciklama: 'Açıklama' }],
    });
    expect(() => validateHermesNewspaperResponse(response, candidates)).toThrow('2 yeni tam-görsel haber bölgesi');
  });
});
