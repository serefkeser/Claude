import fs from 'node:fs';

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`${path}: beklenen blok bulunamadı; tahminle değiştirilmedi.`);
  fs.writeFileSync(path, source.replace(before, after));
}

const verificationPath = 'apps/web/src/lib/newspaperVerification.ts';
replaceOnce(
  verificationPath,
  `  const first = tokens[0];\n  const last = tokens.at(-1) || '';\n  if (/^\\d+(?:[.,]\\d+)?$/u.test(last)) return false;`,
  `  const first = tokens[0];\n  const last = tokens.at(-1) || '';\n  // Para birimi/sembol artığı tek başına bir haber olgusu değildir. Cumhuriyet\n  // örneğindeki “KÖŞE ATIŞI £ |” gibi OCR gürültüsünü başlık havuzuna alma.\n  if (/[₺$€£]/u.test(text) && !/\\d/u.test(text)) return false;\n  if (/^\\d+(?:[.,]\\d+)?$/u.test(last)) return false;`,
);

const consensusAnchor = `function readingsMutuallyAgree(left: OcrTextReading, right: OcrTextReading) {\n  if (left.confidence < MIN_OCR_CONFIDENCE || right.confidence < MIN_OCR_CONFIDENCE) return false;\n  return hasStrictOcrConsensus(left.text, right.text, left.confidence, right.confidence)\n    && hasStrictOcrConsensus(right.text, left.text, right.confidence, left.confidence);\n}`;
const consensusReplacement = `function hasRelaxedIndependentCropConsensus(primary: string, verification: string) {\n  const primaryTokens = evidenceTokens(primary).map(token => token.replace(/-$/u, ''));\n  const verificationTokens = evidenceTokens(verification).map(token => token.replace(/-$/u, ''));\n  if (primaryTokens.length < 5 || !verificationTokens.length) return false;\n\n  const primaryFacts = exactFactTokens(primary).sort();\n  const verificationFacts = exactFactTokens(verification).sort();\n  if (primaryFacts.length !== verificationFacts.length\n    || primaryFacts.some((fact, index) => fact !== verificationFacts[index])) return false;\n\n  const remaining = [...verificationTokens];\n  let matched = 0;\n  for (const primaryToken of primaryTokens) {\n    const matchIndex = remaining.findIndex(verificationToken => {\n      if (primaryToken === verificationToken) return true;\n      if (foldTurkishOcrDiacritics(primaryToken) === foldTurkishOcrDiacritics(verificationToken)) return true;\n      if (/\\d/u.test(primaryToken) || primaryToken.length < 5 || verificationToken.length < 5) return false;\n      return editDistance(primaryToken, verificationToken) <= Math.max(1, Math.floor(primaryToken.length * 0.18));\n    });\n    if (matchIndex < 0) continue;\n    remaining.splice(matchIndex, 1);\n    matched += 1;\n  }\n  return matched >= primaryTokens.length - 1;\n}\n\nfunction readingsMutuallyAgree(left: OcrTextReading, right: OcrTextReading) {\n  if (left.confidence < MIN_OCR_CONFIDENCE || right.confidence < MIN_OCR_CONFIDENCE) return false;\n  if (hasStrictOcrConsensus(left.text, right.text, left.confidence, right.confidence)\n    && hasStrictOcrConsensus(right.text, left.text, right.confidence, left.confidence)) return true;\n\n  // Tolerans yalnız iki bağımsız, yüksek güvenli kırpmanın birbirini desteklediği\n  // aşamada uygulanır. Tek bir tam-sayfa okuması bu yolla kendini doğrulayamaz.\n  // Sayı/skor/yüzde/para olguları yukarıda birebir eşit olmak zorundadır.\n  return hasRelaxedIndependentCropConsensus(left.text, right.text)\n    || hasRelaxedIndependentCropConsensus(right.text, left.text);\n}`;
replaceOnce(verificationPath, consensusAnchor, consensusReplacement);

const testPath = 'apps/web/src/lib/newspaperVerification.test.ts';
const testSource = fs.readFileSync(testPath, 'utf8');
const anchor = `  it('Cumhuriyet başlığında yalnız düşen kelime boşluğunu içerik farkı saymaz', () => {\n    expect(selectVerifiedOcrReading('Skandal okul savunması', 77, [\n      { text: 'Skandal okulsavunması', confidence: 90 },\n    ])).toBe('Skandal okul savunması');\n  });`;
if (!testSource.includes(anchor)) throw new Error(`${testPath}: test ekleme noktası bulunamadı.`);
const extraTests = `${anchor}\n\n  it('Cumhuriyet yoğun sayfasında iki bağımsız kırpma kenar gürültüsüne rağmen temiz başlığı doğrular', () => {\n    expect(selectVerifiedOcrReading(\n      \"Şam'daki tekkelere övgüler düzen Büyükelçi Nuh Yılmaz, Cumhuriyet dönemini eleştirdi\",\n      66,\n      [\n        { text: \"Şam'daki tekkelere övgüler düzen Büyükelçi Nuh Yılmaz, Cumhuriyet dönemini eleştiGİ A e\", confidence: 77 },\n        { text: \"Şam'daki tekkelere övgüler düzen Büyükelçi Nuh Yılmaz, Cumhuriyet dönemini eleştirdi LA ACI\", confidence: 88 },\n      ],\n    )).toBe(\"Şam'daki tekkelere övgüler düzen Büyükelçi Nuh Yılmaz, Cumhuriyet dönemini eleştirdi\");\n  });\n\n  it('sayı içermeyen para/sembol OCR artığını haber başlığı saymaz', () => {\n    expect(isLikelyCompleteNewspaperHeadline('KÖŞE ATIŞI £ |')).toBe(false);\n    expect(isLikelyCompleteNewspaperHeadline('Bütçe 40 milyar ₺ arttı')).toBe(true);\n  });`;
fs.writeFileSync(testPath, testSource.replace(anchor, extraTests));

const versionFiles = [
  'package.json',
  'package-lock.json',
  'apps/web/package.json',
  'apps/web/src/version.ts',
  'packages/shared-config/package.json',
  'packages/shared-types/package.json',
  'packages/shared-utils/package.json',
  'services/api-gateway/package.json',
  'services/api-gateway/src/index.ts',
  'services/api-gateway/src/routes/health.ts',
  'services/media-storage/package.json',
  'services/video-renderer/package.json',
  'services/video-renderer/src/index.ts',
];
for (const file of versionFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const updated = source.replaceAll('3.14.35', '3.14.36');
  if (updated === source) throw new Error(`${file}: 3.14.35 bulunamadı.`);
  fs.writeFileSync(file, updated);
}

console.log('Cumhuriyet OCR fix + OTONOM 3.14.36 applied.');
// trigger-3
