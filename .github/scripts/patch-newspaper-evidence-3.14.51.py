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


# services/api-gateway/src/ai/promptBuilder.ts
path = 'services/api-gateway/src/ai/promptBuilder.ts'
anchor = '''function newspaperSystemPrompt(language: string) {
'''
verification_prompt = '''function newspaperVerificationSystemPrompt(language: string) {
  return `Sen OTONOM gazete birebir metin doğrulama motorusun.
Çıktının tamamı geçerli JSON olmalı; Markdown, açıklama, düşünce metni veya kod bloğu kullanma.
Dil: ${language}.

İKİNCİ GEÇİŞ — BİREBİR BAŞLIK + SPOT DOĞRULAMA:
1. Gönderilen TEK görsel H1, H2, H3... etiketli bağımsız gazete haber kırpımlarından oluşur. Her kart ayrı bir haber kanıtıdır.
2. sourceHeadlineId alanını kartın H etiketinden aynen kopyala. H kimliği uydurma veya değiştirme.
3. baslik yalnız kartta büyük/başlık tipografisiyle basılı gerçek haber başlığıdır. Harfleri, Türkçe karakterleri, kelime sırasını ve sayıları birebir koru. Dilbilgisi düzeltme, tahmin, normalleştirme veya yeniden yazma yapma.
4. aciklama yalnız AYNI kartta o başlığın hemen altında/yanında fiziksel olarak bağlı spot veya haber girişinden 1-2 tam cümledir. Başka H kartından veya komşu haberden tek kelime taşıma.
5. Bir kelimeyi güvenle okuyamıyorsan o H kartını tamamen atla. Eksik kelimeyi tahmin etme.
6. Reklam, fotoğraf altyazısı, yazar künyesi, sayfa masthead'i veya başka haber metnini açıklamaya katma.
7. En az 5 H kartını başlık+açıklama olarak güvenle doğrulayamıyorsan isContentUnreadable=true yap. Sayıyı tamamlamak için uydurma üretme.
8. Bu ikinci geçişte koordinatlar kullanılmayacak; x=0, y=0, w=100, h=100 döndür.
9. onem alanını H1 için 100, H2 için 90, H3 için 80 şeklinde azalan sırada ver.

Yalnız şu JSON yapısını döndür:
{
  "isContentUnreadable": boolean,
  "gazeteBasliklari": [
    {"sourceHeadlineId": "H1", "baslik": string, "aciklama": string, "onem": number, "x": 0, "y": 0, "w": 100, "h": 100}
  ]
}`;
}

'''
replace(path, anchor, verification_prompt + anchor)

old_system = '''  const system = isGazete
    ? newspaperSystemPrompt(language)
    : standardSystemPrompt(language, input);
'''
new_system = '''  const isNewspaperVerification = isGazete && config.analysisMode === 'newspaper_verify';
  const system = isNewspaperVerification
    ? newspaperVerificationSystemPrompt(language)
    : isGazete
      ? newspaperSystemPrompt(language)
      : standardSystemPrompt(language, input);
'''
replace(path, old_system, new_system)

old_tail = '''    text: isGazete
      ? `Kaynak adı yalnız bağlam içindir: ${config.sourceName || 'belirtilmedi'}\nTek birleşik görselde soldaki tam sayfayı ve sağdaki iki yakın planı birlikte incele, tekrarları birleştir ve yalnız isContentUnreadable + gazeteBasliklari JSON yapısını döndür.`
      : `Kaynak adı: ${config.sourceName || 'belirtilmedi'}\nİçerik türü: ${config.tip || 'haber'}\nVideo stili: ${config.videoStyle || 'cinematic'}\nEk kullanıcı yorumu: ${config.yorum || 'yok'}\nİçeriği analiz et ve yalnız şemaya uyan JSON döndür.`,
'''
new_tail = '''    text: isNewspaperVerification
      ? `Kaynak adı yalnız bağlam içindir: ${config.sourceName || 'belirtilmedi'}\nH1-H9 kartlarını birbirinden bağımsız oku. sourceHeadlineId + birebir baslik + yalnız aynı karta bağlı aciklama alanlarını döndür.`
      : isGazete
        ? `Kaynak adı yalnız bağlam içindir: ${config.sourceName || 'belirtilmedi'}\nTek birleşik görselde soldaki tam sayfayı ve sağdaki iki yakın planı birlikte incele, tekrarları birleştir ve yalnız isContentUnreadable + gazeteBasliklari JSON yapısını döndür.`
        : `Kaynak adı: ${config.sourceName || 'belirtilmedi'}\nİçerik türü: ${config.tip || 'haber'}\nVideo stili: ${config.videoStyle || 'cinematic'}\nEk kullanıcı yorumu: ${config.yorum || 'yok'}\nİçeriği analiz et ve yalnız şemaya uyan JSON döndür.`,
'''
replace(path, old_tail, new_tail)


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

old_flags = '''    const ocrCandidates = parseOcrHeadlineCandidates(body.text || '');
    const isNewspaper = body.inputType === 'gazete';
    const generated = await generateWithFallback(c.env, {
'''
new_flags = '''    const ocrCandidates = parseOcrHeadlineCandidates(body.text || '');
    const isNewspaper = body.inputType === 'gazete';
    const isNewspaperVerification = isNewspaper && body.config?.analysisMode === 'newspaper_verify';
    const generated = await generateWithFallback(c.env, {
'''
replace(path, old_flags, new_flags)

replace(
    path,
    "      temperature: isNewspaper ? 0.05 : 0.2,\n",
    "      temperature: isNewspaperVerification ? 0 : isNewspaper ? 0.05 : 0.2,\n",
)

old_validator = '''      validateResponse: isNewspaper
        ? text => validateHermesNewspaperResponse(text, [])
        : validateHermesScriptResponse,
'''
new_validator = '''      validateResponse: isNewspaperVerification
        ? validateNewspaperVerificationResponse
        : isNewspaper
          ? text => validateHermesNewspaperResponse(text, [])
          : validateHermesScriptResponse,
'''
replace(path, old_validator, new_validator)

old_script = '''    const parsedScript = parseAiJsonObject(generated.text);
    const script = isNewspaper
      ? normalizeNewspaperScript(parsedScript, ocrCandidates)
      : parsedScript;
'''
new_script = '''    const parsedScript = parseAiJsonObject(generated.text);
    const script = isNewspaperVerification
      ? normalizeNewspaperVerificationScript(parsedScript)
      : isNewspaper
        ? normalizeNewspaperScript(parsedScript, ocrCandidates)
        : parsedScript;
'''
replace(path, old_script, new_script)

print('OTONOM 3.14.51 newspaper evidence patch applied')
