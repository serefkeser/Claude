import fs from 'node:fs';

const aiPath = 'apps/web/src/lib/aiClient.ts';
let source = fs.readFileSync(aiPath, 'utf8');
const before = `  const visionCandidates = options.inputType === 'gazete'\n    && localCandidates.length < 5\n    && imageCandidates[0]\n    && result.script.visionGazeteBasliklari?.length\n    ? await addLocalCropEvidenceToVisionCandidates(\n      imageCandidates[0],\n      result.script.visionGazeteBasliklari,\n    )\n    : result.script.visionGazeteBasliklari;`;
const after = `  const visionCandidates = options.inputType === 'gazete'\n    && imageCandidates[0]\n    && result.script.visionGazeteBasliklari?.length\n    ? await addLocalCropEvidenceToVisionCandidates(\n      imageCandidates[0],\n      result.script.visionGazeteBasliklari,\n    )\n    : result.script.visionGazeteBasliklari;`;
if (!source.includes(before)) throw new Error('aiClient vision enrichment guard bulunamadı');
source = source.replace(before, after);
fs.writeFileSync(aiPath, source);

const testPath = 'apps/web/src/lib/aiClient.guard.test.ts';
fs.writeFileSync(testPath, `import { describe, expect, it } from 'vitest';\nimport fs from 'node:fs';\n\ndescribe('gazete vision crop evidence orchestration', () => {\n  it('yerel OCR tam 5 aday bulsa bile Vision kutularının yakın OCR ile zenginleştirilmesini engellemez', () => {\n    const source = fs.readFileSync(new URL('./aiClient.ts', import.meta.url), 'utf8');\n    expect(source).not.toContain('localCandidates.length < 5');\n    expect(source).toContain("options.inputType === 'gazete'\\n    && imageCandidates[0]\\n    && result.script.visionGazeteBasliklari?.length");\n    expect(source).toContain('addLocalCropEvidenceToVisionCandidates');\n  });\n});\n`);

console.log('3.14.40 crop evidence orchestration fix applied.');
