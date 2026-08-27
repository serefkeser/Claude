from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old[:160]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

path = 'apps/web/src/lib/newspaperEvidenceVerification.ts'
old = r'''export function hasLocalOcrHeadlineSupport(headline: string, ocrEvidence: string) {
  const expected = ocrTokens(headline);
  const evidence = ocrTokens(ocrEvidence);
  if (expected.length < 2 || evidence.length < 2) return false;
  const facts = exactFacts(headline);
  const evidenceFacts = new Set(exactFacts(ocrEvidence));
  if (!facts.every(fact => evidenceFacts.has(fact))) return false;
  return orderedOcrCoverage(expected, evidence) >= 0.82;
}
'''
new = r'''export function hasLocalOcrHeadlineSupport(headline: string, ocrEvidence: string) {
  const expected = ocrTokens(headline);
  if (expected.length < 2) return false;
  const facts = exactFacts(headline);
  const evidenceFacts = new Set(exactFacts(ocrEvidence));
  if (!facts.every(fact => evidenceFacts.has(fact))) return false;

  const rawLines = String(ocrEvidence || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  if (!rawLines.length) return false;

  for (let start = 0; start < rawLines.length; start += 1) {
    for (let count = 1; count <= 3 && start + count <= rawLines.length; count += 1) {
      const windowTokens = ocrTokens(rawLines.slice(start, start + count).join(' '));
      if (!windowTokens.length) continue;
      const matched = orderedOcrCoverage(expected, windowTokens) * expected.length;
      const recall = matched / expected.length;
      const precision = matched / windowTokens.length;
      if (recall >= 0.82 && precision >= 0.82) return true;
    }
  }
  return false;
}
'''
replace_once(path, old, new)
replace_once(
    path,
    "        evidence.set(candidate.id.toUpperCase(), String(result.data?.text || '').replace(/\\s+/g, ' ').trim());",
    "        evidence.set(candidate.id.toUpperCase(), String(result.data?.text || '').replace(/\\r/g, '').trim());",
)

path = 'apps/web/src/lib/localRenderer.subtitle.test.ts'
replace_once(
    path,
    "    chunks.forEach(chunk => expect(chunk.split(/\\s+/)).toHaveLength(expect.any(Number)));",
    "    chunks.forEach(chunk => expect(chunk.split(/\\s+/).length).toBeGreaterThan(0));",
)

print('OTONOM 3.14.54 OCR precision hardening applied.')
