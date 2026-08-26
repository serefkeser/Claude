import fs from 'node:fs';

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`${path}: beklenen blok bulunamadı.`);
  fs.writeFileSync(path, source.replace(before, after));
}

const recoveryPath = 'apps/web/src/lib/newspaperVisionRecovery.ts';

replaceOnce(
  recoveryPath,
  `function validateVisionCandidate(candidate: VisionNewspaperCandidate, rawOcrText: string) {\n  const headline = normalizeVisibleText(candidate.baslik);\n  const detail = normalizeVisibleText(candidate.aciklama);\n  const rejectionReason = newspaperHeadlineRejectionReason(headline);\n  if (rejectionReason) return rejectionReason;\n  if (!isLikelyCompleteNewspaperHeadline(headline)) return 'tam bir haber başlığı değil';\n  if (!isReliableNewspaperDetail(detail)) return 'tam bir haber açıklaması değil';\n\n  const headlineTokenCount = tokens(headline).length;\n  const requiredHeadlineCoverage = headlineTokenCount <= 4 ? 1 : 0.8;\n  const evidenceSources = [candidate.localCropEvidence || '', rawOcrText].filter(Boolean);\n  if (!evidenceSources.some(evidence => hasRequiredEvidence(headline, evidence, requiredHeadlineCoverage))) {\n    return 'başlık yerel OCR metniyle eşleşmedi';\n  }\n  if (!evidenceSources.some(evidence => hasRequiredEvidence(detail, evidence, 0.78))) {\n    return 'açıklama yerel OCR metniyle eşleşmedi';\n  }\n  return '';\n}`,
  `function validateVisionCandidate(candidate: VisionNewspaperCandidate, rawOcrText: string, strictCropOnly = false) {\n  const headline = normalizeVisibleText(candidate.baslik);\n  const detail = normalizeVisibleText(candidate.aciklama);\n  const rejectionReason = newspaperHeadlineRejectionReason(headline);\n  if (rejectionReason) return rejectionReason;\n  if (!isLikelyCompleteNewspaperHeadline(headline)) return 'tam bir haber başlığı değil';\n  if (!isReliableNewspaperDetail(detail)) return 'tam bir haber açıklaması değil';\n\n  const headlineTokenCount = tokens(headline).length;\n  const requiredHeadlineCoverage = headlineTokenCount <= 4 ? 1 : (strictCropOnly ? 0.95 : 0.8);\n  const requiredDetailCoverage = strictCropOnly ? 0.95 : 0.78;\n  const cropEvidence = normalizeVisibleText(candidate.localCropEvidence || '');\n  const evidenceSources = strictCropOnly\n    ? (cropEvidence ? [cropEvidence] : [])\n    : [cropEvidence, rawOcrText].filter(Boolean);\n  if (!evidenceSources.length) return 'aynı haber kutusundan bağımsız OCR kanıtı yok';\n  if (!evidenceSources.some(evidence => hasRequiredEvidence(headline, evidence, requiredHeadlineCoverage))) {\n    return 'başlık aynı haber kutusundaki OCR ile yeterince eşleşmedi';\n  }\n  if (!evidenceSources.some(evidence => hasRequiredEvidence(detail, evidence, requiredDetailCoverage))) {\n    return 'açıklama aynı haber kutusundaki OCR ile yeterince eşleşmedi';\n  }\n  return '';\n}`,
);

replaceOnce(
  recoveryPath,
  `    const localMatch = options.localCandidates.find(candidate => isDuplicateHeadline(candidate.text, headline));\n    if (localMatch) {\n      // Görsel model aynı haber bölgesini yerel OCR ile yüksek oranda doğruluyorsa,\n      // yazım/kelime hatalarını görseldeki temiz metinle düzeltebilir. Sayı, tarih,\n      // skor, yüzde ve para olguları validateVisionCandidate içinde yine OCR ile\n      // birebir eşleşmek zorundadır. Böylece “SÜYÜK / MN aylık” gibi OCR\n      // bozulmaları seslendirmeye taşınmaz; AI'nin uydurma metni ise geçemez.\n      const localCorrectionEvidence = [\n        proposal.localCropEvidence || '',\n        localMatch.text,\n        localMatch.detail,\n        evidence,\n      ].filter(Boolean).join(' ');\n      const correctionReason = validateVisionCandidate(proposal, localCorrectionEvidence);\n      if (!correctionReason) {\n        ordered.push({\n          ...localMatch,\n          text: headline,\n          detail: normalizeVisibleText(proposal.aciklama),\n          recovered: false,\n        });\n      } else {\n        ordered.push({ ...localMatch, recovered: false });\n      }\n      continue;\n    }\n\n    const reason = validateVisionCandidate(proposal, evidence);`,
  `    const localMatch = options.localCandidates.find(candidate => isDuplicateHeadline(candidate.text, headline));\n    if (localMatch) {\n      // AI artık kendi önerisini tam sayfa metni veya mevcut adayla doğrulayamaz.\n      // Düzeltme yalnız aynı haber kutusundan yeniden alınan bağımsız OCR ile\n      // %95+ kelime/sıra örtüşmesinde kabul edilir. Aksi halde yalnız yerel metin\n      // de aynı kutuda güçlü biçimde destekleniyorsa korunur; belirsiz haber atlanır.\n      const correctionReason = validateVisionCandidate(proposal, '', true);\n      if (!correctionReason) {\n        ordered.push({\n          ...localMatch,\n          text: headline,\n          detail: normalizeVisibleText(proposal.aciklama),\n          recovered: false,\n        });\n        continue;\n      }\n\n      const localAsProposal: VisionNewspaperCandidate = {\n        baslik: localMatch.text,\n        aciklama: localMatch.detail,\n        localCropEvidence: proposal.localCropEvidence,\n      };\n      const localReason = validateVisionCandidate(localAsProposal, '', true);\n      if (!localReason) {\n        ordered.push({ ...localMatch, recovered: false });\n      } else {\n        rejected.push({\n          headline,\n          reason: \\`aynı haber kutusunda güvenilir cümle mutabakatı yok: \\${correctionReason} / \\${localReason}\\`,\n        });\n      }\n      continue;\n    }\n\n    const reason = validateVisionCandidate(proposal, '', true);`,
);

