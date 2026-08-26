import { describe, expect, it } from 'vitest';
import { buildNewspaperNarration, limitNewspaperHook, normalizeTurkishSpeech } from './newspaperCopy';

describe('newspaper copy', () => {
  it('clickbait hook metnini en fazla dört kelimeyle sınırlar', () => {
    expect(limitNewspaperHook('Okul yolunda beklenmedik büyük tehlike', 'Okul yolu')).toBe('Okul yolunda beklenmedik büyük');
    expect(limitNewspaperHook('', 'Yol çok zorlu')).toBe('Yol çok zorlu');
  });

  it('özgün başlık ve ayrıntıyı yalnız birer kez, kaynak kalıbı eklemeden seslendirir', () => {
    const narration = buildNewspaperNarration({
      sourceName: 'Nefes',
      headline: 'Okul yolu çok zorlu',
      detail: 'Okul yolu çok zorlu. Veliler çözüm bekliyor.',
    });
    expect(narration).toBe('Okul yolu çok zorlu. Veliler çözüm bekliyor.');
    expect(narration).not.toContain('gazetesinin haberine göre');
  });

  it('Türkçe TTS için kurum kısaltmalarını ve yüzde işaretini doğal okuma metnine çevirir', () => {
    expect(normalizeTurkishSpeech('ABD, AİHM ve HSK yüzde %25 açıkladı.')).toBe(
      'Amerika Birleşik Devletleri, Avrupa İnsan Hakları Mahkemesi ve Hakimler ve Savcılar Kurulu yüzde 25 açıkladı.',
    );
    expect(buildNewspaperNarration({
      headline: 'ABD yeni yaptırımları açıkladı',
      detail: 'AİHM kararına ilişkin HSK açıklama yaptı.',
    })).toBe('Amerika Birleşik Devletleri yeni yaptırımları açıkladı. Avrupa İnsan Hakları Mahkemesi kararına ilişkin Hakimler ve Savcılar Kurulu açıklama yaptı.');
  });
});
