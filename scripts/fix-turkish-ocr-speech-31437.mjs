import fs from 'node:fs';

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`${path}: beklenen blok bulunamadı; tahminle değiştirilmedi.`);
  fs.writeFileSync(path, source.replace(before, after));
}

const recoveryPath = 'apps/web/src/lib/newspaperVisionRecovery.ts';
replaceOnce(
  recoveryPath,
  `    const localMatch = options.localCandidates.find(candidate => isDuplicateHeadline(candidate.text, headline));\n    if (localMatch) {\n      ordered.push({ ...localMatch, recovered: false });\n      continue;\n    }\n\n    const reason = validateVisionCandidate(proposal, evidence);`,
  `    const localMatch = options.localCandidates.find(candidate => isDuplicateHeadline(candidate.text, headline));\n    if (localMatch) {\n      // Görsel model aynı haber bölgesini yerel OCR ile yüksek oranda doğruluyorsa,\n      // yazım/kelime hatalarını görseldeki temiz metinle düzeltebilir. Sayı, tarih,\n      // skor, yüzde ve para olguları validateVisionCandidate içinde yine OCR ile\n      // birebir eşleşmek zorundadır. Böylece “SÜYÜK / MN aylık” gibi OCR\n      // bozulmaları seslendirmeye taşınmaz; AI'nin uydurma metni ise geçemez.\n      const localCorrectionEvidence = [\n        proposal.localCropEvidence || '',\n        localMatch.text,\n        localMatch.detail,\n        evidence,\n      ].filter(Boolean).join(' ');\n      const correctionReason = validateVisionCandidate(proposal, localCorrectionEvidence);\n      if (!correctionReason) {\n        ordered.push({\n          ...localMatch,\n          text: headline,\n          detail: normalizeVisibleText(proposal.aciklama),\n          recovered: false,\n        });\n      } else {\n        ordered.push({ ...localMatch, recovered: false });\n      }\n      continue;\n    }\n\n    const reason = validateVisionCandidate(proposal, evidence);`,
);

const recoveryTestPath = 'apps/web/src/lib/newspaperVisionRecovery.test.ts';
let recoveryTest = fs.readFileSync(recoveryTestPath, 'utf8');
const recoveryAnchor = `  it('aynı haberi yerel OCR ve görsel analizden iki kez eklemez; güçlü yerel metni korur', () => {\n    const local = localCandidate();\n    const result = recoverNewspaperCandidatesFromVision({\n      localCandidates: [local],\n      visionCandidates: [visionCandidates[0], visionCandidates[0]],\n      localOcrText: fullOcrText,\n      maximumStories: 9,\n    });\n\n    expect(result.candidates).toHaveLength(1);\n    expect(result.recoveredCount).toBe(0);\n    expect(result.candidates[0]).toMatchObject({ text: local.text, detail: local.detail, confidence: 94 });\n  });`;
const recoveryReplacement = `  it('aynı haberi yerel OCR ve görsel analizden iki kez eklemez; doğrulanmış temiz görsel metnini kullanır', () => {\n    const local = localCandidate();\n    const result = recoverNewspaperCandidatesFromVision({\n      localCandidates: [local],\n      visionCandidates: [visionCandidates[0], visionCandidates[0]],\n      localOcrText: fullOcrText,\n      maximumStories: 9,\n    });\n\n    expect(result.candidates).toHaveLength(1);\n    expect(result.recoveredCount).toBe(0);\n    expect(result.candidates[0]).toMatchObject({\n      text: visionCandidates[0].baslik,\n      detail: visionCandidates[0].aciklama,\n      confidence: 94,\n    });\n  });\n\n  it('görsel okuma OCR yazım hatasını düzeltir ama sayısal olguyu değiştiremez', () => {\n    const local: VerifiedNewspaperCandidate = {\n      id: 'H1',\n      text: 'Tarihin akışı değişti',\n      detail: \"SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.\",\n      confidence: 88, score: 12000, x: 10, y: 20, w: 900, h: 140,\n    };\n    const cleanProposal: VisionNewspaperCandidate = {\n      baslik: 'Tarihin akışı değişti',\n      aciklama: \"Büyük Atatürk'ün ardından 11 aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.\",\n      onem: 100,\n      localCropEvidence: \"Tarihin akışı değişti Büyük Atatürk'ün ardından 11 aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.\",\n    };\n    const corrected = recoverNewspaperCandidatesFromVision({\n      localCandidates: [local],\n      visionCandidates: [cleanProposal],\n      localOcrText: \"OCR TAM METİN: Tarihin akışı değişti SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.\",\n      maximumStories: 9,\n    });\n    expect(corrected.candidates[0].detail).toBe(cleanProposal.aciklama);\n\n    const wrongNumber = recoverNewspaperCandidatesFromVision({\n      localCandidates: [local],\n      visionCandidates: [{ ...cleanProposal, aciklama: \"Büyük Atatürk'ün ardından 12 aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.\" }],\n      localOcrText: \"OCR TAM METİN: Tarihin akışı değişti SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.\",\n      maximumStories: 9,\n    });\n    expect(wrongNumber.candidates[0].detail).toBe(local.detail);\n  });`;
if (!recoveryTest.includes(recoveryAnchor)) throw new Error(`${recoveryTestPath}: test bloğu bulunamadı.`);
fs.writeFileSync(recoveryTestPath, recoveryTest.replace(recoveryAnchor, recoveryReplacement));

