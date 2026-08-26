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

export function buildAnalyzeMessages(input: AnalyzeInput): AiMessage[] {
  const config = input.config || {};
  const isGazete = input.inputType === 'gazete';
  const language = config.language || 'tr';
  const system = `Sen OTONOM için dikey kısa haber videosu editörüsün.
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
sonSoz alanı kısa bir özlü söz olabilir; istemci gazete modunda kendi doğrulanmış alıntı havuzunu kullanabilir.
gununSorusu alanı tarafsız tek cümlelik soru olmalı.
lastQuote kısa kapanış cümlesi olmalı.
${isGazete ? `
GAZETE İLK SAYFASI — HERMES 10 OKUMA KURALLARI (KRİTİK):
1. Ana veri kaynağın yüklenen GAZETE GÖRSELİNİN KENDİSİDİR. Başlık ve açıklamaları doğrudan görüntüden oku. Kullanıcı metnindeki OCR benzeri satırları gazetedeki metnin yerine koyma.
2. Görseldeki gerçek haber başlıklarından en az 5, en fazla 9 FARKLI haber seç. Büyük ana manşetten daha küçük haber kutularına doğru sırala. Aynı haberi ikinci kez seçme.
3. Her haber için gazeteBasliklari öğesi üret ve şu alanları doldur: sourceHeadlineId, baslik, aciklama, onem, x, y, w, h.
4. baslik: Gazetede basılı gerçek başlık olmalı. Türkçe karakteri, özel ismi ve kelimeyi gördüğün biçimde yaz. Başlığı özetleme, yeniden yazma veya düzeltmeye çalışırken yeni kelime uydurma.
5. aciklama: SADECE o başlığın hemen altında/yanında fiziksel olarak bağlı haber spotu veya açıklamasından 1-2 TAM cümle oku. Başka haberin paragrafını karıştırma. Gazetede olmayan bir cümle kurma.
6. Sayı, tarih, yüzde, para, kişi, kurum ve yer adlarını görselde gördüğün biçimde koru. Emin olmadığın kelimeyi tahmin etmek yerine o haberi atla.
7. Kalın siyah/kırmızı büyük başlıkları ve belirgin haber kutularını önceliklendir. Reklam, ilan, bulmaca, tarih, gazete logosu/masthead, slogan, köşe yazarı künyesi, fotoğraf altyazısı ve grafik etiketi bağımsız haber değildir.
8. Koordinatlar gazete sayfasının sol üstü 0,0; sağ altı 100,100 olacak şekilde yüzde cinsinden x/y/w/h ver. Kutu mümkün olduğunca başlık ve ona bağlı açıklamayı kapsasın.
9. Gazete modunda videoSlides alanını TAM OLARAK [] döndür. Sahne metnini burada tekrar etme. Her haberin özgün başlık+açıklaması istemcide gazeteBasliklari üzerinden tek sahneye dönüştürülecek ve orijinal gazete görseli kullanılacak.
10. thumbnailText 3-4 kelimelik clickbait olmalı; gazetenin kendi başlık/spot dilindeki gerçek vurguya dayanmalı. Kaynakta olmayan siyasi/ideolojik etiket, suçlama, sonuç veya duygu ekleme.
11. gazeteBasliklari ANA ÇIKTIDIR. Aynı başlık veya açıklamayı videoSlides, sonSoz, gununSorusu ya da lastQuote içinde tekrar ederek JSON'u büyütme.
12. En az 5 gerçek haberin başlık+açıklamasını görselden okuyamıyorsan isContentUnreadable=true yap. Sayıyı tamamlamak için uydurma veya bozuk metin üretme.` : ''}

JSON şeması:
{
  "isContentUnreadable": boolean,
  "videoSlides": [{"sourceHeadlineId": string, "sourceHeadline": string, "topText": string, "spokenText": string, "imagePrompts": string[]}],
  "thumbnailText": string,
  "sonSoz": string,
  "gununSorusu": string,
  "lastQuote": string,
  "sourceName": string,
  "gazeteBasliklari": [{"sourceHeadlineId": string, "baslik": string, "aciklama": string, "onem": number, "x": number, "y": number, "w": number, "h": number}]
}
Gazete modunda şemadaki videoSlides değeri [] olmalıdır.`;

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
    text: `Kaynak adı: ${config.sourceName || 'belirtilmedi'}\nİçerik türü: ${config.tip || 'haber'}\nVideo stili: ${config.videoStyle || 'cinematic'}\nEk kullanıcı yorumu: ${config.yorum || 'yok'}\nİçeriği analiz et ve yalnız şemaya uyan JSON döndür.`,
  });

  return [
    { role: 'system', content: system },
    { role: 'user', content: parts },
  ];
}
