from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f'{path}: expected {count}, found {actual}: {old[:160]!r}')
    p.write_text(text.replace(old, new), encoding='utf-8')


# apps/web/src/lib/aiClient.ts
path = 'apps/web/src/lib/aiClient.ts'
replace(
    path,
    "import { prepareNewspaperVisionViews } from './newspaperVisionViews';\n",
    "import { prepareNewspaperVisionViews } from './newspaperVisionViews';\nimport {\n  applyVerifiedNewspaperText,\n  prepareNewspaperEvidenceSheet,\n} from './newspaperEvidenceVerification';\n",
)

anchor = '''async function mediaToNewspaperVisionViews(media: MediaFile): Promise<AnalysisImage[]> {
  const url = media.url || media.thumbnailUrl;
  if (!url || media.type !== 'image') {
    throw new Error('Gazete çoklu Vision görünümü için geçerli bir gazete görseli gerekli.');
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${media.name} gazete Vision analizi için açılamadı.`);
  const source = await response.blob();
  return prepareNewspaperVisionViews(source, media.name || 'Gazete');
}
'''
replacement = anchor + '''
async function mediaToNewspaperEvidenceImage(
  media: MediaFile,
  candidates: VerifiedNewspaperCandidate[],
): Promise<AnalysisImage> {
  const url = media.url || media.thumbnailUrl;
  if (!url || media.type !== 'image') {
    throw new Error('Gazete birebir doğrulaması için geçerli bir gazete görseli gerekli.');
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${media.name} birebir doğrulama için açılamadı.`);
  const source = await response.blob();
  return prepareNewspaperEvidenceSheet(source, candidates, media.name || 'Gazete');
}
'''
replace(path, anchor, replacement)

old_flow = '''  const candidates = buildHermes10NewspaperCandidates(result.script);
  writeSystemLog(
    `Hermes 10 gazete okuma: Vision modelinden ${candidates.length} gerçek başlık+açıklama alındı.`,
    candidates.length >= 5 ? 'success' : 'warn',
  );

  const orderedScript = buildLockedNewspaperScript({
    script: result.script,
    candidates,
    configuredSourceName: options.config.sourceName,
  });

  writeSystemLog(
    `Gazete sahneleri hazır: ${orderedScript.videoSlides.length} haber · her haber tek sahne · özgün başlık + açıklama · AI görsel yok.`,
    'success',
  );

  return { ...result, script: normalizeScript(orderedScript) };
'''
new_flow = '''  const candidates = buildHermes10NewspaperCandidates(result.script);
  writeSystemLog(
    `Hermes 10 gazete keşfi: Vision modelinden ${candidates.length} haber bölgesi bulundu; bu metinler henüz yayına alınmayacak.`,
    candidates.length >= 5 ? 'success' : 'warn',
  );
  if (candidates.length < 5) {
    throw new Error('Gazete keşfinde en az 5 haber bölgesi bulunamadı; birebir okuma doğrulaması başlatılmadı.');
  }

  const verificationImage = await mediaToNewspaperEvidenceImage(imageCandidates[0], candidates);
  writeSystemLog(
    `Gazete birebir okuma doğrulaması: ${candidates.length} haber H1-H${candidates.length} olarak ayrı kırpımlarda büyütüldü; ikinci Vision geçişi başlatılıyor.`,
  );
  const verificationResult = await request<AnalyzeResult>('/analyze', {
    inputType: 'gazete',
    text: 'GAZETE BİREBİR DOĞRULAMA: Görsel H1-H9 etiketli bağımsız haber kırpımlarından oluşur. Her H kartında yalnız o kartın basılı başlığını ve fiziksel olarak bağlı spot/açıklamasını birebir oku. Önceki okuma metnini tahmin veya düzeltme kaynağı olarak kullanma. Kartlar arasında kelime veya cümle taşıma. sourceHeadlineId alanını kart etiketiyle aynen döndür.',
    images: [verificationImage],
    config: {
      ...requestConfig,
      analysisMode: 'newspaper_verify',
    },
  });

  if (verificationResult.provider === 'local-fallback') {
    throw new Error(
      `Gazete birebir okuma doğrulaması başarısız oldu; ilk geçişteki olası yanlış metin videoya alınmadı. ${verificationResult.fallbackReason || ''}`.trim(),
    );
  }

  const verifiedCandidates = applyVerifiedNewspaperText(
    candidates,
    verificationResult.script.gazeteBasliklari || [],
  );
  writeSystemLog(
    `Gazete birebir doğrulama tamamlandı: ${verifiedCandidates.length}/${candidates.length} haber başlığı + açıklaması ikinci Vision okumasıyla H kimliğine kilitlendi.`,
    verifiedCandidates.length >= 5 ? 'success' : 'warn',
  );

  const orderedScript = buildLockedNewspaperScript({
    script: verificationResult.script,
    candidates: verifiedCandidates,
    configuredSourceName: options.config.sourceName,
  });

  writeSystemLog(
    `Gazete sahneleri hazır: ${orderedScript.videoSlides.length} haber · yazı ve TTS yalnız ikinci birebir Vision okumasından üretildi · AI görsel yok.`,
    'success',
  );

  return {
    ...verificationResult,
    attempts: [...result.attempts, ...verificationResult.attempts],
    script: normalizeScript(orderedScript),
  };
'''
replace(path, old_flow, new_flow)


