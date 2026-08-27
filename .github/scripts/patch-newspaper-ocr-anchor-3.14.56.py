from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:180]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


AI_CLIENT = 'apps/web/src/lib/aiClient.ts'
PROMPT = 'services/api-gateway/src/ai/promptBuilder.ts'

replace_once(
    AI_CLIENT,
    "import { fetchWithNetworkRetry } from './networkRetry';",
    "import { anchorNewspaperCandidatesWithLocalOcr } from './newspaperOcrAnchoring';\nimport { fetchWithNetworkRetry } from './networkRetry';",
)

replace_once(
    AI_CLIENT,
    "const MAX_NEWSPAPER_IMAGE_EDGE = 2600;",
    "const MAX_NEWSPAPER_IMAGE_EDGE = 2600;\nconst MAX_NEWSPAPER_DISCOVERY_CANDIDATES = 12;",
)

replace_once(
    AI_CLIENT,
    "async function mediaToNewspaperHeadlineOcrEvidence(\n  media: MediaFile,\n  candidates: VerifiedNewspaperCandidate[],\n) {\n  const url = media.url || media.thumbnailUrl;\n  if (!url || media.type !== 'image') {\n    throw new Error('Gazete yerel OCR doğrulaması için geçerli bir gazete görseli gerekli.');\n  }\n  const response = await fetch(url);\n  if (!response.ok) throw new Error(`${media.name} yerel OCR doğrulaması için açılamadı.`);\n  const source = await response.blob();\n  return readLocalHeadlineOcrEvidence(source, candidates);\n}\n",
    "async function mediaToNewspaperHeadlineOcrEvidence(\n  media: MediaFile,\n  candidates: VerifiedNewspaperCandidate[],\n) {\n  const url = media.url || media.thumbnailUrl;\n  if (!url || media.type !== 'image') {\n    throw new Error('Gazete yerel OCR doğrulaması için geçerli bir gazete görseli gerekli.');\n  }\n  const response = await fetch(url);\n  if (!response.ok) throw new Error(`${media.name} yerel OCR doğrulaması için açılamadı.`);\n  const source = await response.blob();\n  return readLocalHeadlineOcrEvidence(source, candidates);\n}\n\nasync function mediaToNewspaperOcrAnchors(\n  media: MediaFile,\n  candidates: VerifiedNewspaperCandidate[],\n) {\n  const url = media.url || media.thumbnailUrl;\n  if (!url || media.type !== 'image') {\n    throw new Error('Gazete OCR konum ankrajı için geçerli bir gazete görseli gerekli.');\n  }\n  const response = await fetch(url);\n  if (!response.ok) throw new Error(`${media.name} OCR konum ankrajı için açılamadı.`);\n  const source = await response.blob();\n  return anchorNewspaperCandidatesWithLocalOcr(source, candidates, MAX_NEWSPAPER_STORIES);\n}\n",
)

replace_once(
    AI_CLIENT,
    ".slice(0, MAX_NEWSPAPER_STORIES)\n    .map((item, index) => ({",
    ".slice(0, MAX_NEWSPAPER_DISCOVERY_CANDIDATES)\n    .map((item, index) => ({",
)

replace_once(
    AI_CLIENT,
    "? 'GAZETE KEŞFİ: Gönderilen TEK görsel doğrudan orijinal tam gazete sayfasıdır. Bu ilk geçişin görevi yayın metni yazmak değil, en az 5 gerçek haber bölgesini bulup x/y/w/h koordinatlarını bu tam sayfanın 0-100 sisteminde vermektir. baslik/aciklama yalnız bölgeyi tanımaya yarayan okuma ipucudur ve videoda kullanılmayacaktır. Okuyamadığın kelimeyi uydurma.'",
    "? 'GAZETE KEŞFİ: Gönderilen TEK görsel doğrudan orijinal tam gazete sayfasıdır. Bu ilk geçişin görevi yayın metni yazmak değil, güvenle ayırt edebildiğin mümkünse 8-12 farklı gerçek haber bölgesini bulmaktır; 8 yoksa en az 5 bul. x/y/w/h yalnız kaba konum ipucudur ve istemci gerçek piksel konumunu yerel OCR kelime kutularından yeniden sabitleyecektir. baslik/aciklama yalnız bölgeyi tanımaya yarayan okuma ipucudur ve videoda kullanılmayacaktır. Okuyamadığın kelimeyi uydurma.'",
)

