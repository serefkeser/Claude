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

replaceOnce(
  verificationPath,
  `function allTokensHaveIndependentConsensus(primaryTokens: string[], verificationTokens: string[]) {\n  const remaining = [...verificationTokens];\n  return primaryTokens.every(primaryToken => {\n    const matchIndex = remaining.findIndex(verificationToken => {\n      if (primaryToken === verificationToken) return true;\n      // Türkçe gazete fontlarında nokta/aksan sık düşer: TERORUN ↔ TERÖRÜN.\n      // Bu yalnız kanıt karşılaştırması içindir; döndürülen basılı metin güçlü\n      // kırpmanın özgün Türkçe yazımı olarak kalır.\n      if (foldTurkishOcrDiacritics(primaryToken) === foldTurkishOcrDiacritics(verificationToken)) return true;\n      if (/\\d/u.test(primaryToken) || primaryToken.length < 5 || verificationToken.length < 5) return false;\n      return editDistance(primaryToken, verificationToken) <= Math.max(1, Math.floor(primaryToken.length * 0.16));\n    });\n    if (matchIndex < 0) return false;\n    remaining.splice(matchIndex, 1);\n    return true;\n  });\n}`,
  `function allTokensHaveIndependentConsensus(primaryTokens: string[], verificationTokens: string[]) {\n  const remaining = [...verificationTokens];\n  let matched = 0;\n  for (const primaryToken of primaryTokens) {\n    const matchIndex = remaining.findIndex(verificationToken => {\n      if (primaryToken === verificationToken) return true;\n      // Türkçe gazete fontlarında nokta/aksan sık düşer: TERORUN ↔ TERÖRÜN.\n      // Bu yalnız kanıt karşılaştırması içindir; döndürülen basılı metin güçlü\n      // kırpmanın özgün Türkçe yazımı olarak kalır.\n      if (foldTurkishOcrDiacritics(primaryToken) === foldTurkishOcrDiacritics(verificationToken)) return true;\n      if (/\\d/u.test(primaryToken) || primaryToken.length < 5 || verificationToken.length < 5) return false;\n      return editDistance(primaryToken, verificationToken) <= Math.max(1, Math.floor(primaryToken.length * 0.18));\n    });\n    if (matchIndex < 0) continue;\n    remaining.splice(matchIndex, 1);\n    matched += 1;\n  }\n\n  // Yoğun gazete puntolarında tek bir kelimenin harfleri ikinci segmentasyonda\n  // bozulabiliyor. 5+ kelimelik metinde yalnız bir sözlü token kaybına izin ver;\n  // sayılar/para/yüzdeler hasStrictOcrConsensus içindeki exactFactTokens ile\n  // hâlâ birebir doğrulanmak zorunda. Kısa başlıklar ise tamamen eşleşmeli.\n  const allowedMisses = primaryTokens.length >= 5 ? 1 : 0;\n  return matched >= primaryTokens.length - allowedMisses;\n}`,
);

replaceOnce(
  verificationPath,
  `function readingsMutuallyAgree(left: OcrTextReading, right: OcrTextReading) {\n  if (left.confidence < MIN_OCR_CONFIDENCE || right.confidence < MIN_OCR_CONFIDENCE) return false;\n  return hasStrictOcrConsensus(left.text, right.text, left.confidence, right.confidence)\n    && hasStrictOcrConsensus(right.text, left.text, right.confidence, left.confidence);\n}`,
  `function readingsMutuallyAgree(left: OcrTextReading, right: OcrTextReading) {\n  if (left.confidence < MIN_OCR_CONFIDENCE || right.confidence < MIN_OCR_CONFIDENCE) return false;\n\n  // Bir kırpma kenarda fazladan masthead/gürültü taşıyabilir. Bu yüzden iki yönlü\n  // tam kapsama zorlamak yerine, aynı sayısal olguları taşıyan okumaların en az\n  // bir yönde güçlü metin kapsaması göstermesi yeterlidir. Böylece “eleştirdi\n  // LA ACI” gibi kenar gürültüsü gerçek başlığı düşürmez; yanlış skor/sayı ise\n  // aşağıdaki fact eşitliği nedeniyle yine geçemez.\n  const leftFacts = exactFactTokens(left.text).sort();\n  const rightFacts = exactFactTokens(right.text).sort();\n  if (leftFacts.length !== rightFacts.length\n    || leftFacts.some((fact, index) => fact !== rightFacts[index])) return false;\n\n  return hasStrictOcrConsensus(left.text, right.text, left.confidence, right.confidence)\n    || hasStrictOcrConsensus(right.text, left.text, right.confidence, left.confidence);\n}`,
);

const testPath = 'apps/web/src/lib/newspaperVerification.test.ts';
const testSource = fs.readFileSync(testPath, 'utf8');
const anchor = `  it('Cumhuriyet başlığında yalnız düşen kelime boşluğunu içerik farkı saymaz', () => {\n    expect(selectVerifiedOcrReading('Skandal okul savunması', 77, [\n      { text: 'Skandal okulsavunması', confidence: 90 },\n    ])).toBe('Skandal okul savunması');\n  });`;
if (!testSource.includes(anchor)) throw new Error(`${testPath}: test ekleme noktası bulunamadı.`);
const extraTests = `${anchor}\n\n  it('Cumhuriyet yoğun sayfasında tek bozuk kelime ve kırpma kenar gürültüsü gerçek başlığı düşürmez', () => {\n    expect(selectVerifiedOcrReading(\n      \"Şam'daki tekkelere övgüler düzen Büyükelçi Nuh Yılmaz, Cumhuriyet dönemini eleştirdi\",\n      66,\n      [\n        { text: \"Şam'daki tekkelere övgüler düzen Büyükelçi Nuh Yılmaz, Cumhuriyet dönemini eleştiGİ A e\", confidence: 77 },\n        { text: \"Şam'daki tekkelere övgüler düzen Büyükelçi Nuh Yılmaz, Cumhuriyet dönemini eleştirdi LA ACI\", confidence: 88 },\n      ],\n    )).toBe(\"Şam'daki tekkelere övgüler düzen Büyükelçi Nuh Yılmaz, Cumhuriyet dönemini eleştirdi LA ACI\");\n  });\n\n  it('sayı içermeyen para/sembol OCR artığını haber başlığı saymaz', () => {\n    expect(isLikelyCompleteNewspaperHeadline('KÖŞE ATIŞI £ |')).toBe(false);\n    expect(isLikelyCompleteNewspaperHeadline('Bütçe 40 milyar ₺ arttı')).toBe(true);\n  });`;
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