# services/api-gateway/src/ai/providerRouter.ts
path = 'services/api-gateway/src/ai/providerRouter.ts'
replace(
    path,
    "        properties: {\n          baslik: { type: 'STRING' },\n          aciklama: { type: 'STRING' },",
    "        properties: {\n          sourceHeadlineId: { type: 'STRING' },\n          baslik: { type: 'STRING' },\n          aciklama: { type: 'STRING' },",
    count=1,
)


# services/api-gateway/src/routes/ai.ts
path = 'services/api-gateway/src/routes/ai.ts'
anchor = '''function normalizeHeadline(value: unknown) {
  return String(value || '').toLocaleLowerCase('tr-TR').replace(/[^\\p{L}\\p{N}]+/gu, ' ').trim();
}
'''
insert = anchor + '''
function verificationHeadlineId(value: unknown) {
  const id = String(value || '').trim().toUpperCase();
  return /^H\\d+$/.test(id) ? id : '';
}

function validateNewspaperVerificationResponse(text: string) {
  validateHermesNewspaperResponse(text, []);
  const parsed = parseAiJsonObject(text);
  const headlines = Array.isArray(parsed.gazeteBasliklari)
    ? parsed.gazeteBasliklari.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];
  const ids = new Set(
    headlines
      .map(item => verificationHeadlineId(item.sourceHeadlineId))
      .filter(Boolean),
  );
  if (ids.size < 5) {
    throw new Error('Gazete birebir doğrulamasında en az 5 farklı H kimliği korunamadı; diğer sağlayıcı deneniyor.');
  }
}

export function normalizeNewspaperVerificationScript(script: Record<string, unknown>) {
  const rawHeadlines = Array.isArray(script.gazeteBasliklari)
    ? script.gazeteBasliklari.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];
  const headlines = rawHeadlines
    .map(headline => ({
      ...headline,
      sourceHeadlineId: verificationHeadlineId(headline.sourceHeadlineId),
      baslik: String(headline.baslik || '').replace(/\\s+/g, ' ').trim(),
      aciklama: String(headline.aciklama || '').replace(/\\s+/g, ' ').trim(),
    }))
    .filter(headline => headline.sourceHeadlineId && headline.baslik && headline.aciklama)
    .filter((headline, index, all) => all.findIndex(item => item.sourceHeadlineId === headline.sourceHeadlineId) === index)
    .sort((left, right) => Number(left.sourceHeadlineId.slice(1)) - Number(right.sourceHeadlineId.slice(1)))
    .slice(0, 9);

  return {
    ...script,
    isContentUnreadable: headlines.length < 5,
    videoSlides: [],
    visionGazeteBasliklari: headlines,
    gazeteBasliklari: headlines,
  };
}
'''
replace(path, anchor, insert)

replace(
    path,
    "    const ocrCandidates = parseOcrHeadlineCandidates(body.text || '');\n    const isNewspaper = body.inputType === 'gazete';\n    const generated = await generateWithFallback(c.env, {\n",
    "    const ocrCandidates = parseOcrHeadlineCandidates(body.text || '');\n    const isNewspaper = body.inputType === 'gazete';\n    const isNewspaperVerification = isNewspaper && body.config?.analysisMode === 'newspaper_verify';\n    const generated = await generateWithFallback(c.env, {\n",
)

replace(
    path,
    "      temperature: isNewspaper ? 0.05 : 0.2,\n",
    "      temperature: isNewspaperVerification ? 0 : isNewspaper ? 0.05 : 0.2,\n",
)

replace(
    path,
    "      validateResponse: isNewspaper\n        ? text => validateHermesNewspaperResponse(text, [])\n        : validateHermesScriptResponse,\n",
    "      validateResponse: isNewspaperVerification\n        ? validateNewspaperVerificationResponse\n        : isNewspaper\n          ? text => validateHermesNewspaperResponse(text, [])\n          : validateHermesScriptResponse,\n",
)

replace(
    path,
    "    const parsedScript = parseAiJsonObject(generated.text);\n    const script = isNewspaper\n      ? normalizeNewspaperScript(parsedScript, ocrCandidates)\n      : parsedScript;\n",
    "    const parsedScript = parseAiJsonObject(generated.text);\n    const script = isNewspaperVerification\n      ? normalizeNewspaperVerificationScript(parsedScript)\n      : isNewspaper\n        ? normalizeNewspaperScript(parsedScript, ocrCandidates)\n        : parsedScript;\n",
)

print('OTONOM 3.14.51 newspaper evidence patch v2 applied')
