import { describe, expect, it } from 'vitest';
import {
  anchorCandidatesToOcrLines,
  extractOcrLinesFromTesseractBlocks,
  type NewspaperOcrLine,
} from './newspaperOcrAnchoring';
import type { VerifiedNewspaperCandidate } from './newspaperPipeline';

function candidate(id: string, text: string, x: number, y: number): VerifiedNewspaperCandidate {
  return {
    id,
    text,
    detail: 'Bu yalnız keşif açıklamasıdır ve yayın metni değildir.',
    confidence: 100,
    score: 1000,
    x,
    y,
    w: 20,
    h: 8,
  };
}

function line(
  paragraphKey: string,
  text: string,
  x0: number,
  y0: number,
  wordWidth = 95,
): NewspaperOcrLine {
  const words = text.split(/\s+/).map((word, index) => ({
    text: word,
    bbox: {
      x0: x0 + index * wordWidth,
      y0,
      x1: x0 + index * wordWidth + wordWidth - 12,
      y1: y0 + 58,
    },
    confidence: 90,
  }));
  return {
    text,
    words,
    paragraphKey,
    bbox: {
      x0,
      y0,
      x1: words.at(-1)?.bbox.x1 || x0 + 100,
      y1: y0 + 58,
    },
  };
}

describe('newspaper OCR anchoring', () => {
  it('Vision koordinatı yanlış olsa bile gerçek OCR başlık kutusuna taşır', () => {
    const result = anchorCandidatesToOcrLines({
      imageWidth: 2000,
      imageHeight: 3000,
      maxCandidates: 9,
      candidates: [candidate('H1', 'FENERBAHÇE TARİH YAZDI', 5, 5)],
      lines: [
        line('0:0', 'Başka haber burada', 120, 120),
        line('1:0', 'FENERBAHÇE TARİH YAZDI', 1080, 1980),
      ],
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].x).toBeGreaterThan(50);
    expect(result.candidates[0].y).toBeGreaterThan(60);
    expect(result.candidates[0].text).toBe('FENERBAHÇE TARİH YAZDI');
  });

  it('Türkçe karakter ve küçük OCR sapmalarında aynı fiziksel başlığı bulur', () => {
    const result = anchorCandidatesToOcrLines({
      imageWidth: 1800,
      imageHeight: 2800,
      candidates: [candidate('H1', 'İSTİKLAL MARŞI IŞIKLANAMAZ', 40, 10)],
      lines: [line('0:0', 'ISTIKLAL MARSI ISIKLANAMAZ', 600, 300)],
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.rejections).toHaveLength(0);
  });

  it('başlığı OCR yerleşiminde bulunmayan adayı fail-closed reddeder', () => {
    const result = anchorCandidatesToOcrLines({
      imageWidth: 1800,
      imageHeight: 2800,
      candidates: [candidate('H1', 'GERÇEKTE OLMAYAN BAŞLIK', 50, 50)],
      lines: [line('0:0', 'FENERBAHÇE TARİH YAZDI', 600, 300)],
    });

    expect(result.candidates).toEqual([]);
    expect(result.rejections[0].reason).toContain('OCR kelime kutularında');
  });

  it('iki keşif adayı aynı fiziksel OCR başlığına düşerse tek haber bırakır', () => {
    const lines = [line('0:0', 'DEVLETTE ARAÇ SALTANATI ZİRVEDE', 700, 1500)];
    const result = anchorCandidatesToOcrLines({
      imageWidth: 2000,
      imageHeight: 3000,
      candidates: [
        candidate('H1', 'DEVLETTE ARAÇ SALTANATI ZİRVEDE', 30, 45),
        candidate('H2', 'DEVLETTE ARAÇ SALTANATI ZİRVEDE', 55, 60),
      ],
      lines,
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.rejections.some(item => item.reason.includes('aynı fiziksel bölge'))).toBe(true);
  });

  it('Tesseract v6 blocks yapısından satır ve kelime bbox çıkarır', () => {
    const lines = extractOcrLinesFromTesseractBlocks([
      {
        paragraphs: [
          {
            lines: [
              {
                text: 'Örnek Başlık',
                bbox: { x0: 10, y0: 20, x1: 300, y1: 80 },
                words: [
                  { text: 'Örnek', confidence: 91, bbox: { x0: 10, y0: 20, x1: 130, y1: 80 } },
                  { text: 'Başlık', confidence: 93, bbox: { x0: 150, y0: 20, x1: 300, y1: 80 } },
                ],
              },
            ],
          },
        ],
      },
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0].words).toHaveLength(2);
    expect(lines[0].bbox).toEqual({ x0: 10, y0: 20, x1: 300, y1: 80 });
  });
});
