import fs from 'node:fs';

const aiClientPath = 'apps/web/src/lib/aiClient.ts';
let aiClient = fs.readFileSync(aiClientPath, 'utf8');

const oldOcrPromise = `  const ocrPromise = options.inputType === 'gazete' && imageCandidates[0]\n    ? extractTextLocally(imageCandidates[0], options.config.sourceName)\n    : Promise.resolve('');`;
const newOcrPromise = `  // Hermes 10 gazete akışı: gazete metni ana kaynak olarak görsel Vision modelinden okunur.\n  // Yerel Tesseract OCR gazete sahnelerini belirlemez; yanlış OCR metninin doğru Vision çıktısını\n  // ezmesi böylece engellenir. Diğer modlarda mevcut davranış korunur.\n  const ocrPromise = Promise.resolve('');`;
if (!aiClient.includes(oldOcrPromise)) throw new Error('aiClient OCR promise bloğu bulunamadı');
aiClient = aiClient.replace(oldOcrPromise, newOcrPromise);

const startMarker = `  const localCandidates = options.inputType === 'gazete' ? parseLocalOcrCandidates(localOcrText) : [];`;
const endMarker = `  return { ...result, script: normalizeScript(orderedScript) };`;
const start = aiClient.indexOf(startMarker);
const end = aiClient.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('aiClient gazete birleştirme bloğu bulunamadı');
const replacement = `  const localCandidates = options.inputType === 'gazete' ? parseLocalOcrCandidates(localOcrText) : [];\n  const hermes10Headlines = options.inputType === 'gazete'\n    ? (result.script.gazeteBasliklari?.length\n      ? result.script.gazeteBasliklari\n      : result.script.visionGazeteBasliklari || [])\n    : [];\n  const directVisionCandidates: VerifiedNewspaperCandidate[] = hermes10Headlines\n    .filter(item => item && String(item.baslik || '').trim() && String(item.aciklama || '').trim())\n    .sort((left, right) => {\n      const importance = Number(right.onem || 0) - Number(left.onem || 0);\n      if (importance) return importance;\n      return Number(right.w || 0) * Number(right.h || 0) - Number(left.w || 0) * Number(left.h || 0);\n    })\n    .slice(0, MAX_NEWSPAPER_STORIES)\n    .map((item, index) => ({\n      id: \\`H\\${index + 1}\\`,\n      text: String(item.baslik || '').replace(/\\s+/g, ' ').trim(),\n      detail: String(item.aciklama || '').replace(/\\s+/g, ' ').trim(),\n      confidence: 100,\n      score: Math.max(1, Number(item.onem || (100 - index * 10))) * 10_000\n        + Math.max(1, Number(item.w || 1)) * Math.max(1, Number(item.h || 1)),\n      x: Number(item.x || 0),\n      y: Number(item.y || 0),\n      w: Number(item.w || 1),\n      h: Number(item.h || 1),\n    }));\n\n  if (options.inputType === 'gazete') {\n    writeSystemLog(\n      \\`Hermes 10 gazete okuma: Vision modelinden \\${directVisionCandidates.length} başlık+açıklama alındı; yerel OCR sahne metnini değiştirmedi.\\`,\n      directVisionCandidates.length >= 5 ? 'success' : 'warn',\n    );\n  }\n  const orderedScript = options.inputType === 'gazete'\n    ? buildLockedNewspaperScript({\n      script: result.script,\n      candidates: directVisionCandidates,\n      configuredSourceName: options.config.sourceName,\n    })\n    : result.script;\n  if (directVisionCandidates.length) {\n    writeSystemLog(\n      \\`Gazete sahneleri hazır: \\${directVisionCandidates.length} başlık · her başlık tek sahne · başlık + açıklama.\\`,\n      'success',\n    );\n  }\n  return { ...result, script: normalizeScript(orderedScript) };`;
aiClient = aiClient.slice(0, start) + replacement + aiClient.slice(end + endMarker.length);
fs.writeFileSync(aiClientPath, aiClient);

const aiRoutePath = 'services/api-gateway/src/routes/ai.ts';
let aiRoute = fs.readFileSync(aiRoutePath, 'utf8');
const ocrBranchStart = `  if (ocrCandidates.length) {`;
const headlinesGuard = `  if (headlines.length < 5) return { ...script, visionGazeteBasliklari: headlines };`;
const branchStart = aiRoute.indexOf(ocrBranchStart, aiRoute.indexOf('export function normalizeNewspaperScript'));
const guardPos = aiRoute.indexOf(headlinesGuard, branchStart);
if (branchStart < 0 || guardPos < 0) throw new Error('ai.ts OCR override bloğu bulunamadı');
const replacementRoute = `  // Hermes 10 davranışı: görselden çıkarılan gazeteBasliklari ana kaynaktır.\n  // Yerel OCR adayları Vision çıktısını asla ezmez.\n  if (headlines.length < 5) return { ...script, visionGazeteBasliklari: headlines };\n`;
aiRoute = aiRoute.slice(0, branchStart) + replacementRoute + aiRoute.slice(guardPos + headlinesGuard.length);
fs.writeFileSync(aiRoutePath, aiRoute);

