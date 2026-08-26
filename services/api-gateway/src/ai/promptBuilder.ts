import type { AiContentPart, AiMessage } from './providerRouter';

export interface AnalyzeImageInput {
  mimeType: string;
  data: string;
  name?: string;
}

export interface AnalyzeConfig {
  duration?: string;
  language?: string;
  analysisMode?: string;
  videoStyle?: string;
  imageStyle?: string;
  tip?: string;
  sourceName?: string;
  yorum?: string;
}

export interface AnalyzeInput {
  inputType: 'text' | 'url' | 'prompt' | 'media' | 'gazete';
  text?: string;
  images?: AnalyzeImageInput[];
  config?: AnalyzeConfig;
}

function durationInstruction(duration = '30') {
  if (duration === '15') return '15-30 saniye, yaklaşık 4 sahne';
  if (duration === '60') return '60-90 saniye, yaklaşık 9 sahne';
  if (duration === '90') return '90-120 saniye, yaklaşık 13 sahne';
  if (duration === 'unlimited') return 'içerik bitene kadar, en az 10 sahne';
  return '30-60 saniye, yaklaşık 6 sahne';
}

function analysisInstruction(mode = 'yorumsuz') {
  if (mode === 'deep_analysis') {
    return '5N1K yanında toplumsal ve ekonomik etkileri açıkça analiz et; doğrulanmayan bilgiyi kesin hüküm gibi yazma.';
  }
  if (mode === 'visibility') {
    return 'İçeriğin görünürlük ve haber değeri tarafını değerlendir; doğrulanmayan bilgiyi kesin hüküm gibi yazma.';
  }
  return 'Yalnız haberi tarafsız ve yorumsuz anlat; 5N1K kurallarını uygula.';
}

function newspaperSystemPrompt(language: string) {
  return `Sen OTONOM gazete ilk sayfa okuma motorusun.
Çıktının tamamı geçerli JSON olmalı; Markdown, açıklama, düşünce metni veya kod bloğu kullanma.
Dil: ${language}.

GAZETE İLK SAYFASI — HERMES 10 OKUMA KURALLARI:
1. Gönderilen görseller AYNI gazete sayfasının tam görünümü ve örtüşen yakın planları olabilir. Bunları tek sayfa olarak birlikte değerlendir. Yakın planda tekrar görülen aynı haberi yalnız bir kez say.
2. Ana veri kaynağın yalnız yüklenen gazete görselleridir. Kullanıcı metni gazetedeki metnin yerine geçmez.
3. Görseldeki gerçek haber başlıklarından en az 5, en fazla 9 FARKLI haber seç. Büyük ana manşetten daha küçük haber kutularına doğru sırala.
4. Her haber için yalnız baslik, aciklama, onem, x, y, w, h üret.
5. baslik gazetede basılı gerçek başlık olmalı. Özetleme, yeniden yazma, dilbilgisi düzeltmesi yapma ve yeni kelime uydurma.
6. aciklama yalnız o başlığın hemen altında veya yanında fiziksel olarak bağlı spot/açıklamadan 1-2 tam cümle olmalı. Başka haber metnini karıştırma.
7. Sayı, tarih, yüzde, para, kişi, kurum ve yer adlarını gördüğün biçimde koru. Emin olmadığın haberi atla.
8. Reklam, ilan, bulmaca, masthead/logo, slogan, köşe yazarı künyesi, fotoğraf altyazısı ve grafik etiketi bağımsız haber değildir.
9. Koordinatlar tam sayfa için sol üst 0,0; sağ alt 100,100 olacak şekilde yüzde cinsinden yaklaşık x/y/w/h değerleridir. Yakın plan kullanarak okusan bile koordinatı tam sayfaya göre yaklaşıkla.
10. thumbnailText 3-4 kelimelik clickbait olmalı ve yalnız gazetenin gerçek başlık/spot dilindeki vurguya dayanmalı.
11. En az 5 gerçek başlık+açıklama okuyamıyorsan isContentUnreadable=true yap. Sayıyı tamamlamak için tahmin üretme.
12. Başlık ve açıklama dışında video sahnesi, son söz, soru veya kapanış üretme; bunları istemci oluşturacak.

Yalnız şu JSON yapısını döndür:
{
  "isContentUnreadable": boolean,
  "sourceName": string,
  "thumbnailText": string,
  "gazeteBasliklari": [
    {"baslik": string, "aciklama": string, "onem": number, "x": number, "y": number, "w": number, "h": number}
  ]
}`;
}

