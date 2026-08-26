import fs from 'node:fs';

function update(path, transform) {
  const source = fs.readFileSync(path, 'utf8');
  const result = transform(source);
  if (result === source) throw new Error(`${path}: değişiklik uygulanmadı.`);
  fs.writeFileSync(path, result);
}

const recoveryPath = 'apps/web/src/lib/newspaperVisionRecovery.ts';
update(recoveryPath, source => {
  let out = source;
  out = out.replace(
`function validateVisionCandidate(candidate: VisionNewspaperCandidate, rawOcrText: string) {
  const headline = normalizeVisibleText(candidate.baslik);
  const detail = normalizeVisibleText(candidate.aciklama);
  const rejectionReason = newspaperHeadlineRejectionReason(headline);
  if (rejectionReason) return rejectionReason;
  if (!isLikelyCompleteNewspaperHeadline(headline)) return 'tam bir haber başlığı değil';
  if (!isReliableNewspaperDetail(detail)) return 'tam bir haber açıklaması değil';

  const headlineTokenCount = tokens(headline).length;
  const requiredHeadlineCoverage = headlineTokenCount <= 4 ? 1 : 0.8;
  const evidenceSources = [candidate.localCropEvidence || '', rawOcrText].filter(Boolean);
  if (!evidenceSources.some(evidence => hasRequiredEvidence(headline, evidence, requiredHeadlineCoverage))) {
    return 'başlık yerel OCR metniyle eşleşmedi';
  }
  if (!evidenceSources.some(evidence => hasRequiredEvidence(detail, evidence, 0.78))) {
    return 'açıklama yerel OCR metniyle eşleşmedi';
  }
  return '';
}`,
`function validateVisionCandidate(candidate: VisionNewspaperCandidate, rawOcrText: string, strictCropOnly = false) {
  const headline = normalizeVisibleText(candidate.baslik);
  const detail = normalizeVisibleText(candidate.aciklama);
  const rejectionReason = newspaperHeadlineRejectionReason(headline);
  if (rejectionReason) return rejectionReason;
  if (!isLikelyCompleteNewspaperHeadline(headline)) return 'tam bir haber başlığı değil';
  if (!isReliableNewspaperDetail(detail)) return 'tam bir haber açıklaması değil';

  const headlineTokenCount = tokens(headline).length;
  const requiredHeadlineCoverage = headlineTokenCount <= 4 ? 1 : (strictCropOnly ? 0.95 : 0.8);
  const requiredDetailCoverage = strictCropOnly ? 0.95 : 0.78;
  const cropEvidence = normalizeVisibleText(candidate.localCropEvidence || '');
  const evidenceSources = strictCropOnly
    ? (cropEvidence ? [cropEvidence] : [])
    : [cropEvidence, rawOcrText].filter(Boolean);
  if (!evidenceSources.length) return 'aynı haber kutusundan bağımsız OCR kanıtı yok';
  if (!evidenceSources.some(evidence => hasRequiredEvidence(headline, evidence, requiredHeadlineCoverage))) {
    return 'başlık aynı haber kutusundaki OCR ile yeterince eşleşmedi';
  }
  if (!evidenceSources.some(evidence => hasRequiredEvidence(detail, evidence, requiredDetailCoverage))) {
    return 'açıklama aynı haber kutusundaki OCR ile yeterince eşleşmedi';
  }
  return '';
}`);

  const start = out.indexOf('    const localMatch = options.localCandidates.find(candidate => isDuplicateHeadline(candidate.text, headline));');
  const endMarker = '    const reason = validateVisionCandidate(proposal, evidence);';
  const end = out.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('localMatch bloğu bulunamadı.');
  const replacement = `    const localMatch = options.localCandidates.find(candidate => isDuplicateHeadline(candidate.text, headline));
    if (localMatch) {
      const correctionReason = validateVisionCandidate(proposal, '', true);
      if (!correctionReason) {
        ordered.push({
          ...localMatch,
          text: headline,
          detail: normalizeVisibleText(proposal.aciklama),
          recovered: false,
        });
        continue;
      }

      const localAsProposal: VisionNewspaperCandidate = {
        baslik: localMatch.text,
        aciklama: localMatch.detail,
        localCropEvidence: proposal.localCropEvidence,
      };
      const localReason = validateVisionCandidate(localAsProposal, '', true);
      if (!localReason) {
        ordered.push({ ...localMatch, recovered: false });
      } else {
        rejected.push({
          headline,
          reason: 'aynı haber kutusunda güvenilir cümle mutabakatı yok: ' + correctionReason + ' / ' + localReason,
        });
      }
      continue;
    }

    const reason = validateVisionCandidate(proposal, '', true);`;
  out = out.slice(0, start) + replacement + out.slice(end + endMarker.length);
  return out;
});