const promptPath = 'services/api-gateway/src/ai/promptBuilder.ts';
let prompt = fs.readFileSync(promptPath, 'utf8');
const gazeteStart = `1. Yalnız doğrulanmış 5-9 FARKLI HABERİ seç.`;
const gazeteEnd = `7. Reklam, ilan, bulmaca, tarih, fiyat, gazete logosu/masthead sloganı, “... YAZDI” biçimindeki yazar künyesi, fotoğraf altyazısı ve grafik/istatistik etiketini bağımsız haber sayma. Gazete ilk sayfası devam sahnelerinde sabit kalacağı için imagePrompts boş dizi olmalı.`;
const gs = prompt.indexOf(gazeteStart);
const ge = prompt.indexOf(gazeteEnd, gs);
if (gs < 0 || ge < 0) throw new Error('promptBuilder gazete kuralları bulunamadı');
const hermesRules = `1. Görseldeki TÜM gerçek haber başlıklarını doğrudan gazete sayfasından oku. En az 5, en fazla 9 farklı haber seç; büyük ana manşetten küçük başlıklara doğru sırala. Aynı haberi iki kez kullanma.\n2. Her haber için gazeteBasliklari içinde: baslik, aciklama, onem, x, y, w, h alanlarını doldur. baslik gazetedeki gerçek başlık olmalı. aciklama o başlığın hemen yanında/altında basılı ve habere bağlı metinden 1-2 doğal Türkçe cümle olmalı; başka haberin metnini karıştırma.\n3. Türkçe karakterleri ve özel isimleri doğru yaz. Görselde açıkça okuyamadığın kelimeyi uydurma. Sayı, tarih, yüzde, para, kişi ve kurum adlarını görselde gördüğün biçimde koru.\n4. Kalın siyah/kırmızı büyük başlıkları ve belirgin haber kutularını önceliklendir. Reklam, ilan, bulmaca, gazete logosu, masthead sloganı, yazar künyesi ve fotoğraf altyazısını bağımsız haber sayma.\n5. Kapakta 3-4 kelimelik clickbait kullan; gazetenin kendi haber dili ve vurgusuyla uyumlu olsun, kaynakta olmayan siyasi etiket veya iddia ekleme.\n6. Her gazete başlığı videoda yalnız BİR sahne olacak. Sahne metni sırası: özgün başlık, ardından o başlığa ait açıklama. Gazete ilk sayfası sabit görsel olarak kullanılacağı için imagePrompts her zaman boş dizi olmalı.\n7. gazeteBasliklari ana çıktıdır. videoSlides taslak olabilir; istemci gazeteBasliklari öğelerini sırayla tek sahneye dönüştürür.`;
prompt = prompt.slice(0, gs) + hermesRules + prompt.slice(ge + gazeteEnd.length);
fs.writeFileSync(promptPath, prompt);

const testPath = 'services/api-gateway/src/routes/ai-newspaper.test.ts';
let test = fs.readFileSync(testPath, 'utf8');
if (!test.includes('Hermes 10 Vision başlıkları')) {
  test += `\n\ndescribe('Hermes 10 Vision başlıkları', () => {\n  it('OCR adayları verilse bile 5+ Vision gazete başlığını ana kaynak olarak korur', () => {\n    const vision = Array.from({ length: 6 }, (_, index) => ({\n      baslik: \\`GERÇEK BAŞLIK \\${index + 1}\\`,\n      aciklama: \\`Bu haberin görselden okunan doğru açıklama cümlesi \\${index + 1}.\\`,\n      onem: 100 - index, x: 5, y: 5 + index * 10, w: 70, h: 8,\n    }));\n    const badOcr = [{ id: 'H1', text: 'SÜYÜK MN AYLIK', detail: 'bozuk ocr', confidence: 90, score: 99, x: 0, y: 0, w: 1, h: 1 }];\n    const normalized = normalizeNewspaperScript({ gazeteBasliklari: vision, videoSlides: [] }, badOcr);\n    expect(normalized.gazeteBasliklari).toEqual(vision);\n    expect(normalized.videoSlides).toHaveLength(6);\n    expect(normalized.videoSlides[0].sourceHeadline).toBe('GERÇEK BAŞLIK 1');\n    expect(normalized.videoSlides[0].spokenText).toContain('doğru açıklama');\n    expect(normalized.videoSlides[0].spokenText).not.toContain('SÜYÜK');\n  });\n});\n`;
}
fs.writeFileSync(testPath, test);

console.log('Hermes 10 newspaper Vision-first reader restored.');
// trigger: 2026-08-26