const testPath = 'apps/web/src/lib/newspaperVisionRecovery.test.ts';
let testSource = fs.readFileSync(testPath, 'utf8');

// Tam-görsel test adaylarına gerçek uygulamadaki yakın OCR kanıtını ekle.
testSource = testSource.replace(
  `    onem: 100, x: 20, y: 10, w: 75, h: 25,\n  },`,
  `    onem: 100, x: 20, y: 10, w: 75, h: 25,\n    localCropEvidence: 'Devlet ibadet DAYATAMAZ Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',\n  },`,
).replace(
  `    onem: 90, x: 25, y: 40, w: 70, h: 20,\n  },`,
  `    onem: 90, x: 25, y: 40, w: 70, h: 20,\n    localCropEvidence: 'Baskın seçim planı Ortak liste için yeni kurallar getirilmesi beklendiği belirtildi.',\n  },`,
).replace(
  `    onem: 80, x: 25, y: 60, w: 60, h: 15,\n  },`,
  `    onem: 80, x: 25, y: 60, w: 60, h: 15,\n    localCropEvidence: 'Transferle kazanamazsın Belediyelerin rekabetle kazanılır transferle seçim kazanılmaz dedi.',\n  },`,
).replace(
  `    onem: 70, x: 0, y: 20, w: 24, h: 20,\n  },`,
  `    onem: 70, x: 0, y: 20, w: 24, h: 20,\n    localCropEvidence: \"Tarihin yönü Sakarya'da değişti Mustafa Kemal hattı müdafaa yoktur sathı müdafaa vardır emrini yayımladı.\",\n  },`,
).replace(
  `    onem: 60, x: 0, y: 70, w: 24, h: 16,\n  },`,
  `    onem: 60, x: 0, y: 70, w: 24, h: 16,\n    localCropEvidence: \"Netanyahu Türkleri kışkırtmaya çalışıyor Barrack saldırı Türkiye'yi kışkırtma veya seçim hamlesiydi dedi.\",\n  },`,
);

const anchor = `  it('tam sayfa OCR sütunu parçalasa bile aynı haber kutusunun yerel yakın okumasıyla doğrular', () => {`;
if (!testSource.includes(anchor)) throw new Error('test anchor yok');
const added = `  it('anlamı benzer olsa bile gazetedeki cümleyi yeniden yazan AI açıklamasını reddeder', () => {\n    const local = localCandidate();\n    const result = recoverNewspaperCandidatesFromVision({\n      localCandidates: [local],\n      visionCandidates: [{\n        baslik: 'Devlet ibadet dayatamaz',\n        aciklama: 'Danıştay yöneticilerin uygulamasının zorlayıcı sonuç doğurabileceğini açıkladı.',\n        localCropEvidence: 'Devlet ibadet DAYATAMAZ Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',\n      }],\n      localOcrText: fullOcrText,\n      maximumStories: 9,\n    });\n    expect(result.candidates[0].detail).toBe(local.detail);\n  });\n\n  it('aynı haber kutusundan yakın OCR yoksa AI metniyle kelime düzeltmez', () => {\n    const local = localCandidate();\n    const result = recoverNewspaperCandidatesFromVision({\n      localCandidates: [local],\n      visionCandidates: [{\n        baslik: 'Devlet ibadet dayatamaz',\n        aciklama: 'Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',\n      }],\n      localOcrText: fullOcrText,\n      maximumStories: 9,\n    });\n    expect(result.candidates).toHaveLength(0);\n  });\n\n${anchor}`;
testSource = testSource.replace(anchor, added);
fs.writeFileSync(testPath, testSource);

const versionFiles = [
  'package.json','package-lock.json','apps/web/package.json','apps/web/src/version.ts',
  'packages/shared-config/package.json','packages/shared-types/package.json','packages/shared-utils/package.json',
  'services/api-gateway/package.json','services/api-gateway/src/index.ts','services/api-gateway/src/routes/health.ts',
  'services/media-storage/package.json','services/video-renderer/package.json','services/video-renderer/src/index.ts',
];
for (const file of versionFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const updated = source.replaceAll('3.14.37', '3.14.38');
  if (updated === source) throw new Error(`${file}: 3.14.37 bulunamadı.`);
  fs.writeFileSync(file, updated);
}
console.log('Strict newspaper proof + OTONOM 3.14.38 applied.');
