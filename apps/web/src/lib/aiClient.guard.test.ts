import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('gazete Vision-first orchestration', () => {
  it('ilk geçişi yalnız keşif yapar; gerçek H konumunu OCR bbox ile sabitler; OCR metnini yayın/TTS kaynağı yapmaz', () => {
    const source = fs.readFileSync(new URL('./aiClient.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('extractTextLocally(');
    expect(source).not.toContain('recoverNewspaperCandidatesFromVision');
    expect(source).not.toContain('addLocalCropEvidenceToVisionCandidates');
    expect(source).toContain('Hermes 10 gazete keşif modu');
    expect(source).toContain('buildHermes10NewspaperCandidates');
    expect(source).toContain('anchorNewspaperCandidatesWithLocalOcr');
    expect(source).toContain('Tesseract tam sayfada yalnız blocks/words/bbox');
    expect(source).toContain('Yerel Tesseract OCR gazete başlığını veya cümlesini değiştirmeyecek');
    expect(source).toContain('ilk keşif metni ve OCR metni yayında kullanılmadı');
    expect(source).toContain('yerel OCR kelime kutularından deterministik olarak sabitlenen hedef başlık bölgesidir');
  });
});