const copyPath = 'apps/web/src/lib/newspaperCopy.ts';
replaceOnce(
  copyPath,
  `function normalizeForComparison(value: string) {\n  return clean(value).toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]+/gi, ' ').trim();\n}\n`,
  `function normalizeForComparison(value: string) {\n  return clean(value).toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]+/gi, ' ').trim();\n}\n\nconst TURKISH_SPEECH_EXPANSIONS: Array<[RegExp, string]> = [\n  [/\\bABD\\b/g, 'Amerika Birleşik Devletleri'],\n  [/\\bAİHM\\b/g, 'Avrupa İnsan Hakları Mahkemesi'],\n  [/\\bHSK\\b/g, 'Hakimler ve Savcılar Kurulu'],\n  [/\\bADD\\b/g, 'Atatürkçü Düşünce Derneği'],\n  [/\\bCHP\\b/g, 'Cumhuriyet Halk Partisi'],\n  [/\\bİBB\\b/g, 'İstanbul Büyükşehir Belediyesi'],\n  [/\\bTBMM\\b/g, 'Türkiye Büyük Millet Meclisi'],\n  [/\\bTSK\\b/g, 'Türk Silahlı Kuvvetleri'],\n  [/\\bSGK\\b/g, 'Sosyal Güvenlik Kurumu'],\n  [/\\bMEB\\b/g, 'Millî Eğitim Bakanlığı'],\n  [/\\bYÖK\\b/g, 'Yükseköğretim Kurulu'],\n];\n\nexport function normalizeTurkishSpeech(value: string) {\n  let text = clean(value)\n    .replace(/%\\s*(\\d+(?:[.,]\\d+)?)/g, 'yüzde $1')\n    .replace(/\\s*&\\s*/g, ' ve ');\n  for (const [pattern, replacement] of TURKISH_SPEECH_EXPANSIONS) {\n    text = text.replace(pattern, replacement);\n  }\n  return clean(text);\n}\n`,
);
replaceOnce(
  copyPath,
  `  const result = words.join(' ').trim();\n  return ensureSentence(result);`,
  `  const result = words.join(' ').trim();\n  return ensureSentence(normalizeTurkishSpeech(result));`,
);

const copyTestPath = 'apps/web/src/lib/newspaperCopy.test.ts';
let copyTest = fs.readFileSync(copyTestPath, 'utf8');
copyTest = copyTest.replace(
  `import { buildNewspaperNarration, limitNewspaperHook } from './newspaperCopy';`,
  `import { buildNewspaperNarration, limitNewspaperHook, normalizeTurkishSpeech } from './newspaperCopy';`,
);
const copyAnchor = `  it('özgün başlık ve ayrıntıyı yalnız birer kez, kaynak kalıbı eklemeden seslendirir', () => {\n    const narration = buildNewspaperNarration({\n      sourceName: 'Nefes',\n      headline: 'Okul yolu çok zorlu',\n      detail: 'Okul yolu çok zorlu. Veliler çözüm bekliyor.',\n    });\n    expect(narration).toBe('Okul yolu çok zorlu. Veliler çözüm bekliyor.');\n    expect(narration).not.toContain('gazetesinin haberine göre');\n  });`;
const copyReplacement = `${copyAnchor}\n\n  it('Türkçe TTS için kurum kısaltmalarını ve yüzde işaretini doğal okuma metnine çevirir', () => {\n    expect(normalizeTurkishSpeech('ABD, AİHM ve HSK yüzde %25 açıkladı.')).toBe(\n      'Amerika Birleşik Devletleri, Avrupa İnsan Hakları Mahkemesi ve Hakimler ve Savcılar Kurulu yüzde yüzde 25 açıkladı.',\n    );\n    expect(buildNewspaperNarration({\n      headline: 'ABD yeni yaptırımları açıkladı',\n      detail: 'AİHM kararına ilişkin HSK açıklama yaptı.',\n    })).toBe('Amerika Birleşik Devletleri yeni yaptırımları açıkladı. Avrupa İnsan Hakları Mahkemesi kararına ilişkin Hakimler ve Savcılar Kurulu açıklama yaptı.');\n  });`;
if (!copyTest.includes(copyAnchor)) throw new Error(`${copyTestPath}: test ekleme noktası bulunamadı.`);
fs.writeFileSync(copyTestPath, copyTest.replace(copyAnchor, copyReplacement));

const versionFiles = [
  'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/src/version.ts',
  'packages/shared-config/package.json', 'packages/shared-types/package.json', 'packages/shared-utils/package.json',
  'services/api-gateway/package.json', 'services/api-gateway/src/index.ts', 'services/api-gateway/src/routes/health.ts',
  'services/media-storage/package.json', 'services/video-renderer/package.json', 'services/video-renderer/src/index.ts',
];
for (const file of versionFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const updated = source.replaceAll('3.14.36', '3.14.37');
  if (updated === source) throw new Error(`${file}: 3.14.36 bulunamadı.`);
  fs.writeFileSync(file, updated);
}

console.log('Turkish OCR correction + speech normalization + OTONOM 3.14.37 applied.');
