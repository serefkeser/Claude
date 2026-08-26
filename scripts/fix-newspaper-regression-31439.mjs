import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOrFail(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`${label}: beklenen metin bulunamadı`);
  return source.replace(before, after);
}

// 1) Gazete doğrulama: ham/tek-motor yerel OCR artık kendi başına videoya giremez.
const recoveryPath = 'apps/web/src/lib/newspaperVisionRecovery.ts';
let recovery = read(recoveryPath);
const localBlockStart = "    const localMatch = options.localCandidates.find(candidate => isDuplicateHeadline(candidate.text, headline));\n";
const localBlockEnd = "\n    const reason = validateVisionCandidate(proposal, '', true);";
const start = recovery.indexOf(localBlockStart);
const end = recovery.indexOf(localBlockEnd, start);
if (start < 0 || end < 0) throw new Error('newspaperVisionRecovery: localMatch bloğu bulunamadı');
const replacement = [
  "    const localMatch = options.localCandidates.find(candidate => isDuplicateHeadline(candidate.text, headline));",
  "    if (localMatch) {",
  "      const correctionReason = validateVisionCandidate(proposal, '', true);",
  "      if (!correctionReason) {",
  "        ordered.push({",
  "          ...localMatch,",
  "          text: headline,",
  "          detail: normalizeVisibleText(proposal.aciklama),",
  "          recovered: false,",
  "        });",
  "      } else {",
  "        rejected.push({",
  "          headline,",
  "          reason: 'aynı haber kutusunda bağımsız OCR + görsel metin mutabakatı yok: ' + correctionReason,",
  "        });",
  "      }",
  "      continue;",
  "    }",
  "",
  "    const reason = validateVisionCandidate(proposal, '', true);",
].join('\n');
recovery = recovery.slice(0, start) + replacement + recovery.slice(end + localBlockEnd.length);
recovery = recovery.replace(/\n  for \(const candidate of options\.localCandidates\) \{[\s\S]*?\n  \}\n\n  const selected = ordered\.slice\(0, options\.maximumStories\);/, "\n  // Fail-closed: Vision ile aynı haber kutusunda doğrulanmayan yerel OCR adayı\n  // asla sonradan fallback olarak geri eklenmez. Yanlış okumaktansa haber atlanır.\n  const selected = ordered.slice(0, options.maximumStories);");
recovery = recovery.replace("  const rejectedLocalCandidateIds = new Set<string>();\n", '');
write(recoveryPath, recovery);

// 2) Kapak clickbait kanıtı yalnız doğrulanmış başlıklardan gelsin; bozuk detay kelimeleri kapağa sızmasın.
const pipelinePath = 'apps/web/src/lib/newspaperPipeline.ts';
let pipeline = read(pipelinePath);
pipeline = replaceOrFail(
  pipeline,
  "  return candidates\n    .flatMap(candidate => [candidate.text, candidate.detail])\n    .map(normalize)",
  "  return candidates\n    .map(candidate => candidate.text)\n    .map(normalize)",
  'newspaperPipeline editorial evidence',
);
write(pipelinePath, pipeline);

