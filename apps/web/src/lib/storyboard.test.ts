import { describe, expect, it } from 'vitest';
import type { RenderConfig } from '@otonom/shared-types';
import {
  buildRenderStoryboard,
  getStoryboardNarration,
  selectRotatingFinalWord,
  TURKISH_FINAL_WORDS,
} from './storyboard';

const config = {
  duration: '30', aspectRatio: '9:16', videoStyle: 'cinematic', fontStyle: 'modern',
  imageStyle: 'cinematic', language: 'tr', subtitles: 'on', resolution: '1K',
  transition: 'none', videoFormat: 'webm', analysisMode: 'yorumsuz', tip: 'haber',
  sourceName: 'Diriliş Postası', yorum: 'Bu konu takip edilmeli.',
} satisfies RenderConfig;

describe('buildRenderStoryboard', () => {
  it('kapak, içerik, son söz ve outro sahnelerini eksiksiz kurar', () => {
    const scenes = buildRenderStoryboard({
      thumbnailText: 'DAVA TARTIŞMASI',
      sonSoz: 'Adalet mülkün temelidir.',
      lastQuote: 'Gelişmeleri takip etmeyi unutmayın.',
      videoSlides: [{ topText: 'GÜNDEM', spokenText: 'Dava bugün görüldü.', imagePrompts: [] }],
    }, config, new Date('2026-08-16T12:00:00Z'));

    expect(scenes.map(scene => scene.kind)).toEqual(['cover', 'content', 'final', 'outro']);
    expect(scenes[0].spokenText).toContain('Diriliş Postası');
    expect(scenes[2].spokenText).toContain('Adalet mülkün temelidir');
    expect(scenes[2].spokenText).toContain('Bu konu takip edilmeli');
    expect(getStoryboardNarration(scenes)).toContain('Abone olmayı');
  });

  it('AI son sözü son haber cümlesiyle tekrarlarsa havuzdan yol gösterici söz kullanır', () => {
    const scenes = buildRenderStoryboard({
      sonSoz: 'Gerçek ortaya çıktı.',
      videoSlides: [{ topText: 'SONUÇ', spokenText: 'Gerçek ortaya çıktı.', imagePrompts: [] }],
    }, config, new Date('2026-08-16T12:01:00Z'));
    const finalText = scenes.find(scene => scene.kind === 'final')?.spokenText || '';
    expect(finalText).not.toContain('Gerçek ortaya çıktı');
    expect(finalText).toMatch(/—/);
  });

  it('gazetede tek clickbait, en az beş başlık-detay, değişken Son Söz ve outro sırasını korur', () => {
    const headlines = Array.from({ length: 5 }, (_, index) => ({
      sourceHeadlineId: `H${index + 1}`,
      baslik: `Doğrulanmış başlık ${index + 1}`,
      aciklama: `Doğrulanmış detay ${index + 1}.`,
      x: 0, y: index * 100, w: 500, h: 80,
    }));
    const scenes = buildRenderStoryboard({
      thumbnailText: 'GERÇEK NE?',
      sonSoz: '',
      lastQuote: '',
      gununSorusu: '',
      gazeteBasliklari: headlines,
      videoSlides: headlines.map(item => ({
        sourceHeadlineId: item.sourceHeadlineId,
        sourceHeadline: item.baslik,
        topText: item.baslik,
        spokenText: `${item.baslik}. ${item.aciklama}`,
        imagePrompts: [],
      })),
    }, { ...config, yorum: '', sourceName: 'BirGün' }, new Date('2026-08-16T12:00:00Z'));

    expect(scenes.map(scene => scene.kind)).toEqual([
      'cover', 'content', 'content', 'content', 'content', 'content', 'final', 'outro',
    ]);
    expect(scenes[0].spokenText).toBe('GERÇEK NE?');
    expect(scenes[0].spokenText).not.toContain('BirGün');
    headlines.forEach((item, index) => {
      expect(scenes[index + 1].topText).toBe(item.baslik);
      expect(scenes[index + 1].spokenText).toBe(`${item.baslik}. ${item.aciklama}`);
    });
    const finalScene = scenes.at(-2);
    expect(finalScene?.kind).toBe('final');
    expect(finalScene?.spokenText).toMatch(/— (Mustafa Kemal Atatürk|Sokrates|René Descartes|Francis Bacon|Yunus Emre|Epiktetos|Türk atasözü)/);
    expect(scenes.at(-1)?.spokenText).toContain('Abone olmayı');
  });

  it('Son Söz havuzu sabit tek cümleye bağlı değildir', () => {
    expect(TURKISH_FINAL_WORDS.length).toBeGreaterThanOrEqual(12);
    const first = selectRotatingFinalWord('seed-a');
    const second = selectRotatingFinalWord('seed-b');
    expect(first).toMatch(/—/);
    expect(second).toMatch(/—/);
    expect(TURKISH_FINAL_WORDS.some(item => first.includes(item.author))).toBe(true);
  });
});
