import { describe, expect, it } from 'vitest';
import { buildAnalyzeMessages } from './promptBuilder';

describe('newspaper verification prompt', () => {
  it('H kartlarını bağımsız ve birebir okumayı zorunlu kılar', () => {
    const messages = buildAnalyzeMessages({
      inputType: 'gazete',
      text: 'Birebir doğrula.',
      images: [{ mimeType: 'image/jpeg', data: 'AA==', name: 'kanıt' }],
      config: {
        language: 'tr',
        analysisMode: 'newspaper_verify',
        sourceName: 'BirGün',
      },
    });

    const system = String(messages[0].content);
    expect(system).toContain('İKİNCİ GEÇİŞ — BİREBİR BAŞLIK + SPOT DOĞRULAMA');
    expect(system).toContain('sourceHeadlineId');
    expect(system).toContain('Başka H kartından veya komşu haberden tek kelime taşıma');
    expect(system).toContain('Harfleri, Türkçe karakterleri, kelime sırasını ve sayıları birebir koru');
  });
});
