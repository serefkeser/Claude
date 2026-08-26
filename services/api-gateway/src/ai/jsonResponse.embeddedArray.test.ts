import { describe, expect, it } from 'vitest';
import { parseAiJsonObject, validateHermesNewspaperResponse } from './jsonResponse';

describe('embedded newspaper JSON arrays', () => {
  it('model açıklama metni ardından doğrudan haber dizisi döndürürse yalnız gerçek başlık+açıklamaları kurtarır', () => {
    const headlines = Array.from({ length: 5 }, (_, index) => ({
      baslik: `Gerçek başlık ${index + 1}`,
      aciklama: `Gazetede basılı gerçek açıklama ${index + 1}.`,
      onem: 100 - index,
      x: 2,
      y: index * 15,
      w: 45,
      h: 11,
    }));
    const response = `İstenen veriler aşağıdadır:\n${JSON.stringify(headlines)}\nBitti.`;

    const parsed = parseAiJsonObject(response);

    expect(parsed.gazeteBasliklari).toHaveLength(5);
    expect((parsed.gazeteBasliklari as Array<{ baslik: string }>)[0].baslik).toBe('Gerçek başlık 1');
    expect(() => validateHermesNewspaperResponse(response)).not.toThrow();
  });

  it('açıklamasız nesneleri gömülü diziden haber olarak kabul etmez', () => {
    const response = `Sonuç: ${JSON.stringify(Array.from({ length: 5 }, (_, index) => ({
      baslik: `Eksik başlık ${index + 1}`,
    })))}.`;

    expect(() => validateHermesNewspaperResponse(response)).toThrow();
  });
});
