from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:140]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


path = 'apps/web/src/lib/aiClient.ts'
replace_once(
    path,
    "writeSystemLog('Gazete Vision hazırlığı: tam sayfa + üst/alt yakın plan tek birleşik JPEG içinde hazırlandı; sağlayıcıya yalnız 1 image gönderilecek.');",
    "writeSystemLog('Gazete Vision hazırlığı: orijinal tam sayfa tek JPEG olarak hazırlandı; keşif koordinatları doğrudan bu sayfaya ait olacak.');",
)
replace_once(
    path,
    "writeSystemLog('Hermes 10 gazete okuma modu: aynı sayfanın tam görünümü ve iki yakın planı TEK Vision görseli olarak gönderiliyor.');",
    "writeSystemLog('Hermes 10 gazete keşif modu: yalnız orijinal tam sayfa Vision modeline gönderiliyor; ilk geçiş metni yayın kaynağı olmayacak.');",
)
replace_once(
    path,
    "? 'GAZETE OKUMA: Gönderilen TEK görsel bir kanıt kolajıdır. Soldaki panel tam gazete sayfasıdır; sağ üst ve sağ alt paneller aynı sayfanın yakın planlarıdır. Sağ panellerden okuduğun metni soldaki tam sayfadaki habere bağla; aynı haberi yalnız bir kez say. Koordinatları yalnız soldaki tam sayfaya göre 0-100 ver. Görseldeki gerçek haber başlıklarını ve onlara fiziksel olarak bağlı açıklamaları doğrudan görselden oku. Okuyamadığın kelimeyi uydurma.'",
    "? 'GAZETE KEŞFİ: Gönderilen TEK görsel doğrudan orijinal tam gazete sayfasıdır. Bu ilk geçişin görevi yayın metni yazmak değil, en az 5 gerçek haber bölgesini bulup x/y/w/h koordinatlarını bu tam sayfanın 0-100 sisteminde vermektir. baslik/aciklama yalnız bölgeyi tanımaya yarayan okuma ipucudur ve videoda kullanılmayacaktır. Okuyamadığın kelimeyi uydurma.'",
)
replace_once(
    path,
    "text: 'GAZETE BİREBİR DOĞRULAMA: Görsel H1-H9 etiketli bağımsız haber kırpımlarından oluşur. Her H kartında yalnız o kartın basılı başlığını ve fiziksel olarak bağlı spot/açıklamasını birebir oku. Önceki okuma metnini tahmin veya düzeltme kaynağı olarak kullanma. Kartlar arasında kelime veya cümle taşıma. sourceHeadlineId alanını kart etiketiyle aynen döndür.',",
    "text: 'GAZETE BİREBİR DOĞRULAMA: Görsel H1-H9 etiketli bağımsız haber kırpımlarından oluşur. Her karttaki kırmızı çerçeve hedef haber bölgesidir. Yalnız o hedefteki basılı başlığı ve fiziksel olarak bağlı spot/açıklamasını birebir oku. İlk keşif metnini tahmin veya düzeltme kaynağı olarak kullanma. Kartlar arasında kelime veya cümle taşıma. sourceHeadlineId alanını kart etiketiyle aynen döndür.',",
)
replace_once(
    path,
    "'Gazete yerel OCR doğrulama kapısı: Tesseract yalnız aynı kırpımda Vision başlığını destekliyor mu kontrol edecek; OCR metni yazı veya TTS kaynağı olmayacak.',",
    "'Gazete yerel OCR doğrulama kapısı: Tesseract ikinci Vision başlık + açıklamasını aynı geniş kırpımda bağımsız olarak destekliyor mu kontrol edecek; OCR metni yazı veya TTS kaynağı olmayacak.',",
)
replace_once(
    path,
    "`Gazete metin mutabakatı reddedildi ${rejection.id}: ${rejection.reason} · Vision-1=\"${rejection.discoveredHeadline}\" · Vision-2=\"${rejection.verifiedHeadline}\"`,",
    "`Gazete yayın doğrulaması reddedildi ${rejection.id}: ${rejection.reason} · keşif-ipucu=\"${rejection.discoveredHeadline}\" · Vision-2=\"${rejection.verifiedHeadline}\"`,",
)
replace_once(
    path,
    "`Gazete üçlü doğrulama tamamlandı: ${verifiedCandidates.length}/${candidates.length} haber · Vision-1 + farklı Vision geçişi + yerel OCR kanıtı.`,",
    "`Gazete yayın doğrulaması tamamlandı: ${verifiedCandidates.length}/${candidates.length} haber · Vision-2 birebir metin + aynı geniş kırpım yerel OCR kanıtı.`,",
)
replace_once(
    path,
    "`En az 5 haber iki Vision geçişi ve aynı gazete kırpımındaki yerel OCR kanıtıyla birebir doğrulanamadı; yanlış video üretilmedi. Doğrulanan: ${verifiedCandidates.length}/${candidates.length}.`,",
    "`En az 5 haber ikinci Vision geçişi ve aynı geniş gazete kırpımındaki yerel OCR başlık+açıklama kanıtıyla doğrulanamadı; yanlış video üretilmedi. Doğrulanan: ${verifiedCandidates.length}/${candidates.length}.`,",
)
replace_once(
    path,
    "`Gazete sahneleri hazır: ${orderedScript.videoSlides.length} haber · başlıklar iki Vision geçişi + yerel OCR kanıtıyla kilitlendi · OCR metni yayında kullanılmadı · AI görsel yok.`,",
    "`Gazete sahneleri hazır: ${orderedScript.videoSlides.length} haber · yayın metni ikinci Vision + aynı kırpım OCR kanıtıyla kilitlendi · ilk keşif metni ve OCR metni yayında kullanılmadı · AI görsel yok.`,",
)

print('OTONOM 3.14.55 aiClient patch applied.')