// 3) Son Söz: anonim atasözlerini çıkar; yalnız adı belli düşünür/lider/yazar havuzu kullan.
const storyboardPath = 'apps/web/src/lib/storyboard.ts';
let storyboard = read(storyboardPath);
storyboard = storyboard.replace(/\n  \{ id: 'atasozu-[^\n]+\},/g, '');
storyboard = storyboard.replace("const FINAL_WORD_HISTORY_LIMIT = 10;", "const FINAL_WORD_HISTORY_LIMIT = 7;");
write(storyboardPath, storyboard);

// 4) Regresyon testleri: kullanıcının Cumhuriyet videosunda görülen gerçek bozuk okumalar.
const recoveryTestPath = 'apps/web/src/lib/newspaperVisionRecovery.test.ts';
let recoveryTest = read(recoveryTestPath);
recoveryTest = replaceOrFail(
  recoveryTest,
  "    expect(result.candidates[0].detail).toBe(local.detail);\n  });\n\n  it('aynı haber kutusundan yakın OCR yoksa AI metniyle kelime düzeltmez'",
  "    expect(result.candidates).toHaveLength(0);\n  });\n\n  it('Cumhuriyet örneğindeki SÜYÜK ve MN aylık gibi ham OCR bozulmalarını asla seslendirme adayına sokmaz', () => {\n    const result = recoverNewspaperCandidatesFromVision({\n      localCandidates: [{\n        id: 'H1',\n        text: 'Tarihin akışı değişti',\n        detail: \"SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.\",\n        confidence: 88, score: 12000, x: 10, y: 20, w: 900, h: 140,\n      }],\n      visionCandidates: [{\n        baslik: 'Tarihin akışı değişti',\n        aciklama: \"Büyük Atatürk'ün başkomutanlığında Türk ordusu, Sakarya Zaferi'nin ardından 11 aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başladı.\",\n        localCropEvidence: \"Tarihin akışı değişti SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.\",\n      }],\n      localOcrText: \"OCR TAM METİN: Tarihin akışı değişti SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.\",\n      maximumStories: 9,\n    });\n    expect(result.candidates).toHaveLength(0);\n  });\n\n  it('Vision ile eşleşmeyen ham yerel OCR adayını fallback olarak geri eklemez', () => {\n    const result = recoverNewspaperCandidatesFromVision({\n      localCandidates: [{\n        id: 'H1', text: 'Tarihin akışı değişti',\n        detail: \"SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.\",\n        confidence: 88, score: 12000, x: 10, y: 20, w: 900, h: 140,\n      }],\n      visionCandidates: [],\n      localOcrText: \"OCR TAM METİN: Tarihin akışı değişti SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla 26 Ağustos 1922'de Büyük Taarruz'a başlandı.\",\n      maximumStories: 9,\n    });\n    expect(result.candidates).toHaveLength(0);\n  });\n\n  it('aynı haber kutusundan yakın OCR yoksa AI metniyle kelime düzeltmez'",
  'newspaperVisionRecovery regression insertion',
);
write(recoveryTestPath, recoveryTest);

const pipelineTestPath = 'apps/web/src/lib/newspaperPipeline.test.ts';
let pipelineTest = read(pipelineTestPath);
const pipelineAnchor = "  it('kaynakta bulunmayan ideolojik etiketli clickbait reddedilir', () => {";
const pipelineAdded = [
  "  it('bozuk açıklama kelimesini clickbait kapağına taşımaz', () => {",
  "    const corrupted = stories.map((story, index) => index === 0",
  "      ? { ...story, detail: \"SÜYÜK Atatürk'ün ardından MN aylık hazırlıkla gelişmeler yaşandı.\" }",
  "      : story);",
  "    const script = aiScript();",
  "    script.thumbnailText = 'Tarihin SÜYÜK akışı';",
  "    const result = buildLockedNewspaperScript({ script, candidates: corrupted, configuredSourceName: 'Cumhuriyet' });",
  "    expect(result.thumbnailText).not.toContain('SÜYÜK');",
  "    expect(result.thumbnailText).not.toContain('MN');",
  "  });",
  "",
  pipelineAnchor,
].join('\n');
if (!pipelineTest.includes(pipelineAnchor)) throw new Error('newspaperPipeline test anchor yok');
pipelineTest = pipelineTest.replace(pipelineAnchor, pipelineAdded);
write(pipelineTestPath, pipelineTest);

const storyboardTestPath = 'apps/web/src/lib/storyboard.test.ts';
let storyboardTest = read(storyboardTestPath);
storyboardTest = storyboardTest.replace(
  "/— (Mustafa Kemal Atatürk|Sokrates|René Descartes|Francis Bacon|Yunus Emre|Epiktetos|Türk atasözü)/",
  "/— (Mustafa Kemal Atatürk|Sokrates|René Descartes|Francis Bacon|Yunus Emre|Epiktetos)/",
);
storyboardTest = storyboardTest.replace(
  "expect(TURKISH_FINAL_WORDS.length).toBeGreaterThanOrEqual(12);",
  "expect(TURKISH_FINAL_WORDS.length).toBeGreaterThanOrEqual(8);\n    expect(TURKISH_FINAL_WORDS.every(item => item.author !== 'Türk atasözü')).toBe(true);",
);
write(storyboardTestPath, storyboardTest);

console.log('Cumhuriyet newspaper regression fix applied.');