old_block = """  const candidates = buildHermes10NewspaperCandidates(result.script);\n  writeSystemLog(\n    `Hermes 10 gazete keşfi: Vision modelinden ${candidates.length} haber bölgesi bulundu; bu metinler henüz yayına alınmayacak.`,\n    candidates.length >= 5 ? 'success' : 'warn',\n  );\n  if (candidates.length < 5) {\n    throw new Error('Gazete keşfinde en az 5 haber bölgesi bulunamadı; birebir okuma doğrulaması başlatılmadı.');\n  }\n\n  const verificationImage = await mediaToNewspaperEvidenceImage(imageCandidates[0], candidates);\n"""
new_block = """  const discoveredCandidates = buildHermes10NewspaperCandidates(result.script);\n  writeSystemLog(\n    `Hermes 10 gazete keşfi: Vision modelinden ${discoveredCandidates.length} haber bölgesi bulundu; koordinatlar henüz güvenilir kabul edilmeyecek ve bu metinler yayına alınmayacak.`,\n    discoveredCandidates.length >= 5 ? 'success' : 'warn',\n  );\n  if (discoveredCandidates.length < 5) {\n    throw new Error('Gazete keşfinde en az 5 haber bölgesi bulunamadı; OCR konum ankrajı başlatılmadı.');\n  }\n\n  writeSystemLog(\n    'Gazete OCR konum ankrajı: Tesseract tam sayfada yalnız blocks/words/bbox ile başlıkların gerçek piksel konumunu bulacak; OCR metni yayın veya TTS kaynağı olmayacak.',\n  );\n  let anchorResult: Awaited<ReturnType<typeof mediaToNewspaperOcrAnchors>>;\n  try {\n    anchorResult = await mediaToNewspaperOcrAnchors(imageCandidates[0], discoveredCandidates);\n  } catch (error) {\n    const reason = error instanceof Error ? error.message : String(error);\n    throw new Error(`Gazete OCR konum ankrajı çalışmadı; AI koordinatına güvenilerek video üretilmedi. ${reason}`);\n  }\n  anchorResult.rejections.forEach(rejection => writeSystemLog(\n    `Gazete OCR ankrajı reddedildi ${rejection.id}: ${rejection.reason} · keşif-ipucu=\"${rejection.headline}\"`,\n    'warn',\n  ));\n  const candidates = anchorResult.candidates;\n  writeSystemLog(\n    `Gazete OCR konum ankrajı tamamlandı: ${candidates.length}/${discoveredCandidates.length} benzersiz haber gerçek OCR kelime kutularına sabitlendi · ${anchorResult.lineCount} OCR satırı incelendi.`,\n    candidates.length >= 5 ? 'success' : 'warn',\n  );\n  if (candidates.length < 5) {\n    throw new Error(`En az 5 haber gerçek OCR kelime kutularına güvenle sabitlenemedi; yanlış H kırpımı üretilmedi. Ankrajlanan: ${candidates.length}/${discoveredCandidates.length}.`);\n  }\n\n  const verificationImage = await mediaToNewspaperEvidenceImage(imageCandidates[0], candidates);\n"""
replace_once(AI_CLIENT, old_block, new_block)

replace_once(
    AI_CLIENT,
    "`Gazete birebir okuma doğrulaması: ${candidates.length} haber H1-H${candidates.length} olarak ayrı kırpımlarda büyütüldü; ikinci Vision geçişi başlatılıyor.`,",
    "`Gazete birebir okuma doğrulaması: OCR kelime kutularına sabitlenen ${candidates.length} haber H1-H${candidates.length} olarak ayrı kırpımlarda büyütüldü; ikinci Vision geçişi başlatılıyor.`,",
)

replace_once(
    AI_CLIENT,
    "text: 'GAZETE BİREBİR DOĞRULAMA: Görsel H1-H9 etiketli bağımsız haber kırpımlarından oluşur. Her karttaki kırmızı çerçeve hedef haber bölgesidir. Yalnız o hedefteki basılı başlığı ve fiziksel olarak bağlı spot/açıklamasını birebir oku. İlk keşif metnini tahmin veya düzeltme kaynağı olarak kullanma. Kartlar arasında kelime veya cümle taşıma. sourceHeadlineId alanını kart etiketiyle aynen döndür.',",
    "text: 'GAZETE BİREBİR DOĞRULAMA: Görsel H1-H9 etiketli bağımsız haber kırpımlarından oluşur. Her karttaki kırmızı çerçeve AI koordinatından değil, tam sayfadaki yerel OCR kelime kutularından deterministik olarak sabitlenen hedef başlık bölgesidir. Yalnız o hedefteki basılı başlığı ve fiziksel olarak bağlı spot/açıklamasını birebir oku. İlk keşif metnini tahmin veya düzeltme kaynağı olarak kullanma. Kartlar arasında kelime veya cümle taşıma. sourceHeadlineId alanını kart etiketiyle aynen döndür.',",
)

replace_once(
    PROMPT,
    "2. Her kartta kırmızı çerçeve ilk geçişin bulduğu hedef haber bölgesini gösterir. Öncelikle kırmızı çerçeve içindeki büyük başlığı oku; açıklamayı yalnız aynı kartta bu başlığa fiziksel olarak bağlı metinden al.",
    "2. Her kartta kırmızı çerçeve, ilk Vision geçişinin kaba koordinatından bağımsız olarak tam sayfadaki yerel OCR kelime kutularından deterministik biçimde sabitlenen hedef başlığı gösterir. Öncelikle kırmızı çerçeve içindeki büyük başlığı oku; açıklamayı yalnız aynı kartta bu başlığa fiziksel olarak bağlı metinden al.",
)

replace_once(
    PROMPT,
    "2. Bu geçişin görevi yayın metni üretmek değil, en az 5 en fazla 9 gerçek haber bölgesini bulup ORİJİNAL sayfadaki konumlarını vermektir. Bu geçişteki baslik/aciklama yalnız bölge kimliği için okuma ipucudur ve videoda kullanılmayacaktır.",
    "2. Bu geçişin görevi yayın metni üretmek değil, güvenle ayırt edebildiğin mümkünse 8-12 farklı gerçek haber bölgesini bulmaktır; 8 yoksa en az 5 bul. Bu geçişteki baslik/aciklama yalnız bölge kimliği için okuma ipucudur ve videoda kullanılmayacaktır.",
)

replace_once(
    PROMPT,
    "4. x/y/w/h değerleri doğrudan BU tam sayfada sol üst 0,0; sağ alt 100,100 olacak şekilde yüzde koordinatlarıdır. Başlık ve ona bağlı spotu birlikte kapsayan haber kutusunu işaretle.",
    "4. x/y/w/h değerleri BU tam sayfada sol üst 0,0; sağ alt 100,100 olacak şekilde yalnız KABA konum ipucudur. İstemci gerçek başlık piksel kutusunu yerel OCR words/bbox çıktısından yeniden sabitleyeceği için koordinatı kesinmiş gibi uydurma.",
)

print('OTONOM 3.14.56 deterministic OCR anchor patch applied.')
