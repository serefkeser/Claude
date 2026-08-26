import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('gazete vision crop evidence orchestration', () => {
  it('yerel OCR tam 5 aday bulsa bile Vision kutularının yakın OCR ile zenginleştirilmesini engellemez', () => {
    const source = fs.readFileSync(new URL('./aiClient.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('localCandidates.length < 5');
    expect(source).toContain("options.inputType === 'gazete'\n    && imageCandidates[0]\n    && result.script.visionGazeteBasliklari?.length");
    expect(source).toContain('addLocalCropEvidenceToVisionCandidates');
  });
});