const testPath = 'apps/web/src/lib/newspaperVisionRecovery.test.ts';
update(testPath, source => {
  let out = source;
  const additions = [
    ["    onem: 100, x: 20, y: 10, w: 75, h: 25,\n  },", "    onem: 100, x: 20, y: 10, w: 75, h: 25,\n    localCropEvidence: 'Devlet ibadet DAYATAMAZ Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',\n  },"],
    ["    onem: 90, x: 25, y: 40, w: 70, h: 20,\n  },", "    onem: 90, x: 25, y: 40, w: 70, h: 20,\n    localCropEvidence: 'Baskın seçim planı Ortak liste için yeni kurallar getirilmesi beklendiği belirtildi.',\n  },"],
    ["    onem: 80, x: 25, y: 60, w: 60, h: 15,\n  },", "    onem: 80, x: 25, y: 60, w: 60, h: 15,\n    localCropEvidence: 'Transferle kazanamazsın Belediyelerin rekabetle kazanılır transferle seçim kazanılmaz dedi.',\n  },"],
    ["    onem: 70, x: 0, y: 20, w: 24, h: 20,\n  },", "    onem: 70, x: 0, y: 20, w: 24, h: 20,\n    localCropEvidence: \"Tarihin yönü Sakarya'da değişti Mustafa Kemal hattı müdafaa yoktur sathı müdafaa vardır emrini yayımladı.\",\n  },"],
    ["    onem: 60, x: 0, y: 70, w: 24, h: 16,\n  },", "    onem: 60, x: 0, y: 70, w: 24, h: 16,\n    localCropEvidence: \"Netanyahu Türkleri kışkırtmaya çalışıyor Barrack saldırı Türkiye'yi kışkırtma veya seçim hamlesiydi dedi.\",\n  },"],
  ];
  for (const [a, b] of additions) out = out.replace(a, b);

  const anchor = "  it('tam sayfa OCR sütunu parçalasa bile aynı haber kutusunun yerel yakın okumasıyla doğrular', () => {";
  if (!out.includes(anchor)) throw new Error('test anchor yok');
  const tests = `  it('anlamı benzer olsa bile gazetedeki cümleyi yeniden yazan AI açıklamasını reddeder', () => {
    const local = localCandidate();
    const result = recoverNewspaperCandidatesFromVision({
      localCandidates: [local],
      visionCandidates: [{
        baslik: 'Devlet ibadet dayatamaz',
        aciklama: 'Danıştay yöneticilerin uygulamasının zorlayıcı sonuç doğurabileceğini açıkladı.',
        localCropEvidence: 'Devlet ibadet DAYATAMAZ Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',
      }],
      localOcrText: fullOcrText,
      maximumStories: 9,
    });
    expect(result.candidates[0].detail).toBe(local.detail);
  });

  it('aynı haber kutusundan yakın OCR yoksa AI metniyle kelime düzeltmez', () => {
    const result = recoverNewspaperCandidatesFromVision({
      localCandidates: [localCandidate()],
      visionCandidates: [{
        baslik: 'Devlet ibadet dayatamaz',
        aciklama: 'Danıştay uygulamanın yöneticiler eliyle yapılacağı için zorlayıcı olacağını belirtti.',
      }],
      localOcrText: fullOcrText,
      maximumStories: 9,
    });
    expect(result.candidates).toHaveLength(0);
  });

${anchor}`;
  return out.replace(anchor, tests);
});

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
