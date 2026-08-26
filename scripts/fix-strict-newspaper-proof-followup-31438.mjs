import fs from 'node:fs';

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`${path}: beklenen blok bulunamadı.`);
  fs.writeFileSync(path, source.replace(before, after));
}

const recoveryPath = 'apps/web/src/lib/newspaperVisionRecovery.ts';
replaceOnce(
  recoveryPath,
  `  const ordered: Array<VerifiedNewspaperCandidate & { recovered: boolean }> = [];\n  for (const proposal of proposals) {`,
  `  const ordered: Array<VerifiedNewspaperCandidate & { recovered: boolean }> = [];\n  const rejectedLocalCandidateIds = new Set<string>();\n  for (const proposal of proposals) {`,
);
replaceOnce(
  recoveryPath,
  `        rejected.push({\n          headline,\n          reason: 'aynı haber kutusunda güvenilir cümle mutabakatı yok: ' + correctionReason + ' / ' + localReason,\n        });\n      }\n      continue;`,
  `        rejectedLocalCandidateIds.add(localMatch.id);\n        rejected.push({\n          headline,\n          reason: 'aynı haber kutusunda güvenilir cümle mutabakatı yok: ' + correctionReason + ' / ' + localReason,\n        });\n      }\n      continue;`,
);
replaceOnce(
  recoveryPath,
  `  for (const candidate of options.localCandidates) {\n    if (!ordered.some(existing => isDuplicateHeadline(existing.text, candidate.text))) {`,
  `  for (const candidate of options.localCandidates) {\n    if (!rejectedLocalCandidateIds.has(candidate.id)\n      && !ordered.some(existing => isDuplicateHeadline(existing.text, candidate.text))) {`,
);

const testPath = 'apps/web/src/lib/newspaperVisionRecovery.test.ts';
let test = fs.readFileSync(testPath, 'utf8');
test = test
  .replace("expect(result.rejected[0]?.reason).toBe('başlık yerel OCR metniyle eşleşmedi');", "expect(result.rejected[0]?.reason).toBe('aynı haber kutusundan bağımsız OCR kanıtı yok');")
  .replace("expect(result.rejected[0]?.reason).toBe('açıklama yerel OCR metniyle eşleşmedi');", "expect(result.rejected[0]?.reason).toBe('aynı haber kutusundan bağımsız OCR kanıtı yok');")
  .replace("expect(wrongNumber.candidates[0].detail).toBe(local.detail);", "expect(wrongNumber.candidates).toHaveLength(0);");
fs.writeFileSync(testPath, test);
console.log('Rejected local candidate fallback closed.');