function standardSystemPrompt(language: string, input: AnalyzeInput) {
  const config = input.config || {};
  return `Sen OTONOM için dikey kısa haber videosu editörüsün.
Çıktının tamamı geçerli JSON olmalı; Markdown kod bloğu kullanma.
Dil: ${language}.
Hedef: ${durationInstruction(config.duration)}.
Editoryal kural: ${analysisInstruction(config.analysisMode)}
Ekran üstü topText en fazla 4 kelime; thumbnailText clickbait başlık 3-4 kelime olmalı.
Her spokenText doğal Türkçe seslendirmeye uygun ve noktalama işaretiyle bitmeli.
Okuyamadığın veya doğrulayamadığın içeriği UYDURMA.
Yayın güvenliği zorunludur: tehdit veya şiddete çağrı, nefret/ayrımcılık, hedef gösterme, hakaret, kişisel veri, çocukların cinsel istismarı, kendine zarar vermeyi teşvik, suç işlemeyi kolaylaştıran talimat, mucize tedavi ya da garantili kazanç vaadi üretme.
Bir kişiyi kesinleşmiş mahkeme kararı olmadan suçlu ilan etme. Kaynaktaki hukuki statüyü değiştirme.
Telefon, e-posta, T.C. kimlik numarası, IBAN veya özel adresi yayın metnine taşıma.
sonSoz alanı kısa bir özlü söz olabilir.
gununSorusu alanı tarafsız tek cümlelik soru olmalı.
lastQuote kısa kapanış cümlesi olmalı.

JSON şeması:
{
  "isContentUnreadable": boolean,
  "videoSlides": [{"sourceHeadlineId": string, "sourceHeadline": string, "topText": string, "spokenText": string, "imagePrompts": string[]}],
  "thumbnailText": string,
  "sonSoz": string,
  "gununSorusu": string,
  "lastQuote": string,
  "sourceName": string,
  "gazeteBasliklari": []
}`;
}

export function buildAnalyzeMessages(input: AnalyzeInput): AiMessage[] {
  const config = input.config || {};
  const isGazete = input.inputType === 'gazete';
  const language = config.language || 'tr';
  const system = isGazete
    ? newspaperSystemPrompt(language)
    : standardSystemPrompt(language, input);

  const parts: AiContentPart[] = [];
  const sourceText = input.text?.trim();
  if (sourceText) {
    const prefix = input.inputType === 'url'
      ? 'Haber bağlantısı:'
      : input.inputType === 'prompt'
        ? 'Kullanıcı talimatı:'
        : isGazete
          ? 'Ek kullanıcı talimatı (gazete metninin yerine geçmez):'
          : 'İçerik:';
    parts.push({ type: 'text', text: `${prefix}\n${sourceText}` });
  }
  for (const image of input.images || []) {
    if (image.name) parts.push({ type: 'text', text: `Görsel adı: ${image.name}` });
    parts.push({ type: 'image', mimeType: image.mimeType, data: image.data });
  }
  parts.push({
    type: 'text',
    text: isGazete
      ? `Kaynak adı: ${config.sourceName || 'belirtilmedi'}\nAynı gazete sayfasının görünümlerini birlikte incele, tekrarları birleştir ve yalnız gazete JSON yapısını döndür.`
      : `Kaynak adı: ${config.sourceName || 'belirtilmedi'}\nİçerik türü: ${config.tip || 'haber'}\nVideo stili: ${config.videoStyle || 'cinematic'}\nEk kullanıcı yorumu: ${config.yorum || 'yok'}\nİçeriği analiz et ve yalnız şemaya uyan JSON döndür.`,
  });

  return [
    { role: 'system', content: system },
    { role: 'user', content: parts },
  ];
}
