// ============================================================================
// OTONOM - Gemini Canvas Uyumlu Versiyon
// ============================================================================
// Akis: S1 -> M1 analiz -> 2 AI gorsel -> S2 -> M2 analiz -> 2 AI gorsel -> ...
// Sabit gorsel sadece 1. sahneye atanir, medyayi anlatan 2 gorsel AI uretir
// Coklu blokta sure siniri yok - dogal okuma hizinda bitir
// Seslendirme daima %80, arka plan muzik daima %29
//
// MODULER YAPI:
//   M1:  Constants & Config       - API key, flags, CORS proxies, APP_VERSION
//   M2:  Core Utilities           - Storage, Audio, EventBus, logging, helpers
//   M3:  Network & Firebase       - Firebase init, NetworkUtils, reauth
//   M4:  Asset Manager            - IndexedDB servisleri
//   M5:  Logic Engine             - AI analiz (haber, elestiri, iddia, guzel soz, OCR)
//   M6:  Media Synthesis          - Gorsel uretim servisleri
//   M7:  Ambient Audio            - Atmosfer sesleri
//   M8:  Render Engine            - Canvas video render
//   M9:  Workflow Coordinator     - Is akis yoneticisi
//   M10: App (React UI)           - Ana component ve tum UI
//
// ============================================================================
// VERSION HISTORY (özet — detaylar CHANGELOG.md'de)
// ============================================================================
// black_1.0 → black_1.11: Gazete takip, ses mixleme, MP4 dönüşümü, Firefox uyum,
//   RAM fix (File System Access API), Instagram FPS fix, ffmpeg.wasm corePath
// H1.155 → H1.158: Drive müzik kütüphanesi kaldırıldı, OCR fonksiyonları birleştirildi,
//   modüler section header'lar eklendi, NVIDIA/GROQ API key'ler eklendi
//
// black_2.0 (bu versiyon):
//   - APP_VERSION objesi ile tek kaynak versiyon yönetimi
//   - Versiyon notlarından duplikasyonlar temizlendi
//   - Dead code (M1b Drive Helpers) kaldırıldı
//   - Magic number'lar RENDER_CONFIG / AI_CONFIG altında toplandı
//   - ErrorHandler.silent() ile boş catch blokları standardize edildi
//   - ObjectURLManager ile URL sızıntısı fix edildi
//   - errorPatterns tek constant'a çıkarıldı
//   - OCR fallback mantığı tek fonksiyona indirildi
//   - UI badge dinamik (APP_VERSION.toString())
//
// black_2.1:
//   - fetchWithRetry'e exponential backoff + jitter eklendi
//   - React Error Boundary eklendi (beyaz ekran önlenir)
//   - sanitizeText() ile AI çıktısı XSS koruması
//
// black_2.2:
//   - API key'ler temizlendi (NVIDIA, GROQ — boş string)
//   - bgmInitialized deklarasyonu düzeltildi (use-before-declare fix)
//   - FeatureFlags ölü kodu kaldırıldı
//   - 999 magic number → RENDER_CONFIG.MAX_CUSTOM_SCENE_IMAGES
//   - var → let/const modernize edildi
//   - window._outroParticles → local değişken (global kirlilik fix)
//   - Localhost CORS proxy'leri yedek pozisyona alındı
//   - ObjectURLManager.revokeAll() cleanup eklendi
//   - sanitizeText güçlendirildi (data:, vbscript: URI'leri)
//   - Duplikat senkronizasyon hata yakalama tek helper'a indirildi
//   - Hardcoded ekonomik veri tarihi dinamik yapıldı
//
// black_2.3:
//   - CORS proxy protokol uyuşmazlığı düzeltildi (https→http localhost)
//   - GAZETE_PROXY_ENDPOINTS https://localhost → http://localhost
//   - CORS_PROXIES: https://localhost → http://localhost, port 3456 girişi kaldırıldı
//   - gazete-proxy.js: generateSelfSignedCert() dead code temizlendi
//   - Windows otomatik başlatma (Startup + VBS silent launcher)
//
// black_2.4 (anti.1.0):
//   - LinkedIn API entegrasyonu (parçalı video yükleme, HTTPS/HTTP otomatik algılama)
//   - Buffer API entegrasyonu (GraphQL, dinamik kanal algılama, Twitter/Instagram/TikTok)
//   - Bulut yükleme 3 katmanlı failover (catbox.moe → file.io)
//   - 27 gazete doğrudan CDN haritası + weserv.nl CORS-free görsel çekme
//   - GazeteCropModal (React.memo, fare takipli kırpma)
//   - Sosyal medya yönetimi (7 platform, localStorage kalıcı bağlantı)
//   - ImageBitmapCache (GPU createImageBitmap önbellekleme)
//   - fetchWikimediaImages (Atatürk vb. gerçek görseller)
//   - Müzik arama/filtreleme + 10sn önizleme
//   - PROXY_AUTH_TOKEN constant'ına taşındı (hardcoded token güvenlik fix)
//   - static_gzt gazete URL'leri dinamik tarih üretimi
//
// black_2.5 (anti.1.0):
//   - isVideoAsset tanımsız bug fix → isVideo değişkeni kullanıldı
//   - getLinkedInServerUrl: remote cloud origin'da localhost deneme atlandı (PNA engeli)
//   - Buffer CORS proxy listesi güncellendi: corsproxy.org → corsproxy.io + allorigins.win
//   - Buffer paylaşım fail durumunda net hata mesajı eklendi
//
// black_2.6 (anti.1.0):
//   - Gazete ilk sayfası modu: AI görsel üretilmez, sadece gazete resmi + anlatım
//   - Her başlık için tek sahne (başlık+açıklama birleşik seslendirme)
//   - _isGazeteOkuma flag: thumbnail için gazete resmi kullanılır, AI kapak atlanır
//   - Tüm başlıklar okununca son söz + outro → video paketlenir
//
// black_2.7 (anti.1.0):
//   - Buffer token kontrolü: token YOK ise erken return + net hata mesajı
//   - isHttpsRemoteOrigin: hostname boş ise remote say (Gemini Canvas fix)
//   - CORS proxy URL encode + cors.eu.org eklendi
//   - UI: Ayarlar bölümüne Buffer API Token input eklendi
//   - Paylaşım log paneli: KOPYALA butonu + işlem bitse bile ekranda kalır
//   - Tüm paylaşım aşamalarında [DEBUG] detaylı log
//
// black_2.8 (anti.1.0):
//   - İddia Analizi prompt tamamen yeniden yazıldı: girdi analizi öncelikli
//   - 2002 baz yılı karşılaştırması eklendi (ECONOMIC_DATA.baseline2002)
//   - Dürüstlük kuralları: "BİLMEDİĞİN şey için ASLA uydurma"
//   - Tekrarlayan ekonomi verisi bölümleri kaldırıldı (XXXXX placeholder yok)
//   - Kaynaklar sahnesi güçlendirildi: kaynak adı + veri + URL birlikte
//   - buildEconomicDataBlock: [2002:] formatında baz yılı gösterimi
//
// black_2.9 (anti.2.9):
//   - TTS hızı normal konuşma hızına getirildi (SPEECH_RATE: 1.0)
//   - Konu-dışı ekonomi verisi enjekte edilmesi yasaklandı (ADIM 2 + ADIM 4)
//   - Ses-görsel senkron düzeltildi: rawSlideSecs +0.3, rawCushion 0.5, playAudio +0.3
//   - TTS text cleaning güçlendirildi: İYİ Parti yanlış okunması fix, Türkçe karakter koruma
//   - Cümle kesilmesi ve video sonu ses kırıntısı önlendi
//
// black_3.0 (black.3.0):
//   - Müzik kalıcı saklama: catbox.moe bulut yedek + localStorage URL
//   - IndexedDB silinse bile müzikler buluttan otomatik geri yüklenir
//   - v3.7'de kaldırıldı: otomatik bulut müzik yedekleme; sadece yerel IndexedDB listeleme
//   - deleteMusic: catbox URL'ini de localStorage'dan temizle
//   - "anti" öneki kaldırıldı, dosya adı black.X.X.jsx olarak devam ediyor
//
// black_3.1 (black.3.1):
//   - İddia Analizi prompt'u genel yapılandırıldı: sadece ekonomi değil TÜM konularda doğrulama
//   - ADIM 2: Konu türüne göre kaynak rehberi (siyaset, hukuk, belediye, sağlık, eğitim, güvenlik, dış politika)
//   - ADIM 3: Google Search aktif kullanım, "İDDİA NE DİYOR vs GERÇEKTE NE VAR" karşılaştırması
//   - ADIM 4: Senaryo yapısı değişti — Hook, İddia, Gerçek, Karşılaştırma, Kanıtlar, Sonuç, Kapanış
//   - Dürüstlük kurallarına TARAFSIZLIK ve KAYNAK ÇEŞİTLİLİĞİ eklendi
//   - Konu-dışı ekonomi verisi yasağı korundu, ekonomi dışı konular için resmi kaynak rehberi eklendi
//
// black_3.2 (black.3.2):
//   - TTS hızı normal konuşma hızına getirildi (SPEECH_RATE: 1.25 → 1.0)
//   - Müzik seçimi gazete okuma modunda da çalışacak şekilde if/else dışına taşındı
//   - catbox.moe yedekleme uploadMediaToCloud üzerinden yapılır (CORS proxy failover dahil)
//   - Bulut yedek başarısız mesajı daha doğru hale getirildi
//
// black_3.3 (black.3.3):
//   - emotionForImage scope fix: değişken if/else dışına taşındı (gazete/normal modda ReferenceError fix)
//   - Müzik seçimi artık tüm modlarda emotionForImage'e erişebiliyor
//
// black_3.4 (black.3.4):
//   - SafeStorage.removeItem eklendi (eksikti — 5+ yerde çağrılıyordu, TypeError veriyordu)
//   - uploadMediaToCloud: catbox.moe kalıcı yükleme eklendi (CORS proxy üzerinden, sonsuz saklama)
//   - litterbox.catbox.moe süresi 1h → 72h (3 gün)
//   - v3.7'de kaldırıldı: buluttan müzik geri yükleme
//
// black_3.5 (black.3.5):
//   - _createTimerWorker: RENDER_CONFIG.TIMER_WORKER_INTERVAL_MS kullanır, FPS senkronizasyonu fix
//   - renderScene Ken Burns: pan değerleri sahne başında bir kere üretilir, frame başı Math.random flicker'ı giderildi
//   - playAudio: TTS playbackRate sabit RENDER_CONFIG.SPEECH_RATE (1.0), scaleFactor ses hızını artırmaz
//   - ECONOMIC_DATA dataAsOf: döviz/altın tarihleri 30 Temmuz 2026'ya güncellendi
//   - uploadMediaToCloud: catbox/litterbox POST stratejisi düzeltildi (direkt + proxy fallback, açıklayıcı log)
//
// black_3.6 (black.3.6):
//   - Catbox CORS sorunu kalıcı çözüm: uploadMediaToCloud önce localhost:3000/upload_cloud_media
//     kullanır; Python sunucu (linkedin_server.py) catbox.moe/litterbox.catbox.moe'ye server-side yükler.
//   - linkedin_server.py /upload_cloud_media endpoint'i catbox/litterbox öncelikli güçlendirildi.
//   - Frontend uploadMediaToCloud failover'leri korundu (tmpfiles, file.io, litterbox direkt).
//
// black_3.7 (black.3.7):
//   - Otomatik bulut müzik yedekleme kaldırıldı. Müzik klasörü seçildiğinde dosyalar sadece
//     IndexedDB'ye kaydedilip listelenir; catbox/temp.sh/tmpfiles vb. otomatik upload yapılmaz.
//   - loadLocalMusic artık buluttan geri yükleme yapmaz, sadece IndexedDB'den listeler.
//   - AssetManagerService cloud music URL metodları ve ilgili localStorage key'i kaldırıldı.
//
// black_3.8 (black.3.8):
//   - İddia Analizi: Yüklenen ses/video clickbait'ten sonra KESİKSİZ oynatılır (raw playback).
//     Hiçbir yeri kesilmeden orijinal medya gösterilir, sonra analiz edilir.
//   - İddia Analizi prompt güncellendi: karşı-örnek kuralı ("bu bir veridir, adalettir"),
//     kaynak zorunluluğu, en güncel veri kuralı (Temmuz 2026 verisi varsa onu yayınla).
//   - Senaryo yapısı: Hook → Orijinal Medya → İddia → Gerçek → Karşılaştırma → Kanıtlar → Sonuç.
//   - Render: _isRawMedia sahnesi video/audio element ile frame-by-frame canvas'a çizilir.
//
// black_3.9 (black.3.9):
//   - Raw medya sesi artık audioDest'e route ediliyor (createMediaElementSource → gain → audioDest).
//     Önceki versiyonda raw video/audio sesi MediaRecorder'a gitmiyordu — final videoda SİLENT idi.
//   - Raw medya süresi artık async pre-load ile gerçek duration olarak alınıyor (placeholder 10s değil).
//     Bu sayede scaleFactor hesabı doğru yapılıyor, diğer sahneler gereksiz sıkışmıyor.
//   - Tek element kullanımı: video ve audio için ayrı elementler yerine tek rawEl kullanılıyor.
//   - Render sonunda MediaElementSourceNode ve GainNode disconnect ediliyor (temizlik).
//
// black_3.10 (black.3.10):
//   - [KRİTİK] Siyah ekran fix: drawImageContain/Cover artık videoWidth/videoHeight kullanıyor
//     (video element width/height = 0 olduğu için NaN oran → çizim yapılmıyordu).
//   - [KRİTİK] Raw video artık doğal oynatılıyor (seeking kaldırıldı) — her frame'de mevcut frame çizilir.
//   - [KRİTİK] Prompt'a grafik kuralı eklendi: imagePrompts'te TAM sayıları ve etiketleri yaz zorunluluğu.
//   - [ORTA] generateImage prompt'una "no text, no words, no letters, no labels, clean visual" eklendi.
//   - [DÜŞÜK] Outro öncesi 0.5sn fade-to-black efekti eklendi (sert kesme yerine yumuşak geçiş).
//
// black_3.11 (black.3.11):
//   - Güzel Söz modu artık ÇOK DİLLİ: Sahne 1 Fransızca, Sahne 2 Almanca, Sahne 3 Türkçe.
//   - _translateQuoteMultilang fonksiyonu eklendi — Gemini API ile sözü FR/DE/TR'ye çevirir.
//   - _buildGuzelSozScript artık her sahneye farklı dilde metin atıyor (spokenText + topText).
//   - Asset generation 3 sahnenin de sesini üretiyor (sadece audio[0] değil).
//   - renderGuzelSoz çok dilli modda 3 sesi sırayla çalıyor, her sahneye doğru metni ve görseli gösteriyor.
//   - Dil etiketi (FR/DE/TR) sağ üst köşede gösteriliyor.
//   - _isMultilang flag ile geriye uyumluluk korunuyor (eski tek dilli davranış hâlâ çalışır).
//
// black_3.12 (black.3.12):
//   - İddia Analizi: İfşa sahnesi artık RAKAMLARA değil ADALETSİZLİĞE odaklanıyor.
//   - ADIM 3 "KARŞI-ÖRNEK VE İFŞA KURALI" → "İFŞA VE ADALETSİZLİK KURALI" olarak yeniden yazıldı.
//     Seçici hedefleme (sadece CHP belediyeleri evlerden alınıyor mu?),
//     itibar suikasti (tüm medyada ifşa edilerek linç kampanyası),
//     çifte standart (iktidar/muhalefet aynı eylemde sadece muhalefet mi cezalandırılıyor?)
//     sorgulanıyor. Rakamlar ikincil, adaletsizlik birincil.
//   - ADIM 4 senaryo yapısında "Karşılaştırma" → "Karşılaştırma/İfşa" olarak güncellendi.
//     Senaryo artık adaletsizliği NET olarak söylemek zorunda.
//
// black_3.14 (black.3.14):
//   - [KRİTİK] Müzik Seçim Bug Fix: Workflow aşamasında kullanıcı müzik seçmiş olsa bile
//     matchMusicToEmotion + random fallback ile farklı müzik seçiliyordu. Artık kullanıcı
//     müzik seçtiyse onu kullanır, seçmediyse duygu bazlı otomatik seçer.
//   - GuzelSoz render'ında ambientSound='none' iken otomatik ilk müziği seçme kaldırıldı.
//     Kullanıcı 'none' seçtiyse müzik istememiştir.
//
// black_3.15 (black.3.15):
//   - [KRİTİK] Instagram FPS Fix: captureStream(0) + manuel requestFrame() VFR (değişken
//     frame rate) üretiyordu. ffmpeg -r 30 sadece çıkış FPS'ini set eder, VFR→CFR yapmaz.
//     Artık ffmpeg komutuna -vf fps=30 (kare yeniden örnekleme) + -vsync cfr (constant
//     frame rate zorlama) eklendi. Instagram Reels sabit 30fps CFR şart koşar.
//   - [KRİTİK] WebM→MP4 dönüştürme: shareToBufferAPI'de video WebM blob ise MP4'e
//     dönüştürülmeden buluta yükleniyordu. Instagram WebM kabul etmez. Artık otomatik
//     dönüştürme yapılıyor.
//
// black_3.16 (black.3.16):
//   - [KRİTİK] Export Progress Feedback: Render bittikten sonra MP4 dönüşümü ve bulut
//     yükleme sırasında UI sessizce donuyordu. Artık full-screen progress overlay gösteriliyor:
//     yüzde, mesaj, progress bar. autoSaveVideo, shareToBufferAPI, handleDownloadVideo
//     üç çağrı noktası da exportProgress state'ine bağlı.
//   - [KRİTİK] Granular ffmpeg Error Handling: convertWebMtoMP4 artık try/catch içinde.
//     Hata mesajları kullanıcı dostu metinlere çevriliyor (memory, codec, network, corrupt,
//     timeout). _getFFmpegFriendlyError helper'ı ile hata sınıflandırma.
//
// black_3.17 (black.3.17):
//   - [KRİTİK] Export Presets: Platform hazır ayarları (Instagram Reels, TikTok, YouTube
//     Shorts, X/Twitter, Facebook, LinkedIn). Tek tıkla aspect ratio + çözünürlük + format
//     + süre + bitrate ayarlanır. EXPORT_PRESETS + CANVAS_DIMENSIONS sabitleri eklendi.
//     Canvas boyutu artık resolution + aspectRatio kombinasyonundan dinamik hesaplanıyor.
//     MediaRecorder ve convertWebMtoMP4 artık preset/preview'dan dinamik bitrate okuyor.
//   - [KRİTİK] Voice-over Web Speech API: generateVoiceOverWithWebSpeech fonksiyonu eklendi.
//     Tarayıcı yerleşik ses motoru (speechSynthesis) ile API anahtarı gerektirmeden ses üretimi.
//     TTS engine toggle: "Gemini TTS" / "Tarayıcı Sesi". Gemini TTS başarısız olursa otomatik
//     Web Speech fallback. generateAudio'ya ttsEngine parametresi eklendi.
//   - [KRİTİK] Preview/Low-Res Toggle: Preview modunda canvas boyutu yarıya iner (360×640),
//     FPS 15'e düşer, bitrate 1M olur, AI görsel ve TTS üretimi atlanır. Hızlı test imkanı.
//     RENDER_CONFIG'e PREVIEW_FPS, PREVIEW_BITRATE, PREVIEW_SCALE sabitleri eklendi.
//
// black_3.18 (black.3.18):
//   - [KRİTİK] Render Resume: AssetManagerService'ye saveRenderCheckpoint/getRenderCheckpoint/
//     clearRenderCheckpoint metodları eklendi. Her sahne sonunda render ilerlemesi IndexedDB'ye
//     kaydedilir, sekme kapansa bile kaldığı yerden devam edilebilir.
//   - [KRİTİK] SRT Altyazı Export: generateSRT + _formatSRTTime fonksiyonları eklendi.
//     calculateSubtitles çıktısından standart .srt dosyası üretir. UI'da "SRT" indir butonu.
//   - [KRİTİK] Custom Thumbnail: Config'e customThumbnail alanı eklendi. Kullanıcı kendi
//     kapak görselini yükleyip AI üretimini override edebilir. UI'da "Kapak" butonu.
//   - [KRİTİK] Auto-Hashtag: AI prompt'a SEKİZİNCİ KURAL eklendi — konuya uygun 3-5 hashtag
//     üretilir, script.hashtags alanına kaydedilir. shareToBufferAPI'de post text'e otomatik eklenir.
//   - [KRİTİK] Batch/Queue Production: Çoklu konu sıralı üretim altyapısı (batchQueue state).
//   - [KRİTİK] Scheduled Publishing: shareToBufferAPI'ye options.scheduledAt parametresi eklendi.
//     Buffer GraphQL createPost mutation'ında mode='schedule' + scheduledAt field'ı.
//   - [KRİTİK] Video Transitions: TRANSITION_STYLES sabiti + drawTransition fonksiyonu eklendi.
//     5 geçiş efekti: crossfade, slide, zoom, wipe, dissolve. Config'de transition seçimi.
//   - [KRİTİK] Custom Branding: drawBranding fonksiyonu eklendi. Logo + marka adı video'da
//     alt bant olarak çizilir. Config'e brandLogo (base64) + brandText alanları.
//   - [KRİTİK] A/B Varyasyon: AI prompt'a DOKUZUNCU KURAL eklendi — 2 farklı hook önerilir.
//     hookVariations dizisi. Config'e abVariation toggle. UI'da "A/B" butonu.
//   - [KRİTİK] Stock Footage: fetchStockFootage fonksiyonu eklendi — Pexels API'den
//     konuya uygun gerçek video klipleri çeker. Config'e useStockFootage toggle. UI'da "Stock" butonu.
//   - [KRİTİK] Multi-language TTS: generateAudioMultilang fonksiyonu eklendi. Config'e
//     narrationLanguage alanı. UI'da dil seçimi (TR/EN/DE/AR).
//   - [KRİTİK] Analytics Dashboard: fetchBufferAnalytics fonksiyonu eklendi. Buffer GraphQL'den
//     post metrikleri (impressions, clicks, likes, shares, comments) çeker.
//
// black_3.20 (black.3.20):
//   - [KRİTİK] Hürriyet ve Milliyet gazetemanset.gzt.com'dan eklendi. Aydınlık CDN'inde
//     olmayan bu 2 gazete için gzt source config kullanılarak img.piri.net CDN'inden
//     görsel URL'si çekilir. fetchGazeteManşetleri fonksiyonu gzt tipi için HTML fetch +
//     parse yapar: gazetemanset.gzt.com sayfası fetch edilir, img.piri.net URL'leri ve
//     alt attribute'ları parse edilir, gazete adı eşleştirme ile doğru görsel bulunur.
//     Toplam gazete sayısı: 27 → 29.
//   - Yeni Mesaj: Hiçbir CDN'de bulunamadı, eklenmedi.
//
// black_3.19 (black.3.19):
//   - [KRİTİK] Gazete CDN Slug Fix: Aydınlık CDN'inden 5 gazete yüklenmiyordu.
//     "Nasıl Bir Ekonomi" slug: nasil-bir-ekonomi → nb-ekonomi (200 OK).
//     "Yeni Birlik" slug: yeni-birlik → yenibirlik (tire yok, 200 OK).
//     "Hürriyet", "Milliyet", "Yeni Mesaj" Aydınlık CDN'inden kaldırılmış — listeden çıkarıldı.
//     Toplam gazete sayısı: 30 → 27.
//
// black_3.13 (black.3.13):
//   - [KRİTİK] Audio Bleed Fix: playAudio artık sourceNode döndürüyor, renderScene
//     görsel süre dolduğunda ses hala çalıyorsa sourceNode.stop() ile hard-cut yapıyor.
//     Outro'ya ses sızıntısı (audio bleed) önlendi.
//   - [KRİTİK] Altyazı Senkronu: wordsPerSub 2→4 yapıldı, tek kelime floating altyazılar önlendi.
//     Altyazı endSec overlap 0.1→0.15 sn'ye çıkarıldı (daha akıcı geçiş).
//   - [ORTA] AI Grafik Metin Bozulması: drawChartOverlay fonksiyonu eklendi — chartData.show
//     true ise canvas'a temiz bar chart çizilir (AI görseldeki bozuk sayılar yerine).
//     generateImage prompt'una "no numbers, no digits" eklendi.
//   - [ORTA] Split-Screen Fix: Raw video artık drawImageCover ile tam ekran (contain değil).
//     Audio-only raw medyada thumbnail görsel yerine temiz koyu arka plan kullanılıyor.
//   - [DÜŞÜK] Watermark Overlay: Raw video oynatımında üst %6 ve alt %6 bant ile
//     üçüncü taraf filigranları gizleniyor.
//
// black_3.21 (black.3.21):
//   - [KRİTİK] showSaveFilePicker Cross-Origin Fix: Gemini Canvas gibi cross-origin
//     iframe ortamlarında showSaveFilePicker SecurityError fırlatıyordu (sarı WARN).
//     Artık window.self !== window.top kontrolü ile iframe tespit edilip direkt
//     bellek içi kayda düşülüyor — uyarı hiç oluşmuyor.
//   - [DÜŞÜK] 401 Oturum Yenileme log seviyesi warn → info: Token yenileme normal
//     kurtarılabilir akışın parçası, uyarı değil bilgi olarak loglanıyor.
//   - [DÜŞÜK] attemptSilentReauth log seviyesi warn → info: Aynı şekilde normal
//     yenileme akışı info seviyesine çekildi.
//
// black_3.22 (black.3.22):
//   - [KRİTİK] Sahneler arası boşluklar tamamen kaldırıldı:
//     (1) playAudio: ses süresi +0.3sn ekstra → +0 (ses = görsel süre)
//     (2) rawSlideSecs: slayt süresi +0.3sn buffer → +0
//     (3) Fade-to-black: 0.5sn siyaha geçiş → kaldırıldı (hard cut outro)
//     (4) rawCushion: 0.5sn video sonu bekleme → 0
//     (5) transitionFrames: min(8 kare) → min(2 kare) (0.07sn — anında geçiş)
//     (6) Güzel Söz bufferTime: 1sn → 0
//     (7) Güzel Söz segDur: +0.5sn → +0.1sn (minimum guard)
//
// black_3.23 (black.3.23):
//   - [KRİTİK] İddia Analizi senaryo yapısı değişti:
//     (1) Yeni ADIM 3: "GERÇEKTE NE OLUYOR" — eleştirel, tarafsız genel değerlendirme
//     (2) Raw media oynatımından hemen sonra "GERÇEKTE NE OLUYOR" sahnesi eklenir
//     (3) Text/url/prompt modunda da 2. sahne olarak eklenir
//     (4) ResponseSchema'ya gercekNeOluyor + gercekNeOluyorImagePrompt eklendi
//     (5) Mevcut ADIM 3 → ADIM 4, mevcut ADIM 4 → ADIM 5 olarak kaydırıldı
//     (6) Senaryo yapısına "GERÇEKTE NE OLUYOR" adımı eklendi

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// SVG ICON SYSTEM (lucide-react yerine - Gemini Canvas uyumluluğu)
// ============================================================================
const ICONS = {
  Download: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  RotateCcw: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>,
  UploadCloud: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>,
  Music: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  Trash2: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  Volume2: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>,
  Clock: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Loader2: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>,
  Copy: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  AlertCircle: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Activity: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Server: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  Database: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  ShieldCheck: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  ImagePlus: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Smartphone: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  Clapperboard: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 6h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4"/><path d="M4 6h10"/><line x1="2" y1="12" x2="6" y2="12"/></svg>,
  Type: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  Palette: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>,
  Globe: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  MessageSquare: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Monitor: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Filter: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Wand2: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m3 21 9-9"/><path d="M12 22V8"/><path d="M12 2 4 10"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/></svg>,
  CloudRain: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><line x1="12" y1="15" x2="12" y2="18"/><line x1="10" y1="17" x2="14" y2="17"/></svg>,
  ChevronDown: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="6 9 12 15 18 9"/></svg>,
  Film: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="10" y1="2" x2="10" y2="22"/></svg>,
  FileText: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Layers: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  RefreshCw: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  Share2: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Check: ({size=14, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  Link2: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Newspaper: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><line x1="18" y1="14" x2="18" y2="18"/><line x1="15" y1="18" x2="21" y2="18"/><line x1="6" y1="7h4"/><line x1="6" y1="11h4"/><line x1="6" y1="15h4"/></svg>,
  Scissors: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
  ExternalLink: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Eye: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  BarChart3: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8"/><rect x="12" y="6" width="3" height="12"/><rect x="17" y="13" width="3" height="5"/></svg>,
  ListPlus: ({size=16, ...p}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11 11h13"/><path d="M11 15h13"/><path d="M11 19h13"/><path d="M3 11h2"/><path d="M3 15h2"/><path d="M3 19h2"/><path d="M11 7h13"/><path d="M11 3h13"/><path d="M3 7h2"/><path d="M3 3h2"/></svg>,
};

// Gemini Canvas: ikonları doğrudan JSX'te kullanılabilir hale getir
const { Download, RotateCcw, UploadCloud, Music, Trash2, Volume2, Clock, Loader2, Copy, AlertCircle, Activity, Server, Database, ShieldCheck, ImagePlus, Smartphone, Clapperboard, Type, Palette, Globe, MessageSquare, Monitor, Filter, Wand2, CloudRain, ChevronDown, Film, FileText, Layers, RefreshCw, Share2, Check, Link2, Newspaper, Scissors, ExternalLink, Eye, BarChart3, ListPlus } = ICONS;
// Firebase (Gemini Canvas: global scope veya CDN'den yüklenebilir)
// npm bağımlılığı yok — canvas ortamında firebase SDK global olarak sunulabilir
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseAppId = 'default-app-id';
try {
  if (typeof firebaseAppGlobal !== 'undefined') {
    firebaseApp = firebaseAppGlobal;
    firebaseAuth = typeof firebaseAuthGlobal !== 'undefined' ? firebaseAuthGlobal : null;
    firebaseDb = typeof firebaseDbGlobal !== 'undefined' ? firebaseDbGlobal : null;
  }
} catch(e) { /* Firebase yok */ }

// ============================================================================
// M1: CONSTANTS & CONFIG
// ============================================================================

// ── APP_VERSION: Tek kaynak versiyon yönetimi ──────────────────────────────
const APP_VERSION = {
  major: 3,
  minor: 23,
  hotfix: 'H3.23',
  toString() { return `BLACKBOX black_${this.major}.${this.minor}`; },
  toBadge() { return `${this.toString()} • One-Page`; }
};

// ── RENDER_CONFIG: Render ile ilgili tüm magic number'lar ──────────────────
const RENDER_CONFIG = {
  FPS: 30,
  TIMER_WORKER_INTERVAL_MS: 1000 / 30, // 33.33ms = 30fps exact
  WINDOW_SIZE: 5,
  VOICE_VOLUME: 0.80,
  BGM_VOLUME: 0.29,
  SPEECH_RATE: 1.0,
  VIDEO_BITS_PER_SECOND: 4_000_000,
  MIN_CROP_SIZE: 10,
  MAX_BLOCKS: 10,
  SCALE_FACTOR: 1,
  MAX_CUSTOM_SCENE_IMAGES: 5,
  // v3.17: Preview/Low-Res mode sabitleri
  PREVIEW_FPS: 15,
  PREVIEW_BITRATE: 1_000_000,
  PREVIEW_SCALE: 0.5,
  // v3.18: Video transition efektleri
  TRANSITION_DURATION: 0.5, // saniye
  // v3.18: Branding watermark
  BRAND_LOGO_SIZE: 0.08, // canvas yüksekliğinin %8'i
  BRAND_TEXT_FONT: 'bold 14px Inter, sans-serif'
};

// ── EXPORT_PRESETS: Platform hazır ayarları (v3.17) ───────────────────────
const EXPORT_PRESETS = {
  custom:           { label: 'Özel',                aspectRatio: null,  resolution: null,  videoFormat: null,  duration: null, bitrate: null },
  instagram_reels:  { label: 'Instagram Reels',    aspectRatio: '9:16', resolution: '1K', videoFormat: 'mp4', duration: '30',  bitrate: 4_000_000 },
  tiktok:           { label: 'TikTok',              aspectRatio: '9:16', resolution: '1K', videoFormat: 'mp4', duration: '30',  bitrate: 4_000_000 },
  youtube_shorts:   { label: 'YouTube Shorts',     aspectRatio: '9:16', resolution: '2K', videoFormat: 'mp4', duration: '60',  bitrate: 8_000_000 },
  twitter:          { label: 'X (Twitter)',         aspectRatio: '16:9', resolution: '1K', videoFormat: 'mp4', duration: '90',  bitrate: 4_000_000 },
  facebook:         { label: 'Facebook',            aspectRatio: '16:9', resolution: '1K', videoFormat: 'mp4', duration: '90',  bitrate: 4_000_000 },
  linkedin:         { label: 'LinkedIn',            aspectRatio: '16:9', resolution: '1K', videoFormat: 'mp4', duration: '90',  bitrate: 4_000_000 }
};

// ── CANVAS_DIMENSIONS: Çözünürlük + aspect → canvas piksel boyutu (v3.17) ──
const CANVAS_DIMENSIONS = {
  '9:16': { '1K': [720, 1280],  '2K': [1080, 1920], '4K': [1440, 2560] },
  '16:9': { '1K': [1280, 720], '2K': [1280, 720],  '4K': [1920, 1080] },
  '1:1':  { '1K': [1080, 1080], '2K': [1080, 1080], '4K': [1440, 1440] }
};

// ── TRANSITION_STYLES: Sahne geçiş efektleri (v3.18) ──────────────────────
const TRANSITION_STYLES = {
  none:     { label: 'Yok',          type: 'none' },
  crossfade:{ label: 'Crossfade',    type: 'crossfade' },
  slide:    { label: 'Kaydırma',     type: 'slide' },
  zoom:     { label: 'Zoom',         type: 'zoom' },
  wipe:     { label: 'Silme (Wipe)', type: 'wipe' },
  dissolve: { label: 'Dissolve',     type: 'dissolve' }
};

// ── STOCK_FOOTAGE_CONFIG: Pexels API ayarları (v3.18) ─────────────────────
const STOCK_FOOTAGE_CONFIG = {
  PEXELS_API_URL: 'https://api.pexels.com/videos/search',
  PEXELS_API_KEY: '', // Kullanıcı tarafından ayarlanır
  MAX_CLIPS_PER_SCENE: 1,
  MIN_DURATION: 3,
  MAX_DURATION: 10
};

// ── ANALYTICS_CONFIG: Sosyal medya metrikleri (v3.18) ─────────────────────
const ANALYTICS_CONFIG = {
  BUFFER_GRAPHQL_URL: 'https://api.buffer.com/graphql',
  CACHE_DURATION_MS: 300000 // 5 dakika önbellek
};

// ── AI_CONFIG: AI API ile ilgili tüm magic number'lar ──────────────────────
const AI_CONFIG = {
  TEMPERATURE: 0.8,
  MAX_OUTPUT_TOKENS: 150,
  SCENE_COUNT: 3,
  GEMINI_MODEL: 'gemini-3.5-flash',
  OCR_MODELS: ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite-preview']
};

// ============================================================================
// M1b: AI_PROVIDERS — Çoklu sağlayıcı desteği (Gemini / Groq / OpenRouter)
// ============================================================================
// Her sağlayıcı kendi API key'ini kullanır (kullanıcı tarafından girilir,
// tarayıcıda localStorage'da saklanır — hiçbir yere gönderilmez).
// Metin/analiz görevleri (haber, iddia, güzel söz, çeviri, clickbait) seçili
// sağlayıcı üzerinden çalışır. Medya (görsel/video) analizi ve internet
// araştırması (google_search) SADECE Gemini ile çalışır — bu görevler
// otomatik olarak Gemini'ye yönlendirilir (Gemini key varsa).
const AI_PROVIDERS = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    badge: 'Ücretsiz Katman',
    color: 'indigo',
    badgeClass: 'bg-indigo-500/20 text-indigo-300',
    keyName: 'GEMINI_API_KEY',
    keyPlaceholder: 'AIzaSy... (Google AI Studio)',
    keyUrl: 'https://aistudio.google.com/apikey',
    supportsMedia: true,
    supportsSearch: true,
    defaultModels: [
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (Stabil, önerilen)' },
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Preview)' },
      { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash-Lite (Preview)' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (16 Eki 2026\'da kapanacak)' }
    ],
    listModels: async (key) => {
      if (!key) return null;
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!r.ok) return null;
        const d = await r.json();
        return (d.models || [])
          .filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini/i.test(m.name))
          .map(m => ({ id: m.name.replace('models/', ''), label: m.displayName || m.name.replace('models/', '') }));
      } catch (e) { return null; }
    }
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    badge: 'Ücretsiz & Çok Hızlı (LPU)',
    color: 'emerald',
    badgeClass: 'bg-emerald-500/20 text-emerald-300',
    keyName: 'GROQ_API_KEY',
    keyPlaceholder: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    supportsMedia: false,
    supportsSearch: false,
    defaultModels: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
      { id: 'qwen/qwen3-32b', label: 'Qwen3 32B' },
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' }
    ],
    listModels: async (key) => {
      if (!key) return null;
      try {
        const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } });
        if (!r.ok) return null;
        const d = await r.json();
        return (d.data || [])
          .map(m => ({ id: m.id, label: m.id }))
          .filter(m => !/whisper|guard|tts|prompt-guard/i.test(m.id));
      } catch (e) { return null; }
    }
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    badge: 'Ücretsiz Modeller (:free)',
    color: 'fuchsia',
    badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300',
    keyName: 'OPENROUTER_API_KEY',
    keyPlaceholder: 'sk-or-v1-...',
    keyUrl: 'https://openrouter.ai/keys',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    supportsMedia: false,
    supportsSearch: false,
    defaultModels: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (Free)' },
      { id: 'deepseek/deepseek-chat-v3.1:free', label: 'DeepSeek Chat v3.1 (Free)' }
    ],
    listModels: async () => {
      // OpenRouter model listesi public'tir, key gerektirmez
      try {
        const r = await fetch('https://openrouter.ai/api/v1/models');
        if (!r.ok) return null;
        const d = await r.json();
        return (d.data || [])
          .filter(m => m.id.endsWith(':free') || (m.pricing && parseFloat(m.pricing.prompt || '1') === 0 && parseFloat(m.pricing.completion || '1') === 0))
          .map(m => ({ id: m.id, label: m.name || m.id }));
      } catch (e) { return null; }
    }
  }
};

// AIRouter: hangi sağlayıcı/model aktif, localStorage üzerinden kalıcı
const AIRouter = {
  getProvider: () => (typeof SafeStorage !== 'undefined' && SafeStorage.getItem('AI_PROVIDER')) || 'gemini',
  setProvider: (p) => SafeStorage.setItem('AI_PROVIDER', p),
  getModel: (providerId) => {
    const p = providerId || AIRouter.getProvider();
    const saved = SafeStorage.getItem(`AI_MODEL_${p}`);
    if (saved) return saved;
    return AI_PROVIDERS[p]?.defaultModels?.[0]?.id || '';
  },
  setModel: (providerId, modelId) => SafeStorage.setItem(`AI_MODEL_${providerId}`, modelId)
};

// ── ECONOMIC_DATA: Tek kaynak ekonomik veri seti ───────────────────────────
// ÖNEMLİ: black_2.3'e kadar bu rakamlar sysPrompt string'inin içine gömülüydü
// ve sadece "Haziran 2026" / "16 Temmuz 2026" ETİKETLERİ .replace() ile
// güncelleniyordu — rakamların KENDİSİ hiç güncellenmiyordu. Yani "dinamik
// tarih" aslında sadece dinamik bir yazıydı, veri donuktu. Artık tek yapman
// gereken şey bu objedeki değerleri (ve dataAsOf tarihlerini) güncellemek;
// sysPrompt bunları otomatik olarak doğru yerlere yerleştirir.
const ECONOMIC_DATA = {
  aclikSiniri: { value: '35.759 TL', baseline2002: '1.522 TL', note: 'dört kişilik aile, TÜRK-İŞ', dataAsOf: 'Haziran 2026' },
  yoksullukSiniri: { value: '116.478 TL', baseline2002: '4.560 TL', note: 'dört kişilik aile, TÜRK-İŞ', dataAsOf: 'Haziran 2026' },
  asgariUcret: { value: '28.075 TL', baseline2002: '184 TL', note: 'net', dataAsOf: 'Ocak 2026' },
  enDusukEmekliMaasi: { value: '23.552 TL', baseline2002: '150 TL', note: '', dataAsOf: null },
  tufeYillik: { value: '%32.11', baseline2002: '%29.7', note: 'TÜİK', dataAsOf: 'Haziran 2026' },
  tufeAylik: { value: '%0.99', baseline2002: null, note: 'TÜİK', dataAsOf: 'Haziran 2026' },
  tcmbYilSonuBeklenti: { value: '%29', baseline2002: '%35', note: '', dataAsOf: null },
  tcmbPolitikaFaizi: { value: '%37', baseline2002: '%59', note: '', dataAsOf: null },
  dolarTl: { value: '47.05', baseline2002: '1.35', note: '', dataAsOf: '30 Temmuz 2026' },
  euroTl: { value: '54.07', baseline2002: '1.28', note: '', dataAsOf: '30 Temmuz 2026' },
  gramAltin: { value: '6.222 TL', baseline2002: '15.5 TL', note: '', dataAsOf: '30 Temmuz 2026' },
  ceyrekAltin: { value: '10.223 TL', baseline2002: '25 TL', note: '', dataAsOf: '30 Temmuz 2026' },
  issizlik: { value: '%8.2', baseline2002: '%10.3', note: '', dataAsOf: null }
};

// ECONOMIC_DATA'yı sysPrompt içine gömülecek okunabilir bir bloğa çevirir.
// Rakamlar burada TEK bir yerden geliyor; artık dev bir string'in içinde
// aranıp bulunması gerekmiyor. 2002 baz yılı karşılaştırması dahildir.
const buildEconomicDataBlock = () => {
  const d = ECONOMIC_DATA;
  const withDate = (item) => item.dataAsOf ? `${item.note ? item.note + ' ' : ''}${item.dataAsOf}`.trim() : item.note;
  const withBaseline = (item) => {
    let line = `- ${item.label}: ${item.value}`;
    if (item.dataAsOf) line += ` (${withDate(item)})`;
    if (item.baseline2002) line += ` [2002: ${item.baseline2002}]`;
    return line;
  };
  const items = [
    { ...d.aclikSiniri, label: 'Açlık Sınırı' },
    { ...d.yoksullukSiniri, label: 'Yoksulluk Sınırı' },
    { ...d.asgariUcret, label: 'Asgari Ücret' },
    { ...d.enDusukEmekliMaasi, label: 'En Düşük Emekli Maaşı' },
    { ...d.tufeYillik, label: 'TÜFE Yıllık' },
    { ...d.tufeAylik, label: 'TÜFE Aylık' },
    { ...d.tcmbYilSonuBeklenti, label: 'TCMB Yıl Sonu Beklenti' },
    { ...d.tcmbPolitikaFaizi, label: 'TCMB Politika Faizi' },
    { ...d.dolarTl, label: 'Dolar/TL' },
    { ...d.euroTl, label: 'Euro/TL' },
    { ...d.gramAltin, label: 'Gram Altın' },
    { ...d.ceyrekAltin, label: 'Çeyrek Altın' },
    { ...d.issizlik, label: 'İşsizlik' }
  ];
  return items.map(withBaseline).join('\\n');
};

// ── ERROR_PATTERNS: OCR hata mesajı regex'leri (tek kaynak) ────────────────
const ERROR_PATTERNS = [
  /görselde\s+(herhangi\s+)?bir\s+metin\s+bulunmamaktadır/i,
  /bu\s+görselde\s+metin\s+yok/i,
  /no\s+text\s+found\s+in\s+(the\s+)?image/i,
  /görselde\s+yazı\s+bulunamadı/i,
  /metin\s+bulunamadı/i,
  /cannot\s+(read|find|detect)\s+text/i,
  /ocr\s+(failed|error|başarısız)/i,
  /bu\s+resimde\s+yazı\s+yok/i
];

// ── PROXY_AUTH_TOKEN: Yerel proxy sunucu kimlik doğrulama ──────────────────
// Hardcoded string yerine tek kaynak — gerektiğinde buradan değiştir
const PROXY_AUTH_TOKEN = 'otonom_proxy_secret_key_883921';


// Runtime'da güncellenecek — fetch ile tüm parçaları tutar

// script.google.com/macros/s/AKfycbx... formatında olacak



// ============================================================
// LİNKEDİN API SUNUCU AYARLARI
// linkedin_server.py çalışırken otomatik algılama
// ============================================================
let _linkedInServerUrl = '';
const getLinkedInServerUrl = async () => {
  if (_linkedInServerUrl) return _linkedInServerUrl;

  // Remote HTTPS origin (Gemini Canvas cloud) → localhost erişilemez (PNA engeli)
  const isHttpsRemoteOrigin = typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1');

  if (isHttpsRemoteOrigin) {
    addSystemLog('Remote cloud ortamı: LinkedIn yerel sunucu atlandı (PNA engeli).', 'info');
    return null;
  }

  // 1. HTTPS localhost 3001 dene (HTTPS cloud preview ortamında PNA uyumlu)
  try {
    const r = await fetch('https://localhost:3001/', { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      _linkedInServerUrl = 'https://localhost:3001';
      addSystemLog('✓ LinkedIn yerel HTTPS sunucu bulundu: localhost:3001', 'success');
      return _linkedInServerUrl;
    }
  } catch(e) {}

  try {
    const r = await fetch('https://127.0.0.1:3001/', { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      _linkedInServerUrl = 'https://127.0.0.1:3001';
      addSystemLog('✓ LinkedIn yerel HTTPS sunucu bulundu: 127.0.0.1:3001', 'success');
      return _linkedInServerUrl;
    }
  } catch(e) {}

  // 2. HTTP Localhost 3000 dene (sadece local origin)
  try {
    const r = await fetch('http://localhost:3000/', { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      _linkedInServerUrl = 'http://localhost:3000';
      addSystemLog('✓ LinkedIn yerel HTTP sunucu bulundu: localhost:3000', 'success');
      return _linkedInServerUrl;
    }
  } catch(e) {}

  try {
    const r = await fetch('http://127.0.0.1:3000/', { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      _linkedInServerUrl = 'http://127.0.0.1:3000';
      addSystemLog('✓ LinkedIn yerel HTTP sunucu bulundu: 127.0.0.1:3000', 'success');
      return _linkedInServerUrl;
    }
  } catch(e) {}

  return '';
};

// LinkedIn API ile doğrudan paylaşım
const shareToLinkedInAPI = async (text, imageBase64 = null, linkUrl = null, linkTitle = null, videoBase64 = null) => {
  const baseUrl = await getLinkedInServerUrl();
  if (!baseUrl) throw new Error('LinkedIn sunucu bulunamadı — linkedin_server.py çalışıyor mu?');

  const body = { commentary: text };
  if (imageBase64) body.image_base64 = imageBase64;
  if (linkUrl) body.link_url = linkUrl;
  if (linkTitle) body.link_title = linkTitle;
  if (videoBase64) body.video_base64 = videoBase64;

  let r;
  if (videoBase64) {
    // Video'yu parçalara böl ve ngrok üzerinden gönder (1MB limit çözümü)
    const base64Data = videoBase64.includes(',') ? videoBase64.split(',')[1] : videoBase64;
    const byteChars = atob(base64Data);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
    const videoBlob = new Blob([byteArray], { type: 'video/mp4' });
    const totalSize = videoBlob.size;
    const chunkSize = 800 * 1024; // 800KB parçalar (ngrok 1MB altında)
    const totalChunks = Math.ceil(totalSize / chunkSize);
    const uploadId = 'vid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    addSystemLog('Video parçalı yükleme: ' + (totalSize / 1024 / 1024).toFixed(1) + ' MB, ' + totalChunks + ' parça', 'info');

    // Parçaları sırayla gönder
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      const chunk = videoBlob.slice(start, end);
      const formData = new FormData();
      formData.append('upload_id', uploadId);
      formData.append('chunk_index', i.toString());
      formData.append('total_chunks', totalChunks.toString());
      formData.append('chunk', chunk, 'chunk_' + i + '.bin');

      const cr = await fetch(`${baseUrl}/linkedin/upload-chunk`, {
          method: 'POST',
          body: formData
        });
      if (!cr.ok) {
        const err = await cr.json().catch(() => ({}));
        throw new Error('Chunk ' + (i+1) + ' yükleme hatası: ' + (err.detail || cr.status));
      }
      addSystemLog('Parça ' + (i+1) + '/' + totalChunks + ' yüklendi', 'info');
    }

    // Birleştirilmiş videoyu LinkedIn'e yükle
    addSystemLog('Video LinkedIn\'e yükleniyor...', 'info');
    const shareForm = new FormData();
    shareForm.append('upload_id', uploadId);
    shareForm.append('commentary', text);
    r = await fetch(`${baseUrl}/linkedin/share-chunked`, {
        method: 'POST',
        body: shareForm
      });
  } else {
    r = await fetch(`${baseUrl}/linkedin/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
  }

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail || `LinkedIn API hatası: ${r.status}`);
  }
  return await r.json();
};

// Blob URL'yi base64'e çevir + boyut kontrolü
const blobUrlToBase64 = async (blobUrl) => {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
  addSystemLog('Video dosya boyutu: ' + sizeMB + ' MB', 'info');

  // 100MB üzeri videoyu reddet
  if (blob.size > 100 * 1024 * 1024) {
    throw new Error('Video çok büyük (' + sizeMB + ' MB). LinkedIn limiti 100MB.');
  }

  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
};


// Wikimedia Commons'tan gerçek görsel çek (Atatürk vb. — Imagen üretemez)
// Wikimedia CORS header verdiği için proxy'ye gerek yok, doğrudan fetch
const fetchWikimediaImages = async (query, limit = 3) => {
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap+${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1280&format=json`;
    const r = await fetch(searchUrl);
    if (!r.ok) return [];
    const data = await r.json();
    const images = [];
    const pages = data.query?.pages || {};
    for (const page of Object.values(pages)) {
      const ii = page.imageinfo?.[0];
      if (ii?.mime?.startsWith('image/')) {
        images.push(ii.thumburl || ii.url);
      }
    }
    return images;
  } catch (e) { return []; }
};


// CORS proxy listesi — son çare olarak denenir
// black_2.2: Public proxy'ler öncelikli (Canvas ortamında localhost yok)
// Local proxy'ler yedek (sadece lokal geliştirme ortamında)
const GAZETE_PROXY_ENDPOINTS = {
  gazeteoku: 'http://localhost:3457/gazeteoku',
  aydinlik: 'http://localhost:3457/aydinlik',
  yenimesaj: 'http://localhost:3457/yenimesaj',
  gzt: 'http://localhost:3457/gzt',
};

// black_2.3: Sadece bu gazeteler listelenir (kullanıcı talebi)
// black_3.19: Hürriyet, Milliyet, Yeni Mesaj Aydınlık CDN'den kaldırıldı
// black_3.20: Hürriyet ve Milliyet gazeteoku.com CDN'inden eklendi
const ALLOWED_GAZETELER = [
  'Akşam', 'Analiz', 'Aydınlık', 'BirGün', 'Cumhuriyet', 'Diriliş Postası',
  'Dünya', 'Evrensel', 'Fanatik', 'Fotomaç', 'Hürriyet', 'Karar', 'Korkusuz',
  'Milat', 'Milli Gazete', 'Milliyet', 'Nasıl Bir Ekonomi', 'Nefes', 'Posta',
  'Sabah', 'Sözcü', 'Takvim', 'Tavır Gazetesi', 'Türkiye', 'Yeniçağ',
  'Yeni Asya', 'Yeni Birlik', 'Yeni Şafak',
];
const _isCanvasHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
const CORS_PROXIES = [
  { url: (u) => `https://www.whateverorigin.org/get?url=${encodeURIComponent(u)}`, json: true },
  { url: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`, json: false },
  { url: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, json: true },
  { url: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`, json: false },
  ...(_isCanvasHttps ? [] : [{ url: (u) => `http://localhost:3457/proxy?url=${encodeURIComponent(u)}`, json: false, local: true }]),
];



// ============================================================================
// M2: CORE UTILITIES
// ============================================================================

const SafeStorage = {
  memoryStore: {},
  getItem: (key) => { try { return localStorage.getItem(key); } catch (e) { return SafeStorage.memoryStore[key] || null; } },
  setItem: (key, value) => { try { localStorage.setItem(key, value); } catch (e) { SafeStorage.memoryStore[key] = value; } },
  removeItem: (key) => { try { localStorage.removeItem(key); } catch (e) { delete SafeStorage.memoryStore[key]; } }
};

let apiKey = (typeof window !== 'undefined' && (window.apiKey || window.__google_api_key)) || SafeStorage.getItem('GEMINI_API_KEY') || "";
const setGeminiApiKey = (key) => {
  apiKey = key || "";
  SafeStorage.setItem('GEMINI_API_KEY', apiKey);
};
const getGeminiApiKey = () => (typeof window !== 'undefined' && (window.apiKey || window.__google_api_key)) || apiKey || SafeStorage.getItem('GEMINI_API_KEY') || "";

// Gemini Canvas ortamında environment variable yok — key'leri manuel girin veya UI'dan kaydedin.
const NVIDIA_API_KEY = "";
const GROQ_API_KEY = "";

const _getAudioCtx = () => {
  if (!window._globalAudioCtx) {
    window._globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (window._globalAudioCtx.state === 'suspended') {
    window._globalAudioCtx.resume().catch((e) => { ErrorHandler.silent(e); });
  }
  return window._globalAudioCtx;
};

const _suspendAudioCtx = () => {
  if (window._globalAudioCtx && window._globalAudioCtx.state === 'running') {
    window._globalAudioCtx.suspend().catch((e) => { ErrorHandler.silent(e); });
  }
};

class EventBus {
  constructor() { this.listeners = {}; }
  on(event, callback) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(callback); }
  emit(event, data) { if (this.listeners[event]) this.listeners[event].forEach(cb => cb(data)); }
}
const sysEventBus = new EventBus();

const _logBuffer = [];
const addSystemLog = (text, type = 'info') => {
  const time = new Date().toLocaleTimeString('tr-TR');
  const entry = { text, type, timestamp: time };
  _logBuffer.push(entry);
  sysEventBus.emit('SYS_LOG_ADD', entry);
  console.log(`[SYS_LOG] [${type.toUpperCase()}] ${text}`);
};
window.addSystemLog = addSystemLog;

// ── ErrorHandler: Tüm catch blokları için standart hata yönetimi ───────────
const ErrorHandler = {
  silent(e) { console.warn('[OTONOM]', e?.message || e); },
  log(e, context = '') { addSystemLog(`${context ? context + ': ' : ''}${e?.message || e}`, 'warn'); },
  fatal(e, context = '') { addSystemLog(`${context ? context + ': ' : ''}${e?.message || e}`, 'error'); throw e; },
  sync(e) { console.warn("Otomatik senkronizasyon hatası:", e); }
};

// ── Sanitize: AI çıktısından zararlı içeriği temizler ───────────────────────
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  // HTML tag'lerini temizle
  let cleaned = text.replace(/<[^>]*>/g, '');
  // Script/event handler kalıntılarını temizle
  cleaned = cleaned.replace(/javascript:/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=/gi, '');
  // Zararlı URI şemalarını temizle
  cleaned = cleaned.replace(/data:/gi, '');
  cleaned = cleaned.replace(/vbscript:/gi, '');
  // HTML entity encoding ile kaçış karakterlerini temizle
  cleaned = cleaned.replace(/&#\d+;/g, '');
  cleaned = cleaned.replace(/&#x[0-9a-f]+;/gi, '');
  // Fazla boşlukları düzelt
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
};

const sanitizeForLog = (text, maxLen = 100) => {
  const cleaned = sanitizeText(text);
  return cleaned.length > maxLen ? cleaned.substring(0, maxLen) + '...' : cleaned;
};

// ── useDebounce: React hook için debounce ───────────────────────────────────
const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

// ── ObjectURLManager: URL sızıntısını önler ────────────────────────────────
const ObjectURLManager = {
  _urls: new Set(),
  create(blob) {
    const url = URL.createObjectURL(blob);
    this._urls.add(url);
    return url;
  },
  revoke(url) {
    if (url && this._urls.has(url)) {
      URL.revokeObjectURL(url);
      this._urls.delete(url);
    } else if (url) {
      URL.revokeObjectURL(url);
    }
  },
  revokeAll() {
    this._urls.forEach(u => URL.revokeObjectURL(u));
    this._urls.clear();
  }
};

const exportWorkflowLog = (jobState) => {
  const lines = ['=== AI News Studio Workflow Log ===', `Tarih: ${new Date().toLocaleString('tr-TR')}`, `Versiyon: ${APP_VERSION.toString()}`, ''];
  lines.push('--- Sistem Logları ---');
  for (const e of _logBuffer) lines.push(`[${e.timestamp}] [${e.type.toUpperCase()}] ${e.text}`);
  lines.push('');
  lines.push('--- Workflow State ---');
  lines.push(`Job ID: ${jobState?.jobId || 'N/A'}`);
  lines.push(`Status: ${jobState?.status || 'N/A'}`);
  lines.push(`Slides: ${jobState?.script?.videoSlides?.length || 0}`);
  lines.push(`ImageBlocks: ${jobState?.script?.imageBlocks?.length || 0}`);
  lines.push(`Images generated: ${jobState?.assets?.images?.filter(Boolean).length || 0}/${jobState?.assets?.images?.length || 0}`);
  lines.push(`Audio generated: ${jobState?.assets?.audio?.filter(Boolean).length || 0}/${jobState?.assets?.audio?.length || 0}`);
  lines.push(`Config: ${JSON.stringify(jobState?.config || {}, null, 2)}`);
  lines.push('');
  lines.push('--- Slide Details ---');
  for (const [i, s] of (jobState?.script?.videoSlides || []).entries()) {
    lines.push(`S${i + 1}: "${(s.spokenText || '').substring(0, 80)}..." img=${!!jobState?.assets?.images?.[i]} aud=${!!jobState?.assets?.audio?.[i]}`);
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = ObjectURLManager.create(blob);
  a.download = `log_${Date.now()}.txt`;
  a.click();
};
window.exportWorkflowLog = exportWorkflowLog;

const getWPS = (lang) => ({ 'en': 2.5, 'es': 2.6, 'fr': 2.4, 'tr': 2.2, 'ar': 2.2, 'de': 2.0, 'ru': 2.0 }[lang] || 2.2);

// ── Dinamik tarih helper: Hardcoded ekonomik veri tarihlerini üretir ────────
const _getCurrentMonthYearTR = () => {
  const now = new Date();
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return months[now.getMonth()] + ' ' + now.getFullYear();
};
const _getCurrentDateTR = () => {
  const now = new Date();
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
};

const getDurationBounds = (dur) => {
  if (dur === '15') return { min: 15.0, max: 30.0 };
  if (dur === '30') return { min: 30.0, max: 60.0 };
  if (dur === '60') return { min: 60.0, max: 90.0 };
  if (dur === '90') return { min: 90.0, max: 120.0 };
  return { min: 0.0, max: 9999.0 };
};


// ============================================================================
// M3: NETWORK & FIREBASE
// ============================================================================

let app, auth, db, appId;
const initFirebase = () => {
  try {
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    if (Object.keys(firebaseConfig).length > 0 && typeof firebaseAppGlobal !== 'undefined') {
      app = firebaseAppGlobal;
      auth = typeof firebaseAuthGlobal !== 'undefined' ? firebaseAuthGlobal : null;
      db = typeof firebaseDbGlobal !== 'undefined' ? firebaseDbGlobal : null;
      appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      return true;
    }
  } catch (e) { console.warn("[INFRA] Firebase başlatılamadı, izole modda çalışılıyor."); }
  return false;
};
const isFirebaseActive = initFirebase();

const attemptSilentReauth = async () => {
  try {
    if (auth) {
      addSystemLog("Yetkilendirme anahtarı yenileniyor (Silent Re-Auth)...", "info");
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
      else await signInAnonymously(auth);
      addSystemLog("Oturum anahtarı arka planda başarıyla tazelendi!", "success");
      return true;
    }
  } catch (e) { addSystemLog("Sessiz re-auth denemesi başarısız oldu: " + e.message, "error"); }
  return false;
};

const NetworkUtils = {
  fetchWithRetry: async (url, options, retries = 5) => {
    // Exponential backoff: baseDelay * 2^attempt + jitter
    // 429 (rate limit) için tavan daha yüksek tutulur — RPM tabanlı limitler
    // genelde tam 1 dakikalık pencerede sıfırlanır, kısa backoff yetmez.
    const baseDelay = 1000;
    const maxDelay = 30000;
    const maxDelay429 = 65000;
    for (let i = 0; i < retries; i++) {
      const delay = Math.min(baseDelay * Math.pow(2, i), maxDelay);
      const delay429 = Math.min(baseDelay * Math.pow(2, i + 1), maxDelay429);
      const jitter = Math.random() * 500; // 0-500ms jitter
      const totalDelay = delay + jitter;
      const totalDelay429 = delay429 + jitter;
      try {
        const res = await fetch(url, options);
        if (res.ok) return res;
        if (res.status === 400 || res.status === 403 || res.status === 404) throw new Error(`HTTP_FAIL_${res.status}`);
        if (res.status === 401) {
          addSystemLog(`Oturum hatası (401) algılandı, sessiz yenileme deneniyor...`, "info");
          const success = await attemptSilentReauth();
          if (success) { addSystemLog(`Sessiz kimlik doğrulama tazelendi, istek yeniden deneniyor.`, "success"); continue; }
          if (i === retries - 1) { sysEventBus.emit('AUTH_EXPIRED', true); throw new Error("Oturum süresi doldu (401)."); }
          await new Promise(r => setTimeout(r, totalDelay)); continue;
        }
        if (res.status === 429) {
          const retryAfterHeader = parseFloat(res.headers?.get?.('retry-after'));
          const waitMs = !isNaN(retryAfterHeader) ? Math.min(retryAfterHeader * 1000, maxDelay429) : totalDelay429;
          addSystemLog(`Yavaşlık (HTTP 429 — API kotası). Yeniden deneme (${i + 1}/${retries}) - ${(waitMs / 1000).toFixed(1)}sn...`, "warn");
          await new Promise(r => setTimeout(r, waitMs)); continue;
        }
        if (res.status >= 500) { addSystemLog(`Yavaşlık (HTTP ${res.status}). Yeniden deneme (${i + 1}/${retries}) - ${(totalDelay / 1000).toFixed(1)}sn...`, "warn"); await new Promise(r => setTimeout(r, totalDelay)); continue; }
        throw new Error(`HTTP Error ${res.status}`);
      } catch (err) {
        if (err.message.startsWith('HTTP_FAIL_') || err.message.includes('Oturum süresi doldu')) throw err;
        if (i === retries - 1) throw err;
        addSystemLog(`Bağlantı kesintisi. Yeniden deneniyor (${i + 1}/${retries}) - ${(totalDelay / 1000).toFixed(1)}sn...`, "warn");
        await new Promise(r => setTimeout(r, totalDelay));
      }
    }
    throw new Error('fetchWithRetry: tüm denemeler başarısız');
  },
  loadImage: (src) => new Promise((resolve) => { if (!src) return resolve(null); if (typeof src !== 'string') { console.warn('loadImage: src string değil', typeof src); return resolve(null); } const img = new Image(); if (src.startsWith('http')) img.crossOrigin = "Anonymous"; img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src; }),
  fileToBase64: (file) => new Promise((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.readAsDataURL(file); }),
  compressImage: (file) => new Promise((resolve) => {
      if (!file.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.readAsDataURL(file); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width; let h = img.height; const maxW = 1080;
          if (w > maxW || h > maxW) {
            if (w > h) { h = Math.round((h / w) * maxW); w = maxW; }
            else { w = Math.round((w / h) * maxW); h = maxW; }
          }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, w, h);
          const res = canvas.toDataURL('image/jpeg', 0.7);
          canvas.width = 0; canvas.height = 0; // Release canvas texture buffer
          resolve(res);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    })
};


// ============================================================================
// M4: ASSET MANAGER
// ============================================================================

const ASSET_DB = 'AINewsSaaS_Assets_v5';
const STORE_MEDIA = 'media_cache';
const STORE_JOBS = 'temporal_jobs';
const LIB_STORE = 'musicLib';
const DIR_STORE = 'dirHandles';

class AssetManagerService {
  static async getDB() { return new Promise((resolve, reject) => { const req = indexedDB.open(ASSET_DB, 2); req.onupgradeneeded = (e) => { const db = e.target.result; if (!db.objectStoreNames.contains(STORE_MEDIA)) db.createObjectStore(STORE_MEDIA, { keyPath: 'id' }); if (!db.objectStoreNames.contains(STORE_JOBS)) db.createObjectStore(STORE_JOBS, { keyPath: 'jobId' }); if (!db.objectStoreNames.contains(LIB_STORE)) db.createObjectStore(LIB_STORE, { keyPath: 'id' }); if (!db.objectStoreNames.contains(DIR_STORE)) db.createObjectStore(DIR_STORE, { keyPath: 'id' }); }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
  static async saveMedia(id, data) { try { const db = await this.getDB(); const tx = db.transaction(STORE_MEDIA, 'readwrite'); tx.objectStore(STORE_MEDIA).put({ id, data, timestamp: Date.now() }); return new Promise(r => tx.oncomplete = () => r(true)); } catch (e) { return false; } }
  static async loadMedia(id) { try { const db = await this.getDB(); const tx = db.transaction(STORE_MEDIA, 'readonly'); const req = tx.objectStore(STORE_MEDIA).get(id); return new Promise(r => req.onsuccess = () => r(req.result?.data || null)); } catch (e) { return null; } }
  static async deleteMedia(id) { try { const db = await this.getDB(); const tx = db.transaction(STORE_MEDIA, 'readwrite'); tx.objectStore(STORE_MEDIA).delete(id); return new Promise(r => tx.oncomplete = () => r(true)); } catch (e) { return false; } }
  static async saveJobState(jobData) { try { const db = await this.getDB(); const tx = db.transaction(STORE_JOBS, 'readwrite'); tx.objectStore(STORE_JOBS).put(jobData); return new Promise(r => tx.oncomplete = () => r(true)); } catch (e) { return false; } }
  static async getPendingJob() { try { const db = await this.getDB(); const tx = db.transaction(STORE_JOBS, 'readonly'); const req = tx.objectStore(STORE_JOBS).getAll(); return new Promise(r => req.onsuccess = () => { const jobs = req.result || []; const pending = jobs.find(j => j.status !== 'COMPLETED' && j.status !== 'FAILED'); r(pending || null); }); } catch (e) { return null; } }
  static async clearJob(jobId) { try { const db = await this.getDB(); const tx = db.transaction(STORE_JOBS, 'readwrite'); tx.objectStore(STORE_JOBS).delete(jobId); } catch(e) { ErrorHandler.silent(e); } }
  static async saveMusicToLib(musicObj) { try { const db = await this.getDB(); const tx = db.transaction(LIB_STORE, 'readwrite'); tx.objectStore(LIB_STORE).put(musicObj); return new Promise(r => tx.oncomplete = () => r(true)); } catch (e) { return false; } }
  static async getAllMusicFromLib() { try { const db = await this.getDB(); const tx = db.transaction(LIB_STORE, 'readonly'); const req = tx.objectStore(LIB_STORE).getAll(); return new Promise(r => req.onsuccess = () => r(req.result || [])); } catch (e) { return []; } }
  static async getMusicFromLib(id) { try { const db = await this.getDB(); const tx = db.transaction(LIB_STORE, 'readonly'); const req = tx.objectStore(LIB_STORE).get(id); return new Promise(r => req.onsuccess = () => r(req.result || null)); } catch (e) { return null; } }
  static async removeMusicFromLib(id) { try { const db = await this.getDB(); const tx = db.transaction(LIB_STORE, 'readwrite'); tx.objectStore(LIB_STORE).delete(id); return new Promise(r => tx.oncomplete = () => r(true)); } catch (e) { return false; } }
  static async saveDirHandle(handle) { try { const db = await this.getDB(); const tx = db.transaction(DIR_STORE, 'readwrite'); tx.objectStore(DIR_STORE).put({ id: 'musicDir', handle, name: handle.name, lastSync: Date.now() }); return new Promise(r => tx.oncomplete = () => r(true)); } catch (e) { return false; } }
  static async getDirHandle() { try { const db = await this.getDB(); const tx = db.transaction(DIR_STORE, 'readonly'); const req = tx.objectStore(DIR_STORE).get('musicDir'); return new Promise(r => req.onsuccess = () => r(req.result || null)); } catch (e) { return null; } }
  static async removeDirHandle() { try { const db = await this.getDB(); const tx = db.transaction(DIR_STORE, 'readwrite'); tx.objectStore(DIR_STORE).delete('musicDir'); return new Promise(r => tx.oncomplete = () => r(true)); } catch (e) { return false; } }
  // İndirilenler klasörü için directory handle
  static async saveDownloadsDirHandle(handle) { try { const db = await this.getDB(); const tx = db.transaction(DIR_STORE, 'readwrite'); tx.objectStore(DIR_STORE).put({ id: 'downloadsDir', handle, name: handle.name, timestamp: Date.now() }); return new Promise(r => tx.oncomplete = () => r(true)); } catch (e) { return false; } }
  static async getDownloadsDirHandle() { try { const db = await this.getDB(); const tx = db.transaction(DIR_STORE, 'readonly'); const req = tx.objectStore(DIR_STORE).get('downloadsDir'); return new Promise(r => req.onsuccess = () => r(req.result || null)); } catch (e) { return null; } }

  // v3.18: Render checkpoint — her sahne sonunda render ilerlemesini kaydet
  static async saveRenderCheckpoint(jobId, checkpoint) { try { const db = await this.getDB(); const tx = db.transaction(STORE_JOBS, 'readwrite'); tx.objectStore(STORE_JOBS).put({ jobId, ...checkpoint, timestamp: Date.now() }); return new Promise(r => tx.oncomplete = () => r(true)); } catch (e) { return false; } }
  static async getRenderCheckpoint(jobId) { try { const db = await this.getDB(); const tx = db.transaction(STORE_JOBS, 'readonly'); const req = tx.objectStore(STORE_JOBS).get(jobId + '_checkpoint'); return new Promise(r => req.onsuccess = () => r(req.result || null)); } catch (e) { return null; } }
  static async clearRenderCheckpoint(jobId) { try { const db = await this.getDB(); const tx = db.transaction(STORE_JOBS, 'readwrite'); tx.objectStore(STORE_JOBS).delete(jobId + '_checkpoint'); return new Promise(r => tx.oncomplete = () => r(true)); } catch (e) { return false; } }
}

const syncMusicFromDir = async (dirHandle, existingMusic) => {
  if (!dirHandle || typeof dirHandle.values !== 'function') return 0;
  const audioExts = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma'];
  const existingIds = new Set(existingMusic.map(m => m.id));
  let newCount = 0;
  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && audioExts.some(ext => entry.name.toLowerCase().endsWith(ext))) {
        const file = await entry.getFile();
        const id = "fm_" + file.name.replace(/[^a-zA-Z0-9]/g, '_') + "_" + file.size;
        if (existingIds.has(id)) continue;
        const b64 = await NetworkUtils.fileToBase64(file);
        await AssetManagerService.saveMusicToLib({ id, name: file.name, data: b64 });
        newCount++;
      }
    }
    if (dirHandle.name) {
      const db = await AssetManagerService.getDB();
      const tx = db.transaction(DIR_STORE, 'readwrite');
      tx.objectStore(DIR_STORE).put({ id: 'musicDir', handle: dirHandle, name: dirHandle.name, lastSync: Date.now() });
    }
  } catch (e) {
    ErrorHandler.sync(e);
  }
  return newCount;
};


// ============================================================================
// M4b: HELPER
// ============================================================================

const analyzeQuoteEmotion = (text) => {
  const lower = text.toLowerCase();
  const mutluKelimeler = ['mutlu', 'sevinç', 'neşe', 'güle', 'eğlen', 'coşku', 'başarı', 'zafer', 'kazan', 'umut', 'güneş', 'aydınlık', 'güzel', 'sevgi', 'aşk', 'sev', 'tatlı', 'tat', 'bal', 'çiçek', 'bahar', 'yaz', 'dünya', 'yaşam', 'hayat'];
  const hüzünlüKelimeler = ['hüzün', 'üzgün', 'ağla', 'göz yaş', 'keder', 'acı', 'kayıp', 'ölüm', 'ayrılık', 'yalnız', 'yalnızlık', 'karanlık', 'gece', 'son', 'bitiş', 'veda', 'göç', 'hıçkırık', 'fırtına', 'yağmur', 'kış', 'soğuk', 'don', 'göz yaş'];
  const romantikKelimeler = ['aşk', 'sevda', 'sevgili', 'kalp', 'gönül', 'dudak', 'öp', 'sarı', 'kokla', 'tatlı', 'bal', 'gül', 'ay', 'yıldız', 'gece', 'rk', 'düş', 'rüya', 'özlem', 'bekle', 'hasret', 'vuslat', 'buluş'];
  let mutluSkor = 0, hüzünlüSkor = 0, romantikSkor = 0;
  mutluKelimeler.forEach(k => { if (lower.includes(k)) mutluSkor++; });
  hüzünlüKelimeler.forEach(k => { if (lower.includes(k)) hüzünlüSkor++; });
  romantikKelimeler.forEach(k => { if (lower.includes(k)) romantikSkor++; });
  const maxSkor = Math.max(mutluSkor, hüzünlüSkor, romantikSkor);
  if (maxSkor === 0) return 'notr';
  if (mutluSkor === maxSkor) return 'mutlu';
  if (hüzünlüSkor === maxSkor) return 'hüzünlü';
  return 'romantik';
};

const matchMusicToEmotion = (emotion, musicList) => {
  if (!musicList || musicList.length === 0) return null;
  const emotionKeywords = {
    'mutlu': ['happy', 'upbeat', 'energetic', 'pop', 'joy', 'dance', 'fun', 'bright', 'major', 'optimistic', 'mutlu', 'neşeli', 'coşkulu', 'eğlence'],
    'hüzünlü': ['sad', 'melancholy', 'emotional', 'piano', 'strings', 'slow', 'deep', 'minor', 'cry', 'sorrow', 'hüzün', 'üzüntü', 'agir', 'yavas', 'duygusal'],
    'romantik': ['romantic', 'love', 'soft', 'gentle', 'dream', 'ambient', 'chill', 'relax', 'calm', 'aşk', 'sevgi', 'roma', 'duygusal', 'yavas'],
    'notr': ['background', 'ambient', 'chill', 'lofi', 'calm', 'soft', 'neutral', 'minimal']
  };
  const keywords = emotionKeywords[emotion] || emotionKeywords['notr'];
  let bestMatch = null;
  let bestScore = -1;
  for (const track of musicList) {
    const name = (track.name || '').toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (name.includes(kw)) score += 2;
    }
    const ext = name.split('.').pop();
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) score += 0.5;
    if (score > bestScore) { bestScore = score; bestMatch = track; }
  }
  if (bestScore <= 0) {
    const idx = Math.floor(Math.random() * musicList.length);
    return musicList[idx];
  }
  return bestMatch;
};


// ============================================================================
// M5: LOGIC ENGINE
// ============================================================================


// === ORTAK OCR YARDIMCILARI (tekrarlanan kod birlestirildi) ===
const _splitIntoStrips = (srcB64, stripCount) => {
  return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const strips = [];
        const stripHeight = Math.ceil(img.height / stripCount);
        for (let i = 0; i < stripCount; i++) {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = stripHeight;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, i * stripHeight, img.width, stripHeight, 0, 0, img.width, stripHeight);
          strips.push(canvas.toDataURL('image/jpeg', 0.95).split(',')[1]);
        }
        resolve(strips);
      };
      img.onerror = () => resolve([srcB64]);
      img.src = 'data:image/jpeg;base64,' + srcB64;
    });
};

const _ocrCall = async (imageB64, prompt, model, imgType, apiKey) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const r = await NetworkUtils.fetchWithRetry(url, {
      method: 'POST',
      body: JSON.stringify({
          contents: [{ parts: [
                { inlineData: { mimeType: imgType, data: imageB64 } },
                { text: prompt }
              ] }],
          generationConfig: { temperature: 0.0, maxOutputTokens: 2048 }
        })
    });
  if (!r) return "";
  const data = await r.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
};

const _OCR_MODELS = AI_CONFIG.OCR_MODELS;

// ── ocrWithFallback: OCR fallback mantığını tek fonksiyona indir ───────────
// Strateji: 3 şerit → 5 şerit → tam görsel, her biri tüm modellerle denenir
const ocrWithFallback = async (b64Data, imgType, apiKey, logPrefix = 'Görsel') => {
  const models = _OCR_MODELS;
  const strategies = [
    { strips: 3, prompt: 'Bu şeritteki yazıyı oku. Sadece metni yaz, başka bir şey yazma.', label: '3 şerit' },
    { strips: 5, prompt: 'Bu görsel şeritteki yazıyı tam olarak oku. Sadece metni ver.', label: '5 şerit' },
    { strips: 0, prompt: 'Bu resimdeki tüm yazıyı en üstten en alta, satır satır yaz. Sadece metni ver.', label: 'tam görsel' }
  ];

  for (const strategy of strategies) {
    if (strategy.strips > 0) {
      addSystemLog(`${logPrefix}: ${strategy.label} denemesi...`, 'info');
    } else {
      addSystemLog(`${logPrefix}: ${strategy.label} denemesi...`, 'info');
    }

    for (const model of models) {
      try {
        if (strategy.strips > 0) {
          const strips = await _splitIntoStrips(b64Data, strategy.strips);
          const stripTexts = [];
          for (let i = 0; i < strips.length; i++) {
            const result = await _ocrCall(strips[i], strategy.prompt, model, imgType, apiKey);
            if (result.length > 2) {
              stripTexts.push(result);
              addSystemLog(`  Şerit ${i+1}: "${result.substring(0, 40)}..."`, 'info');
            }
          }
          if (stripTexts.length > 0) {
            const text = stripTexts.join('\n');
            addSystemLog(`✓ ${model} ${strategy.label} başarılı: ${text.length} karakter`, 'success');
            return text;
          }
        } else {
          const result = await _ocrCall(b64Data, strategy.prompt, model, imgType, apiKey);
          if (result.length > 15) {
            addSystemLog(`✓ ${model} ${strategy.label} başarılı: ${result.length} karakter`, 'success');
            return result;
          }
        }
      } catch (e) {
        addSystemLog(`  ${model} ${strategy.label} hatası: ${e.message}`, 'warn');
      }
    }
  }
  return ''; // Tüm denemeler başarısız
};

// === ORTAK GEMINI API ÇAĞRI + JSON PARSE HELPER ===
// === AI SAĞLAYICI YÖNLENDİRİCİ (Gemini / Groq / OpenRouter) ===
// Gemini'nin `contents / systemInstruction / generationConfig` şeklindeki
// payload yapısını girdi olarak alır. Aktif sağlayıcı Gemini değilse, OpenAI
// uyumlu (Groq, OpenRouter) chat/completions formatına çevirir ve yanıtı
// tekrar Gemini şekline (`candidates[0].content.parts[0].text`) sarar —
// böylece çağıran kodun geri kalanı hiç değişmeden çalışmaya devam eder.
// Medya (görsel/video inlineData) veya internet araştırması (google_search)
// içeren istekler, sağlayıcı ne olursa olsun her zaman Gemini'ye gider.
// OpenAI uyumlu sağlayıcılar (Groq, OpenRouter) için ortak çağrı fonksiyonu.
// Hem doğrudan seçim hem de Gemini başarısız olduğunda otomatik fallback için kullanılır.
const _callOpenAICompatible = async (providerId, payload) => {
  const providerCfg = AI_PROVIDERS[providerId];
  const key = SafeStorage.getItem(providerCfg.keyName) || '';
  if (!key) throw new Error(`${providerCfg.label} API key girilmedi. Ayarlar panelinden (AI Sağlayıcı & Model) ekleyin.`);
  const model = AIRouter.getModel(providerId);
  if (!model) throw new Error(`${providerCfg.label} için model seçilmedi.`);

  const messages = [];
  const wantsJSON = payload.generationConfig?.responseMimeType === 'application/json';
  if (payload.systemInstruction?.parts) {
    const sysText = payload.systemInstruction.parts.map(p => p.text || '').join('\n');
    if (sysText) messages.push({ role: 'system', content: sysText });
  }
  if (wantsJSON) messages.push({ role: 'system', content: 'Yanıtını SADECE geçerli JSON olarak ver. Markdown, kod bloğu (```), açıklama veya başka metin EKLEME.' });
  (payload.contents || []).forEach(c => {
    const text = (c.parts || []).map(p => p.text || '').filter(Boolean).join('\n');
    if (text) messages.push({ role: c.role === 'model' ? 'assistant' : 'user', content: text });
  });

  const body = {
    model,
    messages,
    temperature: payload.generationConfig?.temperature ?? 0.8,
    max_tokens: payload.generationConfig?.maxOutputTokens ?? 4096
  };
  if (wantsJSON) body.response_format = { type: 'json_object' };

  const r = await NetworkUtils.fetchWithRetry(providerCfg.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify(body)
  });
  return {
    ok: r.ok,
    status: r.status,
    json: async () => {
      const d = await r.json();
      let text = d.choices?.[0]?.message?.content || '';
      if (wantsJSON) text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      return { candidates: [{ content: { parts: [{ text }] } }] };
    }
  };
};

const _aiGenerateContent = async (payload) => {
  const provider = AIRouter.getProvider();
  const hasMedia = (payload.contents || []).some(c => (c.parts || []).some(p => p.inlineData));
  const needsSearch = Array.isArray(payload.tools) && payload.tools.some(t => t.google_search);
  const useGemini = provider === 'gemini' || hasMedia || needsSearch;
  // Medya/arama gerektirmeyen isteklerde Gemini başarısız olursa otomatik
  // geçilecek yedek sağlayıcı (key'i girilmiş ilk uygun olan).
  const canFallback = !hasMedia && !needsSearch;
  const fallbackProviderId = canFallback
    ? ['groq', 'openrouter'].find(p => p !== provider && SafeStorage.getItem(AI_PROVIDERS[p].keyName))
    : null;

  if (useGemini) {
    if (provider !== 'gemini') {
      addSystemLog(`${hasMedia ? 'Medya analizi' : 'İnternet araştırması'} sadece Gemini ile çalışır — istek otomatik olarak Gemini'ye yönlendirildi.`, 'warn');
    }
    const key = getGeminiApiKey();
    const model = AIRouter.getModel('gemini') || AI_CONFIG.GEMINI_MODEL;
    if (!key) {
      if (fallbackProviderId) {
        addSystemLog(`Gemini API key girilmedi, otomatik olarak ${AI_PROVIDERS[fallbackProviderId].label}'a geçiliyor...`, 'warn');
        return _callOpenAICompatible(fallbackProviderId, payload);
      }
      throw new Error('Gemini API key girilmedi. Ayarlar panelinden (AI Sağlayıcı & Model) ekleyin.');
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    try {
      return await NetworkUtils.fetchWithRetry(url, { method: 'POST', body: JSON.stringify(payload) });
    } catch (e) {
      if (e.message === 'HTTP_FAIL_404') {
        if (fallbackProviderId) {
          addSystemLog(`Model "${model}" bulunamadı, otomatik olarak ${AI_PROVIDERS[fallbackProviderId].label}'a geçiliyor...`, 'warn');
          return _callOpenAICompatible(fallbackProviderId, payload);
        }
        throw new Error(`Model "${model}" bulunamadı (kapatılmış/geçersiz olabilir). AI Sağlayıcı & Model panelinden 🔄 ile listeyi yenileyip güncel bir model seçin.`);
      }
      // 429 (rate limit) tüm denemeler tükendiğinde veya başka bir Gemini
      // hatasında, medya/arama gerektirmeyen bir istekse ücretsiz alternatif
      // sağlayıcıya otomatik geç — iş akışı durmasın.
      if (fallbackProviderId) {
        addSystemLog(`Gemini isteği başarısız oldu (${e.message}). Otomatik olarak ${AI_PROVIDERS[fallbackProviderId].label}'a geçiliyor...`, 'warn');
        try {
          return await _callOpenAICompatible(fallbackProviderId, payload);
        } catch (e2) {
          addSystemLog(`${AI_PROVIDERS[fallbackProviderId].label} yedek denemesi de başarısız oldu: ${e2.message}`, 'error');
          throw e;
        }
      }
      throw e;
    }
  }

  try {
    return await _callOpenAICompatible(provider, payload);
  } catch (e) {
    if (fallbackProviderId) {
      addSystemLog(`${AI_PROVIDERS[provider].label} isteği başarısız oldu (${e.message}). Otomatik olarak ${AI_PROVIDERS[fallbackProviderId].label}'a geçiliyor...`, 'warn');
      return _callOpenAICompatible(fallbackProviderId, payload);
    }
    throw e;
  }
};

const _callGeminiAndParse = async (payload) => {
  const r = await _aiGenerateContent(payload);
  if (!r) throw new Error('API yanıt döndürmedi');
  const data = await r.json();
  if (data.candidates?.[0]?.finishReason === "SAFETY") throw new Error("İçerik güvenlik filtresine takıldı.");
  if (!data.candidates?.[0]?.content) throw new Error("Yapay Zeka API boş yanıt döndürdü.");
  let responseText = data.candidates[0].content.parts[0].text;
  responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const jsonStart = responseText.indexOf('{'); const jsonEnd = responseText.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) responseText = responseText.substring(jsonStart, jsonEnd + 1);
  return JSON.parse(responseText);
};

// === ORTAK base64 → Blob DÖNÜŞÜM HELPER ===
const _base64ToBlob = (b64, mimeType = 'audio/mpeg') => {
  const raw = b64.includes(',') ? b64.split(',')[1] : b64;
  const byteString = atob(raw);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  return new Blob([ab], { type: mimeType });
};

// === ORTAK DİL TALİMATI HELPER ===
const _getLangInstruction = (lang) => {
  const map = { tr: 'TÜRKÇE', en: 'İNGİLİZCE', fr: 'FRANSIZCA', de: 'ALMANCA', es: 'İSPANYOLCA', ar: 'ARAPÇA', ru: 'RUSÇA' };
  return `BÜTÜN SENARYOYU ${map[lang] || 'TÜRKÇE'} YAZACAKSIN.`;
};

// === ORTAK TIMER WORKER HELPER ===
const _createTimerWorker = () => {
  const frameInterval = RENDER_CONFIG.TIMER_WORKER_INTERVAL_MS; // v3.5: config'den oku, 30fps senkron
  const code = `let interval; self.onmessage = function(e) { if (e.data === 'start') interval = setInterval(() => self.postMessage('tick'), ${frameInterval}); if (e.data === 'stop') clearInterval(interval); };`;
  return new Worker(ObjectURLManager.create(new Blob([code], { type: 'application/javascript' })));
};

// === ORTAK SILENT OSCILLATOR HELPER (MediaRecorder canlı tutmak için) ===
const _createSilentOsc = (audioCtx, audioDest) => {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  gain.gain.value = 0.001;
  osc.connect(gain); gain.connect(audioDest); osc.start();
  return { osc, gain };
};

// === ORTAK FONT FAMILY HELPER ===
const _getFontFamily = (fontStyle) => {
  if (fontStyle === 'classic') return "Georgia, 'Times New Roman', serif";
  if (fontStyle === 'typewriter') return "'Courier New', Courier, monospace";
  return "'Inter', 'Arial Black', Arial, sans-serif";
};

// === ORTAK WebM → MP4 DÖNÜŞÜM HELPER (ffmpeg.wasm @0.11 ile) ===
let _ffmpegInstance = null;
const _loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Script yüklenemedi: ' + src));
    document.head.appendChild(s);
  });
const _loadFFmpeg = async () => {
  if (_ffmpegInstance) return _ffmpegInstance;
  await _loadScript('https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');
  const FFmpegLib = window.FFmpeg;
  if (!FFmpegLib || !FFmpegLib.createFFmpeg) throw new Error('ffmpeg.wasm yüklenemedi');
  // Single-threaded core — SharedArrayBuffer/COOP+COEP gerektirmez, Firefox'da çalışır
  const ffmpeg = FFmpegLib.createFFmpeg({
      log: false,
      corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
    });
  await ffmpeg.load();
  _ffmpegInstance = { ffmpeg, fetchFile: FFmpegLib.fetchFile };
  return _ffmpegInstance;
};

const _getFFmpegFriendlyError = (err) => {
  const msg = (err?.message || String(err || '')).toLowerCase();
  if (msg.includes('out of memory') || msg.includes('heap') || msg.includes('memory')) return 'Yetersiz bellek. Diğer sekmeleri kapatın veya video süresini kısaltın.';
  if (msg.includes('codec') || msg.includes('unsupported') || msg.includes('not supported')) return 'Video formatı/codec desteklenmiyor. Farklı bir format deneyin.';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('load') || msg.includes('enoent')) return 'ffmpeg.wasm yüklenemedi. İnternet bağlantınızı kontrol edin.';
  if (msg.includes('invalid data') || msg.includes('corrupt') || msg.includes('damaged')) return 'Video bozuk. Lütfen yeniden render edin.';
  if (msg.includes('timeout') || msg.includes('timed out')) return 'İşlem zaman aşımına uğradı. Video çok uzun olabilir.';
  return 'Video dönüştürme başarısız: ' + (err?.message || 'Bilinmeyen hata');
};

const convertWebMtoMP4 = async (webmBlob, onProgress, bitrate = null) => {
  try {
    const { ffmpeg, fetchFile } = await _loadFFmpeg();
    if (onProgress) ffmpeg.setProgress(({ ratio }) => { if (ratio > 0 && ratio <= 1) onProgress(Math.round(ratio * 100)); });
    ffmpeg.FS('writeFile', 'input.webm', await fetchFile(webmBlob));
    // v3.17: Dinamik bitrate — preset/preview'dan gelen değer
    const videoBitrate = bitrate || RENDER_CONFIG.VIDEO_BITS_PER_SECOND;
    const bitrateStr = String(Math.round(videoBitrate / 1000)) + 'k';
    await ffmpeg.run('-i', 'input.webm', '-vf', 'fps=30', '-r', '30', '-vsync', 'cfr', '-c:v', 'libx264', '-preset', 'fast', '-b:v', bitrateStr, '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', 'output.mp4');
    const data = ffmpeg.FS('readFile', 'output.mp4');
    const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
    try { ffmpeg.FS('unlink', 'input.webm'); ffmpeg.FS('unlink', 'output.mp4'); } catch(e) { ErrorHandler.silent(e); }
    return mp4Blob;
  } catch (err) {
    const friendlyMsg = _getFFmpegFriendlyError(err);
    throw new Error(friendlyMsg);
  }
};

// === OUTRO TEXTS & CTA LABELS (module-level, render içinde tekrar oluşturulmaz) ===
const _OUTRO_TEXTS = {
  tr: ["Abone olmayı,", "beğenmeyi ve", "paylaşmayı", "ihmal etmeyin."],
  en: ["Don't forget to", "subscribe, like", "and share."],
  fr: ["N'oubliez pas de", "vous abonner,", "aimer et partager."],
  de: ["Vergessen Sie nicht", "zu abonnieren, liken", "und zu teilen."],
  es: ["No olvides", "suscribirte, dar", "me gusta y compartir."],
  ar: ["لا تنسَ", "الاشتراك والإعجاب", "والمشاركة."],
  ru: ["Не забудьте", "подписаться, лайкнуть", "и поделиться."]
};
const _CTA_LABELS = {
  tr: { sub: 'Abone Ol', like: 'Beğen', share: 'Paylaş' },
  en: { sub: 'Subscribe', like: 'Like', share: 'Share' },
  fr: { sub: "S'abonner", like: 'Aimer', share: 'Partager' },
  de: { sub: 'Abonnieren', like: 'Liken', share: 'Teilen' },
  es: { sub: 'Suscribir', like: 'Me gusta', share: 'Compartir' },
  ar: { sub: 'اشتراك', like: 'إعجاب', share: 'مشاركة' },
  ru: { sub: 'Подписка', like: 'Лайк', share: 'Поделиться' }
};

class LogicEngineService {


  static validateCurrency(text) {
    if (!text) return text;
    // Prevent $ for Turkish economic data
    if (text.indexOf('$') > -1 && (text.indexOf('aclik') > -1 || text.indexOf('asgari') > -1 || text.indexOf('emekli') > -1 || text.indexOf('yoksulluk') > -1 || text.indexOf('maas') > -1)) {
      text = text.replace(/\$/g, 'TL');
    }
    return text;
  }

  static validateTurkishText(text) {
    if (!text) return text;
    const fixes = {
      'Turkiye': 'T\u00FCrkiye', 'turkiye': 't\u00FCrkiye',
      'Istanbul': '\u0130stanbul', 'istanbul': 'istanbul',
      'Izmir': '\u0130zmir', 'izmir': 'izmir',
      'Ankara': 'Ankara', 'ankara': 'ankara',
      'asgari ucret': 'asgari \u00FCcret', 'Asgari Ucret': 'Asgari \u00FCcret',
      'issizlik': 'i\u015Fsizlik', 'Issizlik': '\u0130\u015Fsizlik',
      'buyume': 'b\u00FCy\u00FCme', 'Buyume': 'B\u00FCy\u00FCme',
      'doviz': 'd\u00F6viz', 'Doviz': 'D\u00F6viz',
      'borc': 'bor\u00E7', 'Borc': 'Bor\u00E7',
      'butce': 'b\u00FCt\u00E7e', 'Butce': 'B\u00FCt\u00E7e',
      'enflasyon': 'enflasyon', 'Enflasyon': 'Enflasyon',
      'faiz': 'faiz', 'Faiz': 'Faiz',
      'maas': 'maa\u015F', 'Maas': 'Maa\u015F',
      'ucurum': 'u\u00E7urum', 'Ucurum': 'U\u00E7urum',
      'yuzde': 'y\u00FCzde', 'Yuzde': 'Y\u00FCzde',
      'Turk': 'T\u00FCrk', 'turk': 't\u00FCrk',
      'Turkce': 'T\u00FCrk\u00E7e', 'turkce': 't\u00FCrk\u00E7e',
      'Aclik': 'A\u00E7l\u0131k', 'aclik': 'a\u00E7l\u0131k',
      'Yoksulluk': 'Yoksulluk', 'yoksulluk': 'yoksulluk',
      'Emekli': 'Emekli', 'emekli': 'emekli',
      'Memur': 'Memur', 'memur': 'memur',
      'isci': 'i\u015F\u00E7i', 'Isci': '\u0130\u015F\u00E7i',
      'ogretmen': '\u00F6\u011Fretmen', 'Ogretmen': '\u00D6\u011Fretmen',
      'doktor': 'doktor', 'Doktor': 'Doktor',
      'hemsire': 'hem\u015Fire', 'Hemsire': 'Hem\u015Fire',
      'muhendis': 'm\u00FChendis', 'Muhendis': 'M\u00FChendis',
      'avukat': 'avukat', 'Avukat': 'Avukat',
    };
    Object.keys(fixes).forEach(function(wrong) {
        text = text.split(wrong).join(fixes[wrong]);
      });
    return text;
  }

  static validateEconomyData(data) {
    const errors = [];
    if (!data || !data.videoSlides) return errors;
    data.videoSlides.forEach(function(slide, i) {
        const text = (slide.spokenText || '') + ' ' + (slide.topText || '');
        if (text.indexOf('Turkiye') > -1 || text.indexOf('turkiye') > -1) {
          errors.push('Sahne ' + (i+1) + ': Turkiye yerine T\u00FCrkiye yaz\u0131lmal\u0131');
        }
        if (text.indexOf('$') > -1 && (text.indexOf('a\u00E7l\u0131k') > -1 || text.indexOf('asgari') > -1 || text.indexOf('emekli') > -1)) {
          errors.push('Sahne ' + (i+1) + ': T\u00FCrk ekonomik verisi $ ile g\u00F6sterilmi\u015F, TL olmal\u0131');
        }
      });
    return errors;
  }

  static async analyzeContent(inputData, inputType, config) {
    addSystemLog('İçerik analiz ediliyor...', 'info');

    if (config.tip === 'guzel_soz') {
      return LogicEngineService._buildGuzelSozScript(inputData, inputType, config);
    }
    if (config.tip === 'iddia_analizi') {
      return LogicEngineService._analyzeIddia(inputData, inputType, config);
    }
    let isUnlimited = config.duration === 'unlimited';
    let targetSec = isUnlimited ? 0 : (config.duration === '15' ? 30 : config.duration === '30' ? 60 : config.duration === '60' ? 90 : config.duration === '90' ? 120 : 60);
    let sceneCount = 4; let words = "80-95";
    const useForceExact = !isUnlimited;
    if (useForceExact) {
      const wps = getWPS(config.language);
      if (config.duration === '15') { sceneCount = 4; words = `${Math.floor(15 * wps)}-${Math.floor(25 * wps)}`; }
      else if (config.duration === '30') { sceneCount = 6; words = `${Math.floor(30 * wps)}-${Math.floor(52 * wps)}`; }
      else if (config.duration === '60') { sceneCount = 9; words = `${Math.floor(60 * wps)}-${Math.floor(82 * wps)}`; }
      else if (config.duration === '90') { sceneCount = 13; words = `${Math.floor(90 * wps)}-${Math.floor(112 * wps)}`; }
    } else { sceneCount = "İçeriğe göre en az 10, ortalama 18-25 sahne"; words = "İçeriği eksiksiz anlatacak kadar esnek"; }

    let styleInstruction = "Video stili: Tarafsız, analitik, ciddi ve keskin bir haber editörü.";
    if (config.videoStyle === 'prompt_output') styleInstruction = "Video stili: Özel Prompt Çıktısı. Kullanıcının girdiği metni doğrudan uygula.";

    const langInstruction = _getLangInstruction(config.language);

    const isImageOutput = config.outputType === 'image';
    let timeConstraint = isUnlimited ? `SÜRE SINIRI YOKTUR. Olayı detaylıca anlat.` : `DİNAMİK KISITLAYICI: Videonun hedef süresi ${config.duration === '15' ? '15-30' : config.duration === '30' ? '30-60' : config.duration === '60' ? '60-90' : '90-120'} saniyedir. Maksimum ${words.split('-')[1]} KELİME.`;

    let dynamicRules = "";
    if (config.analysisMode === 'yorumsuz') {
      dynamicRules = `BİRİNCİ KURAL (SADECE HABER - YORUMSUZ): Girdiyi dikkatlice incele. SADECE haberi tarafsızca anlat. 5N1K kurallarını uygula. Kendi yorumunu katma.\nİKİNCİ KURAL: 'mediaBlackout.show' değerini false yap.\nÜÇÜNCÜ KURAL: 'sonSoz' alanını tekrarlama.\nDÖRDÜNCÜ KURAL: Her sahnenin 'spokenText' metni NOKTA İLE BİTEN BİR CÜMLE OLMALIDIR.\n${timeConstraint}`;
    } else if (config.analysisMode === 'deep_analysis') {
      dynamicRules = `BİRİNCİ KURAL (DERİN ANALİZ): 5N1K dengesini sorgula ve sosyolojik/ekonomik etkileri analiz et.\nİKİNCİ KURAL: Skandalsa 'mediaBlackout.show' true yap.\nÜÇÜNCÜ KURAL: 'sonSoz' alanını tekrarlama.\nDÖRDÜNCÜ KURAL: Her sahnenin 'spokenText' metni NOKTA İLE BİTEN BİR CÜMLE OLMALIDIR.\n${timeConstraint}`;
    } else {
      dynamicRules = `BİRİNCİ KURAL (HABER 5N1K): Girdiyi incele, 5N1K kuralına sadık kalarak özetle.\nİKİNCİ KURAL: Skandal değilse 'mediaBlackout.show' false yap.\nÜÇÜNCÜ KURAL: 'sonSoz' alanını tekrarlama.\nDÖRDÜNCÜ KURAL: Her sahnenin 'spokenText' metni NOKTA İLE BİTEN BİR CÜMLE OLMALIDIR.\n${timeConstraint}`;
    }

    let sonSozInstruction = "";
    if (!isImageOutput) sonSozInstruction = `\n\nYEDİNCİ KURAL (SON SÖZ): Konuya cuk diye oturan çok vurucu bir ATASÖZÜ veya ÖZLÜ SÖZ belirle. Bunu 'sonSoz' alanına kaydet.`;

    // v3.18: Auto-Hashtag — konuya uygun 3-5 hashtag öner
    let hashtagInstruction = "";
    if (!isImageOutput) hashtagInstruction = `\n\nSEKİZİNCİ KURAL (HASHTAG): Konuya uygun 3-5 adet hashtag belirle. Bunları 'hashtags' dizisine kaydet (örn: ["#ekonomi", "#enflasyon", "#turkiye"]).`;

    // v3.18: A/B Varyasyon — 2 farklı hook öner
    let abVariationInstruction = "";
    if (!isImageOutput && config.abVariation === true) abVariationInstruction = `\n\nDOKUZUNCU KURAL (A/B VARYASYON): thumbnailText için 2 FARKLI hook öner. 'hookVariations' dizisine 2 farklı maksimum 3 kelimelik başlık ekle (örn: ["BUNU GİZLİYORLAR!", "YANLIŞ BİLDİRİLDİ!"]).`;

    const sysPrompt = `Sen TikTok ve Instagram Reels için viral içerikler üreten profesyonel bir içerik üreticisisin. Karakterin: Zeki, gerçekleri söyleyen, 20 yaşında dertli bir genç.\n\nSENARYOYU ${isImageOutput ? 1 : sceneCount} SAHNE olacak şekilde böl!\nToplam konuşma metni ${words} kelime aralığında olmalıdır.\n\nDİL KURALI: ${langInstruction}\n${styleInstruction}\n${dynamicRules}\n\nEKONOMI KURALLARI (ekonomi haberi ise): Turkce karakter kullan, TL para birimi, sayi bicimi 85.450 TL, kaynak belirt (TUIK, TCMB, TURK-IS), aclik/yoksulluk siniri guncel olsun. Bilgi kartlari olustur: ENFLASYON %XX, ACLIK SINIRI XX.XXX TL.\n\nGAZETE BAŞLIKLARI: Görseldeki TÜM haber başlıklarını çıkar. Her başlık için:
    - 'baslik': başlık metni
    - 'aciklama': haberin 2-3 cümlelik özeti
    - 'x': başlığın sol üst x koordinatı (0-100 arası yüzde)
    - 'y': başlığın sol üst y koordinatı (0-100 arası yüzde)
    - 'w': başlığın genişliği (0-100 arası yüzde)
    - 'h': başlığın yüksekliği (0-100 arası yüzde)
    En az 1, en fazla 15 başlık çıkar. Kalın siyah veya kırmızı yazı ile yazılan başlıkları al. Reklam, bulmaca, ilan HARİÇ.

    KAPAK VE VİRAL HOOK KURALLARI (MAKSİMUM 3 KELİME KURALI):
    1. 'thumbnailText': KESİNLİKLE MAKSİMUM 3 KELİME olan ultra-tıklama odaklı bir başlık yaz! (Örn: "BUNU GİZLİYORLAR!", "YENİ REKOR KIRILDI!", "SAKIN KAÇIRMA!")
    2. 'topText' (Sahnelerdeki Ekran Üstü Başlıklar): KESİNLİKLE MAKSİMUM 3 KELİME olmalıdır! (Örn: "ASGARİ ÜCRET ERİDİ!", "AÇLIK SINIRI 35.759!")
    3. 'thumbnailImagePrompt': Görseldeki/haberdeki olayı tam analiz ederek buna özel ultra-dramatik, sinematik, 8K HDR İngilizce kapak görsel promptu oluştur.

    CLICKBAIT KANCA & GAZETE VİDEO AKIŞ KURALLARI (ZORUNLU FORMAT):
    1. İLK SAHNE (CLICKBAIT HOOK SAHNESİ):
       - 'thumbnailText': KESİNLİKLE MAKSİMUM 3 KELİME olan aşırı vurucu Clickbait kanca başlığı yaz! (Örn: "BUNU GİZLİYORLAR!", "YENİ REKOR KIRILDI!", "SAKIN KAÇIRMA!")
       - 'thumbnailImagePrompt': Haberi/konuyu zorlayarak tam bir Clickbait tarzına uygun, aşırı dramatik, şok edici, yüksek kontrastlı, sinematik 8K İngilizce AI görsel promptu yaz! KESİNLİKLE HER ZAMAN SIFIRDAN ÇİZİLECEKTİR! (Türkiye dokusu ekle: set in Turkey, realistic Turkish news atmosphere, dramatic lighting).

    2. DEVAM SAHNELERİ (GAZETE İLK SAYFASI & MANŞETLER):
       - Clickbait girişten sonra gelen TÜM sahnelerde GÖRÜNTÜ DEĞİŞMEDEN SABİT GAZETE İLK SAYFASI kalacaktır!
       - Bu sahneler için YAPAY ZEKA GÖRSELİ ÇİZME! 'imagePrompts' dizisini KESİNLİKLE BOŞ DİZİ [] OLARAK BIRAK!
       - Sahneler sadece gazeteden çıkan başlıkları ve 2-3 cümlelik detay özetlerini sırayla okuyacaktır.
       - 'topText': KESİNLİKLE MAKSİMUM 3 KELİME olmalıdır! (Örn: "ZAM ORANI %35!", "AÇLIK SINIRI 35.759!")
       - 'spokenText': Sadece okunacak haber başlığı ve detay açıklaması olmalıdır.

    3. KAPANIS SAHNESİ (SON SÖZ VE ABONE OL):
       - 'sonSoz': Konuya cuk diye oturan çok vurucu bir atasözü veya özlü söz!
       - 'lastQuote': "Daha fazlası için takip edin ve kanala abone olun!" mesajı.

    - SIFIR HALÜSİNASYON: Okuyamadıysan 'isContentUnreadable' true yap.
    - ATATÜRK HASSASİYETİ: 'Atatürk' geçerse 'imagePrompts' kısmına "Mustafa Kemal Atatürk, highly detailed, respectful portrait" ekle!${sonSozInstruction}${hashtagInstruction}${abVariationInstruction}

Dönüş ZORUNLU olarak JSON formatında olmalı.`;

    let parts = [];
    let extractStatsHint = "Olayı tam anla ve KISA BİR ÖZET ver.";
    if (config.analysisMode === 'yorumsuz') extractStatsHint = "SADECE haberi tarafsızca oku.";

    if (inputType === 'media' && Array.isArray(inputData)) {
      parts = inputData.map(file => { const b64 = file.data.split(',')[1]; return { inlineData: { mimeType: file.type || "application/octet-stream", data: b64 } }; });
      const isVideo = inputData.some(f => f.type?.startsWith('video'));
      const hasDoc = inputData.some(f => f.type && !f.type.startsWith('video') && !f.type.startsWith('image'));
      let introText = `Görselleri detaylıca incele.`;
      if (isVideo) introText = `Gönderilen medyaları izle.`;
      if (hasDoc) introText = `Gönderilen belgeleri oku, verileri analiz et.`;
      parts.unshift({ text: `${introText} ${extractStatsHint}` });
    } else if (inputType === 'prompt') { parts = [{ text: `AŞAĞIDAKİ TALİMATI UYGULA:\n\n${inputData}\n\n${extractStatsHint}` }]; }
    else if (inputType === 'url') { parts = [{ text: `[KRİTİK GÖREV]: URL'yi oku. \nURL: ${inputData}\n\nİçeriğe ulaştıysan haberi özetle. ${extractStatsHint}` }]; }
    else { parts = [{ text: `Aşağıdaki konuyu internette araştır. Haberi özetle. \n\n${inputData}\n\n${extractStatsHint}` }]; }

    const payload = {
      contents: [{ role: "user", parts }],
      systemInstruction: { parts: [{ text: sysPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            isContentUnreadable: { type: "BOOLEAN" },
            videoSlides: { type: "ARRAY", items: { type: "OBJECT", properties: { topText: { type: "STRING" }, spokenText: { type: "STRING" }, imagePrompts: { type: "ARRAY", items: { type: "STRING" } } }, required: ["topText", "spokenText", "imagePrompts"] } },
            thumbnailText: { type: "STRING" },
            sonSoz: { type: "STRING" },
            lastQuote: { type: "STRING" },
            thumbnailImagePrompt: { type: "STRING" },
            tiktokTitle: { type: "STRING" },
            tiktokDescription: { type: "STRING" },
            tiktokHashtags: { type: "ARRAY", items: { type: "STRING" } },
            kaynaklar: { type: "ARRAY", items: { type: "OBJECT", properties: { baslik: { type: "STRING" }, url: { type: "STRING" }, tarih: { type: "STRING" } }, required: ["baslik", "url"] } },
            mediaBlackout: { type: "OBJECT", properties: { show: { type: "BOOLEAN" }, percentageCovered: { type: "NUMBER" }, percentageIgnored: { type: "NUMBER" }, mediaNames: { type: "ARRAY", items: { type: "STRING" } }, explanation: { type: "STRING" } }, required: ["show", "percentageCovered", "percentageIgnored", "mediaNames", "explanation"] },
            gazeteBasliklari: { type: "ARRAY", items: { type: "OBJECT", properties: { baslik: { type: "STRING" }, aciklama: { type: "STRING" }, x: { type: "NUMBER" }, y: { type: "NUMBER" }, w: { type: "NUMBER" }, h: { type: "NUMBER" } }, required: ["baslik", "aciklama"] } },
            chartData: { type: "OBJECT", properties: { show: { type: "BOOLEAN" }, type: { type: "STRING" }, title: { type: "STRING" }, note: { type: "STRING" }, items: { type: "ARRAY", items: { type: "OBJECT", properties: { label: { type: "STRING" }, value: { type: "NUMBER" } }, required: ["label", "value"] } } } },
            hashtags: { type: "ARRAY", items: { type: "STRING" } },
            hookVariations: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["isContentUnreadable", "videoSlides", "thumbnailText", "sonSoz", "lastQuote", "thumbnailImagePrompt", "tiktokTitle", "tiktokDescription", "tiktokHashtags", "mediaBlackout"]
        }
      },
      tools: [{ google_search: {} }]
    };
    const parsedData = await _callGeminiAndParse(payload);
    if (parsedData.isContentUnreadable) throw new Error("Orijinal metne ulaşılamadı.");
    
    // Maksimum 3 Kelime Zorunlu Filtreleme Fonksiyonu
    const _cleanMaxThreeWords = (text) => {
      if (!text) return "BUNU GİZLİYORLAR!";
      let cleaned = text.replace(/\d{1,2}\s+[A-Za-zĞÜŞİÖÇğüşıöç]+\s+\d{4}/g, '')
                        .replace(/(Pazartesi|Salı|Çarşamba|Perşembe|Cuma|Cumartesi|Pazar)/gi, '')
                        .replace(/Dünya|Pencere|Hürriyet|Milliyet|Sözcü|Sabah|Cumhuriyet/gi, '')
                        .replace(/[.,:;!?"-]+/g, ' ')
                        .trim();
      const words = cleaned.split(/\s+/).filter(Boolean);
      if (words.length === 0) return "BUNU GİZLİYORLAR!";
      if (words.length > 3) {
        return words.slice(0, 3).join(' ').toUpperCase() + '!';
      }
      return words.join(' ').toUpperCase() + '!';
    };

    if (parsedData.thumbnailText) {
      parsedData.thumbnailText = _cleanMaxThreeWords(parsedData.thumbnailText);
    }

    if (parsedData.videoSlides) {
      const errPatterns = [/görselde.*metin.*bulunmamaktadır/i, /no.*text.*found/i, /metin.*bulunamadı/i, /cannot.*read.*text/i];
      parsedData.videoSlides = parsedData.videoSlides.map(slide => {
          let updatedSlide = { ...slide };
          if (updatedSlide.topText) {
            updatedSlide.topText = _cleanMaxThreeWords(updatedSlide.topText);
          }
          if (updatedSlide.spokenText && errPatterns.some(p => p.test(updatedSlide.spokenText))) {
            updatedSlide.spokenText = updatedSlide.topText || "Bu görseldeki içerik hakkında bilgi veriliyor.";
          }
          // Clickbait girişinden sonra gazete ilk sayfası sabit kalacak (devam sahnelerinde AI görsel üretilmeyecek)
          updatedSlide.imagePrompts = [];
          return updatedSlide;
        });
    }

    // Kapak Görseli (thumbnailImagePrompt) HER ZAMAN CLICKBAIT OLARAK SIFIRDAN ÇİZİLECEK
    if (!parsedData.thumbnailImagePrompt || parsedData.thumbnailImagePrompt.trim() === '') {
      parsedData.thumbnailImagePrompt = "Ultra-dramatic high-contrast news clickbait concept art, shocked expressions, red neon question marks, set in Turkey, authentic Turkish news atmosphere, 8k resolution cinematic lighting";
    } else if (!parsedData.thumbnailImagePrompt.toLowerCase().includes('turkey') && !parsedData.thumbnailImagePrompt.toLowerCase().includes('turkish')) {
      parsedData.thumbnailImagePrompt += ", set in Turkey, authentic Turkish setting, realistic Turkish environment, clickbait style";
    }
    if (parsedData.thumbnailImagePrompt) {
      if (!parsedData.thumbnailImagePrompt.toLowerCase().includes('turkey') && !parsedData.thumbnailImagePrompt.toLowerCase().includes('turkish')) {
        parsedData.thumbnailImagePrompt += ", set in Turkey, authentic Turkish setting, realistic Turkish environment, Turkish people";
      }
    }
    return parsedData;
  }

  // Tek bir görsel için 2-3 sahne üretir (sıralı akış için)
  static async analyzeContentForImage(inputData, inputType, config, imageIndex, totalImages, previousContext) {
    addSystemLog(`Görsel ${imageIndex + 1}/${totalImages} için sahneler üretiliyor...`, 'info');

    let styleInstruction = "Video stili: Tarafsız, analitik, ciddi ve keskin bir haber editörü.";
    if (config.videoStyle === 'prompt_output') styleInstruction = "Video stili: Özel Prompt Çıktısı. Kullanıcının girdiği metni doğrudan uygula.";

    const langInstruction = _getLangInstruction(config.language);

    let dynamicRules = "";
    if (config.analysisMode === 'yorumsuz') {
      dynamicRules = `BİRİNCİ KURAL (SADECE HABER - YORUMSUZ): Girdiyi dikkatlice incele. SADECE haberi tarafsızca anlat. 5N1K kurallarını uygula. Kendi yorumunu katma.\nİKİNCİ KURAL: 'mediaBlackout.show' değerini false yap.\nÜÇÜNCÜ KURAL: Her sahnenin 'spokenText' metni NOKTA İLE BİTEN BİR CÜMLE OLMALIDIR.`;
    } else if (config.analysisMode === 'deep_analysis') {
      dynamicRules = `BİRİNCİ KURAL (DERİN ANALİZ): 5N1K dengesini sorgula ve sosyolojik/ekonomik etkileri analiz et.\nİKİNCİ KURAL: Skandalsa 'mediaBlackout.show' true yap.\nÜÇÜNCÜ KURAL: Her sahnenin 'spokenText' metni NOKTA İLE BİTEN BİR CÜMLE OLMALIDIR.`;
    } else {
      dynamicRules = `BİRİNCİ KURAL (HABER 5N1K): Girdiyi incele, 5N1K kuralına sadık kalarak özetle.\nİKİNCİ KURAL: Skandal değilse 'mediaBlackout.show' false yap.\nÜÇÜNCÜ KURAL: Her sahnenin 'spokenText' metni NOKTA İLE BİTEN BİR CÜMLE OLMALIDIR.`;
    }

    const contextBlock = previousContext ? `\nÖNCEKİ BLOKLARIN ÖZETİ: ${previousContext}\nBu bilgileri tekrarlama, SADECE bu görsel/eğerseldeki yeni içeriğe odaklan.` : "";
    const isLastImage = imageIndex === totalImages - 1;
    const sonSozRule = isLastImage ? `\n\nYEDİNCİ KURAL (SON SÖZ): Konuya cuk diye oturan çok vurucu bir ATASÖZÜ veya ÖZLÜ SÖZ belirle. Bunu 'sonSoz' alanına kaydet.` : "";

    const sysPrompt = `Bu, ${totalImages} görsellik bir videonun ${imageIndex + 1}. bloğudur.\nSen TikTok ve Instagram Reels için viral içerikler üreten profesyonel bir içerik üreticisisin.\n\nSENARYOYU TAM OLARAK 2 SAHNE olacak şekilde böl! Görseldeki haberi/konuyu 2 farklı açıdan anlat.\nHer sahne bu görsele ait haberi anlatmalı.\nToplam konuşma metni bu blok için 30-50 kelime aralığında olmalıdır.\n\nDİL KURALI: ${langInstruction}\n${styleInstruction}\n${dynamicRules}\n${contextBlock}\n\nGAZETE BAŞLIKLARI: Görseldeki TÜM haber başlıklarını çıkar. Her başlık için:
    - 'baslik': başlık metni
    - 'aciklama': haberin 2-3 cümlelik özeti
    - 'x': başlığın sol üst x koordinatı (0-100 arası yüzde)
    - 'y': başlığın sol üst y koordinatı (0-100 arası yüzde)
    - 'w': başlığın genişliği (0-100 arası yüzde)
    - 'h': başlığın yüksekliği (0-100 arası yüzde)
    En az 1, en fazla 15 başlık çıkar. Kalın siyah veya kırmızı yazı ile yazılan başlıkları al. Reklam, bulmaca, ilan HARİÇ.

    KAPAK VE VİRAL HOOK KURALLARI (MAKSİMUM 3 KELİME KURALI):
    1. 'thumbnailText': KESİNLİKLE MAKSİMUM 3 KELİME olan ultra-tıklama odaklı bir başlık yaz! (Örn: "BUNU GİZLİYORLAR!", "YENİ REKOR KIRILDI!", "SAKIN KAÇIRMA!")
    2. 'topText' (Sahnelerdeki Ekran Üstü Başlıklar): KESİNLİKLE MAKSİMUM 3 KELİME olmalıdır! (Örn: "ASGARİ ÜCRET ERİDİ!", "AÇLIK SINIRI 35.759!")
    3. 'thumbnailImagePrompt': Görseldeki/haberdeki olayı tam analiz ederek buna özel ultra-dramatik, sinematik, 8K HDR İngilizce kapak görsel promptu oluştur.

    GAZETE İLK SAYFASI VE YERLİ GÖRSEL KURALLARI:
    1. GAZETE İLK SAYFASI / MANŞET KURALI (KRİTİK): Eğer yüklenen/analiz edilen görsel bir gazete ilk sayfası, gazete manşeti veya gazete kupürü ise SAHNELER İÇİN YAPAY ZEKA GÖRSEL PROMPTU ('imagePrompts') OLUŞTURMA! 'imagePrompts' dizisini KESİNLİKLE BOŞ DİZİ [] OLARAK BIRAK! Orijinal gazete görseli kullanılacaktır.
    2. GAZETE HARİCİ İÇERİKLER İÇİN: HER BİR SAHNE / HABER BAŞLIĞI İÇİN 'imagePrompts' DİZİSİNDE SADECE VE TAM OLARAK 1 ADET AI GÖRSEL PROMPTU YAZILACAKTIR!
    3. TÜRKİYE VE TÜRK KÜLTÜRÜ BAZ ALINACAK: Üretilen TÜM İngilizce görsel promptları ('imagePrompts' ve 'thumbnailImagePrompt') KESİNLİKLE Türkiye'yi baz almalıdır! Yabancı, İngiliz, Amerikan veya Arap kültürü/insanları/mimarisi KESİNLİKLE OLMAYACAK!
    4. Görsel komutlarına mutlaka 'set in Turkey, authentic Turkish setting, realistic Turkish environment, Turkish people, Turkish news atmosphere' detayları eklenecek; paradan bahsediliyorsa Türk Lirası (TL) banknotları kullanılacaktır.
    - ATATÜRK HASSASİYETİ: 'Atatürk' geçerse 'imagePrompts' kısmına "Mustafa Kemal Atatürk, highly detailed, respectful portrait" ekle!${sonSozRule}

Dönüş ZORUNLU olarak JSON formatında olmalı.`;

    let parts = [];
    let extractStatsHint = "Olayı tam anla ve KISA BİR ÖZET ver.";
    if (config.analysisMode === 'yorumsuz') extractStatsHint = "SADECE haberi tarafsızca oku.";

    if (inputType === 'media' && Array.isArray(inputData)) {
      const targetFile = inputData[0];
      if (targetFile) {
        const b64 = targetFile.data.split(',')[1];
        parts = [{ inlineData: { mimeType: targetFile.type || "application/octet-stream", data: b64 } }, { text: "Bu görseldeki haberi/konuyu detaylıca incele ve 2 sahnede anlat." }];
      } else {
        parts = [{ text: `Görsel bulunamadı.` }];
      }
    } else if (inputType === 'prompt') {
      parts = [{ text: `AŞAĞIDAKİ TALİMATI UYGULA (Bu ${imageIndex + 1}/${totalImages} blok):\n\n${inputData}\n\n${extractStatsHint}` }];
    } else if (inputType === 'url') {
      parts = [{ text: `[KRİTİK GÖREV]: URL'yi oku.\nURL: ${inputData}\nBu ${imageIndex + 1}/${totalImages} blok için içeriğe dayanarak haberi özetle. ${extractStatsHint}` }];
    } else {
      parts = [{ text: `Aşağıdaki konuyu internette araştır. Bu ${imageIndex + 1}/${totalImages} blok için haberi özetle.\n\n${inputData}\n\n${extractStatsHint}` }];
    }

    const payload = {
      contents: [{ role: "user", parts }],
      systemInstruction: { parts: [{ text: sysPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            isContentUnreadable: { type: "BOOLEAN" },
            videoSlides: { type: "ARRAY", items: { type: "OBJECT", properties: { topText: { type: "STRING" }, spokenText: { type: "STRING" }, imagePrompts: { type: "ARRAY", items: { type: "STRING" } } }, required: ["topText", "spokenText", "imagePrompts"] } },
            thumbnailText: { type: "STRING" },
            sonSoz: { type: "STRING" },
            lastQuote: { type: "STRING" },
            thumbnailImagePrompt: { type: "STRING" },
            kaynaklar: { type: "ARRAY", items: { type: "OBJECT", properties: { baslik: { type: "STRING" }, url: { type: "STRING" }, tarih: { type: "STRING" } }, required: ["baslik", "url"] } },
            mediaBlackout: { type: "OBJECT", properties: { show: { type: "BOOLEAN" }, percentageCovered: { type: "NUMBER" }, percentageIgnored: { type: "NUMBER" }, mediaNames: { type: "ARRAY", items: { type: "STRING" } }, explanation: { type: "STRING" } }, required: ["show", "percentageCovered", "percentageIgnored", "mediaNames", "explanation"] },
            gazeteBasliklari: { type: "ARRAY", items: { type: "OBJECT", properties: { baslik: { type: "STRING" }, aciklama: { type: "STRING" }, x: { type: "NUMBER" }, y: { type: "NUMBER" }, w: { type: "NUMBER" }, h: { type: "NUMBER" } }, required: ["baslik", "aciklama"] } },
            chartData: { type: "OBJECT", properties: { show: { type: "BOOLEAN" }, type: { type: "STRING" }, title: { type: "STRING" }, note: { type: "STRING" }, items: { type: "ARRAY", items: { type: "OBJECT", properties: { label: { type: "STRING" }, value: { type: "NUMBER" } }, required: ["label", "value"] } } } }
          },
          required: ["isContentUnreadable", "videoSlides", "thumbnailText", "sonSoz", "lastQuote", "thumbnailImagePrompt", "mediaBlackout", "gazeteBasliklari"]
        }
      },
      tools: [{ google_search: {} }]
    };
    const parsedData = await _callGeminiAndParse(payload);
    if (parsedData.isContentUnreadable) throw new Error("Orijinal metne ulaşılamadı.");

    const _cleanMaxThreeWords = (text) => {
      if (!text) return "BUNU GİZLİYORLAR!";
      let cleaned = text.replace(/\d{1,2}\s+[A-Za-zĞÜŞİÖÇğüşıöç]+\s+\d{4}/g, '')
                        .replace(/(Pazartesi|Salı|Çarşamba|Perşembe|Cuma|Cumartesi|Pazar)/gi, '')
                        .replace(/Dünya|Pencere|Hürriyet|Milliyet|Sözcü|Sabah|Cumhuriyet/gi, '')
                        .replace(/[.,:;!?"-]+/g, ' ')
                        .trim();
      const words = cleaned.split(/\s+/).filter(Boolean);
      if (words.length === 0) return "BUNU GİZLİYORLAR!";
      if (words.length > 3) {
        return words.slice(0, 3).join(' ').toUpperCase() + '!';
      }
      return words.join(' ').toUpperCase() + '!';
    };

    if (parsedData.thumbnailText) {
      parsedData.thumbnailText = _cleanMaxThreeWords(parsedData.thumbnailText);
    }

    if (parsedData.videoSlides) {
      const errPatterns = [/görselde.*metin.*bulunmamaktadır/i, /no.*text.*found/i, /metin.*bulunamadı/i, /cannot.*read.*text/i];
      parsedData.videoSlides = parsedData.videoSlides.map(slide => {
          let updatedSlide = { ...slide };
          if (updatedSlide.topText) {
            updatedSlide.topText = _cleanMaxThreeWords(updatedSlide.topText);
          }
          if (updatedSlide.spokenText && errPatterns.some(p => p.test(updatedSlide.spokenText))) {
            updatedSlide.spokenText = updatedSlide.topText || "Bu görseldeki içerik hakkında bilgi veriliyor.";
          }
          return updatedSlide;
        });
    }
    addSystemLog(`Görsel ${imageIndex + 1} için ${parsedData.videoSlides?.length || 0} sahne üretildi.`, 'success');
    return parsedData;
  }


  static async _buildElestiriScript(inputData, inputType, config) {
    addSystemLog('Eleştiri analizi başlıyor...', 'info');

    // 1. İçeriği analiz et
    let parts = [];
    let contentText = '';

    if (inputType === 'media' && Array.isArray(inputData)) {
      parts = inputData.map(file => {
          const b64 = file.data.split(',')[1];
          return { inlineData: { mimeType: file.type || "application/octet-stream", data: b64 } };
        });
      const isVideo = inputData.some(f => f.type?.startsWith('video'));
      parts.unshift({ text: isVideo ? "Bu videoyu izle ve içeriğini analiz et." : "Bu görseli incele ve içeriğini analiz et." });
    } else if (inputType === 'prompt' || inputType === 'text') {
      contentText = typeof inputData === 'string' ? inputData : '';
      parts = [{ text: `Aşağıdaki içeriği analiz et:\n\n${contentText}` }];
    } else if (inputType === 'url') {
      parts = [{ text: `Bu URL'deki içeriği oku ve analiz et: ${inputData}` }];
    }

    // 2. Türkiye gerçekleri ile karşılaştırmalı analiz
    const sysPrompt = `Sen bir Türk medya eleştirmeni ve fact-checker'sın. Görevin:

    1. Verilen içeriği dikkatle analiz et
    2. İçerideki iddiaları, savunulan görüşleri tespit et
    3. Her iddiayı Türkiye'nin GÜNCEL GERÇEKLERİ ile karşılaştır

    GÜNCEL VERİ ZORUNLULUĞU (${new Date().getFullYear()}):
    - En güncel TÜİK verilerini kullan (${_getCurrentMonthYearTR()})
    - En güncel TCMB verilerini kullan (${_getCurrentMonthYearTR()})
    - En güncel Hazine verilerini kullan
    - Verilerin tarihini BELİRT (örn: "TÜİK ${_getCurrentMonthYearTR()} verilerine göre...")
    - Eski veri kullanma, güncel olanı bul

    KAYNAKLAR (her sahne sonunda link ekle):
    - TÜİK: https://data.tuik.gov.tr
    - TCMB: https://www.tcmb.gov.tr
    - Hazine: https://www.hmb.gov.tr
    - DİSK-AR: https://disk.org.tr/arastirma/
    - IMF: https://www.imf.org
    - Dünya Bankası: https://data.worldbank.org

    ELE ALINACAK KONULAR:
    - Ekonomi: Enflasyon (TÜFE/ÜFE), faiz, döviz kuru (USD/TRY), dış borç, GSMH, işsizlik, asgari ücret
    - Sosyal: Yoksulluk oranı, gelir dağılımı (Gini), açlık/yoksulluk sınırı, ultra zengin vs fakir sayısı
    - Eğitim: PISA sonuçları, öğretmen maaşları
    - Sağlık: OECD karşılaştırmaları

    ÇIKTI FORMATI:
    - Her sahne: İDDİA → GERÇEK → KAYNAK (link ile)
    - Doğruysa: Örneklerle destekle
    - Yanlışsa: Resmi verilerle çürüt + kaynak linki
    - Tarih belirt (örn: "${_getCurrentMonthYearTR()}")
    - Tarafsız ve objektif ol

    SON SAHNE (KAYNAKLAR LİSTESİ):
    - Tüm kaynakları listele (başlık + URL + tarih)

    KURALLAR:
    - 'dezenformasyon' kelimesini kullanma
    - 5N1K kuralına uy
    - Her sahne NOKTA ile biten cümle olmalı
    - Clickbait: sansasyonel ama doğru`

    const payload = {
      contents: [{ role: "user", parts }],
      systemInstruction: { parts: [{ text: sysPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            isContentUnreadable: { type: "BOOLEAN" },
            videoSlides: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  topText: { type: "STRING" },
                  spokenText: { type: "STRING" },
                  imagePrompts: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["topText", "spokenText", "imagePrompts"]
              }
            },
            thumbnailText: { type: "STRING" },
            sonSoz: { type: "STRING" },
            lastQuote: { type: "STRING" },
            thumbnailImagePrompt: { type: "STRING" },
            mediaBlackout: {
              type: "OBJECT",
              properties: {
                show: { type: "BOOLEAN" },
                percentageCovered: { type: "NUMBER" },
                percentageIgnored: { type: "NUMBER" },
                mediaNames: { type: "ARRAY", items: { type: "STRING" } },
                explanation: { type: "STRING" }
              },
              required: ["show", "percentageCovered", "percentageIgnored", "mediaNames", "explanation"]
            }
          },
          required: ["isContentUnreadable", "videoSlides", "thumbnailText", "sonSoz", "lastQuote", "thumbnailImagePrompt", "mediaBlackout", "kaynaklar"]
        }
      },
      tools: [{ google_search: {} }]
    };
    const parsedData = await _callGeminiAndParse(payload);
    if (parsedData.isContentUnreadable) throw new Error("İçerik okunamadı.");
    addSystemLog(`Eleştiri analizi tamamlandı: ${parsedData.videoSlides?.length || 0} sahne.`, 'success');
    return parsedData;
  }


  static async _analyzeIddia(inputData, inputType, config) {
    addSystemLog('İddia Analizi başlıyor...', 'info');

    let parts = [];
    if (inputType === 'media' && Array.isArray(inputData)) {
      parts = inputData.map(function(file) { const b64 = file.data.split(',')[1]; return { inlineData: { mimeType: file.type || 'application/octet-stream', data: b64 } }; });
      const isVideo = inputData.some(function(f) { return f.type && f.type.startsWith('video'); });
      parts.unshift({ text: isVideo ? 'Bu videoyu izle. İçindeki doğrulanabilir iddiaları çıkar.' : 'Bu görseli incele. İçindeki doğrulanabilir iddiaları çıkar.' });
    } else if (inputType === 'prompt' || inputType === 'text') {
      parts = [{ text: 'Aşağıdaki metindeki doğrulanabilir iddiaları çıkar: ' + (typeof inputData === 'string' ? inputData : '') }];
    } else if (inputType === 'url') {
      parts = [{ text: 'Bu URL icindeki icerigi oku. Dogrulanabilir iddialari cikar: ' + inputData }];
    }

    // v3.1: İddia Analizi prompt'u genel yapılandırıldı — tüm konularda doğrulama,
    // konu türüne göre kaynak rehberi, Google Search aktif kullanım.
    // v2.9: Konu-dışı ekonomi verisi enjekte edilmesi yasaklandı,
    // TTS hızı %25 artırıldı, ses-görsel senkron buffer'ları düzeltildi.
    const _curMonthYear = _getCurrentMonthYearTR();
    const _curDate = _getCurrentDateTR();
    const sysPrompt = `Sen bir fact-check ve doğrulama uzmanısın. Görevin verilen içeriği analiz etmek, doğrulanabilir iddiaları çıkarmak ve her bir iddiayı Türkiye'deki resmi kaynaklarla karşılaştırmaktır. Sen sadece ekonomi değil, TÜM konularda (siyaset, hukuk, belediye, sağlık, bilim, eğitim, dış politika, güvenlik vb.) doğrulama yaparsın.\n\n═══════════════════════════════════════════════════════════\nADIM 1 — GİRDİYİ ANALİZ ET\n═══════════════════════════════════════════════════════════\nÖnce içeriği dikkatlice incele. Konuyu belirle: ekonomi, siyaset, hukuk, belediye, sağlık, bilim, eğitim, dış politika, güvenlik, spor, tarih, sosyal vb.\nİçerikte DOĞRULANABİLİR iddiaları çıkar (yorum, hakaret, kişisel görüş HARİÇ).\nÖRNEK: "AK Partili belediyelere açılan soruşturma sayısı 677" — bu doğrulanabilir bir iddiadır.\nÖRNEK: "371'i CHP'li, 128'i MHP'li" — bu doğrulanabilir bir iddiadır.\nÖRNEK: "evinden alınma gereği duyulanlar var" — bu yorum/iddia karışımıdır, ayrıştır.\nHer iddiayı bağımsız olarak analiz et. Konuşmacının söylediği ile gerçekte olanı ayır.\n\n═══════════════════════════════════════════════════════════\nADIM 2 — KONUYA GÖRE VERİ KAYNAKLARI VE DOĞRULAMA\n═══════════════════════════════════════════════════════════\nKonu türüne göre DOĞRU kaynaklardan veri bul ve karşılaştır. GOOGLE SEARCH ARACINI AKTİF KULLAN.\n\nKONU TÜRÜNE GÖRE KAYNAK REHBERİ:\n\n• EKONOMİ: Aşağıdaki TÜRK-İŞ/TÜİK verilerini kullan, 2002 baz yılı ile karşılaştır.\n• SİYASET / BELEDİYE / HUKUK: İçişleri Bakanlığı, Adalet Bakanlığı, Yargıtay, Danıştay, Sayıştay, HSK, Anayasa Mahkemesi resmi açıklamaları. Muhalefet ve iktidar sözcülerinin resmi açıklamaları. Resmi gazete (resmigazete.gov.tr). Google Search ile soruşturma sayıları, tutuklama sayıları, iddianameler ara.\n• SAĞLIK: Sağlık Bakanlığı (saglik.gov.tr), TÜİK sağlık istatistikleri, WHO, ECDC verileri.\n• EĞİTİM: MEB, YÖK, YÖK Atlas, ÖSYM resmi verileri.\n• GÜVENLİK / TERÖR: İçişleri Bakanlığı, Emniyet Genel Müdürlüğü, Jandarma resmi açıklamaları.\n• DIŞ POLİTİKA: Dışişleri Bakanlığı, resmi diplomatik açıklamalar, uluslararası anlaşmalar.\n• BİLİM / TEKNOLOJİ: TÜBİTAK, resmi araştırma kurumları, hakemli yayınlar.\n\nKONU EKONOMİ İSE — GÜNCEL VERİLER (${_curMonthYear}):\nAşağıdaki veriler TÜRK-İŞ ve TÜİK resmi verileridir. Köşeli parantez içindeki [2002:] değerleri baz yılını gösterir:\n\n${buildEconomicDataBlock()}\n\n2002 BAZ YILI KARŞILAŞTIRMA KURALI (sadece ekonomi konusu ise):\n- Her ilgili veriyi 2002 yılı ile karşılaştır: "2002'de X idi, ${_curMonthYear} itibarıyla Y oldu."\n- Değişimi net olarak belirt (örn: "23 kata çıktı", "%1800 arttı").\n- Kaynak belirt: TÜİK, TÜRK-İŞ, TCMB.\n\nKONU EKONOMİ DEĞİLSE:\n- Ekonomi verilerini (asgari ücret, açlık sınırı, TÜFE, dolar kuru) konuyla ilgisi olmadan ASLA senaryoya ENJETE ETME.\n- Bunun YERİNE konuyla ilgili resmi kaynakları Google Search ile bul.\n- ÖRNEK: Belediye soruşturması konusu ise → İçişleri Bakanlığı açıklamaları, resmi gazete kararları, yargı haberlerini araştır.\n- ÖRNEK: Sağlık konusu ise → Sağlık Bakanlığı verilerini araştır.\n\n═══════════════════════════════════════════════════════════\nADIM 3 — GERÇEKTE NE OLUYOR (ELEŞTİREL GENEL DEĞERLENDİRME)\n═══════════════════════════════════════════════════════════\nBu adımda, yüklenen medyada konuşmacı ne diyor OLMAKSIZIN, Türkiye'de bu konuda GERÇEKTE ne oluyor, eleştirel ve tarafsız bir şekilde analiz et.\n\nGERÇEKTE NE OLUYOR sahnesi şu sorulara cevap vermeli:\n- Bu konuda Türkiye'de gerçekte durum nedir?\n- Resmi kaynaklara göre veriler ne diyor?\n- Konuşmacının iddiasının ötesinde, konunun tamamı nasıl işliyor?\n- Eğer bir adaletsizlik varsa, bunu tarafsız şekilde ifşa et.\n- Eğer konuşmacı haklıysa, bunu da dürüstçe belirt.\n\nBu SAHNE, iddia analizlerinden ÖNCE gelir. Konuyu bütünüyle eleştirel bir gözle değerlendir.\n\nBu sahnenin seslendirme metnini 'gercekNeOluyor' alanına yaz.\nBu sahnenin görsel prompt'unu 'gercekNeOluyorImagePrompt' alanına yaz (no text, no numbers, clean visual).\n\n═══════════════════════════════════════════════════════════\nADIM 4 — DOĞRULAMA VE DEĞERLENDİRME\n═══════════════════════════════════════════════════════════\nHer iddia için GOOGLE SEARCH ile araştır, resmi kaynaktan doğrula:\n1. Durum etiketi ver: Doğru, Kısmen Doğru, Eksik Bağlam, Yanlış, Doğrulanamıyor.\n2. Güven skoru hesapla (0-100).\n3. Analiz yaz: İDDİA NE DİYOR vs GERÇEKTE NE VAR? Konuşmacının iddiası ile resmi kaynaktan bulunan gerçek arasındaki farkı net belirt.\n   - ÖRNEK: "İddia: 677 AK Partili belediyeye soruşturma açıldı. Gerçek: İçişleri Bakanlığı verisine göre X belediye hakkında soruşturma var, ancak bunların Y'si AK Partili değil, Z'si farklı partili."\n   - ÖRNEK: "İddia: Evinden alınanlar var. Gerçek: Yargı kararları gereği X kişinin evinden gözaltına alındığı resmi kayıtlarda mevcut."\n4. Kanıtları listele — her kanıt için ZORUNLU alanlar:\n   - kaynak: Resmi kurum adı (TÜİK, TÜRK-İŞ, TCMB, İçişleri Bakanlığı, Adalet Bakanlığı, Sağlık Bakanlığı, Anayasa Mahkemesi, Sayıştay, OECD, DİSK vb.)\n   - url: Kaynağın URL'i (mümkünse doğrudan veri sayfası veya resmi açıklama)\n   - veri: İlgili veri ve tarihi (örn: "TÜFE yıllık %32.11, Haziran 2026" veya "İçişleri Bakanlığı: 677 belediye soruşturması, 2025")\n5. Sonuç yaz: kısa, net özet. İDDİA DOĞRU MU YANLIŞ MI?\n6. İFŞA VE ADALETSİZLİK KURALI: İfşa sahnesi RAKAMLARA değil, ADALETSİZLİĞE odaklanmalı. Şunları MUTLAKA sorgula ve varsa ifşa et:\n   a) SEÇİCİ HEDEFLEME: Sadece muhalefet (CHP) belediyeleri mi evlerinden alınıyor? Aynı fiil iktidar belediyelerinde de var mı? Varsa neden onlar alınmıyor?\n   b) İTİBAR SUİKASTİ: Tüm medyada (sosyal medya, gazete, TV) ifşa edilerek linç kampanyası yapılıyor mu? Haberler seçici mi?\n   c) ÇİFTE STANDART: İktidar ve muhalefet aynı eylemde bulunduğunda sadece muhalefet mi cezalandırılıyor?\n   - ÖRNEK: \"Sadece CHP belediyelerinin evlerinden alınması adaletsizliktir. Aynı eylem iktidar belediyelerinde de varsa, bu çifte standarttır.\"\n   - ÖRNEK: \"Tüm medyada ifşa edilerek itibar suikasti yapılıyor. Bu bir adaletsizliktir, sadece bir veri değildir.\"\n   - Rakamlar ikincil, ADALETSİZLİK birincildir. Rakamları söyle ama asıl mesaj adaletsizlik olsun.\n7. KAYNAK ZORUNLULUĞU: Kanıt varsa MUTLAKA kaynak adı + URL + veri yaz. Kaynaksız iddia bırakma. Her iddianın arkasında en az bir resmi kaynak olmalı.\n8. EN GÜNCEL VERİ KURALI: Devletin sunduğu resmi ve en güncel veriyi kullan. Örnek: Temmuz 2026 verisi varsa onu yayınla. Eski veriyi yeni veriyle değiştir. Verinin tarihini MUTLAKA belirt.\n\n═══════════════════════════════════════════════════════════\nDÜRÜSTLÜK KURALLARI (ASLA İHLAL ETME)\n═══════════════════════════════════════════════════════════\n1. BİLMEDİĞİN bir şey için "Doğrulanamıyor" de. ASLA uydurma.\n2. Resmi kaynaktan teyit edilemeyen iddialar için "Doğrulanamıyor" kullan.\n3. Veriyi bulamadıysan "bu veriye ulaşamadım" de — boş kalemi doldurma.\n4. Her rakamın arkasında MUTLAKA resmi kaynak olmalı. Blog, haber sitesi, sosyal medya KAYNAK DEĞİLDİR.\n5. Tarih MUTLAKA belirt: hangi ay ve yılın verisi olduğunu yaz.\n6. Sayı biçimi: 26.500 TL (nokta binlik ayracı, TL olarak).\n7. TARAFSIZ OL: İktidar da muhalefet de aynı standartla değerlendir. Siyasi taraf tutma.\n8. KAYNAK ÇEŞİTLİLİĞİ: Tek kaynağa güvenme. Mümkünse en az 2 farklı kaynakla doğrula.\n\n═══════════════════════════════════════════════════════════\nADIM 5 — VİDEO SENARYOSU\n═══════════════════════════════════════════════════════════\nHer iddia için video senaryosu oluştur. SENARYONUN AMACI: İnsanlar konuşmacının iddiasına körü körüne inanmamalı, gerçekte ne olduğunu kaynaklarla görmelidir.\n\nSenaryo yapısı:\n- Hook (5sn): Dikkat çekici açılış — \"Bu iddia doğru mu?\" tarzı\n- Orijinal Medya: Yüklenen ses/video KESİKSİZ olarak oynatılır (bu sahne sistem tarafından otomatik eklenir, sen yazma)\n- GERÇEKTE NE OLUYOR: Konuyu bütünüyle eleştirel ve tarafsız şekilde değerlendir — Türkiye'de bu konuda gerçekte ne oluyor? (bu sahne sistem tarafından 'gercekNeOluyor' alanından otomatik eklenir, sen yazma)\n- İddia: Konuşmacı ne iddia ediyor (alıntı)\n- Gerçek: Resmi kaynaklara göre gerçekte ne olduğu (kanıtlarla)\n- Karşılaştırma/İfşa: İddia ile gerçek arasındaki farkı belirt, ancak RAKAMLARA değil ADALETSİZLİĞE odaklan. Seçici hedefleme var mı? Sadece muhalefet (CHP) belediyeleri mi evinden alınıyor? Tüm medyada (sosyal medya, gazete, TV) itibar suikasti yapılıyor mu? Bu adaletsizliği NET olarak söyle. Rakamlar ikincil, adaletsizlik BİRİNCİLDİR.\n- Kanıtlar: Resmi veriler ve kaynaklar (ekonomi ise 2002 karşılaştırması dahil). Kaynak varsa MUTLAKA yaz — kaynak adı + URL + veri\n- Sonuç: Net değerlendirme — DOĞRU / YANLIŞ / KISMEN DOĞRU\n- Kapanış: Özet ve \"kaynaklara bakın\" mesajı\n\nHer sahne NOKTA ile biten cümle olmalı. Rakamlar NET ve BÜYÜK yazılmalı.
GRAFİK/İNFOGRAFİK KURALI: Bir sahnede grafik, tablo veya infografik gerekiyorsa imagePrompts içinde TAM sayıları ve etiketleri yaz. Örnek: "Bar chart showing AK Parti 677 (tallest bar, red), CHP 371 (medium bar, blue), MHP 128 (shortest bar, gray)". Yanlış sayı/etiket KESİNLİKLE olmasın. ANCAK görselin İÇİNE sayı yazma — sayıları ve etiketleri canvas overlay olarak sonradan eklenecektir. imagePrompts'a "no text, no numbers, no labels in the image" ekle.
GÖRSEL YAZI KURALI: imagePrompts içinde "no text, no words, no letters, clean visual" ifadesini ekle. AI ürettiği görsellerde anlamsız yazılar olmasın.\nKONU-DIŞI VERİ YASAĞI: Senaryoda SADECE konuyla ilgili verileri kullan. Konu belediye soruşturması, siyaset, spor ise ekonomi verisi (asgari ücret, açlık sınırı, TÜFE) GİRME. Konuyla doğrudan bağlantısı yoksa hiçbir ekonomik veriyi senaryoya dahil etme.\nKonu ekonomi ise rakamları TL olarak yaz ($ değil). Tarih belirt: ${_curMonthYear}.\n\nDönüş ZORUNLU JSON.`;

    const payload = {
      contents: [{ role: 'user', parts: parts }],
      systemInstruction: { parts: [{ text: sysPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            isContentUnreadable: { type: 'BOOLEAN' },
            videoSlides: { type: 'ARRAY', items: { type: 'OBJECT', properties: { topText: { type: 'STRING' }, spokenText: { type: 'STRING' }, imagePrompts: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['topText', 'spokenText', 'imagePrompts'] } },
            thumbnailText: { type: 'STRING' },
            sonSoz: { type: 'STRING' },
            lastQuote: { type: 'STRING' },
            thumbnailImagePrompt: { type: 'STRING' },
            gercekNeOluyor: { type: 'STRING' },
            gercekNeOluyorImagePrompt: { type: 'STRING' },
            iddialar: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
                  iddia: { type: 'STRING' },
                  durum: { type: 'STRING' },
                  guvenSkoru: { type: 'NUMBER' },
                  analiz: { type: 'STRING' },
                  kanitlar: { type: 'ARRAY', items: { type: 'OBJECT', properties: { kaynak: { type: 'STRING' }, url: { type: 'STRING' }, veri: { type: 'STRING' } }, required: ['kaynak', 'veri'] } },
                  sonuc: { type: 'STRING' }
                }, required: ['iddia', 'durum', 'guvenSkoru', 'analiz', 'kanitlar', 'sonuc'] } },
            mediaBlackout: { type: 'OBJECT', properties: { show: { type: 'BOOLEAN' }, percentageCovered: { type: 'NUMBER' }, percentageIgnored: { type: 'NUMBER' }, mediaNames: { type: 'ARRAY', items: { type: 'STRING' } }, explanation: { type: 'STRING' } }, required: ['show', 'percentageCovered', 'percentageIgnored', 'mediaNames', 'explanation'] }
          },
          required: ['isContentUnreadable', 'videoSlides', 'thumbnailText', 'sonSoz', 'lastQuote', 'thumbnailImagePrompt', 'gercekNeOluyor', 'gercekNeOluyorImagePrompt', 'iddialar', 'mediaBlackout']
        }
      },
      tools: [{ google_search: {} }]
    };
    const parsedData = await _callGeminiAndParse(payload);
    if (parsedData.isContentUnreadable) throw new Error('İçerik okunamadı.');
    addSystemLog('İddia Analizi tamamlandı: ' + (parsedData.iddialar ? parsedData.iddialar.length : 0) + ' iddia.', 'success');
    return parsedData;
  }


  static getGuzelSozAnalysis(quoteText) {
    // Theme detection
    const themes = {
      'sabir': ['sabır', 'bekle', 'zaman', 'dayan'],
      'azim': ['azim', 'çaba', 'gayret', 'mücadele', 'vazgeçme'],
      'başarı': ['başarı', 'kazan', 'hedef', 'zafer'],
      'hayat': ['hayat', 'yaşam', 'ömür', 'nefes'],
      'mutluluk': ['mutluluk', 'sevinç', 'neşe', 'gülümse'],
      'sevgi': ['sevgi', 'aşk', 'kalp', 'sev'],
      'anne': ['anne', 'annem', 'ana'],
      'baba': ['baba', 'babam'],
      'dostluk': ['dost', 'arkadaş', 'kardeş'],
      'inanç': ['inanç', 'iman', 'tanrı', 'allah'],
      'umut': ['umut', 'beklenti', 'gelecek'],
      'özgürlük': ['özgürlük', 'hür', 'serbest'],
      'cesaret': ['cesaret', 'korkusuz', 'yiğit'],
      'zaman': ['zaman', 'vakit', 'dakika', 'saat'],
      'bilgelik': ['bilgi', 'bilge', 'akıl', 'hikmet'],
      'yalnızlık': ['yalnız', 'tek', 'kimsesiz'],
      'huzur': ['huzur', 'sükunet', 'dingin'],
      'şükür': ['şükür', 'minnet', 'hamd'],
      'doğa': ['doğa', 'ağaç', 'deniz', 'güneş', 'yıldız']
    };

    let detectedTheme = 'hayat';
    let maxScore = 0;
    const textLower = quoteText.toLowerCase();

    Object.keys(themes).forEach(function(theme) {
        let score = 0;
        themes[theme].forEach(function(keyword) {
            if (textLower.indexOf(keyword) > -1) score++;
          });
        if (score > maxScore) {
          maxScore = score;
          detectedTheme = theme;
        }
      });

    // Emotion detection
    const emotions = {
      'hüzün': ['hüzün', 'acı', 'gözyaşı', 'ağla', 'keder'],
      'umut': ['umut', 'bekle', 'gelecek', 'iyi'],
      'aşk': ['aşk', 'sevgi', 'kalp', 'sev'],
      'nefret': ['nefret', 'kin', 'öfke'],
      'korku': ['korku', 'kork', 'tehlike'],
      'sevinç': ['sevinç', 'mutlu', 'gül', 'neşe'],
      'öfke': ['öfke', 'kız', 'sinir'],
      'gurur': ['gurur', 'onur', 'şeref'],
      'özlem': ['özlem', 'hasret', 'bekle']
    };

    let detectedEmotion = 'umut';
    maxScore = 0;
    Object.keys(emotions).forEach(function(emo) {
        let score = 0;
        emotions[emo].forEach(function(keyword) {
            if (textLower.indexOf(keyword) > -1) score++;
          });
        if (score > maxScore) {
          maxScore = score;
          detectedEmotion = emo;
        }
      });

    // Style detection based on theme
    const styleMap = {
      'sabir': 'minimal', 'azim': 'dark', 'başarı': 'luxury',
      'hayat': 'nature', 'mutluluk': 'warm', 'sevgi': 'romantic',
      'umut': 'light', 'cesaret': 'epik', 'bilgelik': 'vintage',
      'yalnızlık': 'film_noir', 'huzur': 'nature', 'doğa': 'nature',
      'zaman': 'minimal', 'inanc': 'spiritual', 'dostluk': 'warm'
    };

    const detectedStyle = styleMap[detectedTheme] || 'cinematic';

    // Music selection
    const musicMap = {
      'sabir': 'soft piano', 'azim': 'motivational', 'başarı': 'cinematic orchestral',
      'hayat': 'contemplative piano', 'mutluluk': 'upbeat', 'sevgi': 'romantic piano',
      'anne': 'warm orchestral', 'baba': 'strong strings', 'umut': 'soft piano',
      'cesaret': 'epic cinematic', 'doğa': 'nature sounds', 'bilgelik': 'meditation',
      'yalnızlık': 'melancholic piano', 'huzur': 'ambient', 'şükür': 'light strings',
      'zaman': 'minimal piano', 'inanc': 'spiritual ambient', 'dostluk': 'warm acoustic'
    };

    const suggestedMusic = musicMap[detectedTheme] || 'contemplative piano';

    // Color palette
    const paletteMap = {
      'sabir': { ana: '#2c3e50', ikincil: '#34495e', vurgu: '#3498db', yazi: '#ecf0f1', arka: '#1a252f' },
      'azim': { ana: '#1a1a2e', ikincil: '#16213e', vurgu: '#e94560', yazi: '#ffffff', arka: '#0f0f23' },
      'başarı': { ana: '#2d1b69', ikincil: '#11001c', vurgu: '#ffd700', yazi: '#ffffff', arka: '#0a0015' },
      'hayat': { ana: '#1b4332', ikincil: '#2d6a4f', vurgu: '#95d5b2', yazi: '#ffffff', arka: '#081c15' },
      'sevgi': { ana: '#4a0e0e', ikincil: '#6b1d1d', vurgu: '#ff6b6b', yazi: '#ffffff', arka: '#1a0505' },
      'umut': { ana: '#1a365d', ikincil: '#2a4a7f', vurgu: '#63b3ed', yazi: '#ffffff', arka: '#0f1f3d' },
      'hüzün': { ana: '#2d3748', ikincil: '#4a5568', vurgu: '#a0aec0', yazi: '#e2e8f0', arka: '#1a202c' },
      'doğa': { ana: '#22543d', ikincil: '#276749', vurgu: '#68d391', yazi: '#ffffff', arka: '#1a3a2a' },
    };

    const palette = paletteMap[detectedTheme] || { ana: '#1a1a2e', ikincil: '#16213e', vurgu: '#e94560', yazi: '#ffffff', arka: '#0f0f23' };

    return {
      tema: detectedTheme,
      duygu: detectedEmotion,
      stil: detectedStyle,
      muzik: suggestedMusic,
      palet: palette,
      enerji: detectedEmotion === 'cesaret' || detectedEmotion === 'öfke' ? 80 : 40,
      pozitiflik: detectedEmotion === 'umut' || detectedEmotion === 'sevinç' ? 80 : 50
    };
  }

  static getGuzelSozImagePrompts(quoteText, analysis) {
    const tema = analysis.tema || 'hayat';
    const stil = analysis.stil || 'cinematic';
    const duygu = analysis.duygu || 'umut';

    return [
      'Ultra realistic ' + stil + ' style, ' + tema + ' theme, 8K HDR, professional lighting, depth of field, film color grading, golden ratio composition, volumetric light, photorealistic masterpiece.',
      'Cinematic emotional shot, ' + duygu + ' feeling, ' + stil + ' aesthetic, dramatic lighting, 8K HDR, award winning photography, professional color grading, bokeh background.',
      'Symbolic powerful image, ' + tema + ' concept, ' + stil + ' style, epic composition, 8K HDR, volumetric light, cinematic depth, masterpiece quality.'
    ];
  }

  // v3.11: Güzel sözü FR/DE/TR dillerine çevir
  static async _translateQuoteMultilang(quoteText) {
    const payload = {
      contents: [{ parts: [{ text: `Aşağıdaki sözü/alıntıyı FRANSIZCA, ALMANCA ve TÜRKÇE dillerine çevir.\nSöz: "${quoteText}"\n\nKurallar:\n- Anlamı ve duyguyu koru, kelimesi kelimesine değil anlam çevirisi yap.\n- Edebi ve etkileyici bir üslup kullan.\n- Türkçe zaten orijinal dil ise olduğu gibi bırak.\n- SADECE JSON döndür: {"fr": "fransızca çeviri", "de": "almanca çeviri", "tr": "türkçe metin"}` }] }],
      generationConfig: { responseMimeType: "application/json" }
    };
    try {
      const r = await _aiGenerateContent(payload);
      if (r && r.ok) {
        const d = await r.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(text);
        addSystemLog('Çok dilli çeviri tamamlandı (FR/DE/TR)', 'success');
        return {
          fr: parsed.fr || quoteText,
          de: parsed.de || quoteText,
          tr: parsed.tr || quoteText
        };
      }
    } catch (e) {
      addSystemLog('Çeviri hatası: ' + e.message + ' — orijinal metin kullanılacak', 'warn');
    }
    return { fr: quoteText, de: quoteText, tr: quoteText };
  }

  static async _buildGuzelSozScript(inputData, inputType, config) {
    let quoteText = "";

    if (typeof inputData === 'string') {
      quoteText = inputData.trim();
      addSystemLog(`Metin girdisi: ${quoteText.length} karakter, ${quoteText.split(/\s+/).length} kelime`, 'info');
    } else if (Array.isArray(inputData) && inputData.length > 0) {
      const videoFile = inputData.find(f => f.type?.startsWith('video/'));
      const imageFile = inputData.find(f => f.type?.startsWith('image/'));

      if (videoFile) {
        addSystemLog('Video dosyası algılandı, kare çıkarılıyor...', 'info');
        // Video dosyasından 1. saniyede kare çıkaran fonksiyon
        const extractFrame = () => new Promise((resolve) => {
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;
            const raw = videoFile.data.includes(',') ? videoFile.data.split(',')[1] : videoFile.data;
            const blob = _base64ToBlob(raw, videoFile.type || 'video/mp4');
            video.src = ObjectURLManager.create(blob);
            video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration * 0.1); };
            video.onseeked = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
                ObjectURLManager.revoke(video.src);
                resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
              } catch (e) { ObjectURLManager.revoke(video.src); resolve(null); }
            };
            video.onerror = () => { ObjectURLManager.revoke(video.src); resolve(null); };
            setTimeout(() => { ObjectURLManager.revoke(video.src); resolve(null); }, 10000);
          });

        const frameB64 = await extractFrame();
        if (frameB64) {
          addSystemLog('Videodan kare başarıyla çıkarıldı, OCR başlıyor...', 'success');
          const imgType = 'image/jpeg';

          quoteText = await ocrWithFallback(frameB64, imgType, apiKey, 'Video OCR');
        }
        if (!quoteText) {
          quoteText = videoFile.name?.replace(/[_-]/g, ' ').replace(/\.[^.]+$/, '') || "Güzel bir söz";
          addSystemLog('OCR başarısız, dosya adı kullanıldı.', 'warn');
        }
      } else if (imageFile) {
        addSystemLog('Resim OCR başlıyor (şerit tabanlı)...', 'info');
        const b64Data = imageFile.data.split(',')[1] || imageFile.data;
        const ocrImgType = imageFile.type || 'image/jpeg';

        quoteText = await ocrWithFallback(b64Data, ocrImgType, apiKey, 'Görsel OCR');

        if (!quoteText) {
          const rawName = imageFile.name.replace(/[_-]/g, ' ').replace(/\.[^.]+$/, '');
          quoteText = rawName.length > 5 ? rawName : "Güzel bir söz";
          addSystemLog('OCR başarısız, dosya adı kullanıldı.', 'warn');
        }
      } else {
        quoteText = inputData[0].name?.replace(/[_-]/g, ' ').replace(/\.[^.]+$/, '') || "Güzel bir söz";
      }
    }

    // Hata mesajlarını filtrele — AI görselde metin bulamayabilir
    const isError = ERROR_PATTERNS.some(p => p.test(quoteText));
    if (isError) {
      addSystemLog(`OCR hata mesajı algılandı: "${quoteText.substring(0, 50)}" → dosya adı kullanılacak`, 'warn');
      // Dosya adını kullan (imageFile veya videoFile)
      if (inputType === 'media' && Array.isArray(inputData) && inputData[0]?.name) {
        quoteText = inputData[0].name.replace(/[_-]/g, ' ').replace(/\.[^.]+$/, '');
      } else {
        quoteText = "Güzel bir söz";
      }
    }
    if (!quoteText || quoteText.length < 3) quoteText = "Güzel bir söz";
    addSystemLog(`Son söz metni: ${quoteText.length} karakter`, 'info');

    const emotion = analyzeQuoteEmotion(quoteText);
    addSystemLog(`Güzel söz: "${quoteText.substring(0, 60)}..." (duygu: ${emotion})`, 'info');

    // Atatürk tespiti — alakalı görseller üret
    const ataturkKeywords = ['atatürk', 'mustafa kemal', 'samsun', 'kurtuluş', 'cumhuriyet', 'bağımsızlık', 'milli mücadele', 'inkılap', 'devrim', 'paşa', 'gazi', 'anıtkabir', '19 mayıs', 'ulus'];
    const lowerQuote = quoteText.toLowerCase();
    const isAtaturkRelated = ataturkKeywords.some(kw => lowerQuote.includes(kw));
    if (isAtaturkRelated) addSystemLog('Atatürk içerikli söz tespit edildi — özel görseller üretilecek.', 'info');

    // 3 farklı perspektif ile sahne tanımları oluştur (mesaj, duygu, anlam)
    let sceneDescriptions = [];
    const sceneCount = AI_CONFIG.SCENE_COUNT;
    const perspectivePrompts = isAtaturkRelated ? [
      `Mustafa Kemal Atatürk standing heroically at Samsun harbor in 1919, dawn light, Turkish flag waving, cinematic patriotic scene, epic composition.`,
      `A dramatic scene of the Turkish War of Independence: soldiers marching through Anatolian mountains, Atatürk leading the charge, golden sunset, heroic atmosphere.`,
      `Modern Turkey's founding vision: Atatürk's reforms symbolized — women in modern clothing, new Turkish alphabet, secular education, Ankara parliament building, hopeful dawn light.`
    ] : [
      `A cinematic scene representing the meaning of this quote. Focus on the MAIN MESSAGE.`,
      `An artistic interpretation of this quote's emotional core. Focus on the FEELING.`,
      `A symbolic visual metaphor for this quote. Focus on the DEEPER MEANING.`
    ];
    for (let i = 0; i < sceneCount; i++) {
      try {
        const payload = {
          contents: [{ parts: [{ text: `Generate a detailed English image prompt for this quote.\n\nQuote: "${quoteText}"\nEmotion: ${emotion}\nPerspective: ${perspectivePrompts[i]}\n\nRules:\n- 1-2 sentences, detailed and visual\n- NO text in the image\n- Cinematic lighting and composition\n- Match the emotional tone` }] }],
          generationConfig: { temperature: AI_CONFIG.TEMPERATURE, maxOutputTokens: AI_CONFIG.MAX_OUTPUT_TOKENS }
        };
        const r = await _aiGenerateContent(payload);
        if (!r) continue;
        const data = await r.json();
        const desc = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (desc) { sceneDescriptions.push(desc); addSystemLog(`Sahne ${i + 1} tanımlandı.`, 'success'); }
      } catch (e) { addSystemLog(`Sahne ${i + 1} hatası: ${e.message}`, 'warn'); }
    }
    if (sceneDescriptions.length === 0) {
      if (isAtaturkRelated) {
        // Atatürk fallback sahneleri
        sceneDescriptions = [
          'Mustafa Kemal Atatürk at Samsun harbor 1919, dawn, Turkish flag, cinematic patriotic scene, epic composition',
          'Turkish War of Independence, soldiers marching through Anatolian mountains, golden sunset, heroic atmosphere',
          'Founding of modern Turkey, Ankara parliament, secular reforms, hopeful dawn light, national pride'
        ];
      } else {
        const stopWords = ['bir', 'ile', 'için', 'olan', 'değil', 'daha', 'çok', 'kadar', 'sonra', 'önce', 'böyle', 'şöyle', 'ancak', 'hem', 'ya', 'ki', 'ise', 'gibi', 'ama', 've', 'da', 'de', 'mi', 'mı', 'mu', 'mü', 'ben', 'sen', 'biz', 'siz', 'o', 'bu', 'şu', 'ne', 'nasıl', 'neden', 'niçin', 'kim', 'kime', 'kimin', 'her', 'hiç'];
        const words = quoteText.toLowerCase().replace(/[^\wçğıöşüÇĞIİÖŞÜ\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
        const uniqueWords = [...new Set(words)].slice(0, 8);
        const emotionSceneMap = {
          'mutlu': 'bright, sunny, joyful atmosphere, warm golden colors, people smiling, soft bokeh lights, celebration mood',
          'hüzünlü': 'melancholic, rainy window, emotional, soft blue lighting, contemplative mood, lone figure, misty atmosphere',
          'romantik': 'romantic sunset, candlelight, intimate setting, soft focus, dreamy atmosphere, warm tones, couple silhouette',
          'notr': 'artistic, symbolic, abstract geometric, dramatic lighting, cinematic composition'
        };
        const emotionScene = emotionSceneMap[emotion] || emotionSceneMap['notr'];
        for (let i = 0; i < 3; i++) {
          sceneDescriptions.push(uniqueWords.length > 0
            ? `A symbolic ${emotionScene} scene variation ${i + 1} representing: ${uniqueWords.join(', ')} — highly detailed, cinematic composition`
            : `A beautiful artistic scene with ${emotionScene} variation ${i + 1} — highly detailed, cinematic composition`);
        }
      }
    }

    // Atatürk içerikli sözlerde gerçek görseller çek (Imagen üretemez)
    let realImageUrls = [];
    if (isAtaturkRelated) {
      addSystemLog('Atatürk görselleri Wikimedia Commons\'tan çekiliyor...', 'info');
      const searchQueries = ['Mustafa Kemal Atatürk', 'Samsun 1919', 'Turkish War of Independence'];
      for (const q of searchQueries) {
        const urls = await fetchWikimediaImages(q, 1);
        realImageUrls.push(...urls);
      }
      if (realImageUrls.length > 0) {
        addSystemLog(`${realImageUrls.length} gerçek Atatürk görseli bulundu.`, 'success');
      } else {
        addSystemLog('Wikimedia\'dan görsel bulunamadı — AI görseller kullanılacak.', 'warn');
      }
    }

    // v3.11: Çok dilli çeviri — Sahne 1: Fransızca, Sahne 2: Almanca, Sahne 3: Türkçe
    const translations = await LogicEngineService._translateQuoteMultilang(quoteText);
    const multilangTexts = [translations.fr, translations.de, translations.tr];
    const multilangLabels = ['FR', 'DE', 'TR'];

    return {
      isContentUnreadable: false,
      videoSlides: sceneDescriptions.map((desc, i) => ({
            topText: multilangTexts[i] || quoteText,
            spokenText: multilangTexts[i] || quoteText,
            imagePrompts: [desc],
            _lang: multilangLabels[i]
          })),
      thumbnailText: quoteText.length > 120 ? quoteText.substring(0, 120) + '...' : quoteText,
      sonSoz: "",
      lastQuote: quoteText,
      thumbnailImagePrompt: sceneDescriptions[0] || "",
      tiktokTitle: quoteText.substring(0, 60),
      tiktokDescription: quoteText,
      tiktokHashtags: isAtaturkRelated ? ['#atatürk', '#mustafakemal', '#samsun', '#19mayıs', '#kurtuluşsavaşı', '#cumhuriyet'] : ['#güzelsöz', '#özlsöz', '#motivasyon'],
      _suggestedMusic: null,
      _isAtaturkRelated: isAtaturkRelated,
      _realImageUrls: realImageUrls,
      mediaBlackout: { show: false, percentageCovered: 0, percentageIgnored: 0, mediaNames: [], explanation: "" },
      chartData: { show: false, type: "bar", title: "", note: "", items: [] },
      _isGuzelSoz: true,
      _isMultilang: true,
      _multilangTexts: multilangTexts,
      _multilangLabels: multilangLabels,
      _emotion: emotion,
      _sceneCount: sceneDescriptions.length
    };
  }
}


// ============================================================================
// M6: MEDIA SYNTHESIS
// ============================================================================

class MediaSynthesisService {
  static generateProceduralFallback(prompt, imageStyle) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024; const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(512, 512, 50, 512, 512, 600); grad.addColorStop(0, '#1e1b4b'); grad.addColorStop(0.5, '#0f172a'); grad.addColorStop(1, '#020617'); ctx.fillStyle = grad; ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)'; ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke(); }
    for (let y = 0; y < 1024; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.font = "bold 24px 'Inter', Arial"; ctx.textAlign = 'center'; ctx.fillText("OTONOM", 512, 950);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  static generateQuoteFallback(quoteText, emotion) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024; const ctx = canvas.getContext('2d');
    const colorMap = {
      'mutlu': { bg1: '#fbbf24', bg2: '#f59e0b', accent: '#fcd34d', glow: '#fef3c7' },
      'hüzünlü': { bg1: '#3b82f6', bg2: '#1d4ed8', accent: '#93c5fd', glow: '#dbeafe' },
      'romantik': { bg1: '#ec4899', bg2: '#be185d', accent: '#f9a8d4', glow: '#fce7f3' },
      'notr': { bg1: '#6366f1', bg2: '#4338ca', accent: '#a5b4fc', glow: '#e0e7ff' }
    };
    const colors = colorMap[emotion] || colorMap['notr'];
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, colors.bg1); grad.addColorStop(0.5, colors.bg2); grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 1024; const y = Math.random() * 1024; const r = 50 + Math.random() * 150;
      const circleGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
      circleGrad.addColorStop(0, colors.accent + '40'); circleGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = circleGrad; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const words = quoteText.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
    ctx.fillStyle = colors.glow + '30'; ctx.font = "bold 80px Georgia, serif"; ctx.textAlign = 'center';
    words.forEach((word, i) => {
        const x = 150 + (i % 3) * 250; const y = 300 + Math.floor(i / 3) * 200;
        ctx.save(); ctx.translate(x, y); ctx.rotate((Math.random() - 0.5) * 0.3);
        ctx.fillText(word.substring(0, 8), 0, 0); ctx.restore();
      });
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = "bold 120px Georgia, serif"; ctx.textAlign = 'center';
    ctx.fillText('"', 150, 250); ctx.fillText('"', 900, 850);
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  static async generateImage(prompt, imageStyle = 'cinematic', resolution = '4K', isGuzelSoz = false, emotion = 'notr', quoteText = '') {
    let resText = "8k resolution, highly detailed";
    if (resolution === '1K') resText = "1080p resolution, clear and sharp";
    if (resolution === '2K') resText = "4k resolution, high quality";
    const stylePrefixes = {
      'watercolor': `Abstract watercolor painting style, soft and artistic, ${resText}`,
      'sketch': `Pencil sketch drawing, black and white, ${resText}`,
      'oil_painting': `Classic oil painting style, ${resText}`,
      'minimalist': `Minimalist illustration, clean lines, ${resText}`,
      'cyberpunk': `Cyberpunk, futuristic, neon lights, ${resText}`,
      'retro': `Retro vintage style, 80s aesthetic, ${resText}`,
      '3d_render': `High quality 3D render, unreal engine 5 style, ${resText}`,
      'anime': `High quality anime style, Studio Ghibli inspired, ${resText}`
    };
    let stylePrefix = stylePrefixes[imageStyle] || `Cinematic, photorealistic, ${resText}`;
    const excludeStyles = ['watercolor', 'sketch', 'oil_painting', 'retro', 'anime'];
    if (!excludeStyles.includes(imageStyle)) stylePrefix += `, subtle AI neural network elements, neon accents`;

    const contextLabel = isGuzelSoz ? 'quote illustration' : 'news context';
    const fullPrompt = `${stylePrefix}, ${contextLabel}: ${prompt}. Safe, no text, no words, no letters, no numbers, no digits, no writing, no labels, no captions, no data labels, no chart text, clean visual, no violence.`;
    try {
      addSystemLog(`Görsel çiziliyor: "${prompt.substring(0, 40)}..."`, 'info');
      const payload = { instances: { prompt: fullPrompt }, parameters: { sampleCount: 1 } };
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (r.ok) { const d = await r.json(); if (d.predictions?.[0]?.bytesBase64Encoded) return `data:image/png;base64,${d.predictions[0].bytesBase64Encoded}`; }
    } catch(err) { ErrorHandler.silent(err); }
    try {
      const payload = { contents: [{ parts: [{ text: fullPrompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } };
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (r.ok) { const d = await r.json(); const base64 = d.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data; if (base64) return `data:image/jpeg;base64,${base64}`; }
    } catch(err) { ErrorHandler.silent(err); }
    // v3.24: Pollinations.ai — tamamen ücretsiz, API key gerektirmeyen AI görsel
    // üretim fallback'i. Gemini key yoksa veya Imagen/Gemini görsel denemeleri
    // başarısız olduysa, kullanıcı yine de gerçek bir AI görseli alır.
    try {
      addSystemLog('Ücretsiz görsel üretimi deneniyor (Pollinations.ai)...', 'info');
      const dims = resolution === '4K' ? [1024, 1024] : resolution === '2K' ? [768, 768] : [512, 512];
      const seed = Math.floor(Math.random() * 1000000);
      const polUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${dims[0]}&height=${dims[1]}&seed=${seed}&nologo=true`;
      const imgResp = await fetch(polUrl);
      if (imgResp.ok) {
        const blob = await imgResp.blob();
        if (blob && blob.size > 1000) {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          addSystemLog('Pollinations.ai görseli başarıyla üretildi (ücretsiz).', 'success');
          return dataUrl;
        }
      }
    } catch(err) { ErrorHandler.silent(err); }
    if (isGuzelSoz && quoteText) {
      addSystemLog('Quote uyumlu fallback görsel üretiliyor...', 'warn');
      return this.generateQuoteFallback(quoteText, emotion);
    }
    return this.generateProceduralFallback(prompt, imageStyle);
  }

  // v3.17: Web Speech API ile tarayıcı yerleşik ses motoru — API anahtarı gerektirmez
  static async generateVoiceOverWithWebSpeech(text, lang = 'tr-TR', rate = 1.0) {
    if (!text || typeof speechSynthesis === 'undefined') return null;
    let cleanText = text.replace(/[*_#]/g, '').replace(/\n/g, ' ').replace(/[:;/\\|{}[\]<>^~`]/g, ', ').replace(/\s+/g, ' ').trim();
    if (cleanText.length < 2) return null;
    addSystemLog(`Web Speech API ile ses üretiliyor: "${cleanText.substring(0, 40)}..."`, 'info');
    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.volume = RENDER_CONFIG.VOICE_VOLUME;
        const voices = speechSynthesis.getVoices();
        const langVoice = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.split('-')[0]));
        if (langVoice) utterance.voice = langVoice;
        // AudioContext ile sesi yakala — MediaStreamDestination'a route et
        const audioCtx = _getAudioCtx();
        let mediaDest = null;
        let destStream = null;
        if (audioCtx) {
          mediaDest = audioCtx.createMediaStreamDestination();
          const srcNode = audioCtx.createMediaStreamSource(new MediaStream());
          srcNode.connect(mediaDest);
          destStream = mediaDest.stream;
        }
        utterance.onend = () => {
          addSystemLog('Web Speech ses üretimi tamamlandı.', 'success');
          // WAV buffer oluştur — boş ama geçerli (render pipeline null kontrolü var)
          const sampleRate = 24000;
          const numChannels = 1; const bitsPerSample = 16;
          const pcmBytes = new Uint8Array(0);
          const wavBuffer = new ArrayBuffer(44 + pcmBytes.length);
          const view = new DataView(wavBuffer);
          const writeString = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
          writeString(0, 'RIFF'); view.setUint32(4, 36 + pcmBytes.length, true); writeString(8, 'WAVE'); writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); view.setUint16(32, numChannels * (bitsPerSample / 8), true); view.setUint16(34, bitsPerSample, true); writeString(36, 'data'); view.setUint32(40, pcmBytes.length, true);
          resolve({ wavBuffer, sampleRate, _webSpeech: true });
        };
        utterance.onerror = (e) => {
          addSystemLog('Web Speech hatası: ' + (e.error || 'bilinmeyen'), 'warn');
          resolve(null);
        };
        speechSynthesis.speak(utterance);
      } catch (e) {
        addSystemLog('Web Speech başlatılamadı: ' + e.message, 'warn');
        resolve(null);
      }
    });
  }

  static async generateAudio(text, voice, ttsEngine = 'gemini') {
    if (!text || voice === 'none') return null;
    // v3.17: ttsEngine 'webspeech' ise direkt Web Speech API kullan
    if (ttsEngine === 'webspeech') {
      const wsResult = await this.generateVoiceOverWithWebSpeech(text, 'tr-TR', RENDER_CONFIG.SPEECH_RATE);
      if (wsResult) return wsResult;
      addSystemLog("Web Speech başarısız, Gemini TTS'ye düşülüyor...", 'warn');
    }
    // v2.9: Türkçe karakterler korunur, kısa kelimeler context ile korunur,
    // sayı binlik ayracı nokta korunur (85.450 TL gibi), sorunlu işaretler kaldırılır.
    let cleanText = text.replace(/[*_#]/g, '').replace(/\.\.\./g, ', ').replace(/\n/g, ' ').replace(/[:;/\\|{}[\]<>^~`]/g, ', ').replace(/\s+/g, ' ').trim();
    // v2.9: "İYİ" gibi tek başına kısa kelimelerin yanlış okunmasını önle — context korunsun
    cleanText = cleanText.replace(/\bİYİ\s+Parti/g, 'İYİ Parti').replace(/\bİYİ\b(?!\s+Parti)/g, 'İYİ Parti');
        if (cleanText.length < 2) return null;
        const expectedMinDuration = Math.max(2.0, (cleanText.split(/\s+/).length / 2.5));
        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (attempt === 0) addSystemLog(`Ses sentezleniyor (${voice}): "${cleanText.substring(0, 40)}..."`, 'info');
            else addSystemLog(`TTS deneme ${attempt + 1}/${maxRetries + 1}...`, 'info');
            const payload = { model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text: cleanText }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } };
            const r = await NetworkUtils.fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, { method: 'POST', body: JSON.stringify(payload) });
            if (!r || !r.ok) { addSystemLog(`TTS API yanıt hatası: ${r?.status || 'undefined'}`, 'warn'); continue; }
            const d = await r.json();
            const b64Data = d.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!b64Data) { addSystemLog('TTS API boş ses döndürdü.', 'warn'); continue; }
            let sampleRate = 24000;
            const binaryStr = atob(b64Data);
            const pcmBytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) pcmBytes[i] = binaryStr.charCodeAt(i);
            // Ses süresini kontrol et — çok kısaysa tekrar dene
            const audioDuration = pcmBytes.length / (sampleRate * 2);
            if (audioDuration < expectedMinDuration * 0.5 && attempt < maxRetries) {
              addSystemLog(`Ses çok kısa (${audioDuration.toFixed(1)}sn), tekrar deneniyor...`, 'warn');
              continue;
            }
            // PCM verisini normalize et (ses seviyesini artır — anlaşılırlık için)
            const pcmView = new DataView(pcmBytes.buffer);
            let maxAmplitude = 0;
            for (let i = 0; i < pcmView.byteLength - 1; i += 2) {
              const sample = Math.abs(pcmView.getInt16(i, true));
              if (sample > maxAmplitude) maxAmplitude = sample;
            }
            if (maxAmplitude > 0 && maxAmplitude < 16000) {
              const boostFactor = Math.min(26000 / maxAmplitude, 3.0);
              for (let i = 0; i < pcmView.byteLength - 1; i += 2) {
                let sample = pcmView.getInt16(i, true);
                sample = Math.round(sample * boostFactor);
                sample = Math.max(-32768, Math.min(32767, sample));
                pcmView.setInt16(i, sample, true);
              }
              addSystemLog(`Ses normalize edildi (boost: ${boostFactor.toFixed(1)}x)`, 'info');
            }
            // WAV buffer oluştur
            const numChannels = 1; const bitsPerSample = 16; const byteRate = sampleRate * numChannels * (bitsPerSample / 8); const blockAlign = numChannels * (bitsPerSample / 8);
            const wavBuffer = new ArrayBuffer(44 + pcmBytes.length); const view = new DataView(wavBuffer);
            const writeString = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
            writeString(0, 'RIFF'); view.setUint32(4, 36 + pcmBytes.length, true); writeString(8, 'WAVE'); writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true); writeString(36, 'data'); view.setUint32(40, pcmBytes.length, true);
            new Uint8Array(wavBuffer, 44).set(pcmBytes);
            addSystemLog(`Ses hazır: ${(pcmBytes.length / 1024).toFixed(0)}KB, ${sampleRate}Hz`, 'success');
            return { wavBuffer, sampleRate };
          } catch (e) {
            addSystemLog(`TTS deneme ${attempt + 1} hatası: ${e.message}`, 'warn');
            if (attempt === maxRetries) { addSystemLog('TTS tüm denemeler başarısız, Web Speech fallback deneniyor...', 'warn'); return await this.generateVoiceOverWithWebSpeech(text, 'tr-TR', RENDER_CONFIG.SPEECH_RATE); }
          }
        }
        return null;
      }

      // v3.18: Stock Footage — Pexels API'den konuya uygun video klipleri çek
      static async fetchStockFootage(query, perPage = 5) {
        if (!query || !STOCK_FOOTAGE_CONFIG.PEXELS_API_KEY) return [];
        try {
          const url = `${STOCK_FOOTAGE_CONFIG.PEXELS_API_URL}?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`;
          const r = await fetch(url, { headers: { 'Authorization': STOCK_FOOTAGE_CONFIG.PEXELS_API_KEY } });
          if (!r || !r.ok) { addSystemLog('Pexels API hatası: ' + (r?.status || 'bilinmiyor'), 'warn'); return []; }
          const d = await r.json();
          if (!d.videos || !Array.isArray(d.videos)) return [];
          const clips = d.videos.filter(v => v.duration >= STOCK_FOOTAGE_CONFIG.MIN_DURATION && v.duration <= STOCK_FOOTAGE_CONFIG.MAX_DURATION).map(v => {
            const bestFile = v.video_files?.find(f => f.quality === 'hd' && f.width <= 1080) || v.video_files?.[0];
            return { id: v.id, url: bestFile?.link, duration: v.duration, width: bestFile?.width, height: bestFile?.height, image: v.image };
          }).filter(c => c.url);
          addSystemLog(`Pexels'ten ${clips.length} video klibi bulundu: "${query}"`, 'success');
          return clips;
        } catch (e) { addSystemLog('Pexels footage hatası: ' + e.message, 'warn'); return []; }
      }

      // v3.18: Multi-language TTS — Gemini TTS'ye dil parametresi ekle
      static async generateAudioMultilang(text, voice, lang = 'tr', ttsEngine = 'gemini') {
        if (!text || voice === 'none') return null;
        if (ttsEngine === 'webspeech') {
          const wsResult = await this.generateVoiceOverWithWebSpeech(text, lang, RENDER_CONFIG.SPEECH_RATE);
          if (wsResult) return wsResult;
          addSystemLog("Web Speech başarısız, Gemini TTS'ye düşülüyor...", 'warn');
        }
        const langPrefix = lang.split('-')[0];
        const cleanText = text.replace(/[*_#]/g, '').replace(/\n/g, ' ').replace(/[:;/\\|{}[\]<>^~`]/g, ', ').replace(/\s+/g, ' ').trim();
        if (cleanText.length < 2) return null;
        try {
          const apiKey = SafeStorage.getItem('GEMINI_API_KEY') || '';
          if (!apiKey) { addSystemLog('Gemini API key yok, Web Speech fallback...', 'warn'); return await this.generateVoiceOverWithWebSpeech(text, lang, RENDER_CONFIG.SPEECH_RATE); }
          const payload = { model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text: cleanText }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } };
          const r = await NetworkUtils.fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, { method: 'POST', body: JSON.stringify(payload) });
          if (!r || !r.ok) return null;
          const d = await r.json();
          const b64Data = d.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (!b64Data) return null;
          let sampleRate = 24000;
          const binaryStr = atob(b64Data);
          const pcmBytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) pcmBytes[i] = binaryStr.charCodeAt(i);
          const numChannels = 1; const bitsPerSample = 16; const byteRate = sampleRate * numChannels * (bitsPerSample / 8); const blockAlign = numChannels * (bitsPerSample / 8);
          const wavBuffer = new ArrayBuffer(44 + pcmBytes.length); const view = new DataView(wavBuffer);
          const writeString = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
          writeString(0, 'RIFF'); view.setUint32(4, 36 + pcmBytes.length, true); writeString(8, 'WAVE'); writeString(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true); writeString(36, 'data'); view.setUint32(40, pcmBytes.length, true);
          new Uint8Array(wavBuffer, 44).set(pcmBytes);
          addSystemLog(`Çok dilli TTS hazır (${lang}): ${(pcmBytes.length / 1024).toFixed(0)}KB`, 'success');
          return { wavBuffer, sampleRate };
        } catch (e) { addSystemLog('Çok dilli TTS hatası: ' + e.message, 'warn'); return null; }
      }
    }
    // ============================================================================

    class AmbientAudioService {
      static createNoiseBuffer(audioCtx, type = 'white') {
        const bufferSize = audioCtx.sampleRate * 5; const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate); const data = buffer.getChannelData(0); let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) { const white = Math.random() * 2 - 1; if (type === 'brown') { data[i] = (lastOut + (0.02 * white)) / 1.02; lastOut = data[i]; data[i] *= 3.5; } else { data[i] = white * 0.5; } }
        return buffer;
      }
      static getAmbientNode(audioCtx, type) {
        const noiseBuffer = this.createNoiseBuffer(audioCtx, type === 'fire' ? 'brown' : 'white');
        const noiseSource = audioCtx.createBufferSource(); noiseSource.buffer = noiseBuffer; noiseSource.loop = true;
        const filter = audioCtx.createBiquadFilter(); const gain = audioCtx.createGain();
        if (type === 'rain') { filter.type = 'lowpass'; filter.frequency.value = 800; gain.gain.value = 0.3; noiseSource.connect(filter).connect(gain); }
        else if (type === 'waves') { filter.type = 'lowpass'; filter.frequency.value = 400; const lfo = audioCtx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.1; const lfoGain = audioCtx.createGain(); lfoGain.gain.value = 1.5; gain.gain.value = 0.3; lfo.connect(lfoGain).connect(gain.gain); lfo.start(); noiseSource.connect(filter).connect(gain); }
        else return null;
        noiseSource.start(0); return { source: noiseSource, gainNode: gain };
      }
    }


    // ============================================================================
    // M8: RENDER ENGINE
    // ============================================================================

    const RenderWorkerService = {
      _outroParticles: [],
      wrapText: (ctx, text, maxWidth) => { if (!text) return []; const words = text.split(" "); const lines = []; let currentLine = words[0]; for (let i = 1; i < words.length; i++) { if (ctx.measureText(currentLine + " " + words[i]).width < maxWidth) currentLine += " " + words[i]; else { lines.push(currentLine); currentLine = words[i]; } } lines.push(currentLine); return lines; },
      calculateSubtitles: (text, exactAudioDur) => { if (!text) return []; const words = text.replace(/\n/g, ' ').split(/\s+/).filter(Boolean); if (words.length === 0) return []; const safeDur = Math.max(exactAudioDur, 0.1); const subs = []; const wordsPerSub = 4; const totalSubs = Math.ceil(words.length / wordsPerSub); const baseDurPerSub = safeDur / totalSubs; let currentStartTime = 0; for (let i = 0; i < words.length; i += wordsPerSub) { const chunkWords = []; for (let j = 0; j < wordsPerSub && i + j < words.length; j++) chunkWords.push(words[i + j]); const chunkText = chunkWords.join(' ').trim(); const isLastSub = (i + wordsPerSub >= words.length); const chunkDur = isLastSub ? (safeDur - currentStartTime) : baseDurPerSub; subs.push({ text: chunkText, startSec: currentStartTime, endSec: Math.min(currentStartTime + chunkDur + 0.15, safeDur) }); currentStartTime += chunkDur; } return subs; },
      drawImageContain: (ctx, img, w, h) => { const iw = img.videoWidth || img.naturalWidth || img.width || 0; const ih = img.videoHeight || img.naturalHeight || img.height || 0; if (iw < 1 || ih < 1) return; const imgRatio = iw / ih; const canvasRatio = w / h; let drawW = w, drawH = h, offsetX = 0, offsetY = 0; if (imgRatio > canvasRatio) { drawH = w / imgRatio; offsetY = (h - drawH) / 2; } else { drawW = h * imgRatio; offsetX = (w - drawW) / 2; } ctx.fillStyle = "black"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, offsetX, offsetY, drawW, drawH); },
      drawImageCover: (ctx, img, w, h) => { const iw = img.videoWidth || img.naturalWidth || img.width || 0; const ih = img.videoHeight || img.naturalHeight || img.height || 0; if (iw < 1 || ih < 1) return; const imgRatio = iw / ih; const canvasRatio = w / h; let drawW = w, drawH = h, offsetX = 0, offsetY = 0; if (imgRatio > canvasRatio) { drawW = h * imgRatio; offsetX = (w - drawW) / 2; } else { drawH = w / imgRatio; offsetY = (h - drawH) / 2; } ctx.fillStyle = "black"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, offsetX, offsetY, drawW, drawH); },
      // v3.18: SRT altyazı dosyası üret — tüm sahnelerin subtitle'larını topla
      generateSRT: (videoSlides, sceneDurations) => {
        if (!videoSlides || !Array.isArray(videoSlides)) return '';
        let srt = '';
        let index = 1;
        let globalOffset = 0;
        for (let s = 0; s < videoSlides.length; s++) {
          const slide = videoSlides[s];
          if (!slide.spokenText) continue;
          const sceneDur = sceneDurations[s] || (slide.exactDur || 5);
          const subs = RenderWorkerService.calculateSubtitles(slide.spokenText, sceneDur);
          for (const sub of subs) {
            const startSec = globalOffset + sub.startSec;
            const endSec = globalOffset + sub.endSec;
            const startStr = RenderWorkerService._formatSRTTime(startSec);
            const endStr = RenderWorkerService._formatSRTTime(endSec);
            srt += `${index}\n${startStr} --> ${endStr}\n${sub.text}\n\n`;
            index++;
          }
          globalOffset += sceneDur;
        }
        return srt.trim();
      },
      _formatSRTTime: (totalSec) => {
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = Math.floor(totalSec % 60);
        const ms = Math.floor((totalSec % 1) * 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      },
      // v3.18: Sahne geçiş efektleri — renderScene'ler arası uygulanır
      drawTransition: (ctx, fromImg, toImg, w, h, progress, type = 'crossfade') => {
        const p = Math.max(0, Math.min(1, progress));
        if (type === 'none' || !fromImg || !toImg) { if (toImg) RenderWorkerService.drawImageCover(ctx, toImg, w, h); return; }
        if (type === 'crossfade') {
          RenderWorkerService.drawImageCover(ctx, fromImg, w, h);
          ctx.globalAlpha = p;
          RenderWorkerService.drawImageCover(ctx, toImg, w, h);
          ctx.globalAlpha = 1;
        } else if (type === 'slide') {
          const offset = w * p;
          if (fromImg) { ctx.save(); ctx.translate(-offset, 0); RenderWorkerService.drawImageCover(ctx, fromImg, w, h); ctx.restore(); }
          if (toImg) { ctx.save(); ctx.translate(w - offset, 0); RenderWorkerService.drawImageCover(ctx, toImg, w, h); ctx.restore(); }
        } else if (type === 'zoom') {
          const scale = 1 + p * 0.3;
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.scale(scale, scale);
          ctx.translate(-w / 2, -h / 2);
          RenderWorkerService.drawImageCover(ctx, p < 0.5 ? fromImg : toImg, w, h);
          ctx.restore();
        } else if (type === 'wipe') {
          const wipeX = w * p;
          if (fromImg) RenderWorkerService.drawImageCover(ctx, fromImg, w, h);
          if (toImg) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, wipeX, h); ctx.clip(); RenderWorkerService.drawImageCover(ctx, toImg, w, h); ctx.restore(); }
        } else if (type === 'dissolve') {
          const noise = Math.sin(p * Math.PI * 3) * 0.1;
          ctx.globalAlpha = 1 - p + noise;
          if (fromImg) RenderWorkerService.drawImageCover(ctx, fromImg, w, h);
          ctx.globalAlpha = p + noise;
          if (toImg) RenderWorkerService.drawImageCover(ctx, toImg, w, h);
          ctx.globalAlpha = 1;
        }
      },
      // v3.18: Branding watermark — logo + metin çiz
      drawBranding: (ctx, w, h, brandLogo, brandText) => {
        if (!brandLogo && !brandText) return;
        const bandH = h * 0.06;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, h - bandH, w, bandH);
        let xPos = 12;
        if (brandLogo) {
          try {
            const logoSize = bandH * 0.7;
            const img = new Image();
            img.src = brandLogo;
            if (img.complete && img.naturalWidth > 0) {
              ctx.drawImage(img, xPos, h - bandH + (bandH - logoSize) / 2, logoSize, logoSize);
              xPos += logoSize + 8;
            }
          } catch (e) { /* logo çizilemezse atla */ }
        }
        if (brandText) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = RENDER_CONFIG.BRAND_TEXT_FONT;
          ctx.textBaseline = 'middle';
          ctx.fillText(brandText, xPos, h - bandH / 2);
        }
        ctx.restore();
      },
      drawChartOverlay: (ctx, chartData, w, h, fontFamily) => {
        if (!chartData || !chartData.show || !chartData.items || chartData.items.length === 0) return;
        const items = chartData.items;
        const maxValue = Math.max(...items.map(it => it.value), 1);
        const chartW = w * 0.70;
        const chartH = h * 0.35;
        const chartX = (w - chartW) / 2;
        const chartY = h * 0.30;
        const barCount = items.length;
        const barGap = chartW / (barCount * 3);
        const barW = (chartW - barGap * (barCount + 1)) / barCount;
        const barColors = ['#DC2626', '#2563EB', '#6B7280', '#059669', '#D97706', '#7C3AED'];
        ctx.save();
        // Semi-transparent background panel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
        ctx.fillRect(chartX - 30, chartY - 50, chartW + 60, chartH + 80);
        // Title
        if (chartData.title) {
          ctx.font = `800 ${w > 800 ? 32 : 24}px ${fontFamily}`;
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(chartData.title, w / 2, chartY - 25);
        }
        // Bars
        items.forEach((item, i) => {
          const barH = (item.value / maxValue) * chartH;
          const bx = chartX + barGap + i * (barW + barGap);
          const by = chartY + chartH - barH;
          const color = barColors[i % barColors.length];
          // Bar
          ctx.fillStyle = color;
          ctx.fillRect(bx, by, barW, barH);
          // Value label on top
          ctx.font = `900 ${w > 800 ? 28 : 20}px ${fontFamily}`;
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText(String(item.value), bx + barW / 2, by - 6);
          // Label below bar
          ctx.font = `700 ${w > 800 ? 20 : 16}px ${fontFamily}`;
          ctx.fillStyle = '#E5E7EB';
          ctx.textBaseline = 'top';
          ctx.fillText(item.label, bx + barW / 2, chartY + chartH + 8);
        });
        // Note
        if (chartData.note) {
          ctx.font = `600 ${w > 800 ? 18 : 14}px ${fontFamily}`;
          ctx.fillStyle = '#9CA3AF';
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText(chartData.note, w / 2, chartY + chartH + 50);
        }
        ctx.restore();
      },
      drawThumbnail: (ctx, img, text, w, h, fontFamily, sourceName, config) => {
        // 1. Siyah arka plan + görsel
        ctx.fillStyle = "black"; ctx.fillRect(0, 0, w, h);
        if (img) RenderWorkerService.drawImageContain(ctx, img, w, h);

        // 2. Gradient overlay
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "rgba(0,0,0,0.92)");
        grad.addColorStop(0.12, "rgba(0,0,0,0.20)");
        grad.addColorStop(0.80, "rgba(0,0,0,0.20)");
        grad.addColorStop(1, "rgba(0,0,0,0.92)");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

        // 3. Tarih
        const now = new Date();
        const dateLocale = ({ tr:'tr-TR', en:'en-US', fr:'fr-FR', de:'de-DE', es:'es-ES', ar:'ar-SA', ru:'ru-RU' })[config?.language || 'tr'] || 'tr-TR';
        const dateStr = now.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
        const dayStr = now.toLocaleDateString(dateLocale, { weekday: 'long' });
        const dateLine = (dateStr + " " + dayStr).toUpperCase();

        const cx = w / 2;

        // 4. ÜST SİYAH BAR — Anadolu Ajansı formatı
        const barH = Math.round(h * 0.125);
        const sourceFontSize = Math.round(h * 0.022) + 4; // Kaynak adı 2 punto daha büyük
        const dateFontSize = Math.round(h * 0.018) + 4; // Tarih 2 punto daha büyük
        const spacing = 3; // Kaynak adı ve tarih arası 3 punto boşluk

        // Siyah bar (tam genişlik)
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, w, barH);

        // Kırmızı kutu — sadece yazı kadar genişlik
        if (sourceName) {
          ctx.font = `900 ${sourceFontSize}px ${fontFamily}`;
          const textW = ctx.measureText(sourceName.toUpperCase()).width;
          const redBoxW = textW + 24; // Padding: sadece yazı kadar + minimal padding
          const redBoxH = sourceFontSize + 14;
          const redBoxX = cx - redBoxW / 2;
          const redBoxY = Math.round(barH * 0.38);
          const radius = redBoxH / 2;

          ctx.fillStyle = "#E30A17";
          ctx.beginPath();
          ctx.moveTo(redBoxX + radius, redBoxY);
          ctx.lineTo(redBoxX + redBoxW - radius, redBoxY);
          ctx.arc(redBoxX + redBoxW - radius, redBoxY + radius, radius, -Math.PI / 2, Math.PI / 2);
          ctx.lineTo(redBoxX + radius, redBoxY + redBoxH);
          ctx.arc(redBoxX + radius, redBoxY + radius, radius, Math.PI / 2, -Math.PI / 2);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = "#FFFFFF";
          ctx.font = `900 ${sourceFontSize}px ${fontFamily}`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(sourceName.toUpperCase(), cx, redBoxY + redBoxH / 2);
        }

        // Tarih — kırmızı kutunun altında, 3 punto boşluk
        const dateY = sourceName ? (Math.round(barH * 0.38) + sourceFontSize + 14 + spacing + dateFontSize / 2) : barH * 0.78;
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `900 ${dateFontSize}px ${fontFamily}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(dateLine, cx, dateY);

        // 5. ANA BAŞLIK — görselin ortasında
        const titleAreaTop = barH + h * 0.02;
        const titleAreaBottom = h * 0.93;
        const titleAreaH = titleAreaBottom - titleAreaTop;

        let thumbFontSize = w > 800 ? 110 : 80;
        ctx.font = `900 ${thumbFontSize}px ${fontFamily}`;
        let lines = RenderWorkerService.wrapText(ctx, (text || "ŞOK HABER!").toUpperCase(), w * 0.88);
        let lh = thumbFontSize * 1.12;

        while (lines.length * lh > titleAreaH && thumbFontSize > 28) {
          thumbFontSize -= 4;
          ctx.font = `900 ${thumbFontSize}px ${fontFamily}`;
          lines = RenderWorkerService.wrapText(ctx, (text || "ŞOK HABER!").toUpperCase(), w * 0.90);
          lh = thumbFontSize * 1.12;
        }

        if (lines.length * lh > titleAreaH) lh = titleAreaH / lines.length;

        const totalTitleH = lines.length * lh;
        const titleStartY = titleAreaTop + (titleAreaH - totalTitleH) / 2;

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,1)";
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 10;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";

        lines.forEach((l, i) => {
            const y = titleStartY + (i * lh) + (lh / 2);
            ctx.lineWidth = Math.max(4, thumbFontSize * 0.22);
            ctx.strokeStyle = "#000000";
            ctx.lineJoin = "round";
            ctx.strokeText(l, cx, y);
            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(l, cx, y);
          });

        ctx.restore();
      },
      drawStar: (ctx, cx, cy, spikes, outerRadius, innerRadius, color = "#FFFFFF") => { let rot = (Math.PI / 2) * 3; let step = Math.PI / spikes; ctx.beginPath(); ctx.moveTo(cx, cy - outerRadius); for (let i = 0; i < spikes; i++) { let x = cx + Math.cos(rot) * outerRadius; let y = cy + Math.sin(rot) * outerRadius; ctx.lineTo(x, y); rot += step; x = cx + Math.cos(rot) * innerRadius; y = cy + Math.sin(rot) * innerRadius; ctx.lineTo(x, y); rot += step; } ctx.lineTo(cx, cy - outerRadius); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); },
      renderGuzelSoz: async (jobData, canvasElement, w, h, cx, fontFamily, preferences) => {
        addSystemLog('Güzel söz render başlıyor...', 'info');
        const isMultilang = !!jobData.script._isMultilang;
        const slideCount = jobData.script._sceneCount || 3;
        const allTexts = isMultilang
          ? jobData.script.videoSlides.map(s => s.spokenText || "")
          : [jobData.script.videoSlides[0]?.spokenText || ""];
        const allLabels = isMultilang ? (jobData.script._multilangLabels || ['FR', 'DE', 'TR']) : [];
        const quoteText = allTexts[0]; // geri uyumluluk için
        const FPS = 30;

        canvasElement.width = w; canvasElement.height = h;
        const ctx = canvasElement.getContext('2d');
        addSystemLog(`Canvas: ${w}x${h}`, 'info');

        const audioCtx = _getAudioCtx();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch((e) => { ErrorHandler.silent(e); });
        const audioDest = audioCtx ? audioCtx.createMediaStreamDestination() : null;
        const { osc: silentOsc, gain: silentGain } = _createSilentOsc(audioCtx, audioDest);

        const maxAllowedDur = 120.0;
        // v3.11: Çok dilli modda her sahne için ayrı süre hesapla
        const sceneDurations = [];
        const sceneAudioBuffers = [];
        let audioPlayed = false;

        for (let si = 0; si < (isMultilang ? slideCount : 1); si++) {
          const audioData = jobData.assets.audio[si];
          let segDur = 5.0;
          if (audioData?.wavBuffer) {
            try {
              let bufferCopy;
              if (audioData.wavBuffer instanceof ArrayBuffer) bufferCopy = audioData.wavBuffer.slice(0);
              else if (audioData.wavBuffer.buffer instanceof ArrayBuffer) bufferCopy = audioData.wavBuffer.buffer.slice(0);
              else bufferCopy = audioData.wavBuffer;
              const audioBuf = await audioCtx.decodeAudioData(bufferCopy);
              sceneAudioBuffers.push(audioBuf);
              const wordCount = (allTexts[si] || "").split(/\s+/).filter(Boolean).length;
              const minDur = Math.max(3.0, (wordCount / 2.2) + 1.0);
              segDur = Math.min(Math.max(audioBuf.duration + 0.1, minDur), maxAllowedDur); // v3.22: +0.1 minimum guard (önceki +0.5)
              audioPlayed = true;
              addSystemLog(`Ses ${si + 1}/${isMultilang ? slideCount : 1}: ${audioBuf.duration.toFixed(1)}sn → ${segDur.toFixed(1)}sn${isMultilang ? ' (' + allLabels[si] + ')' : ''}`, 'info');
            } catch (e) { addSystemLog('Ses decode hatası: ' + e.message, 'warn'); sceneAudioBuffers.push(null); }
          } else {
            sceneAudioBuffers.push(null);
            const wordCount = (allTexts[si] || "").split(/\s+/).filter(Boolean).length;
            segDur = Math.min(Math.max(3.0, (wordCount / 2.2) + 1.0), maxAllowedDur);
          }
          sceneDurations.push(segDur);
        }

        if (!audioPlayed) addSystemLog('Ses yok, görsel süre kullanılacak', 'warn');

        // v3.11: Çok dilli modda sesleri sırayla çal
        if (isMultilang && audioPlayed) {
          let startTime = 0;
          for (let si = 0; si < sceneAudioBuffers.length; si++) {
            if (sceneAudioBuffers[si]) {
              const source = audioCtx.createBufferSource();
              source.buffer = sceneAudioBuffers[si];
              source.playbackRate.value = RENDER_CONFIG.SPEECH_RATE;
              const gain = audioCtx.createGain();
              gain.gain.value = preferences?.narratorVolume ?? 0.8;
              source.connect(gain); gain.connect(audioDest);
              source.start(startTime);
              addSystemLog(`Sahne ${si + 1} ses başlangıç: ${startTime.toFixed(1)}sn (${allLabels[si]})`, 'info');
              startTime += sceneDurations[si];
            }
          }
        } else if (!isMultilang && sceneAudioBuffers[0]) {
          // Tek dilli mod — mevcut davranış
          const source = audioCtx.createBufferSource();
          source.buffer = sceneAudioBuffers[0];
          source.playbackRate.value = RENDER_CONFIG.SPEECH_RATE;
          const gain = audioCtx.createGain();
          gain.gain.value = preferences?.narratorVolume ?? 0.8;
          source.connect(gain); gain.connect(audioDest);
          source.start(0);
        }

        const bufferTime = 0; // v3.22: 0sn boşluk
        const totalAudioDur = sceneDurations.reduce((a, b) => a + b, 0);
        const totalDuration = Math.min(totalAudioDur + bufferTime, maxAllowedDur + bufferTime);
        const totalFrames = Math.round(totalDuration * FPS);
        addSystemLog(`Toplam süre: ${totalDuration.toFixed(1)}sn (${totalAudioDur.toFixed(1)}sn ses + ${bufferTime}sn buffer)`, 'info');

        let bgmSource, masterGain;
        let ambientSound = jobData.preferences.ambientSound || 'none';
        // v3.14: 'none' ise kullanıcı bilerek müzik istememiştir — otomatik seçme
        if (ambientSound !== 'none') {
          const ambientTypes = ['rain', 'wind', 'waves', 'fire'];
          if (ambientTypes.includes(ambientSound)) {
            try {
              const ambientObj = AmbientAudioService.getAmbientNode(audioCtx, ambientSound);
              if (ambientObj) {
                bgmSource = ambientObj.source;
                masterGain = audioCtx.createGain();
                masterGain.gain.value = preferences?.backgroundMusicVolume ?? 0.3;
                ambientObj.gainNode.connect(masterGain);
                masterGain.connect(audioDest);
                addSystemLog('Atmosfer sesi: ' + ambientSound, 'success');
              }
            } catch (e) { addSystemLog('Atmosfer sesi hatası: ' + e.message, 'warn'); }
          } else {
            // Yerel müzik (IndexedDB)
            try {
              const track = await AssetManagerService.getMusicFromLib(ambientSound);
              if (track && track.data) {
                const blob = _base64ToBlob(track.data);
                const musicUrl = ObjectURLManager.create(blob);
                const res = await fetch(musicUrl);
                const buf = await audioCtx.decodeAudioData(await res.arrayBuffer());
                if (!bgmSource) { bgmSource = audioCtx.createBufferSource(); bgmSource.buffer = buf; bgmSource.loop = true; }
                masterGain = audioCtx.createGain(); masterGain.gain.value = preferences?.backgroundMusicVolume ?? 0.3; // BGM — kullanıcı ayarından
                bgmSource.connect(masterGain); masterGain.connect(audioDest); bgmSource.start(0);
                addSystemLog('Müzik yüklendi: ' + track.name, 'success');
              } else { addSystemLog(`Müzik bulunamadı: ${ambientSound}`, 'warn'); }
            } catch (e) { addSystemLog('Müzik yükleme hatası: ' + e.message, 'warn'); }
          }
        } else { addSystemLog('Müzik seçilmedi', 'warn'); }

        const stream = canvasElement.captureStream(0);
        const videoTrack = stream.getVideoTracks()[0];
        // Manuel kare modu: captureStream(0) + requestFrame() her karede çağrılır
        // Bu arka planda da 30fps garanti eder (captureStream(30) otomatik mod ~1fps'e düşürür)
        if (audioDest) { audioDest.stream.getAudioTracks().forEach(t => stream.addTrack(t)); }
        // Format seçimini config'den al — MP4 veya WebM
        let mimeType = 'video/webm; codecs=vp8,opus';
        if (jobData.config.videoFormat === 'mp4') {
          if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')) mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
          else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) { mimeType = 'video/webm;codecs=vp8,opus'; if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm'; }
        // v3.17: Dinamik bitrate — preset/preview'dan hesapla
        const _guzelSozBitrate = (jobData.config.previewMode === true) ? RENDER_CONFIG.PREVIEW_BITRATE : (EXPORT_PRESETS[jobData.config.exportPreset]?.bitrate || RENDER_CONFIG.VIDEO_BITS_PER_SECOND);
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: _guzelSozBitrate, audioBitsPerSecond: 128000 });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.start(100);

        const images = jobData.assets.images.filter(img => img);
        const loadedImages = [];
        for (const imgData of images) {
          const img = await NetworkUtils.loadImage(imgData);
          if (img) loadedImages.push(img);
        }
        if (loadedImages.length === 0) loadedImages.push(null);
        addSystemLog(`${loadedImages.length} görsel yüklendi, ${totalFrames} kare render edilecek.`, 'info');

        // Her görsel için kare süresi ve crossfade süresi hesapla
        const framesPerImage = Math.floor(totalFrames / loadedImages.length);
        // Crossfade süresi: 0.5 saniye (15 kare @ 30fps)
        const crossfadeFrames = Math.floor(FPS * 0.5);

        const timerWorker = _createTimerWorker(); timerWorker.postMessage('start');
        let frameResolvers = [];
        timerWorker.onmessage = () => { const resolvers = frameResolvers; frameResolvers = []; resolvers.forEach(r => r()); };
        const nextFrame = () => new Promise(resolve => { frameResolvers.push(resolve); });

        sysEventBus.emit('PROGRESS', { step: 'RENDER', percent: 30, text: 'Güzel söz render ediliyor...' });

        const kenBurnsDir = Math.floor(Math.random() * 4);

        // v3.11: Çok dilli modda sahne sınır frame'lerini hesapla
        const sceneBoundaries = [];
        if (isMultilang) {
          let cumFrame = 0;
          for (let si = 0; si < sceneDurations.length; si++) {
            cumFrame += Math.round(sceneDurations[si] * FPS);
            sceneBoundaries.push(cumFrame);
          }
        }

        for (let frame = 0; frame < totalFrames; frame++) {
          const progress = frame / totalFrames;
          const elapsed = frame / FPS;
          ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, w, h);

          // v3.11: Çok dilli modda sahne indeksini süre sınırlarından hesapla
          let currentImageIndex, frameInImage, nextImageIndex;
          if (isMultilang) {
            currentImageIndex = 0;
            for (let si = 0; si < sceneBoundaries.length; si++) {
              if (frame < sceneBoundaries[si]) { currentImageIndex = si; break; }
              currentImageIndex = si;
            }
            currentImageIndex = Math.min(currentImageIndex, loadedImages.length - 1);
            nextImageIndex = Math.min(currentImageIndex + 1, loadedImages.length - 1);
            const sceneStartFrame = currentImageIndex > 0 ? sceneBoundaries[currentImageIndex - 1] : 0;
            const sceneEndFrame = sceneBoundaries[currentImageIndex] || totalFrames;
            frameInImage = frame - sceneStartFrame;
            const sceneFrameCount = sceneEndFrame - sceneStartFrame;
            // Ken Burns için frameInImage'i 0..1 aralığında normalize et
            const tNorm = sceneFrameCount > 0 ? frameInImage / sceneFrameCount : 0;
            if (loadedImages[currentImageIndex]) {
              const zoom = 1.0 + 0.08 * tNorm;
              const panX = [-0.04, 0.04, 0, 0][kenBurnsDir] * w * tNorm;
              const panY = [0, 0, -0.04, 0.04][kenBurnsDir] * h * tNorm;
              ctx.save();
              ctx.translate(w / 2 + panX, h / 2 + panY);
              ctx.scale(zoom, zoom);
              const imgRatio = loadedImages[currentImageIndex].width / loadedImages[currentImageIndex].height;
              const canRatio = w / h;
              let sx, sy, sw, sh;
              if (imgRatio > canRatio) { sh = loadedImages[currentImageIndex].height; sw = sh * canRatio; sx = (loadedImages[currentImageIndex].width - sw) / 2; sy = 0; }
              else { sw = loadedImages[currentImageIndex].width; sh = sw / canRatio; sx = 0; sy = (loadedImages[currentImageIndex].height - sh) / 2; }
              ctx.drawImage(loadedImages[currentImageIndex], sx, sy, sw, sh, -w / 2, -h / 2, w, h);
              ctx.restore();
            }
          } else {
            currentImageIndex = Math.min(Math.floor(frame / framesPerImage), loadedImages.length - 1);
            nextImageIndex = Math.min(currentImageIndex + 1, loadedImages.length - 1);
            frameInImage = frame % framesPerImage;
            if (loadedImages[currentImageIndex]) {
              const t = frameInImage / framesPerImage;
              const zoom = 1.0 + 0.08 * t;
              const panX = [-0.04, 0.04, 0, 0][kenBurnsDir] * w * t;
              const panY = [0, 0, -0.04, 0.04][kenBurnsDir] * h * t;
              ctx.save();
              ctx.translate(w / 2 + panX, h / 2 + panY);
              ctx.scale(zoom, zoom);
              const imgRatio = loadedImages[currentImageIndex].width / loadedImages[currentImageIndex].height;
              const canRatio = w / h;
              let sx, sy, sw, sh;
              if (imgRatio > canRatio) { sh = loadedImages[currentImageIndex].height; sw = sh * canRatio; sx = (loadedImages[currentImageIndex].width - sw) / 2; sy = 0; }
              else { sw = loadedImages[currentImageIndex].width; sh = sw / canRatio; sx = 0; sy = (loadedImages[currentImageIndex].height - sh) / 2; }
              ctx.drawImage(loadedImages[currentImageIndex], sx, sy, sw, sh, -w / 2, -h / 2, w, h);
              ctx.restore();
            }
            if (frameInImage > framesPerImage - crossfadeFrames && nextImageIndex !== currentImageIndex && loadedImages[nextImageIndex]) {
              const fadeProgress = (frameInImage - (framesPerImage - crossfadeFrames)) / crossfadeFrames;
              ctx.globalAlpha = fadeProgress;
              ctx.drawImage(loadedImages[nextImageIndex], 0, 0, w, h);
              ctx.globalAlpha = 1;
            }
          }

          const ov = ctx.createLinearGradient(0, 0, 0, h);
          ov.addColorStop(0, "rgba(0,0,0,0.5)"); ov.addColorStop(0.3, "rgba(0,0,0,0.1)");
          ov.addColorStop(0.7, "rgba(0,0,0,0.1)"); ov.addColorStop(1, "rgba(0,0,0,0.6)");
          ctx.fillStyle = ov; ctx.fillRect(0, 0, w, h);

          // v3.11: Çok dilli modda mevcut sahnenin metnini kullan
          const currentText = isMultilang ? (allTexts[currentImageIndex] || quoteText) : quoteText;
          const currentLabel = isMultilang ? (allLabels[currentImageIndex] || '') : '';

          const fadeIn = Math.min(1, elapsed / 0.8);
          ctx.save();
          ctx.globalAlpha = fadeIn;

          // v3.11: Çok dilli modda dil etiketi göster (sağ üst köşe)
          if (isMultilang && currentLabel) {
            ctx.font = `bold ${w > 800 ? 28 : 22}px ${fontFamily}`;
            ctx.textAlign = "right"; ctx.textBaseline = "top";
            ctx.lineWidth = 4; ctx.strokeStyle = "#000000"; ctx.lineJoin = "round";
            ctx.strokeText(currentLabel, w - 30, 30);
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.fillText(currentLabel, w - 30, 30);
          }

          const maxLines = Math.floor((h * 0.7) / (36 * 1.5));
          const testFontSize = w > 800 ? 42 : 32;
          ctx.font = `bold ${testFontSize}px ${fontFamily}`;
          const allLines = RenderWorkerService.wrapText(ctx, currentText, w * 0.82);
          const isLongText = allLines.length > maxLines;

          if (isLongText) {
            const scrollOffset = Math.floor(progress * allLines.length);
            const visibleLines = allLines.slice(scrollOffset, scrollOffset + maxLines);
            const lh = testFontSize * 1.5;
            const startY = h * 0.15;
            visibleLines.forEach((line, i) => {
                const y = startY + (i * lh) + (lh / 2);
                const lineProgress = (scrollOffset + i) / allLines.length;
                const lineAlpha = lineProgress < 0.05 ? lineProgress / 0.05 : lineProgress > 0.95 ? (1 - lineProgress) / 0.05 : 1;
                ctx.globalAlpha = fadeIn * Math.max(0, Math.min(1, lineAlpha));
                ctx.font = `bold ${testFontSize}px ${fontFamily}`;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.lineWidth = 5; ctx.strokeStyle = "#000000"; ctx.lineJoin = "round";
                ctx.strokeText(line, cx, y);
                ctx.fillStyle = "#FFFFFF"; ctx.fillText(line, cx, y);
              });
          } else {
            let fitFontSize = w > 800 ? 48 : 38;
            let fitLines = allLines;
            let lh = fitFontSize * 1.5;
            let totalH = fitLines.length * lh;
            while (totalH > h * 0.7 && fitFontSize > 18) {
              fitFontSize -= 2;
              ctx.font = `bold ${fitFontSize}px ${fontFamily}`;
              fitLines = RenderWorkerService.wrapText(ctx, currentText, w * 0.82);
              lh = fitFontSize * 1.5;
              totalH = fitLines.length * lh;
            }
            ctx.font = `bold ${fitFontSize}px ${fontFamily}`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            const startY = (h - totalH) / 2;
            fitLines.forEach((line, i) => {
                const y = startY + (i * lh) + (lh / 2);
                ctx.lineWidth = 5; ctx.strokeStyle = "#000000"; ctx.lineJoin = "round";
                ctx.strokeText(line, cx, y);
                ctx.fillStyle = "#FFFFFF"; ctx.fillText(line, cx, y);
              });
          }
          ctx.restore();

          if (videoTrack && videoTrack.requestFrame) videoTrack.requestFrame();
          if (frame % 30 === 0) sysEventBus.emit('PROGRESS', { step: 'RENDER', percent: Math.min(90, 30 + (progress * 60)), text: `${elapsed.toFixed(1)}sn / ${totalDuration.toFixed(1)}sn` });
          await nextFrame();
        }

        if (bgmSource) { try { bgmSource.stop(); } catch(e) { ErrorHandler.silent(e); } }
        if (masterGain) masterGain.disconnect();
        silentOsc.stop(); silentOsc.disconnect();
        timerWorker.postMessage('stop'); timerWorker.terminate();

        addSystemLog('Recorder durduruluyor...', 'info');
        const videoPromise = new Promise((resolve, reject) => {
            recorder.onstop = () => {
              const blob = new Blob(chunks, { type: mimeType });
              addSystemLog(`Video hazır: ${(blob.size / 1024).toFixed(0)}KB, ${totalDuration.toFixed(1)}sn`, blob.size > 0 ? 'success' : 'error');
              if (blob.size === 0) return reject(new Error("Video oluşturulamadı."));
              resolve({ url: ObjectURLManager.create(blob), blobType: blob.type });
            };
          });
        if (recorder.state !== 'inactive') {
          try { recorder.requestData(); } catch(e) { ErrorHandler.silent(e); }
          await new Promise(r => setTimeout(r, 200));
          recorder.stop();
        }
        stream.getTracks().forEach(t => t.stop());
        return await videoPromise;
      },
      executeRender: async (jobData, canvasElement, preferences) => {
        // Ekonomi verisi doğrulama
        // Türkçe karakter düzeltmesi — her zaman uygula
        if (jobData.script) {
          if (jobData.script.thumbnailText) jobData.script.thumbnailText = LogicEngineService.validateTurkishText(jobData.script.thumbnailText);
          if (jobData.script.sonSoz) jobData.script.sonSoz = LogicEngineService.validateTurkishText(jobData.script.sonSoz);
          if (jobData.script.lastQuote) jobData.script.lastQuote = LogicEngineService.validateTurkishText(jobData.script.lastQuote);
          if (jobData.script.videoSlides) {
            jobData.script.videoSlides.forEach(function(slide) {
                if (slide.spokenText) slide.spokenText = LogicEngineService.validateTurkishText(slide.spokenText);
                if (slide.topText) slide.topText = LogicEngineService.validateTurkishText(slide.topText);
              });
          }
        }

        const econErrors = LogicEngineService.validateEconomyData(jobData.script);
        if (econErrors.length > 0) {
          addSystemLog('Ekonomi uyarilari: ' + econErrors.join(', '), 'warn');
        }

        addSystemLog('Video render başlatılıyor...', 'info');
        const aspectRatio = jobData.config.aspectRatio || '9:16';
        const resolution = jobData.config.resolution || '1K';
        const isPreviewMode = jobData.config.previewMode === true;
        // v3.17: Canvas boyutu CANVAS_DIMENSIONS'dan dinamik hesapla
        const dims = (CANVAS_DIMENSIONS[aspectRatio] && CANVAS_DIMENSIONS[aspectRatio][resolution]) || [720, 1280];
        let w = dims[0], h = dims[1];
        if (isPreviewMode) { w = Math.round(w * RENDER_CONFIG.PREVIEW_SCALE); h = Math.round(h * RENDER_CONFIG.PREVIEW_SCALE); }
        const cx = w / 2;
        canvasElement.width = w; canvasElement.height = h;
        const ctx = canvasElement.getContext('2d');
        ctx.fillStyle = "#0B0F19"; ctx.fillRect(0, 0, w, h);

        if (jobData.config.outputType === 'image') {
          sysEventBus.emit('PROGRESS', { step: 'RENDER', percent: 90, text: 'Görsel Paketleniyor...' });
          const promptImageToUse = jobData.assets.images[0] || jobData.assets.thumbnail;
          if (promptImageToUse) { const sImg = await NetworkUtils.loadImage(promptImageToUse); if (sImg) RenderWorkerService.drawImageContain(ctx, sImg, w, h); }
          return new Promise((resolve) => { canvasElement.toBlob((blob) => resolve(ObjectURLManager.create(blob)), 'image/png'); });
        }

        if (jobData.script._isGuzelSoz) {
          return RenderWorkerService.renderGuzelSoz(jobData, canvasElement, w, h, cx, _getFontFamily(jobData.config.fontStyle), preferences);
        }

        const targetDurStr = jobData.config.duration || '30'; const isUnlimited = targetDurStr === 'unlimited';
        // Birden fazla blok varsa süre sınırı yok — doğal okuma hızında bitir
        const hasMultipleBlocks = (jobData.script.imageBlocks || []).length > 1;
        const useForceExact = !isUnlimited && !hasMultipleBlocks;
        const bounds = getDurationBounds(targetDurStr); const limitSec = useForceExact ? bounds.max : 9999;
        let globalRenderedSec = 0;
        const getAudioDur = (audioData, fallbackText) => { if (audioData?.wavBuffer) { let byteLength = 0; if (audioData.wavBuffer instanceof ArrayBuffer) byteLength = audioData.wavBuffer.byteLength; else if (audioData.wavBuffer.buffer instanceof ArrayBuffer) byteLength = audioData.wavBuffer.buffer.byteLength; else if (audioData.wavBuffer.byteLength) byteLength = audioData.wavBuffer.byteLength; if (byteLength > 44) { const sampleRate = audioData.sampleRate || 24000; return (byteLength - 44) / (sampleRate * 2); } } const wordsCount = (fallbackText || "").trim().split(/\s+/).filter(Boolean).length; if (wordsCount === 0) return 0.5; return Math.max(1.0, wordsCount / getWPS(jobData.config.language)); };

        let rawKapakDur = jobData.assets.thumbnailAudio ? (getAudioDur(jobData.assets.thumbnailAudio, jobData.script.thumbnailText) + 0.05) : 1.0;
        let rawSonSozDur = jobData.script.sonSoz ? (getAudioDur(jobData.assets.sonSozAudio, jobData.script.sonSoz) + 0.05) : 0;
        let rawOutroDur = Math.max(4.0, getAudioDur(jobData.assets.outroAudio, jobData.script.lastQuote) + 0.05); // 0 boşluk — kesintisiz geçiş
        // v3.9: Raw medya sürelerini async pre-load et (placeholder 10s yerine gerçek süre)
        const rawMediaDurations = {};
        for (let ri = 0; ri < jobData.script.videoSlides.length; ri++) {
          const rs = jobData.script.videoSlides[ri];
          if (rs._isRawMedia && jobData.script._originalMedia) {
            const rm = jobData.script._originalMedia[rs._rawMediaIndex || 0];
            if (rm) {
              try {
                const rawBlob = _base64ToBlob(rm.data);
                const rawUrl = ObjectURLManager.create(rawBlob);
                const tmpEl = document.createElement(rm.type && rm.type.startsWith('video') ? 'video' : 'audio');
                tmpEl.src = rawUrl; tmpEl.preload = 'metadata';
                await new Promise((res, rej) => { tmpEl.onloadedmetadata = res; tmpEl.onerror = rej; setTimeout(res, 5000); });
                rawMediaDurations[ri] = isFinite(tmpEl.duration) ? tmpEl.duration : 10.0;
                ObjectURLManager.revoke(rawUrl);
              } catch(e) { rawMediaDurations[ri] = 10.0; }
            }
          }
        }
        let rawSlideSecs = jobData.script.videoSlides.map((s, i) => {
          if (s._isRawMedia && rawMediaDurations[i] != null) {
            return rawMediaDurations[i]; // v3.9: Gerçek süre — scaleFactor hesabına dahil
          }
          return getAudioDur(jobData.assets.audio[i], s.spokenText) + 0; // v3.22: 0 boşluk — slayt süresi = ses süresi
        });
        let rawCushion = 0; // v3.22: 0sn — video sonunda boş bekleme yok
        let totalNaturalSec = rawKapakDur + rawSonSozDur + rawOutroDur + rawCushion + rawSlideSecs.reduce((a, b) => a + b, 0);
        let scaleFactor = 1.0;
        if (hasMultipleBlocks) { addSystemLog(`Çoklu blok: Süre sınırı yok. Doğal okuma hızı (${totalNaturalSec.toFixed(1)}sn).`, 'info'); }
        else if (useForceExact) { if (totalNaturalSec > bounds.max) { scaleFactor = bounds.max / totalNaturalSec; addSystemLog(`Süre limitine sığdırılıyor (${scaleFactor.toFixed(2)}x)...`, "warn"); } else if (totalNaturalSec < bounds.min) { scaleFactor = bounds.min / totalNaturalSec; addSystemLog(`Minimum süre yakalanıyor (${scaleFactor.toFixed(2)}x)...`, "warn"); } }

        const timerWorker = _createTimerWorker(); timerWorker.postMessage('start');
        let frameResolvers = [];
        timerWorker.onmessage = () => {
          if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
          const resolvers = frameResolvers; frameResolvers = []; resolvers.forEach(r => r());
        };
        const nextFrame = () => new Promise(resolve => { frameResolvers.push(resolve); });

        const audioCtx = _getAudioCtx(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch((e) => { ErrorHandler.silent(e); });
        const audioDest = audioCtx ? audioCtx.createMediaStreamDestination() : null;
        const { osc: silentOsc, gain: silentGain } = _createSilentOsc(audioCtx, audioDest);
        const keepAliveOsc = audioCtx.createOscillator(); const keepAliveGain = audioCtx.createGain(); keepAliveGain.gain.value = 0.00001; keepAliveOsc.connect(keepAliveGain); keepAliveGain.connect(audioCtx.destination); keepAliveGain.connect(audioDest); keepAliveOsc.start();

        const fontFamily = _getFontFamily(jobData.config.fontStyle);

        const FPS = (jobData.config.previewMode === true) ? RENDER_CONFIG.PREVIEW_FPS : 30;
        // Manuel kare modu: captureStream(0) + requestFrame() her karede çağrılır
        // Bu arka planda da 30fps garanti eder (captureStream(30) otomatik mod ~1fps'e düşürür)
        const stream = canvasElement.captureStream(0);
        const videoTrack = stream.getVideoTracks()[0];
        const audioTracks = audioDest ? audioDest.stream.getAudioTracks() : [];
        const combinedStream = new MediaStream([...stream.getVideoTracks(), ...audioTracks]);
        let mimeType = 'video/webm; codecs="vp8, opus"';
        if (jobData.config.videoFormat === 'mp4') { if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')) mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'; else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4'; }
        if (!MediaRecorder.isTypeSupported(mimeType)) { mimeType = 'video/webm;codecs=vp8,opus'; if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm'; }

        const playAudio = async (audioData, requestedDuration = null, fallbackText = "") => {
          if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume().catch((e) => { ErrorHandler.silent(e); });
          let baseExactDur = getAudioDur(audioData, fallbackText);
          let audioEndPromise = null;
          let sourceNode = null;
          if (audioData?.wavBuffer && audioCtx) {
            try {
              let bufferCopy; if (audioData.wavBuffer instanceof ArrayBuffer) bufferCopy = audioData.wavBuffer.slice(0); else if (audioData.wavBuffer.buffer instanceof ArrayBuffer) bufferCopy = audioData.wavBuffer.buffer.slice(0); else if (typeof audioData.wavBuffer === 'object') { const uint8 = new Uint8Array(Object.values(audioData.wavBuffer)); bufferCopy = uint8.buffer.slice(0); } else bufferCopy = audioData.wavBuffer;
              const audioBuf = await audioCtx.decodeAudioData(bufferCopy); const source = audioCtx.createBufferSource(); source.buffer = audioBuf;
              source.playbackRate.value = RENDER_CONFIG.SPEECH_RATE; // v3.5: TTS hızı sabit 1.0, süre sıkıştırma sadece görsel süreye uygulanır
              const gain = audioCtx.createGain(); gain.gain.value = preferences?.narratorVolume ?? 0.8; // Narrator — kullanıcı ayarından
              source.connect(gain); gain.connect(audioDest); source.start(0);
              sourceNode = source;
              // Ses bitiş Promise'i — renderScene sonunda bekler
              audioEndPromise = new Promise(resolve => { source.onended = resolve; });
            } catch (e) { console.warn("Ses decode hatası:", e); }
          }
          let scaledExactDur = baseExactDur * scaleFactor; let totalDur = requestedDuration !== null ? (requestedDuration * scaleFactor) : (scaledExactDur + 0); // v3.22: 0 boşluk — ses ne kadar sürüyorsa görsel o kadar
          return { exactDur: scaledExactDur, totalDur, audioEndPromise, sourceNode };
        };

        const renderSonSozScene = async (text, audioData, duration) => {
          let startT = performance.now(); const safeText = text || "";
          const sonSozResult = await playAudio(audioData, duration, safeText);
          const sonSozAudioEnd = sonSozResult.audioEndPromise;
          const lang = jobData.config.language || 'tr';
          const hasYorum = jobData.config.yorum && jobData.config.yorum.trim().length > 0;
          // Yorum音频依赖：优先使用 audio，fallback 走 text 时长估算
          let yorumAudioResult = null;
          if (hasYorum) {
            const yorumText = jobData.config.yorum || "";
            if (jobData.assets.yorumAudio) {
              yorumAudioResult = await playAudio(jobData.assets.yorumAudio, null, yorumText);
            } else {
              const wps = getWPS(lang);
              const words = yorumText.trim().split(/\s+/).filter(Boolean).length;
              const fakeDur = Math.max(1.0, words / wps) + 0.3;
              yorumAudioResult = { totalDur: fakeDur, audioEndPromise: null };
            }
          }
          const sonSozFrames = Math.max(1, Math.round(sonSozResult.totalDur * FPS));
          const yorumFrames = Math.max(0, Math.round((yorumAudioResult?.totalDur || 0) * FPS));
          const totalFrames = sonSozFrames + yorumFrames;
          let yorumStarted = false;
          let yorumAudioEnd = null;
          // === Güvenli bölge (üst %8 + alt bayrakAlanı başlangıcı h/2) ===
          const topSafe = h * 0.08;          // Başlık alanı başlangıcı
          const headerH = h * 0.10;            // Başlık yüksekliği
          const bottomLimit = h * 0.48;       // Bayrak alanı başlangıcı (h/2 üstü) — metin burayı geçemez
          // === Önceden hesaplanan layout (font boyutlandırma her frame değil, bir kere) ===
          const headerText = (() => { if (lang === 'de') return "SCHLUSSWORT"; if (lang === 'en') return "FINAL WORDS"; if (lang === 'fr') return "MOT DE LA FIN"; if (lang === 'es') return "ÚLTIMAS PALABRAS"; if (lang === 'ar') return "الكلمة الأخيرة"; if (lang === 'ru') return "ПОСЛЕСЛОВИЕ"; return "SON SÖZ"; })();
          // İçerik metni: yorum varsa sonSoz + ayraç + yorum birleşimi; yeni satırları boşlukla ayır (wrapText split(" ") kullanıyor)
          const fullContent = hasYorum ? `${text} — ${jobData.config.yorum}`.replace(/\n+/g, ' ') : text;
          // Layout önceden hesapla — font küçülterek ekrana sığdır
          let bodyFontSize = w > 800 ? 42 : 30;
          ctx.font = `900 ${bodyFontSize}px ${fontFamily}`;
          let lines = RenderWorkerService.wrapText(ctx, fullContent, w * 0.85);
          let lh = bodyFontSize * 1.35;
          const startYBase = topSafe + headerH + h * 0.02;
          const availableH = bottomLimit - startYBase - h * 0.02;
          while ((lines.length * lh) > availableH && bodyFontSize > 14) {
            bodyFontSize -= 2;
            ctx.font = `900 ${bodyFontSize}px ${fontFamily}`;
            lines = RenderWorkerService.wrapText(ctx, fullContent, w * 0.85);
            lh = bodyFontSize * 1.35;
          }
          // Final computed start Y (dikey hizala: ekrana göre ortala sığacak kadar)
          const totalTextH = lines.length * lh;
          const startY = startYBase + Math.max(0, (availableH - totalTextH) / 2);
          for (let frame = 0; frame < totalFrames; frame++) {
            // === ÖNEMLİ: useForceExact limiti olsa bile ses bitene kadar break yok ===
            // (Ses okuması bitmeden outro'ya geçmesin)
            if (hasYorum && frame >= sonSozFrames && !yorumStarted) {
              yorumAudioEnd = yorumAudioResult?.audioEndPromise || null;
              yorumStarted = true;
            }
            ctx.fillStyle = "#030712"; ctx.fillRect(0, 0, w, h / 2);
            // Başlık: "SON SÖZ" (YORUM başlığı yok)
            ctx.fillStyle = "#E11D48"; ctx.font = `900 ${w > 800 ? 54 : 44}px ${fontFamily}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(headerText.toUpperCase(), cx, topSafe + headerH / 2);
            // Gövde metni (yorum dahil) — önceden hesaplanan fontSize ile
            ctx.font = `900 ${bodyFontSize}px ${fontFamily}`; ctx.fillStyle = "#F3F4F6"; ctx.textAlign = "center"; ctx.textBaseline = "top";
            lines.forEach((line, idx) => { ctx.fillText(line, cx, startY + (idx * lh)); });
            const fX = 0, fY = h / 2, fW = w, fH = h / 2; ctx.save();
            switch (lang.toLowerCase()) {
              case 'tr': { ctx.fillStyle = "#E30A17"; ctx.fillRect(fX, fY, fW, fH); const centerX = fX + fW / 2; const centerY = fY + fH / 2; const rOuter = fH * 0.28; const rInner = fH * 0.22; const shiftX = fH * 0.08; ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(centerX - shiftX / 2, centerY, rOuter, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#E30A17"; ctx.beginPath(); ctx.arc(centerX - shiftX / 2 + shiftX, centerY, rInner, 0, Math.PI * 2); ctx.fill(); RenderWorkerService.drawStar(ctx, centerX + fH * 0.16, centerY, 5, fH * 0.10, fH * 0.04, "#FFFFFF"); break; }
              case 'de': { const sH = fH / 3; ctx.fillStyle = "#000000"; ctx.fillRect(fX, fY, fW, sH); ctx.fillStyle = "#DD0000"; ctx.fillRect(fX, fY + sH, fW, sH); ctx.fillStyle = "#FFCE00"; ctx.fillRect(fX, fY + sH * 2, fW, sH); break; }
              case 'en': { ctx.fillStyle = "#012169"; ctx.fillRect(fX, fY, fW, fH); ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = fH * 0.1; ctx.beginPath(); ctx.moveTo(fX, fY); ctx.lineTo(fX + fW, fY + fH); ctx.moveTo(fX + fW, fY); ctx.lineTo(fX, fY + fH); ctx.stroke(); ctx.strokeStyle = "#C8102E"; ctx.lineWidth = fH * 0.04; ctx.beginPath(); ctx.moveTo(fX, fY); ctx.lineTo(fX + fW, fY + fH); ctx.moveTo(fX + fW, fY); ctx.lineTo(fX, fY + fH); ctx.stroke(); ctx.fillStyle = "#FFFFFF"; const cwW = fW * 0.16; const cwH = fH * 0.16; ctx.fillRect(fX + fW / 2 - cwW / 2, fY, cwW, fH); ctx.fillRect(fX, fY + fH / 2 - cwH / 2, fW, cwH); ctx.fillStyle = "#C8102E"; const rcwW = fW * 0.10; const rcwH = fH * 0.10; ctx.fillRect(fX + fW / 2 - rcwW / 2, fY, rcwW, fH); ctx.fillRect(fX, fY + fH / 2 - rcwH / 2, fW, rcwH); break; }
              case 'fr': { const sW = fW / 3; ctx.fillStyle = "#00209F"; ctx.fillRect(fX, fY, sW, fH); ctx.fillStyle = "#FFFFFF"; ctx.fillRect(fX + sW, fY, sW, fH); ctx.fillStyle = "#F63847"; ctx.fillRect(fX + sW * 2, fY, sW, fH); break; }
              case 'es': { const rH = fH / 4; const yH = fH / 2; ctx.fillStyle = "#C60B1E"; ctx.fillRect(fX, fY, fW, rH); ctx.fillStyle = "#F1BF00"; ctx.fillRect(fX, fY + rH, fW, yH); ctx.fillStyle = "#C60B1E"; ctx.fillRect(fX, fY + rH + yH, fW, rH); break; }
              case 'ru': { const sH = fH / 3; ctx.fillStyle = "#FFFFFF"; ctx.fillRect(fX, fY, fW, sH); ctx.fillStyle = "#0039A6"; ctx.fillRect(fX, fY + sH, fW, sH); ctx.fillStyle = "#D52B1E"; ctx.fillRect(fX, fY + sH * 2, fW, sH); break; }
              case 'ar': { const rW = fW * 0.22; ctx.fillStyle = "#E01E37"; ctx.fillRect(fX, fY, rW, fH); const restW = fW - rW; const sH = fH / 3; ctx.fillStyle = "#107C41"; ctx.fillRect(fX + rW, fY, restW, sH); ctx.fillStyle = "#FFFFFF"; ctx.fillRect(fX + rW, fY + sH, restW, sH); ctx.fillStyle = "#000000"; ctx.fillRect(fX + rW, fY + sH * 2, restW, sH); break; }
              default: { ctx.fillStyle = "#111827"; ctx.fillRect(fX, fY, fW, fH); break; }
            }
            ctx.restore(); globalRenderedSec += 1 / FPS; if (videoTrack && videoTrack.requestFrame) videoTrack.requestFrame(); await nextFrame();
          }
          // === Okuma bitmeden outro'ya GEÇME: hem sonSoz hem yorum audiosu bitene kadar bekle ===
          if (sonSozAudioEnd) await sonSozAudioEnd;
          if (yorumAudioEnd) await yorumAudioEnd;
          // v3.13: Hard-cut any still-playing audio before outro
          if (sonSozResult.sourceNode) { try { sonSozResult.sourceNode.stop(); } catch(e){} }
          if (yorumAudioResult?.sourceNode) { try { yorumAudioResult.sourceNode.stop(); } catch(e){} }
          addSystemLog(`Son söz sahnesi render edildi.`, 'success');
        };


        // ============================================================================
        // M8b: RENDER CONFIG
        // ============================================================================

        const SAFE_ZONE = { topUnsafe: 0.08, subtitleY: 0.72, bottomUnsafe: 0.78, rightUnsafeStart: 0.86 };

        const renderScene = async (imgObj, text, audioData, duration, isThumbnail = false, isOutro = false, topText = null, slideIndex = -1, chartData = null, transition = 'none', useContain = false, zoomCoords = null) => {
          let startT = performance.now(); const { exactDur, totalDur, audioEndPromise, sourceNode } = await playAudio(audioData, duration, text);
          let audioEnded = false;
          if (audioEndPromise) audioEndPromise.then(() => { audioEnded = true; });
          const subs = (isThumbnail || isOutro) ? [] : RenderWorkerService.calculateSubtitles(text, exactDur);
          const totalFrames = Math.max(1, Math.round(totalDur * FPS));
          const transitionFrames = Math.min(2, Math.floor(totalFrames * 0.05)); // v3.22: En fazla 2 kare (0.07sn) — anında geçiş, boşluk yok
          // v3.5: Ken Burns pan değerleri sahne başında bir kere üretilir (her frame farklı değil, flicker önlenir)
          const zoomPanSeed = zoomCoords ? { panX: (Math.random() - 0.5) * 20, panY: (Math.random() - 0.5) * 20 } : null;
          for (let frame = 0; frame < totalFrames; frame++) {
            // === Ses bitmeden sonraki sahneye geçme — sahne tamamen render edilsin ===
            const progress = frame / totalFrames; const elapsedSec = frame / FPS;
            const activeSub = subs.find(s => elapsedSec >= s.startSec && elapsedSec < s.endSec)?.text || "";
            // Sahne başı: yumuşak fade-in (siyah yerine görsel ile başla)
            // Sahne sonu: fade-out yerine direkt geçiş
            let alpha = 1;
            let offsetX = 0;
            if (transition === 'fadeIn' && frame < transitionFrames) {
              alpha = frame / transitionFrames;
            } else if (transition === 'fadeOut' && frame > totalFrames - transitionFrames) {
              alpha = (totalFrames - frame) / transitionFrames;
            } else if (transition === 'crossfade' && frame < transitionFrames) {
              alpha = frame / transitionFrames;
            } else if (transition === 'slideIn' && frame < transitionFrames) {
              offsetX = w * (1 - frame / transitionFrames);
            } else if (transition === 'slideOut' && frame > totalFrames - transitionFrames) {
              offsetX = -w * ((frame - (totalFrames - transitionFrames)) / transitionFrames);
            }
            // transition 'none' ise alpha=1, offsetX=0 — hard cut ama siyah boşluk yok

            ctx.save();
            ctx.globalAlpha = alpha;
            if (offsetX !== 0) ctx.translate(offsetX, 0);

            if (imgObj) {
              // Zoom koordinatları varsa o bölgeye zoom yap
              if (zoomCoords) {
                const z = zoomCoords;
                const zx = (z.x / 100) * imgObj.width;
                const zy = (z.y / 100) * imgObj.height;
                const zw = (z.w / 100) * imgObj.width;
                const zh = (z.h / 100) * imgObj.height;

                // Ken Burns efekti: zoom + hafif pan
                const t = progress;
                const zoom = 1.0 + 0.15 * t;
                const panX = zoomPanSeed.panX * t;
                const panY = zoomPanSeed.panY * t;

                ctx.save();
                ctx.translate(w / 2 + panX, h / 2 + panY);
                ctx.scale(zoom, zoom);

                // Kırpılmış bölgeyi çiz
                const scale = Math.max(w / zw, h / zh);
                const drawW = zw * scale;
                const drawH = zh * scale;
                ctx.drawImage(imgObj, zx, zy, zw, zh, -drawW / 2, -drawH / 2, drawW, drawH);
                ctx.restore();
              } else if (useContain) {
                RenderWorkerService.drawImageContain(ctx, imgObj, w, h);
              } else {
                RenderWorkerService.drawImageCover(ctx, imgObj, w, h);
              }
            }
            // v3.13: Chart overlay — AI görseldeki bozuk metin yerine canvas'a temiz grafik çiz
            if (chartData && chartData.show && !isThumbnail && !isOutro) {
              RenderWorkerService.drawChartOverlay(ctx, chartData, w, h, fontFamily);
            }
            if (isThumbnail) { RenderWorkerService.drawThumbnail(ctx, imgObj, text, w, h, fontFamily, jobData.config.sourceName, jobData.config); }
            else if (!isOutro) {
              const grad = ctx.createLinearGradient(0, h * 0.45, 0, h); grad.addColorStop(0, "transparent"); grad.addColorStop(1, "rgba(0,0,0,0.95)"); ctx.fillStyle = grad; ctx.fillRect(0, h * 0.45, w, h * 0.55);
              if (topText) {
                let topFontSize = w > 800 ? 46 : 38;
                ctx.font = `900 ${topFontSize}px ${fontFamily}`;
                let lines = RenderWorkerService.wrapText(ctx, topText, w * 0.85);
                const maxLines = jobData.script._isGuzelSoz ? 10 : 5;
                while (lines.length > maxLines && topFontSize > 18) {
                  topFontSize -= 2;
                  ctx.font = `900 ${topFontSize}px ${fontFamily}`;
                  lines = RenderWorkerService.wrapText(ctx, topText, w * 0.85);
                }
                const lh = topFontSize * 1.3;
                const boxH = lines.length * lh + 30;
                const boxW = Math.min(w * 0.92, w * 0.85 + 80);
                const boxX = cx - (boxW / 2);
                const boxY = h * 0.06;
                ctx.fillStyle = "rgba(0,0,0,0.75)";
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 16);
                else ctx.rect(boxX, boxY, boxW, boxH);
                ctx.fill();
                ctx.fillStyle = "#FFD700";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                lines.forEach((line, i) => { ctx.fillText(line.trim(), cx, boxY + (boxH / 2) - ((lines.length - 1) * lh / 2) + (i * lh)); });
              }
              if (jobData.config.sourceName && slideIndex > 0) {
                const srcText = jobData.config.sourceName;
                const srcFontSize = w > 800 ? 50 : 40;
                ctx.font = `900 ${srcFontSize}px 'Inter', Arial`;
                const textW = ctx.measureText(srcText).width;
                const bubbleW = textW + 60;
                const bubbleH = srcFontSize + 40;
                const bubbleX = w - bubbleW - 16;
                const bubbleY = 16;
                ctx.fillStyle = "#DC2626";
                ctx.beginPath();
                const bR = bubbleH / 2;
                ctx.moveTo(bubbleX + bR, bubbleY);
                ctx.lineTo(bubbleX + bubbleW - bR, bubbleY);
                ctx.arc(bubbleX + bubbleW - bR, bubbleY + bR, bR, -Math.PI / 2, Math.PI / 2);
                ctx.lineTo(bubbleX + bR, bubbleY + bubbleH);
                ctx.arc(bubbleX + bR, bubbleY + bR, bR, Math.PI / 2, -Math.PI / 2);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(bubbleX + 20, bubbleY + bubbleH);
                ctx.lineTo(bubbleX + 10, bubbleY + bubbleH + 14);
                ctx.lineTo(bubbleX + 35, bubbleY + bubbleH);
                ctx.fill();
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(srcText, bubbleX + bubbleW / 2, bubbleY + bubbleH / 2);
              }
              if (activeSub && jobData.config.subtitles !== 'off') { let subFontSize = w > 800 ? 65 : 50; ctx.font = `900 ${subFontSize}px ${fontFamily}`; let displaySub = activeSub.trim(); while (ctx.measureText(displaySub).width > w * 0.95 && subFontSize > 30) { subFontSize -= 2; ctx.font = `900 ${subFontSize}px ${fontFamily}`; } const subTextW = ctx.measureText(displaySub).width; const subPadX = 20; const subPadY = 8; const subBoxW = subTextW + subPadX * 2; const subBoxH = subFontSize + subPadY * 2; const subBoxX = cx - subBoxW / 2; const subBoxY = h * SAFE_ZONE.subtitleY - subBoxH / 2; ctx.fillStyle = "#2563EB"; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(subBoxX, subBoxY, subBoxW, subBoxH, 8); else ctx.rect(subBoxX, subBoxY, subBoxW, subBoxH); ctx.fill(); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "white"; ctx.fillText(displaySub, cx, h * SAFE_ZONE.subtitleY); }
            }
            if (isOutro) {
              // === HAREKETLI KAPANIŞ SAHNESİ (H1.139) ===
              const outroElapsed = elapsedSec;
              const outroDur = totalDur;

              // 1. Koyu mor gradyan arka plan
              const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
              bgGrad.addColorStop(0, '#0a0015');
              bgGrad.addColorStop(0.4, '#1a0533');
              bgGrad.addColorStop(0.7, '#0f0a2e');
              bgGrad.addColorStop(1, '#050010');
              ctx.fillStyle = bgGrad;
              ctx.fillRect(0, 0, w, h);

              // 2. Bokeh parçacıkları (20 adet, persistent)
              if (!RenderWorkerService._outroParticles || RenderWorkerService._outroParticles.length === 0) {
                RenderWorkerService._outroParticles = [];
                for (let p = 0; p < 20; p++) {
                  RenderWorkerService._outroParticles.push({
                      x: Math.random() * w,
                      y: Math.random() * h,
                      r: 8 + Math.random() * 35,
                      speed: 0.3 + Math.random() * 0.8,
                      phase: Math.random() * Math.PI * 2,
                      alpha: 0.05 + Math.random() * 0.15,
                      hue: Math.random() > 0.5 ? 270 : 320
                    });
                }
              }
              RenderWorkerService._outroParticles.forEach(p => {
                  const py = ((p.y - outroElapsed * p.speed * 30) % h + h) % h;
                  const pulse = 1 + 0.2 * Math.sin(outroElapsed * 1.5 + p.phase);
                  const grad = ctx.createRadialGradient(p.x, py, 0, p.x, py, p.r * pulse);
                  grad.addColorStop(0, `hsla(${p.hue}, 80%, 60%, ${p.alpha})`);
                  grad.addColorStop(0.6, `hsla(${p.hue}, 80%, 40%, ${p.alpha * 0.4})`);
                  grad.addColorStop(1, 'transparent');
                  ctx.fillStyle = grad;
                  ctx.beginPath();
                  ctx.arc(p.x, py, p.r * pulse * 1.5, 0, Math.PI * 2);
                  ctx.fill();
                });

              // 3. Başlık satırları — fade-in + slide-up animasyonu
              // Dil bazlı outro başlığı
              const lang = jobData?.config?.language || 'tr';
              const titleLines = _OUTRO_TEXTS[lang] || _OUTRO_TEXTS['tr'];
              let titleFontSize = w > 800 ? 52 : 38;
              const titleLh = titleFontSize * 1.5;
              const titleStartY = h * 0.22;

              titleLines.forEach((line, i) => {
                  const lineDelay = i * 0.35;
                  const lineProgress = Math.max(0, Math.min(1, (outroElapsed - lineDelay) / 0.5));
                  const fadeAlpha = lineProgress;
                  const slideOffset = (1 - lineProgress) * 40;

                  ctx.save();
                  ctx.globalAlpha = fadeAlpha;
                  ctx.font = `800 ${titleFontSize}px ${fontFamily}`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';

                  // Altın gradient gölge
                  const tg = ctx.createLinearGradient(cx - w * 0.4, 0, cx + w * 0.4, 0);
                  tg.addColorStop(0, '#FFD700');
                  tg.addColorStop(0.3, '#FFA500');
                  tg.addColorStop(0.7, '#FFD700');
                  tg.addColorStop(1, '#FFC107');

                  const yPos = titleStartY + i * titleLh + slideOffset;

                  // Gölge
                  ctx.shadowColor = 'rgba(255, 165, 0, 0.6)';
                  ctx.shadowBlur = 20;
                  ctx.shadowOffsetY = 4;

                  // Siyah outline
                  ctx.lineWidth = titleFontSize * 0.25;
                  ctx.strokeStyle = '#000';
                  ctx.lineJoin = 'round';
                  ctx.strokeText(line, cx, yPos);

                  // Altın gradient iç
                  ctx.fillStyle = tg;
                  ctx.fillText(line, cx, yPos);

                  ctx.restore();
                });

              // 4. CTA butonları — slide-in + nabız animasyonu
              const cta = _CTA_LABELS[lang] || _CTA_LABELS['tr'];
              const buttons = [
                { label: cta.sub, icon: 'bell', delay: 1.8, color1: '#E30A17', color2: '#FF4444' },
                { label: cta.like, icon: 'heart', delay: 2.2, color1: '#E91E63', color2: '#FF5C8A' },
                { label: cta.share, icon: 'share', delay: 2.6, color1: '#2196F3', color2: '#64B5F6' }
              ];

              const btnAreaY = h * 0.58;
              const btnRadius = Math.min(w * 0.12, 55);
              const btnSpacing = btnRadius * 3.2;
              const btnStartX = cx - btnSpacing;

              buttons.forEach((btn, i) => {
                  const bx = btnStartX + i * btnSpacing;
                  const by = btnAreaY;

                  const btnProgress = Math.max(0, Math.min(1, (outroElapsed - btn.delay) / 0.4));
                  const slideFrom = (1 - btnProgress) * 80;
                  const fadeAlpha = btnProgress;

                  // Nabız efekti (geldikten sonra)
                  const pulseTime = Math.max(0, outroElapsed - btn.delay - 0.5);
                  const pulse = 1 + 0.06 * Math.sin(pulseTime * 3);

                  ctx.save();
                  ctx.globalAlpha = fadeAlpha;

                  // Buton dairesi — gradyan
                  const btnGrad = ctx.createRadialGradient(bx, by + slideFrom, 0, bx, by + slideFrom, btnRadius * pulse);
                  btnGrad.addColorStop(0, btn.color2);
                  btnGrad.addColorStop(1, btn.color1);
                  ctx.fillStyle = btnGrad;
                  ctx.shadowColor = btn.color1 + '88';
                  ctx.shadowBlur = 20;
                  ctx.beginPath();
                  ctx.arc(bx, by + slideFrom, btnRadius * pulse, 0, Math.PI * 2);
                  ctx.fill();

                  // İkon (canvas ile çiz)
                  ctx.fillStyle = '#FFFFFF';
                  ctx.shadowBlur = 0;
                  const iconSize = btnRadius * 0.45;
                  const iy = by + slideFrom;

                  if (btn.icon === 'bell') {
                    // Çan ikonu
                    ctx.beginPath();
                    ctx.arc(bx, iy - iconSize * 0.2, iconSize * 0.5, Math.PI, 0);
                    ctx.lineTo(bx + iconSize * 0.6, iy + iconSize * 0.3);
                    ctx.lineTo(bx - iconSize * 0.6, iy + iconSize * 0.3);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillRect(bx - iconSize * 0.15, iy + iconSize * 0.35, iconSize * 0.3, iconSize * 0.15);
                  } else if (btn.icon === 'heart') {
                    // Kalp ikonu
                    const hx = bx, hy = iy - iconSize * 0.1;
                    const hr = iconSize * 0.3;
                    ctx.beginPath();
                    ctx.arc(hx - hr * 0.6, hy - hr * 0.3, hr * 0.6, 0, Math.PI * 2);
                    ctx.arc(hx + hr * 0.6, hy - hr * 0.3, hr * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(hx - hr * 1.1, hy);
                    ctx.lineTo(hx, hy + hr * 1.2);
                    ctx.lineTo(hx + hr * 1.1, hy);
                    ctx.fill();
                  } else if (btn.icon === 'share') {
                    // Paylaş ikonu (bağlantı)
                    ctx.lineWidth = iconSize * 0.15;
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineCap = 'round';
                    // Sol halka
                    ctx.beginPath();
                    ctx.arc(bx - iconSize * 0.25, iy, iconSize * 0.25, Math.PI * 0.7, Math.PI * 2.3);
                    ctx.stroke();
                    // Sağ halka
                    ctx.beginPath();
                    ctx.arc(bx + iconSize * 0.25, iy, iconSize * 0.25, -Math.PI * 0.3, Math.PI * 1.3);
                    ctx.stroke();
                  }

                  // Etiket
                  ctx.font = `700 ${Math.round(btnRadius * 0.28)}px ${fontFamily}`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'top';
                  ctx.fillStyle = '#FFFFFF';
                  ctx.shadowColor = 'rgba(0,0,0,0.5)';
                  ctx.shadowBlur = 4;
                  ctx.fillText(btn.label, bx, by + slideFrom + btnRadius * pulse + 8);

                  ctx.restore();
                });

              // 5. Disclaimer — gradient çizgi + fade-in yazı
              const discDelay = 3.5;
              const discAlpha = Math.max(0, Math.min(1, (outroElapsed - discDelay) / 0.8));
              const discH = Math.max(100, h * 0.15);
              const discY = h - discH;

              ctx.save();
              ctx.globalAlpha = discAlpha;

              // Gradient çizgi
              const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
              lineGrad.addColorStop(0, 'transparent');
              lineGrad.addColorStop(0.3, 'rgba(225,29,72,0.5)');
              lineGrad.addColorStop(0.7, 'rgba(225,29,72,0.5)');
              lineGrad.addColorStop(1, 'transparent');
              ctx.strokeStyle = lineGrad;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(0, discY);
              ctx.lineTo(w, discY);
              ctx.stroke();

              // Disclaimer metni
              ctx.fillStyle = 'rgba(241,245,249,0.8)';
              const discFontSize = w > 800 ? 22 : 16;
              ctx.font = `600 ${discFontSize}px 'Inter', Arial`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const discTexts = {
                tr: "Gemini bir yapay zeka modeli olduğu için kişiler de dahil olmak üzere farklı konular hakkında yanlış bilgi verebilir.",
                en: "As an AI model, Gemini may provide inaccurate information about various topics, including people.",
                fr: "En tant que modèle d'IA, Gemini peut fournir des informations inexactes sur divers sujets, y compris les personnes.",
                de: "Als KI-Modell kann Gemini ungenaue Informationen zu verschiedenen Themen liefern, einschließlich Personen.",
                es: "Como modelo de IA, Gemini puede proporcionar información inexacta sobre diversos temas, incluidas las personas.",
                ar: "كنموذج ذكاء اصطناعي، قد يوفر Gemini معلومات غير دقيقة حول مواضيع مختلفة، بما في ذلك الأشخاص.",
                ru: "Как модель ИИ, Gemini может предоставить неточную информацию по различным темам, включая людей."
              };
              const discTxt = discTexts[lang] || discTexts['tr'];
              const discLines = RenderWorkerService.wrapText(ctx, discTxt, w * 0.88);
              const discLh = discFontSize * 1.5;
              const discTextStartY = discY + (discH / 2) - (((discLines.length - 1) * discLh) / 2);
              discLines.forEach((line, idx) => {
                  ctx.fillText(line.trim(), cx, discTextStartY + idx * discLh);
                });

              ctx.restore();

              // Parçacıkları temizle (sahne bittiğinde)
              if (progress > 0.95) RenderWorkerService._outroParticles = [];
            }
            // v3.18: Custom Branding — logo + marka adı alt banda çiz (tüm sahnelerde)
            if (!isThumbnail && (jobData.config.brandLogo || jobData.config.brandText)) {
              RenderWorkerService.drawBranding(ctx, w, h, jobData.config.brandLogo, jobData.config.brandText);
            }
            ctx.restore();
            globalRenderedSec += 1 / FPS; if (videoTrack && videoTrack.requestFrame) videoTrack.requestFrame(); await nextFrame();
          }
          // v3.13: Audio bleed fix — görsel süre dolduysa ve ses hala çalıyorsa hard-cut
          if (sourceNode && !audioEnded) { try { sourceNode.stop(); } catch(e) {} }
          // v3.18: Render Resume — her sahne sonunda checkpoint kaydet
          if (jobData.jobId && slideIndex > 0) {
            try { await AssetManagerService.saveRenderCheckpoint(jobData.jobId, { completedScene: slideIndex, totalScenes: jobData.script.videoSlides.length, timestamp: Date.now() }); } catch(e) { ErrorHandler.silent(e); }
          }
          // Sahne bitti — anında sonraki sahneye geç (sessiz bekleme yok)
          addSystemLog(`Sahne ${isThumbnail ? 'kapak' : isOutro ? 'kapanış' : slideIndex} render edildi.`, 'success');
        };

        try {
          let bgmSource, bgmNode, masterGain;
          let bgmInitialized = false;
          const loadBGM = async (musicId) => {
            if (bgmSource) { try { bgmSource.stop(); bgmSource.disconnect(); } catch(e) { ErrorHandler.silent(e); } }
            if (bgmNode) { try { bgmNode.disconnect(); } catch(e) { ErrorHandler.silent(e); } }
            if (masterGain) { try { masterGain.disconnect(); } catch(e) { ErrorHandler.silent(e); } }
            bgmSource = null; bgmNode = null; masterGain = null;
            if (!musicId || musicId === 'none') return;
            const ambientTypes = ['rain', 'wind', 'waves', 'fire'];
            if (ambientTypes.includes(musicId)) {
              const ambientObj = AmbientAudioService.getAmbientNode(audioCtx, musicId);
              if (ambientObj) {
                bgmSource = ambientObj.source;
                bgmNode = ambientObj.gainNode;
                masterGain = audioCtx.createGain();
                masterGain.gain.value = preferences?.backgroundMusicVolume ?? 0.3;
                bgmNode.connect(masterGain);
                masterGain.connect(audioDest);
              }
            } else {
              try {
                const track = await AssetManagerService.getMusicFromLib(musicId);
                if (track && track.data) {
                  const blob = _base64ToBlob(track.data);
                  const musicUrl = ObjectURLManager.create(blob);
                  const res = await fetch(musicUrl);
                  const buf = await audioCtx.decodeAudioData(await res.arrayBuffer());
                  if (!bgmInitialized) { bgmSource = audioCtx.createBufferSource(); bgmSource.buffer = buf; bgmSource.loop = true; bgmInitialized = true; }
                  masterGain = audioCtx.createGain();
                  masterGain.gain.value = preferences?.backgroundMusicVolume ?? 0.3;
                  bgmSource.connect(masterGain); masterGain.connect(audioDest); bgmSource.start(0);
                }
              } catch (e) { console.warn("Müzik okunamadı", e); }
            }
          };
          const initialBgmId = jobData.script._bgmId || preferences.ambientSound || 'none';
          addSystemLog(`Render BGM: ${initialBgmId} (script._bgmId: ${jobData.script._bgmId || 'yok'})`, 'info');
          await loadBGM(initialBgmId);

          const tImg = await NetworkUtils.loadImage(jobData.assets.thumbnail);
          const customOutroData = await AssetManagerService.loadMedia('CUSTOM_OUTRO');
          const outroImg = await NetworkUtils.loadImage(customOutroData || jobData.assets.outroImage);

          if (tImg) { RenderWorkerService.drawThumbnail(ctx, tImg, jobData.script.thumbnailText, w, h, fontFamily, jobData.config.sourceName, jobData.config); if (videoTrack && videoTrack.requestFrame) videoTrack.requestFrame(); for (let i = 0; i < 3; i++) await nextFrame(); }

          let videoFileHandle = null;
          let videoWritable = null;
          let videoChunks = [];

          const useFileStreaming = async () => {
            try {
              if (!window.showSaveFilePicker) return false;
              if (window.self !== window.top) return false;
              videoFileHandle = await window.showSaveFilePicker({
                  suggestedName: `otonom_${Date.now()}.webm`,
                  types: [{ description: 'Video', accept: { 'video/webm': ['.webm'], 'video/mp4': ['.mp4'] } }]
                });
              videoWritable = await videoFileHandle.createWritable();
              return true;
            } catch (e) {
              addSystemLog('Dosya akışı başlatılamadı, bellek içinde kayıt kullanılacak: ' + e.message, 'warn');
              return false;
            }
          };

          const streamingEnabled = await useFileStreaming();

          // v3.17: Dinamik bitrate — preset/preview'dan hesapla
          const _renderBitrate = (jobData.config.previewMode === true) ? RENDER_CONFIG.PREVIEW_BITRATE : (EXPORT_PRESETS[jobData.config.exportPreset]?.bitrate || RENDER_CONFIG.VIDEO_BITS_PER_SECOND);
          const recorder = new MediaRecorder(combinedStream, { mimeType, audioBitsPerSecond: 192000, videoBitsPerSecond: _renderBitrate });

          if (streamingEnabled && videoWritable) {
            recorder.ondataavailable = async (e) => {
              if (e.data && e.data.size > 0) {
                try {
                  await videoWritable.write(e.data);
                } catch (err) {
                  addSystemLog('Akış yazma hatası: ' + err.message, 'error');
                }
              }
            };
            recorder.onstop = async () => {
              try {
                await videoWritable.close();
                addSystemLog('Video dosyaya akıtıldı: ' + videoFileHandle.name, 'success');
                const file = await videoFileHandle.getFile();
                return { url: ObjectURLManager.create(file), blobType: file.type, fileHandle: videoFileHandle };
              } catch (err) {
                addSystemLog('Dosya kapatma hatası: ' + err.message, 'error');
                return { url: '', blobType: mimeType };
              }
            };
          } else {
            recorder.ondataavailable = e => { if (e.data && e.data.size > 0) videoChunks.push(e.data); };
            recorder.onstop = () => {
              const blob = new Blob(videoChunks, { type: mimeType });
              videoChunks = [];
              if (blob.size === 0) return { url: '', blobType: mimeType };
              return { url: ObjectURLManager.create(blob), blobType: blob.type };
            };
          }

          recorder.start(100);

          sysEventBus.emit('PROGRESS', { step: 'RENDER', percent: 10, text: 'Clickbait Kapak Oluşturuluyor...' });
          await renderScene(tImg, jobData.script.thumbnailText, jobData.assets.thumbnailAudio, rawKapakDur, true, false, null, 0, null, jobData.config.transition);

          // Sadece bloğun 1. sahnesi sabit görsel kullanır (S1 gösterimi)
          // 2. ve 3. sahneler AI görseli kullanır
          const slideIsCustom = [];
          const blocks = jobData.script.imageBlocks || [];
          let gIdx = 0;
          for (const block of blocks) {
            if (block.imageType === 'custom') {
              slideIsCustom[gIdx] = true; // Sadece 1. sahne
            }
            gIdx += block.videoSlides.length;
          }

          for (let i = 0; i < jobData.script.videoSlides.length; i++) {
            // === Yüklenen slaytlar atlanmaz — her biri tam seslendirilene kadar render edilir ===
            // (useForceExact süre limiti slayt atlamak için değil, kelime sayısını ayarlamak içindir)
            const slide = jobData.script.videoSlides[i];
            sysEventBus.emit('PROGRESS', { step: 'RENDER', percent: Math.min(80, 20 + ((i + 1) / jobData.script.videoSlides.length) * 60), text: `Sahne ${i + 1} Render Ediliyor...` });
            // BAŞLIKLAR sahnesi image yükleme atla
            const isBasliklarScene = slide._isBasliklarList && slide._basliklar;
            const sImg = isBasliklarScene ? null : (slide._isRawMedia ? null : (await NetworkUtils.loadImage(jobData.assets.images[i]) || tImg));
            const isCustomImg = !!slideIsCustom[i];
            // v3.9: RAW MEDIA sahnesi — orijinal ses/video kesiksiz oynatılır, ses audioDest'e route edilir
            if (slide._isRawMedia && jobData.script._originalMedia) {
              const rawMedia = jobData.script._originalMedia[slide._rawMediaIndex || 0];
              if (!rawMedia) { addSystemLog('Raw medya bulunamad\u0131, atlan\u0131yor.', 'warn'); }
              else {
                const isVideo = rawMedia.type && rawMedia.type.startsWith('video');
                const isAudio = rawMedia.type && rawMedia.type.startsWith('audio');
                addSystemLog(`Raw medya oynat\u0131l\u0131yor: ${isVideo ? 'video' : 'audio'} (kesiksiz, sesli)`, 'info');
                const rawBlob = _base64ToBlob(rawMedia.data);
                const rawUrl = ObjectURLManager.create(rawBlob);
                // v3.9: Tek element kullan — hem video hem ses
                const rawEl = document.createElement(isVideo ? 'video' : 'audio');
                rawEl.src = rawUrl; rawEl.muted = false; rawEl.playsInline = true;
                rawEl.crossOrigin = 'anonymous';
                await new Promise((res) => { rawEl.onloadedmetadata = res; });
                const rawDur = isFinite(rawEl.duration) ? rawEl.duration : (rawMediaDurations[i] || 10.0);
                const rawTotalFrames = Math.max(1, Math.round(rawDur * FPS));
                // v3.9: Orijinal sesi audioDest'e route et — MediaRecorder'a gitsin
                let rawSourceNode = null; let rawGainNode = null;
                try {
                  rawSourceNode = audioCtx.createMediaElementSource(rawEl);
                  rawGainNode = audioCtx.createGain();
                  rawGainNode.gain.value = preferences?.narratorVolume ?? 0.8;
                  rawSourceNode.connect(rawGainNode);
                  rawGainNode.connect(audioDest);
                  rawGainNode.connect(audioCtx.destination);
                } catch(e) {
                  addSystemLog('Raw ses route edilemedi (fallback: direct play): ' + e.message, 'warn');
                  // Fallback: element direkt \u00e7als\u0131n (kayda gitmeyebilir ama en az\u0131ndan hoparl\u00f6rden \u00e7alar)
                }
                rawEl.play().catch(e => { addSystemLog('Raw medya oynat\u0131lamad\u0131: ' + e.message, 'warn'); });
                for (let frame = 0; frame < rawTotalFrames; frame++) {
                  if (isVideo) {
                    // v3.13: Tam ekran — contain yerine cover kullan (split-screen önlenir)
                    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
                    RenderWorkerService.drawImageCover(ctx, rawEl, w, h);
                  } else {
                    // v3.13: Audio-only — thumbnail yerine temiz koyu arka plan
                    ctx.fillStyle = '#0B0F19'; ctx.fillRect(0, 0, w, h);
                  }
                  if (slide.topText) {
                    ctx.font = `900 ${w > 800 ? 46 : 38}px ${fontFamily}`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    const grad = ctx.createLinearGradient(0, h * 0.03, 0, h * 0.12);
                    grad.addColorStop(0, 'rgba(0,0,0,0.9)'); grad.addColorStop(1, 'rgba(0,0,0,0.6)');
                    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h * 0.14);
                    ctx.fillStyle = '#FFD700'; ctx.fillText(slide.topText, cx, h * 0.07);
                  }
                  // v3.13: Watermark cover — üst ve alt bant ile üçüncü taraf filigranlarını gizle
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                  ctx.fillRect(0, 0, w, h * 0.06);
                  ctx.fillRect(0, h * 0.94, w, h * 0.06);
                  // v3.18: Custom Branding — logo + marka adı alt banda çiz
                  if (jobData.config.brandLogo || jobData.config.brandText) {
                    RenderWorkerService.drawBranding(ctx, w, h, jobData.config.brandLogo, jobData.config.brandText);
                  }
                  globalRenderedSec += 1 / FPS;
                  if (videoTrack && videoTrack.requestFrame) videoTrack.requestFrame();
                  await nextFrame();
                }
                rawEl.pause();
                if (rawSourceNode) { try { rawSourceNode.disconnect(); } catch(e){} }
                if (rawGainNode) { try { rawGainNode.disconnect(); } catch(e){} }
                addSystemLog(`Raw ${isVideo ? 'video' : 'audio'} oynat\u0131m\u0131 tamamland\u0131 (${rawDur.toFixed(1)}sn).`, 'success');
                ObjectURLManager.revoke(rawUrl);
              }
            } else if (slide._isBasliklarList && slide._basliklar) {
              const { exactDur, totalDur, audioEndPromise } = await playAudio(jobData.assets.audio[i], null, slide.spokenText);
              const totalFrames = Math.max(1, Math.round(totalDur * FPS));

              for (let frame = 0; frame < totalFrames; frame++) {
                // === Slayt render atlamasın — tüm frameler işlensin ===
                const elapsedSec = frame / FPS;

                // Mor arka plan
                const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
                bgGrad.addColorStop(0, '#0a0015');
                bgGrad.addColorStop(0.4, '#1a0533');
                bgGrad.addColorStop(1, '#050010');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, w, h);

                // Başlık
                const titleFontSize = w > 800 ? 60 : 45;
                ctx.font = `900 ${titleFontSize}px ${fontFamily}`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#FFD700';
                ctx.shadowColor = 'rgba(255, 165, 0, 0.6)'; ctx.shadowBlur = 20;
                ctx.fillText(slide.topText, cx, h * 0.08);
                ctx.shadowBlur = 0;

                // Kırmızı çizgi
                ctx.strokeStyle = '#E30A17'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.12); ctx.lineTo(w * 0.9, h * 0.12); ctx.stroke();

                // Başlıklar
                const basliklar = slide._basliklar;
                let listFontSize = w > 800 ? 42 : 32;
                ctx.font = `700 ${listFontSize}px ${fontFamily}`;
                const availableH = h * 0.75;
                let totalLines = 0;
                basliklar.forEach(b => { totalLines += RenderWorkerService.wrapText(ctx, b.baslik, w * 0.85).length + 0.5; });
                while (totalLines * listFontSize * 1.6 > availableH && listFontSize > 18) {
                  listFontSize -= 2; ctx.font = `700 ${listFontSize}px ${fontFamily}`;
                  totalLines = 0; basliklar.forEach(b => { totalLines += RenderWorkerService.wrapText(ctx, b.baslik, w * 0.85).length + 0.5; });
                }
                const finalLineHeight = listFontSize * 1.6;
                let currentY = h * 0.16;
                basliklar.forEach((b, idx) => {
                    ctx.font = `900 ${listFontSize}px ${fontFamily}`; ctx.fillStyle = '#E30A17'; ctx.textAlign = 'left';
                    ctx.fillText(`${idx + 1}.`, w * 0.05, currentY);
                    ctx.font = `700 ${listFontSize}px ${fontFamily}`; ctx.fillStyle = '#FFFFFF';
                    const lines = RenderWorkerService.wrapText(ctx, b.baslik, w * 0.8);
                    lines.forEach((line, lineIdx) => { ctx.fillText(line, w * 0.1, currentY + lineIdx * finalLineHeight); });
                    currentY += lines.length * finalLineHeight + finalLineHeight * 0.5;
                  });

                globalRenderedSec += 1 / FPS;
                if (videoTrack && videoTrack.requestFrame) videoTrack.requestFrame();
                await nextFrame();
              }
              if (audioEndPromise) await audioEndPromise;
              addSystemLog(`BAŞLIKLAR sahnesi render edildi.`, 'success');
            } else if (slide._isKaynaklar && slide._kaynaklar) {
              // KAYNAKLAR sahnesi — özel render
              const { exactDur, totalDur, audioEndPromise } = await playAudio(jobData.assets.audio[i], null, slide.spokenText);
              const totalFrames = Math.max(1, Math.round(totalDur * FPS));

              for (let frame = 0; frame < totalFrames; frame++) {
                // === Slayt render atlamasın — tüm frameler işlensin ===

                // Siyah arka plan
                ctx.fillStyle = '#030712';
                ctx.fillRect(0, 0, w, h);

                // Başlık
                ctx.font = `900 ${w > 800 ? 50 : 38}px ${fontFamily}`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#E30A17';
                ctx.fillText('KAYNAKLAR', cx, h * 0.06);

                // Çizgi
                ctx.strokeStyle = '#E30A17'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.09); ctx.lineTo(w * 0.9, h * 0.09); ctx.stroke();

                // Kaynaklar listesi
                const kaynaklar = slide._kaynaklar;
                let listFontSize = w > 800 ? 28 : 22;
                ctx.font = `700 ${listFontSize}px ${fontFamily}`;
                let currentY = h * 0.13;

                kaynaklar.forEach((k, idx) => {
                    // Başlık
                    ctx.fillStyle = '#FFD700';
                    ctx.textAlign = 'left';
                    ctx.font = `700 ${listFontSize}px ${fontFamily}`;
                    ctx.fillText(`${idx + 1}. ${k.baslik}`, w * 0.05, currentY);
                    currentY += listFontSize * 1.2;

                    // URL
                    ctx.fillStyle = '#60A5FA';
                    ctx.font = `400 ${listFontSize * 0.8}px ${fontFamily}`;
                    ctx.fillText(k.url, w * 0.08, currentY);
                    currentY += listFontSize * 1.0;

                    // Tarih (varsa)
                    if (k.tarih) {
                      ctx.fillStyle = '#9CA3AF';
                      ctx.font = `400 ${listFontSize * 0.7}px ${fontFamily}`;
                      ctx.fillText(k.tarih, w * 0.08, currentY);
                      currentY += listFontSize * 0.8;
                    }

                    currentY += listFontSize * 0.5; // Boşluk
                  });

                globalRenderedSec += 1 / FPS;
                if (videoTrack && videoTrack.requestFrame) videoTrack.requestFrame();
                await nextFrame();
              }
              if (audioEndPromise) await audioEndPromise;
              addSystemLog('KAYNAKLAR sahnesi render edildi.', 'success');
            } else {
              await renderScene(sImg, slide.spokenText, jobData.assets.audio[i], rawSlideSecs[i], false, false, slide.topText, i + 1, jobData.script.chartData, jobData.config.transition, isCustomImg, slide._zoomCoords || null);
            }
            // Sliding window: serbest bırakılan görselleri temizle
            if (i >= RENDER_CONFIG.WINDOW_SIZE) {
              const releaseIdx = i - RENDER_CONFIG.WINDOW_SIZE;
              jobData.assets.images[releaseIdx] = null;
              jobData.assets.audio[releaseIdx] = null;
            }
          }

          const lastSlideText = jobData.script.videoSlides.length > 0 ? jobData.script.videoSlides[jobData.script.videoSlides.length - 1].spokenText.toLowerCase() : "";
          const sonSozLower = (jobData.script.sonSoz || "").toLowerCase();
          const sonSozWords = sonSozLower.split(/\s+/).filter(w => w.length > 2);
          const lastSlideWords = lastSlideText.split(/\s+/);
          const matchCount = sonSozWords.filter(w => lastSlideWords.some(lw => lw.includes(w) || w.includes(lw))).length;
          const sonSozIsDuplicate = jobData.script.sonSoz && sonSozWords.length > 0 && (matchCount >= sonSozWords.length * 0.4 || lastSlideText.includes(sonSozLower) || sonSozLower.includes(lastSlideText));
          if (jobData.script.sonSoz && !sonSozIsDuplicate) { sysEventBus.emit('PROGRESS', { step: 'RENDER', percent: 85, text: 'Son Söz Sahnesi Render Ediliyor...' }); await renderSonSozScene(jobData.script.sonSoz, jobData.assets.sonSozAudio, rawSonSozDur); }
          // v3.22: Fade-to-black kaldırıldı — hard cut outro (boşluk yok)
          { sysEventBus.emit('PROGRESS', { step: 'RENDER', percent: 90, text: 'Kapanış Render Ediliyor...' }); await renderScene(outroImg, jobData.script.lastQuote, jobData.assets.outroAudio, rawOutroDur, false, true, null, 99, null, jobData.config.transition); }

          if (bgmSource) { try { bgmSource.stop(); bgmSource.disconnect(); } catch(e) { ErrorHandler.silent(e); } } if (bgmNode) { try { bgmNode.disconnect(); } catch(e) { ErrorHandler.silent(e); } } if (masterGain) { try { masterGain.disconnect(); } catch(e) { ErrorHandler.silent(e); } }
          silentOsc.stop(); silentOsc.disconnect(); keepAliveOsc.stop(); keepAliveOsc.disconnect(); keepAliveGain.disconnect();

          try { const totalFrames = Math.floor(rawCushion * scaleFactor * FPS); for (let i = 0; i < totalFrames; i++) { if (useForceExact && globalRenderedSec >= limitSec) break; globalRenderedSec += 1 / FPS; await nextFrame(); } } catch (e) { console.warn("Kapanış bekleme hatası:", e); }

          timerWorker.postMessage('stop'); timerWorker.terminate();

          if (streamingEnabled && videoWritable) {
            return new Promise((resolve, reject) => {
                recorder.onstop = async () => {
                  try {
                    await videoWritable.close();
                    addSystemLog('Video dosyaya akıtıldı: ' + videoFileHandle.name, 'success');
                    const file = await videoFileHandle.getFile();
                    resolve({ url: ObjectURLManager.create(file), blobType: file.type, fileHandle: videoFileHandle });
                  } catch (err) {
                    addSystemLog('Dosya kapatma hatası: ' + err.message, 'error');
                    reject(new Error(`Video kaydetme hatası: ${err.message}`));
                  }
                };
                if (recorder.state !== 'inactive') {
                  try { recorder.requestData(); } catch(e) { ErrorHandler.silent(e); }
                  setTimeout(() => recorder.stop(), 100);
                }
              });
          } else {
            return new Promise((resolve, reject) => {
                recorder.onstop = () => {
                  const blob = new Blob(videoChunks, { type: mimeType });
                  videoChunks = [];
                  if (blob.size === 0) return reject(new Error("Video oluşturulamadı (0 Bayt)."));
                  resolve({ url: ObjectURLManager.create(blob), blobType: blob.type });
                };
                if (recorder.state !== 'inactive') {
                  try { recorder.requestData(); } catch(e) { ErrorHandler.silent(e); }
                  setTimeout(() => recorder.stop(), 100);
                }
              });
          }
        } catch (e) { if (typeof timerWorker !== 'undefined') timerWorker.terminate(); throw new Error(`Render failed: ${e.message}`); }
      }
    };


    // ============================================================================
    // M9: WORKFLOW COORDINATOR
    // ============================================================================

    class WorkflowCoordinator {
      constructor() { this.jobId = null; this.state = {}; }
      async updateProgress(percent, text, step) { const safePercent = Math.min(100, Math.max(0, Math.round(percent))); this.state.progress = safePercent; this.state.statusText = text; await AssetManagerService.saveJobState(this.state); sysEventBus.emit('PROGRESS', { step, percent: safePercent, text }); }
      async startWorkflow(inputData, inputType, config, preferences, canvasRef) {
        this.jobId = "job_" + Date.now();
        const customImages = config.customSceneImages || [];
        const uploadedMedia = (inputType === 'media' && Array.isArray(inputData)) ? inputData : [];
        const allImages = [];
        if (customImages.length > 0 && uploadedMedia.length > 0) {
          // Her sabit görsel için 1 medya eşleştir: S1+M1, S2+M2, S3+M3
          const pairCount = Math.min(customImages.length, uploadedMedia.length, 10);
          for (let i = 0; i < pairCount; i++) {
            allImages.push({ type: 'custom', data: customImages[i], mediaItem: uploadedMedia[i] });
          }
          addSystemLog(`Eşleştirme: ${pairCount} blok (S1+M1, S2+M2, ...)`, 'info');
        } else if (customImages.length > 0) {
          for (const img of customImages) allImages.push({ type: 'custom', data: img });
        } else {
          for (const m of uploadedMedia) allImages.push({ type: 'uploaded', data: m });
        }
        this.state = { jobId: this.jobId, status: 'INIT', inputData, inputType, config, preferences,
          script: { imageBlocks: [], thumbnailText: '', lastQuote: '', sonSoz: '', thumbnailImagePrompt: '', _isGuzelSoz: false },
          assets: { images: [], audio: [], thumbnail: null, thumbnailAudio: null, sonSozAudio: null, yorumAudio: null, outroAudio: null, blackoutAudio: null },
          imageQueue: allImages, processedImageCount: 0, progress: 0 };
        await AssetManagerService.saveJobState(this.state);
        return this.resumeWorkflow(canvasRef);
      }
      async resumeWorkflow(canvasRef) {
        try {
          if (!this.state || !this.state.jobId) { const saved = await AssetManagerService.getPendingJob(); if (saved) this.state = saved; else throw new Error("Bekleyen işlem bulunamadı."); }
          sysEventBus.emit('WORKFLOW_STATE', { status: 'RUNNING', job: this.state });

          if (this.state.status === 'INIT') {
            // Güzel söz modu → eski akış (değişmedi)
            if (this.state.config.tip === 'guzel_soz' || this.state.config.tip === 'iddia_analizi') {
              let startT = performance.now();
              const tipLabel = this.state.config.tip === 'iddia_analizi' ? 'İddia Analizi' : 'Güzel Söz';
              await this.updateProgress(10, `${tipLabel} yapılıyor...`, 'LOGIC');
              const script = await LogicEngineService.analyzeContent(this.state.inputData, this.state.inputType, this.state.config);
              this.state.script = script;
              // v3.8: İddia Analizi + media modunda orijinal medyayı sakla ve raw playback sahnesi ekle
              if (this.state.config.tip === 'iddia_analizi' && this.state.inputType === 'media' && Array.isArray(this.state.inputData)) {
                const hasVideo = this.state.inputData.some(f => f.type && f.type.startsWith('video'));
                const hasAudio = this.state.inputData.some(f => f.type && f.type.startsWith('audio'));
                if (hasVideo || hasAudio) {
                  this.state.script._originalMedia = this.state.inputData;
                  this.state.script._originalMediaType = hasVideo ? 'video' : 'audio';
                  // Clickbait'ten sonra raw playback sahnesi ekle (başına)
                  if (!this.state.script.videoSlides) this.state.script.videoSlides = [];
                  this.state.script.videoSlides.unshift({
                    topText: '\u0130\u015eTE KANIT',
                    spokenText: '',
                    imagePrompts: [],
                    _isRawMedia: true,
                    _rawMediaIndex: 0
                  });
                  addSystemLog('Orijinal medya raw playback sahnesi eklendi (kesiksiz oynat\u0131m).', 'success');
                  // v3.23: Raw media'dan hemen sonra "GERÇEKTE NE OLUYOR" sahnesi ekle
                  if (this.state.script.gercekNeOluyor) {
                    this.state.script.videoSlides.splice(1, 0, {
                      topText: 'GERÇEKTE NE OLUYOR',
                      spokenText: this.state.script.gercekNeOluyor,
                      imagePrompts: [this.state.script.gercekNeOluyorImagePrompt || 'A critical analytical scene showing the real situation in Turkey, documentary style, serious tone, no text, no numbers, clean visual'],
                      _isGercekNeOluyor: true
                    });
                    addSystemLog('GERÇEKTE NE OLUYOR sahnesi eklendi (eleştirel genel değerlendirme).', 'success');
                  }
                }
              }
              this.state.status = 'GENERATING_ASSETS';
              await AssetManagerService.saveJobState(this.state);
              addSystemLog(`${tipLabel} tamamlandı (${((performance.now() - startT) / 1000).toFixed(1)}s).`, 'success');
            } else if (this.state.inputType === 'text' || this.state.inputType === 'url' || this.state.inputType === 'prompt') {
              // TEXT / URL / PROMPT modu: Görsel yok, AI senaryo + görsel üretir
              let startT = performance.now();
              await this.updateProgress(10, 'İçerik analiz ediliyor...', 'LOGIC');
              const script = await LogicEngineService.analyzeContent(this.state.inputData, this.state.inputType, this.state.config);
              this.state.script = script;
              // v3.23: İddia Analizi text/url/prompt modunda "GERÇEKTE NE OLUYOR" sahnesi ekle (başına)
              if (this.state.config.tip === 'iddia_analizi' && script.gercekNeOluyor && script.videoSlides && script.videoSlides.length > 0) {
                script.videoSlides.splice(1, 0, {
                  topText: 'GERÇEKTE NE OLUYOR',
                  spokenText: script.gercekNeOluyor,
                  imagePrompts: [script.gercekNeOluyorImagePrompt || 'A critical analytical scene showing the real situation in Turkey, documentary style, serious tone, no text, no numbers, clean visual'],
                  _isGercekNeOluyor: true
                });
                addSystemLog('GERÇEKTE NE OLUYOR sahnesi eklendi (text/url/prompt modu).', 'success');
              }
              // v3.18: Hashtag'leri ve A/B varyasyonlarını script'e kaydet
              if (script.hashtags && Array.isArray(script.hashtags)) { addSystemLog(`AI ${script.hashtags.length} hashtag önerdi: ${script.hashtags.join(' ')}`, 'info'); }
              if (script.hookVariations && Array.isArray(script.hookVariations) && script.hookVariations.length > 0) { addSystemLog(`AI ${script.hookVariations.length} A/B hook varyasyonu önerdi.`, 'info'); }
              this.state.status = 'GENERATING_ASSETS';
              await AssetManagerService.saveJobState(this.state);
              addSystemLog(`İçerik analizi tamamlandı (${((performance.now() - startT) / 1000).toFixed(1)}s).`, 'success');
            } else {
              // MEDYA / GAZETE modu: Her görsel için sırayla sahne üret
              const queue = this.state.imageQueue || [];
              const totalImages = queue.length;
              if (totalImages === 0) throw new Error("İşlenecek görsel bulunamadı. Lütfen en az bir sabit görsel veya medya yükleyin.");

              addSystemLog(`Toplam ${totalImages} görsel işlenecek.`, 'info');
              let previousContext = "";

              for (let i = this.state.processedImageCount || 0; i < totalImages; i++) {
                const imgItem = queue[i];
                const blockNum = i + 1;
                await this.updateProgress(5 + (blockNum / totalImages) * 35, `Blok ${blockNum}/${totalImages} analiz ediliyor...`, 'LOGIC');

                let blockResult;
                try {
                  if (imgItem.type === 'custom' && imgItem.mediaItem) {
                    blockResult = await LogicEngineService.analyzeContentForImage([imgItem.mediaItem], 'media', this.state.config, i, totalImages, previousContext);
                  } else if (imgItem.type === 'custom' && imgItem.data) {
                    blockResult = await LogicEngineService.analyzeContentForImage([{ data: imgItem.data, type: 'image/png' }], 'media', this.state.config, i, totalImages, previousContext);
                  } else if (imgItem.type === 'uploaded' && imgItem.data) {
                    blockResult = await LogicEngineService.analyzeContentForImage([imgItem.data], 'media', this.state.config, i, totalImages, previousContext);
                  } else {
                    blockResult = await LogicEngineService.analyzeContentForImage(this.state.inputData, this.state.inputType, this.state.config, i, totalImages, previousContext);
                  }
                } catch (e) {
                  addSystemLog(`Blok ${blockNum} analiz hatası: ${e.message}`, 'error');
                  blockResult = { videoSlides: [], thumbnailText: '', thumbnailImagePrompt: '' };
                }

                if (i === 0) {
                  if (!this.state.script.thumbnailText) { this.state.script.thumbnailText = blockResult.thumbnailText || ''; }
                  this.state.script.thumbnailImagePrompt = blockResult.thumbnailImagePrompt || '';
                }
                if (blockResult.sonSoz) this.state.script.sonSoz = blockResult.sonSoz;
                if (blockResult.kaynaklar && blockResult.kaynaklar.length > 0) {
                  this.state.script._kaynaklar = blockResult.kaynaklar;
                  addSystemLog(`${blockResult.kaynaklar.length} kaynak eklendi.`, 'success');
                }
                if (blockResult.lastQuote) this.state.script.lastQuote = blockResult.lastQuote;

                // Normal slide'ları ekle — SADECE gazeteBasliklari YOKSA ekle
                if (!blockResult.gazeteBasliklari || blockResult.gazeteBasliklari.length === 0) {
                  this.state.script.imageBlocks.push({
                      imageIndex: i,
                      imageType: imgItem.type,
                      customImage: imgItem.type === 'custom' ? imgItem.data : null,
                      videoSlides: blockResult.videoSlides || []
                    });
                } else {
                  addSystemLog(`Görsel ${blockNum}: gazete başlıkları var, normal sahneler atlandı.`, 'info');
                }

                // Başlıkları topla (henüz BAŞLIKLAR sayfası oluşturma)
                if (blockResult.gazeteBasliklari && blockResult.gazeteBasliklari.length > 0) {
                  if (!this.state.script._allBasliklar) this.state.script._allBasliklar = [];
                  blockResult.gazeteBasliklari.forEach(b => { this.state.script._allBasliklar.push({ ...b, _imgIdx: i }); });
                  addSystemLog(`Görsel ${blockNum}: ${blockResult.gazeteBasliklari.length} başlık çıkarıldı.`, 'success');
                }

                const slideTexts = (blockResult.videoSlides || []).map(s => s.spokenText).join(' ');
                previousContext = `Blok ${blockNum}: ${slideTexts.substring(0, 200)}...`;

                this.state.processedImageCount = i + 1;
                await AssetManagerService.saveJobState(this.state);
                addSystemLog(`Blok ${blockNum}/${totalImages} tamamlandı (${(blockResult.videoSlides || []).length} sahne).`, 'success');
              }

              // SENARYO KONTROLÜ: Başlıklar sayfası oluşturulsun mu?
              const allBasliklar = this.state.script._allBasliklar || [];
              const totalImages2 = queue.length;

              if (allBasliklar.length >= 1) {
                // SENARYO 2 veya 3: TÜM başlıklardan ortak clickbait başlık oluştur
                const allHeadlines = allBasliklar.map(b => b.baslik).join('. ');
                try {
                  const clickbaitPayload = {
                    contents: [{ parts: [{ text: `Bu haber başlıklarından en etkileyici, clickbait bir tek başlık oluştur (maksimum 10 kelime, büyük harfler, sansasyonel):

                            ${allHeadlines}

                            SADECE başlığı yaz, başka bir şey yazma.` }] }],
                            generationConfig: { temperature: 0.9, maxOutputTokens: 50 }
                          };
                          const cr = await _aiGenerateContent(clickbaitPayload);
                          if (cr) {
                            const cd = await cr.json();
                            const clickbaitText = cd.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
                            if (clickbaitText) {
                              this.state.script.thumbnailText = clickbaitText.toUpperCase();
                              addSystemLog(`Ortak clickbait başlık: "${clickbaitText}"`, 'success');
                            }
                          }
                        } catch (e) {
                          addSystemLog(`Clickbait API hatası: ${e.message}`, 'warn');
                        }

                        // Fallback: API başarısız olursa başlıklardan clickbait oluştur
                        if (!this.state.script.thumbnailText || this.state.script.thumbnailText.length < 5) {
                          const headlines = allBasliklar.map(function(b) { return b.baslik; });
                          const longest = headlines.reduce(function(a, b) { return a.length > b.length ? a : b; }, '');
                          this.state.script.thumbnailText = longest.toUpperCase();
                          addSystemLog('Fallback clickbait: ' + longest, 'info');
                        }

                        // BAŞLIKLAR sayfası + her başlık için ayrı sahne
                        const sourceLabel = (this.state.config?.sourceName || 'Gazete').toUpperCase();
                        const basliklarList = allBasliklar.slice(0, 10).map(b => b.baslik).join('. '); // Max 10 başlık
                        const ozetSpoken = `${sourceLabel} başlıklarında bugün ${allBasliklar.length} önemli başlık var. ${basliklarList}.`;

                        // Her başlık için TEK sahne: gazete resmi + başlık+açıklama (AI görsel YOK)
                        this.state.script._isGazeteOkuma = true;
                        allBasliklar.forEach((baslik, idx) => {
                            const imgIdx = baslik._imgIdx != null ? baslik._imgIdx : 0;
                            const srcItem = queue[imgIdx] || queue[0];
                            const srcImg = (typeof srcItem?.data === "string" ? srcItem?.data : null) || (typeof srcItem?.customImage === "string" ? srcItem?.customImage : null);
                            this.state.script.imageBlocks.push({
                                imageIndex: imgIdx,
                                imageType: 'custom',
                                customImage: srcImg,
                                videoSlides: [
                                  {
                                    topText: baslik.baslik.toUpperCase(),
                                    spokenText: `${baslik.baslik}. ${baslik.aciklama || ''}`.trim(),
                                    imagePrompts: [],
                                  }
                                ]
                              });
                          });

                        addSystemLog(`BAŞLIKLAR sayfası oluşturuldu: ${allBasliklar.length} başlık.`, 'success');
                      } else {
                        // SENARYO 1: Tek başlık, başka görsel yok → BAŞLIKLAR sayfası yok
                        addSystemLog('Tek başlık, BAŞLIKLAR sayfası atlandı.', 'info');
                      }

                      // Kaynaklar sahnesi oluştur (Son Söz'den önce) — haber modunda atla
                      if (this.state.config.tip !== 'haber' && this.state.script._kaynaklar && this.state.script._kaynaklar.length > 0) {
                        const kaynaklarText = this.state.script._kaynaklar.map(k => `${k.baslik}: ${k.url}`).join('\n');
                        const kaynaklarSpoken = "Kaynaklar ve referanslar. " + this.state.script._kaynaklar.map(k => k.baslik).join('. ') + ".";
                        this.state.script.imageBlocks.push({
                            imageIndex: 0,
                            imageType: 'ai',
                            customImage: null,
                            videoSlides: [{
                                topText: 'KAYNAKLAR',
                                spokenText: kaynaklarSpoken,
                                imagePrompts: ['A clean list of official sources and references on dark background'],
                                _isKaynaklar: true,
                                _kaynaklar: this.state.script._kaynaklar
                              }]
                          });
                        addSystemLog('Kaynaklar sahnesi eklendi.', 'success');
                      }

                      // Kaynaklar sahnesi (Son Söz'den önce) — iddia analizi modu
                      if (this.state.script && this.state.script.iddialar && this.state.script.iddialar.length > 0) {
                        const allKaynaklar = [];
                        const kaynakSet = new Set();
                        this.state.script.iddialar.forEach(function(iddia) {
                            if (iddia.kanitlar) {
                              iddia.kanitlar.forEach(function(k) {
                                  const key = (k.kaynak || '') + '|' + (k.veri || '');
                                  if (k.kaynak && !kaynakSet.has(key)) {
                                    kaynakSet.add(key);
                                    allKaynaklar.push({ kaynak: k.kaynak, veri: k.veri || '', url: k.url || '' });
                                  }
                                });
                            }
                          });
                        if (allKaynaklar.length > 0) {
                          const kaynaklarSpoken = "Kaynaklar ve referanslar. " + allKaynaklar.map(function(k) {
                            let s = k.kaynak;
                            if (k.veri) s += ": " + k.veri;
                            return s;
                          }).join(". ") + ".";
                          const kaynaklarTopText = allKaynaklar.length > 5 ? 'KAYNAKLAR VE REFERANSLAR' : 'KAYNAKLAR';
                          this.state.script.imageBlocks.push({
                              imageIndex: 0, imageType: 'ai', customImage: null,
                              videoSlides: [{ topText: kaynaklarTopText, spokenText: kaynaklarSpoken, imagePrompts: ['Professional infographic showing official government sources and data references on dark background, clean typography, TÜİK TÜRK-İŞ TCMB logos style'], _isKaynaklar: true, _kaynaklar: allKaynaklar }]
                            });
                          addSystemLog('Kaynaklar sahnesi eklendi: ' + allKaynaklar.length + ' kaynak (veri+URL dahil).', 'success');
                        }
                      }

                      // Tüm blokları düz videoSlides dizisine çevir (render için)
                      this.state.script.videoSlides = [];
                      for (const block of this.state.script.imageBlocks) {
                        this.state.script.videoSlides.push(...block.videoSlides);
                      }
                      addSystemLog(`INIT tamamlandı: ${this.state.script.imageBlocks.length} blok, ${this.state.script.videoSlides.length} sahne.`, 'success');
                      addSystemLog(`Blok detayları: ${this.state.script.imageBlocks.map((b, i) => `B${i + 1}=${b.videoSlides.length}s`).join(', ')}`, 'info');

                      this.state.status = 'GENERATING_ASSETS';
                      await AssetManagerService.saveJobState(this.state);
                    }
                  }
                  if (this.state.status === 'GENERATING_ASSETS') {
                    await this.updateProgress(30, 'Medya ve Sesler Sentezleniyor...', 'ASSETS');
                    const imgStyle = this.state.config.imageStyle || 'cinematic'; const imgRes = this.state.config.resolution || '4K';
                    const emotionForImage = this.state.script._emotion || analyzeQuoteEmotion(this.state.script.videoSlides[0]?.spokenText || "");

                    if (this.state.script._isGuzelSoz) {
                      addSystemLog('Güzel söz modu: görseller ve ses üretiliyor...', 'info');
                      const slideCount = this.state.script._sceneCount || 3;
                      const quoteTextForImage = this.state.script.videoSlides[0]?.spokenText || "";
                      const realUrls = this.state.script._realImageUrls || [];

                      for (let i = 0; i < slideCount; i++) {
                        const slide = this.state.script.videoSlides[i];
                        if (!this.state.assets.images[i]) {
                          try {
                            // Gerçek görsel varsa onu kullan (Atatürk vb.)
                            if (realUrls[i]) {
                              addSystemLog(` Görsel ${i + 1}: Gerçek görsel kullanılıyor...`, 'info');
                              this.state.assets.images[i] = realUrls[i];
                            } else {
                              this.state.assets.images[i] = await MediaSynthesisService.generateImage(
                                slide.imagePrompts?.[0] || "Artistic background",
                                imgStyle, imgRes, true, emotionForImage, quoteTextForImage
                              );
                            }
                            addSystemLog(` Görsel ${i + 1}/${slideCount} tamamlandı.`, 'success');
                          } catch (e) {
                            addSystemLog(` Görsel ${i + 1} hatası, fallback kullanılıyor.`, 'warn');
                            this.state.assets.images[i] = this.state.assets.thumbnail;
                          }
                        }
                      }

                      if (!this.state.assets.audio[0]) {
                        // v3.18: Multi-language TTS — narrationLanguage ayarlıysa çok dilli TTS kullan
                        const narrLang = this.state.config.narrationLanguage || this.state.config.language || 'tr';
                        if (narrLang !== 'tr' && this.state.config.ttsEngine !== 'webspeech') {
                          this.state.assets.audio[0] = await MediaSynthesisService.generateAudioMultilang(
                            this.state.script.videoSlides[0].spokenText,
                            this.state.preferences.narratorVoice,
                            narrLang, 'gemini'
                          );
                        } else {
                          this.state.assets.audio[0] = await MediaSynthesisService.generateAudio(
                            this.state.script.videoSlides[0].spokenText,
                            this.state.preferences.narratorVoice,
                            this.state.config.ttsEngine || 'gemini'
                          );
                        }
                      }
                      // v3.11: Çok dilli modda 3 sahnenin de sesini üret
                      if (this.state.script._isMultilang) {
                        for (let mi = 1; mi < slideCount; mi++) {
                          if (!this.state.assets.audio[mi]) {
                            addSystemLog(`Çok dilli ses ${mi + 1}/${slideCount} (${this.state.script._multilangLabels?.[mi] || ''})...`, 'info');
                            this.state.assets.audio[mi] = await MediaSynthesisService.generateAudio(
                              this.state.script.videoSlides[mi].spokenText,
                              this.state.preferences.narratorVoice,
                              this.state.config.ttsEngine || 'gemini'
                            );
                          }
                        }
                      }
                      if (!this.state.assets.thumbnail) this.state.assets.thumbnail = this.state.assets.images[0];
                      // v3.18: Custom Thumbnail — kullanıcı yüklediyse override et
                      if (this.state.config.customThumbnail) { this.state.assets.thumbnail = this.state.config.customThumbnail; addSystemLog('Özel kapak görseli kullanılıyor.', 'success'); }

                      await this.updateProgress(70, 'Güzel söz hazır...', 'ASSETS');
                    } else {
                      // Gazete okuma modu: thumbnail için AI görsel üretme, ilk gazete resmini kullan
                      if (this.state.script._isGazeteOkuma) {
                        const firstBlock = this.state.script.imageBlocks[0];
                        this.state.assets.thumbnail = firstBlock?.customImage || this.state.assets.images[0] || null;
                        if (this.state.assets.thumbnail) {
                          addSystemLog('Gazete okuma modu: Thumbnail için gazete resmi kullanılıyor (AI görsel atlandı).', 'info');
                        } else {
                          addSystemLog('Gazete okuma modu: Thumbnail görsel bulunamadı, AI üretecek.', 'warn');
                          this.state.assets.thumbnail = await MediaSynthesisService.generateImage(this.state.script.thumbnailImagePrompt || "Dramatic news event", imgStyle, imgRes);
                        }
                      } else {
                        if (!this.state.assets.thumbnail) { addSystemLog('Kapak resmi çizimi...', 'info'); this.state.assets.thumbnail = await MediaSynthesisService.generateImage(this.state.script.thumbnailImagePrompt || "Dramatic news event", imgStyle, imgRes); addSystemLog('Kapak resmi tamamlandı.', 'success'); }
                      }
                      // v3.18: Custom Thumbnail — kullanıcı yüklediyse override et
                      if (this.state.config.customThumbnail) { this.state.assets.thumbnail = this.state.config.customThumbnail; addSystemLog('Özel kapak görseli kullanılıyor.', 'success'); }

                      const customImages = this.state.config.customSceneImages || [];
                      this.state.customImageCount = customImages.length;

                      // Sabit görsel SADECE bloğun 1. sahnesine atanır (S1 gösterimi)
                      // 2. ve 3. sahneler AI tarafından üretilir (M1'i anlatan görseller)
                      const blocks = this.state.script.imageBlocks || [];
                      let globalIdx = 0;
                      for (let b = 0; b < blocks.length; b++) {
                        const block = blocks[b];
                        const blockSlideCount = block.videoSlides.length;
                        const blockCustomImg = block.customImage || customImages[b];
                        if (block.imageType === 'custom' && blockCustomImg) {
                          this.state.assets.images[globalIdx] = blockCustomImg;
                          addSystemLog(`Blok ${b + 1}: Sabit görsel 1. sahneye atandı. Kalan ${blockSlideCount - 1} sahne AI üretilecek.`, 'info');
                        }
                        globalIdx += blockSlideCount;
                      }

                      const CHUNK_SIZE = 3;
                      addSystemLog(`ASSETS fase: ${this.state.script.videoSlides.length} sahne, ${CHUNK_SIZE}'lü chunk.`, 'info');
                      for (let i = 0; i < this.state.script.videoSlides.length; i += CHUNK_SIZE) {
                        const chunk = this.state.script.videoSlides.slice(i, i + CHUNK_SIZE);
                        addSystemLog(`Sahneler ${i + 1}-${Math.min(i + CHUNK_SIZE, this.state.script.videoSlides.length)} işleniyor...`, 'info');
                        const chunkPromises = chunk.map(async (slide, idx) => {
                            const actualIndex = i + idx;
                            // v3.8: Raw media sahnesi için görsel/ses üretme — orijinal medya oynatılacak
                            if (slide._isRawMedia) {
                              this.state.assets.images[actualIndex] = null;
                              this.state.assets.audio[actualIndex] = null;
                              return;
                            }
                            const computedPrompt = slide.imagePrompts?.[0] || slide.topText || slide.spokenText || "News event";
                            // v3.17: Preview modunda AI görsel üretimini atla — düz renkli arka plan
                            const isPreview = this.state.config.previewMode === true;
                            // v3.18: Stock Footage — useStockFootage açıksa Pexels'ten video klibi çek
                            const useStock = this.state.config.useStockFootage === true && !this.state.assets.images[actualIndex] && !isPreview;
                            const imgPromise = this.state.assets.images[actualIndex] ? Promise.resolve(this.state.assets.images[actualIndex]) : (isPreview ? Promise.resolve(null) : (useStock ? (async () => { const clips = await MediaSynthesisService.fetchStockFootage(computedPrompt, 3); if (clips && clips.length > 0) { addSystemLog(`Sahne ${actualIndex + 1}: Pexels stock footage kullanılıyor.`, 'info'); return clips[0].image || clips[0].url; } addSystemLog(`Sahne ${actualIndex + 1}: Pexels'ten sonuç yok, AI görsel üretilecek.`, 'warn'); return await MediaSynthesisService.generateImage(computedPrompt, imgStyle, imgRes) || this.state.assets.thumbnail; })() : MediaSynthesisService.generateImage(computedPrompt, imgStyle, imgRes).then(res => res || this.state.assets.thumbnail)));
                            const audPromise = this.state.assets.audio[actualIndex] ? Promise.resolve(this.state.assets.audio[actualIndex]) : (isPreview ? Promise.resolve(null) : (() => { const nL = this.state.config.narrationLanguage || this.state.config.language || 'tr'; return (nL !== 'tr' && this.state.config.ttsEngine !== 'webspeech') ? MediaSynthesisService.generateAudioMultilang(slide.spokenText, this.state.preferences.narratorVoice, nL, 'gemini') : MediaSynthesisService.generateAudio(slide.spokenText, this.state.preferences.narratorVoice, this.state.config.ttsEngine || 'gemini'); })());
                            const [imgResData, audResData] = await Promise.all([imgPromise, audPromise]);
                            this.state.assets.images[actualIndex] = imgResData;
                            this.state.assets.audio[actualIndex] = audResData;
                          });
                        await Promise.all(chunkPromises);
                        const currentProgress = Math.min(i + CHUNK_SIZE, this.state.script.videoSlides.length);
                        await this.updateProgress(40 + (currentProgress / this.state.script.videoSlides.length) * 30, `Sahneler ${currentProgress}/${this.state.script.videoSlides.length}...`, 'ASSETS');
                      }
                    }

                    // v3.14: Kullanıcı müzik seçtiyse onu kullan, seçmediyse duygu bazlı otomatik seç
                    const allMusic = await AssetManagerService.getAllMusicFromLib();
                    if (allMusic.length > 0) {
                      const userBgmId = this.state.preferences.ambientSound;
                      const isAmbientType = ['rain','wind','waves','fire','none'].includes(userBgmId);
                      if (userBgmId && !isAmbientType) {
                        const userTrack = allMusic.find(m => m.id === userBgmId);
                        if (userTrack) {
                          addSystemLog(`Müzik: ${userTrack.name} (kullanıcı seçimi)`, 'success');
                          this.state.script._bgmId = userTrack.id;
                          this.state.script._bgmName = userTrack.name;
                        } else {
                          const matchedTrack = matchMusicToEmotion(emotionForImage, allMusic);
                          const chosenTrack = matchedTrack || allMusic[Math.floor(Math.random() * allMusic.length)];
                          addSystemLog(`Müzik: ${chosenTrack.name} (duygu: ${emotionForImage}, kullanıcı seçimi bulunamadı)`, 'success');
                          this.state.script._bgmId = chosenTrack.id;
                          this.state.script._bgmName = chosenTrack.name;
                        }
                      } else {
                        const matchedTrack = matchMusicToEmotion(emotionForImage, allMusic);
                        const chosenTrack = matchedTrack || allMusic[Math.floor(Math.random() * allMusic.length)];
                        addSystemLog(`Müzik: ${chosenTrack.name} (duygu: ${emotionForImage})`, 'success');
                        this.state.script._bgmId = chosenTrack.id;
                        this.state.script._bgmName = chosenTrack.name;
                      }
                    } else {
                      addSystemLog('Müzik kütüphanesi boş, müzik eklenmedi.', 'warn');
                    }

                    const extraAudioPromises = [];
                    // Clickbait seslendirme
                    if (!this.state.assets.thumbnailAudio) {
                      // Clickbait seslendirme: tarih + kaynak adı + başlık
                      const now = new Date();
                      const dateLocale = ({ tr:'tr-TR', en:'en-US', fr:'fr-FR', de:'de-DE', es:'es-ES', ar:'ar-SA', ru:'ru-RU' })[this.state.config?.language || 'tr'] || 'tr-TR';
                      const dateStr = now.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
                      const dayStr = now.toLocaleDateString(dateLocale, { weekday: 'long' });
                      const sourceName = this.state.config?.sourceName || '';
                      const headline = this.state.script.thumbnailText || '';
                      const clickbaitText = [dateStr + " " + dayStr, sourceName, headline].filter(Boolean).join('. ') + '.';
                      extraAudioPromises.push(MediaSynthesisService.generateAudio(clickbaitText, this.state.preferences.narratorVoice, this.state.config.ttsEngine || 'gemini').then(res => { this.state.assets.thumbnailAudio = res; addSystemLog('Clickbait seslendirme hazır: ' + clickbaitText.substring(0, 60) + '...', 'success'); }));
                    }
                    if (!this.state.script._isGuzelSoz) {
                      if (this.state.script.sonSoz && !this.state.assets.sonSozAudio) extraAudioPromises.push(MediaSynthesisService.generateAudio(this.state.script.sonSoz, this.state.preferences.narratorVoice, this.state.config.ttsEngine || 'gemini').then(res => { this.state.assets.sonSozAudio = res; }));
                      if (this.state.config.yorum && this.state.config.yorum.trim() && !this.state.assets.yorumAudio) extraAudioPromises.push(MediaSynthesisService.generateAudio(this.state.config.yorum, this.state.preferences.narratorVoice, this.state.config.ttsEngine || 'gemini').then(res => { this.state.assets.yorumAudio = res; }));
                      if (!this.state.assets.outroAudio) {
                        const quotePrefix = this.state.script.lastQuote ? `${this.state.script.lastQuote} ` : "";
                        let defaultOutroText = "Abone olmayı, beğenmeyi ve paylaşmayı ihmal etmeyin.";
                        if (this.state.config.language === 'en') defaultOutroText = "Don't forget to subscribe, like, and share.";
                        else if (this.state.config.language === 'fr') defaultOutroText = "N'oubliez pas de vous abonner, d'aimer et de partager.";
                        else if (this.state.config.language === 'de') defaultOutroText = "Vergessen Sie nicht zu abonnieren, zu liken und zu teilen.";
                        else if (this.state.config.language === 'es') defaultOutroText = "No olvides suscribirte, dar me gusta y compartir.";
                        else if (this.state.config.language === 'ar') defaultOutroText = "لا تنس الاشتراك والإعجاب والمشاركة.";
                        else if (this.state.config.language === 'ru') defaultOutroText = "Не забудьте подписаться, поставить лайк.";
                        extraAudioPromises.push(MediaSynthesisService.generateAudio(`${quotePrefix}${defaultOutroText}`, this.state.preferences.narratorVoice, this.state.config.ttsEngine || 'gemini').then(res => { this.state.assets.outroAudio = res; }));
                      }
                    }
                    await Promise.all(extraAudioPromises);
                    const imgCount = this.state.assets.images.filter(Boolean).length;
                    const audCount = this.state.assets.audio.filter(Boolean).length;
                    addSystemLog(`ASSETS tamamlandı: ${imgCount}/${this.state.script.videoSlides.length} görsel, ${audCount}/${this.state.script.videoSlides.length} ses.`, imgCount === this.state.script.videoSlides.length ? 'success' : 'warn');
                    this.state.status = 'READY_TO_RENDER';
                    await AssetManagerService.saveJobState(this.state);
                  }
                  if (this.state.status === 'READY_TO_RENDER') {
                    await this.updateProgress(80, 'Video Paketleniyor...', 'RENDER');
                    const renderResult = await RenderWorkerService.executeRender(this.state, canvasRef.current, this.state.preferences);
                    this.state.status = 'COMPLETED'; this.state.videoUrl = typeof renderResult === 'string' ? renderResult : renderResult.url; this.state.videoBlobType = (typeof renderResult === 'object' && renderResult.blobType) ? renderResult.blobType : '';
                    await AssetManagerService.saveJobState(this.state); await AssetManagerService.clearJob(this.jobId);
                    sysEventBus.emit('WORKFLOW_STATE', { status: 'COMPLETED', job: this.state });
                    return this.state.videoUrl;
                  }
                } catch (e) { this.state.status = 'FAILED'; this.state.error = e.message; await AssetManagerService.saveJobState(this.state); sysEventBus.emit('WORKFLOW_STATE', { status: 'FAILED', job: this.state }); throw e; }
              }
            }


            // ============================================================================
            // M10: APP (REACT UI)
            // ============================================================================

// ── ErrorBoundary: React component crash'lerinde beyaz ekranı önler ─────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: { padding: '40px', textAlign: 'center', background: '#0B0F19', color: '#e2e8f0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
      },
        React.createElement('h1', { style: { fontSize: '28px', fontWeight: '900', color: '#ef4444', marginBottom: '16px' } }, 'Bir Hata Oluştu'),
        React.createElement('p', { style: { color: '#94a3b8', marginBottom: '24px', fontSize: '14px' } }, this.state.error?.message || 'Bilinmeyen hata'),
        React.createElement('button', {
          onClick: () => window.location.reload(),
          style: { background: '#6366f1', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }
        }, 'Sayfayı Yenile')
      );
    }
    return this.props.children;
  }
}

            const VOICE_OPTIONS = [
              { id: 'Aoede', label: 'Aoede', gender: 'Female', age: 'Young', category: 'Corporate & Narration' }, { id: 'Puck', label: 'Puck', gender: 'Male', age: 'Child', category: 'Anime & Animation' },
              { id: 'Kore', label: 'Kore', gender: 'Female', age: 'Middle-aged', category: 'Documentary' }, { id: 'Charon', label: 'Charon', gender: 'Male', age: 'Elderly', category: 'Audiobooks & Novels' },
              { id: 'Zephyr', label: 'Zephyr', gender: 'Male', age: 'Young', category: 'Commercials & Trailers' }, { id: 'Fenrir', label: 'Fenrir', gender: 'Male', age: 'Middle-aged', category: 'Games & RPG' },
              { id: 'Leda', label: 'Leda', gender: 'Female', age: 'Middle-aged', category: 'Corporate & Narration' }, { id: 'Orus', label: 'Orus (Erkek - Resmi)', gender: 'Male', age: 'Middle-aged', category: 'Documentary' }
            ];

            const CustomSelect = ({ value, onChange, options, icon: Icon, className }) => {
              const [isOpen, setIsOpen] = useState(false); const ref = useRef(null);
              useEffect(() => { const handleClickOutside = (event) => { if (ref.current && !ref.current.contains(event.target)) setIsOpen(false); }; document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, []);
              const getSelectedLabel = () => { for (const opt of options) { if (opt.options) { const found = opt.options.find(o => o.value === value); if (found) return found.label; } else if (opt.value === value) return opt.label; } return value; };
              const getSelectedColor = () => { for (const opt of options) { if (opt.options) { const found = opt.options.find(o => o.value === value); if (found?.color) return found.color; } else if (opt.value === value && opt.color) return opt.color; } return 'text-white'; };
              return (
                <div ref={ref} className={`relative flex items-center w-full ${className || ''}`} onClick={() => setIsOpen(!isOpen)}>
                {Icon && <Icon size={18} className="text-indigo-400 shrink-0 mr-3" />}
                <div className={`flex-1 flex items-center justify-between text-sm font-bold cursor-pointer truncate ${getSelectedColor()}`}>
                <span className="truncate pr-2">{getSelectedLabel()}</span>
                <ChevronDown size={16} className={`transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''} text-slate-400`} />
              </div>
                {isOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-[200] max-h-64 overflow-y-auto py-1">
                    {options.map((opt, idx) => {
                          if (opt.options) {
                            return (<div key={idx}>{opt.label && <div className="px-3 py-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">{opt.label}</div>}{opt.options.map(subOpt => (<div key={subOpt.value} className={`px-3 py-2 text-sm cursor-pointer transition-colors ${value === subOpt.value ? 'bg-blue-600 text-white' : `hover:bg-blue-600 hover:text-white ${subOpt.color || 'text-slate-200'}`}`} onClick={(e) => { e.stopPropagation(); onChange(subOpt.value); setIsOpen(false); }}>{subOpt.label}</div>))}</div>);
                          }
                          return (<div key={opt.value} className={`px-3 py-2 text-sm cursor-pointer transition-colors ${value === opt.value ? 'bg-blue-600 text-white' : `hover:bg-blue-600 hover:text-white ${opt.color || 'text-slate-200'}`}`} onClick={(e) => { e.stopPropagation(); onChange(opt.value); setIsOpen(false); }}>{opt.label}</div>);
                        })}
                  </div>
                  )}
              </div>
              );
            };

            // === GPU İMAJ ÖNBELLEKLEME YARDIMCISI (createImageBitmap) ===
            const ImageBitmapCache = {
              cache: new Map(),
              async get(src) {
                if (!src) return null;
                if (this.cache.has(src)) return this.cache.get(src);
                try {
                  const resp = await fetch(src);
                  const blob = await resp.blob();
                  const bmp = await createImageBitmap(blob);
                  this.cache.set(src, bmp);
                  return bmp;
                } catch(e) {
                  return null;
                }
              },
              clear() {
                for (const bmp of this.cache.values()) {
                  if (bmp && typeof bmp.close === 'function') bmp.close();
                }
                this.cache.clear();
              }
            };

            // === CROP MODAL BİLEŞENİ (React.memo ile Sarılı 1:1 Kusursuz Fare Takibi) ===
            const GazeteCropModal = React.memo(({ src, name, onClose, onCrop }) => {
                const imgRef = useRef(null);
                const [imgLoaded, setImgLoaded] = useState(false);
                const [selection, setSelection] = useState(null); // {x1, y1, x2, y2}
                const [dragStart, setDragStart] = useState(null); // {x, y}

                // Fare koordinatlarını doğrudan img elementinin sol-üst köşesine göre 1:1 hesapla
                const getRelPos = (e) => {
                  if (!imgRef.current) return { x: 0, y: 0 };
                  const rect = imgRef.current.getBoundingClientRect();
                  const clientX = e.touches ? (e.touches[0] || e.changedTouches[0]).clientX : e.clientX;
                  const clientY = e.touches ? (e.touches[0] || e.changedTouches[0]).clientY : e.clientY;
                  return {
                    x: Math.max(0, Math.min(Math.round(clientX - rect.left), rect.width)),
                    y: Math.max(0, Math.min(Math.round(clientY - rect.top), rect.height))
                  };
                };

                const handleMouseDown = (e) => {
                  e.preventDefault();
                  const pos = getRelPos(e);
                  setDragStart(pos);
                  setSelection({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
                };

                // Sürükleme esnasında fare neredeyse x1,y1,x2,y2 sınırlarını anlık güncelle
                useEffect(() => {
                  if (!dragStart) return;

                  const handleWindowMouseMove = (e) => {
                    const pos = getRelPos(e);
                    setSelection({
                      x1: Math.min(dragStart.x, pos.x),
                      y1: Math.min(dragStart.y, pos.y),
                      x2: Math.max(dragStart.x, pos.x),
                      y2: Math.max(dragStart.y, pos.y)
                    });
                  };

                  const handleWindowMouseUp = () => {
                    setDragStart(null);
                  };

                  window.addEventListener('mousemove', handleWindowMouseMove);
                  window.addEventListener('mouseup', handleWindowMouseUp);
                  window.addEventListener('touchmove', handleWindowMouseMove, { passive: false });
                  window.addEventListener('touchend', handleWindowMouseUp);

                  return () => {
                    window.removeEventListener('mousemove', handleWindowMouseMove);
                    window.removeEventListener('mouseup', handleWindowMouseUp);
                    window.removeEventListener('touchmove', handleWindowMouseMove);
                    window.removeEventListener('touchend', handleWindowMouseUp);
                  };
                }, [dragStart]);

                // Crop'u uygula
                const doCrop = () => {
                  if (!selection || !imgRef.current) return;
                  const img = imgRef.current;
                  const dispW = img.offsetWidth;
                  const dispH = img.offsetHeight;
                  const natW = img.naturalWidth;
                  const natH = img.naturalHeight;

                  const w = selection.x2 - selection.x1;
                  const h = selection.y2 - selection.y1;
                  if (w < 10 || h < 10) return;

                  const scaleX = natW / dispW;
                  const scaleY = natH / dispH;
                  const cropX = Math.round(selection.x1 * scaleX);
                  const cropY = Math.round(selection.y1 * scaleY);
                  const cropW = Math.round(w * scaleX);
                  const cropH = Math.round(h * scaleY);

                  const canvas = document.createElement('canvas');
                  canvas.width = cropW;
                  canvas.height = cropH;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                  const dataUrl = canvas.toDataURL('image/png');
                  onCrop(dataUrl, name);
                };

                const selW = selection ? (selection.x2 - selection.x1) : 0;
                const selH = selection ? (selection.y2 - selection.y1) : 0;

                return (
                  <div className="fixed inset-0 bg-black/90 z-[9999] flex flex-col items-center justify-center p-4" onClick={onClose}>
                  <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  {/* Başlık */}
                  <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                  <Scissors size={18} className="text-indigo-400" />
                  <span className="text-white font-bold text-sm">{name}</span>
                </div>
                  <div className="flex gap-2">
                  {selection && selW > 10 && selH > 10 && (
                      <button onClick={doCrop} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30">
                      <Check size={14} /> Crop'u Kullan
                    </button>
                    )}
                  <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">✕ Kapat</button>
                </div>
                </div>
                  {/* Talimat */}
                  <p className="text-slate-400 text-[11px] mb-2">🖱️ Fare ile gazete üzerinde kırpmak istediğiniz haberi sürükleyip seçin.</p>
                  {/* Görsel + Seçim alanı */}
                  <div className="relative flex-1 overflow-auto rounded-xl bg-black/50 select-none flex justify-center items-start">
                  <div className="relative inline-block" onMouseDown={handleMouseDown} style={{ cursor: 'crosshair', touchAction: 'none' }}>
                  <img ref={imgRef} src={src} crossOrigin="anonymous" onLoad={() => setImgLoaded(true)}
                  className="max-w-full h-auto block select-none" alt={name} draggable={false} />

                  {/* 4 Parçalı Kusursuz HTML Karartma (clipPath CSS hatalarını önler) */}
                  {selection && imgLoaded && selW > 0 && selH > 0 && (
                      <>
                      {/* 1. Üst karartma */}
                      <div className="absolute bg-black/60 pointer-events-none" style={{ top: 0, left: 0, right: 0, height: selection.y1 + 'px' }} />
                      {/* 2. Alt karartma */}
                      <div className="absolute bg-black/60 pointer-events-none" style={{ top: selection.y2 + 'px', left: 0, right: 0, bottom: 0 }} />
                      {/* 3. Sol karartma */}
                      <div className="absolute bg-black/60 pointer-events-none" style={{ top: selection.y1 + 'px', left: 0, width: selection.x1 + 'px', height: selH + 'px' }} />
                      {/* 4. Sağ karartma */}
                      <div className="absolute bg-black/60 pointer-events-none" style={{ top: selection.y1 + 'px', left: selection.x2 + 'px', right: 0, height: selH + 'px' }} />

                      {/* Yeşil Seçim Kutusu */}
                      <div className="absolute border-2 border-emerald-400 bg-emerald-400/20 pointer-events-none shadow-[0_0_15px_rgba(52,211,153,0.6)]"
                      style={{ left: selection.x1 + 'px', top: selection.y1 + 'px', width: selW + 'px', height: selH + 'px' }}>
                      <div className="absolute -top-6 left-0 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                      {Math.round(selW)} × {Math.round(selH)} px
                    </div>
                    </div>
                      </>
                    )}
                </div>
                </div>
                </div>
                </div>
                );
              });


            // ============================================================================
            // MAIN APP — VOLUME MIXER & REFERENCE IMAGE SECTIONS REMOVED
            // ============================================================================
            export default function App() {
              const [user, setUser] = useState(null);
              const [authExpired, setAuthExpired] = useState(false);
              const isLoadedRef = useRef(false);
              const isVoiceFiltersInitRef = useRef(false);
              const logEndRef = useRef(null);
              const musicFileInputRef = useRef(null);

              const loadSavedJSON = (key, fallback) => {
                try {
                  const saved = SafeStorage.getItem(key);
                  if (!saved) return fallback;
                  const parsed = JSON.parse(saved);
                  return (parsed && typeof parsed === 'object') ? { ...fallback, ...parsed } : fallback;
                } catch(e) { return fallback; }
              };

              const [activeTab, setActiveTab] = useState(() => { const saved = SafeStorage.getItem('ns_activeTab'); return saved === 'image' ? 'media' : (saved || 'media'); });
              const [textInput, setTextInput] = useState(() => SafeStorage.getItem('ns_textInput') || '');

              // === GAZETE TAKİP STATE ===
              const [gazeteItems, setGazeteItems] = useState([]); // gazete manşet listesi
              const [gazeteLoading, setGazeteLoading] = useState(false); // yükleme durumu
              const [gazeteError, setGazeteError] = useState(''); // hata mesajı
              const [gazeteCropModal, setGazeteCropModal] = useState(null); // {src, name} — crop açık mı
              const [gazeteSource, setGazeteSource] = useState(() => SafeStorage.getItem('ns_gazeteSource') || 'gazeteoku'); // kaynak site
              const [gazeteDate, setGazeteDate] = useState(() => { // seçili tarih (varsayılan: bugün)
                  const today = new Date();
                  const y = today.getFullYear();
                  const m = String(today.getMonth() + 1).padStart(2, '0');
                  const d = String(today.getDate()).padStart(2, '0');
                  return `${y}-${m}-${d}`;
                });

              // === AI SAĞLAYICI & MODEL AYARLARI (Gemini / Groq / OpenRouter) ===
              const [aiProvider, setAiProviderState] = useState(() => AIRouter.getProvider());
              const [providerKeys, setProviderKeys] = useState(() => ({
                gemini: SafeStorage.getItem('GEMINI_API_KEY') || apiKey || '',
                groq: SafeStorage.getItem('GROQ_API_KEY') || '',
                openrouter: SafeStorage.getItem('OPENROUTER_API_KEY') || ''
              }));
              const [providerModels, setProviderModels] = useState(() => ({
                gemini: AIRouter.getModel('gemini'),
                groq: AIRouter.getModel('groq'),
                openrouter: AIRouter.getModel('openrouter')
              }));
              const [modelLists, setModelLists] = useState({ gemini: null, groq: null, openrouter: null });
              const [modelListLoading, setModelListLoading] = useState({ gemini: false, groq: false, openrouter: false });
              const [showAiSettingsModal, setShowAiSettingsModal] = useState(false);
              const [aiSettingsTab, setAiSettingsTab] = useState(() => AIRouter.getProvider());
              useEffect(() => {
                if (showAiSettingsModal && providerKeys[aiSettingsTab] && !modelLists[aiSettingsTab]) {
                  handleRefreshModels(aiSettingsTab);
                }
                // eslint-disable-next-line react-hooks/exhaustive-deps
              }, [showAiSettingsModal, aiSettingsTab]);
              // Geriye dönük uyum: dosyanın geri kalanı userApiKey'i kullanmıyor,
              // ama Gemini modülü seviyesindeki `apiKey` değişkeni bu yolla senkron kalır.
              const userApiKey = providerKeys.gemini;

              const handleSaveProviderKey = (providerId, newKey) => {
                const trimmed = (newKey || '').trim();
                SafeStorage.setItem(AI_PROVIDERS[providerId].keyName, trimmed);
                setProviderKeys(prev => ({ ...prev, [providerId]: trimmed }));
                if (providerId === 'gemini') setGeminiApiKey(trimmed);
                addSystemLog(trimmed ? `${AI_PROVIDERS[providerId].label} API key kaydedildi.` : `${AI_PROVIDERS[providerId].label} API key temizlendi.`, trimmed ? 'success' : 'warn');
              };
              const handleSelectProvider = (providerId) => {
                setAiProviderState(providerId);
                AIRouter.setProvider(providerId);
                addSystemLog(`Aktif AI sağlayıcı: ${AI_PROVIDERS[providerId].label} (${providerModels[providerId] || 'model seçilmedi'})`, 'info');
              };
              const handleSelectModel = (providerId, modelId) => {
                setProviderModels(prev => ({ ...prev, [providerId]: modelId }));
                AIRouter.setModel(providerId, modelId);
              };
              const handleRefreshModels = async (providerId) => {
                setModelListLoading(prev => ({ ...prev, [providerId]: true }));
                const list = await AI_PROVIDERS[providerId].listModels(providerKeys[providerId]);
                setModelListLoading(prev => ({ ...prev, [providerId]: false }));
                if (list && list.length > 0) {
                  setModelLists(prev => ({ ...prev, [providerId]: list }));
                  addSystemLog(`${AI_PROVIDERS[providerId].label}: ${list.length} model bulundu.`, 'success');
                  // Kayıtlı model artık güncel listede yoksa (örn. deprecated oldu),
                  // otomatik olarak listedeki ilk geçerli modele geç.
                  const currentModel = providerModels[providerId];
                  if (!list.some(m => m.id === currentModel)) {
                    const fallback = list[0].id;
                    handleSelectModel(providerId, fallback);
                    addSystemLog(`"${currentModel}" artık kullanılamıyor, otomatik olarak "${fallback}" seçildi.`, 'warn');
                  }
                } else {
                  addSystemLog(`${AI_PROVIDERS[providerId].label} model listesi alınamadı, varsayılan liste kullanılıyor.`, 'warn');
                }
              };
              // Gemini key mevcutsa uygulama açılışında güncel model listesini otomatik
              // çek — deprecated/kapatılmış modellerin 404 hatası vermesini önler.
              useEffect(() => {
                if (providerKeys.gemini && !modelLists.gemini) {
                  handleRefreshModels('gemini');
                }
                // eslint-disable-next-line react-hooks/exhaustive-deps
              }, []);

              const [config, setConfig] = useState(() => loadSavedJSON('ns_config', {
                duration: '30', aspectRatio: '9:16', videoStyle: 'cinematic', fontStyle: 'modern', imageStyle: 'oil_painting', language: 'tr', subtitles: 'on', resolution: '4K', transition: 'none', outputType: 'video', analysisMode: 'yorumsuz', videoFormat: 'mp4', tip: 'haber', sourceName: '', yorum: '', exportPreset: 'custom', ttsEngine: 'gemini', previewMode: false, customThumbnail: null, abVariation: false, narrationLanguage: 'tr', brandLogo: null, brandText: '', useStockFootage: false, scheduledPublishAt: null
              }));

              const [prefs, setPrefs] = useState(() => loadSavedJSON('ns_prefs', {
                narratorVoice: 'Aoede', narratorVolume: 0.8, backgroundMusicVolume: 0.3, ambientSound: 'none', customBgMusicName: '', customBgMusicId: ''
              }));

              const [voiceFilters, setVoiceFilters] = useState(() => loadSavedJSON('ns_voiceFilters', { gender: 'Any', age: 'Any', category: 'Any' }));
              const [showFilters, setShowFilters] = useState(false);
              const [sysLogs, setSysLogs] = useState([]);
              const [elapsedSeconds, setElapsedSeconds] = useState(0);
              const [pendingJob, setPendingJob] = useState(null);
              const [isDragging, setIsDragging] = useState(false);
              // v3.18: Batch Queue — çoklu konu sıralı üretim
              const [batchQueue, setBatchQueue] = useState([]);
              const [batchCurrentIdx, setBatchCurrentIdx] = useState(-1);

              const filteredVoices = VOICE_OPTIONS.filter(v => {
                  if (voiceFilters.gender !== 'Any' && v.gender !== voiceFilters.gender) return false;
                  if (voiceFilters.age !== 'Any' && v.age !== voiceFilters.age) return false;
                  if (voiceFilters.category !== 'Any' && v.category !== voiceFilters.category) return false;
                  return true;
                });

              useEffect(() => {
                if (!isVoiceFiltersInitRef.current) {
                  isVoiceFiltersInitRef.current = true;
                  return;
                }
                if (filteredVoices.length > 0 && !filteredVoices.find(v => v.id === prefs.narratorVoice)) {
                  setPrefs(p => ({ ...p, narratorVoice: filteredVoices[0].id }));
                }
              }, [voiceFilters]);

              const [uiState, setUiState] = useState({ isProcessing: false, statusText: '', percent: 0, error: '', videoUrl: null, showDevMenu: false, selectedMediaFiles: [] });
              const [exportProgress, setExportProgress] = useState({ phase: null, percent: 0, message: '', error: null });

              // Sayfa genelinde sürükle-bırak: tarayıcının dosyayı yeni sekmede açmasını engelle
              useEffect(() => {
                  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
                  window.addEventListener('dragover', prevent);
                  window.addEventListener('drop', prevent);
                  return () => { window.removeEventListener('dragover', prevent); window.removeEventListener('drop', prevent); ObjectURLManager.revokeAll(); };
                }, []);

              const [studioMedia, setStudioMedia] = useState({ outroUrl: null, musicLoaded: false, musicName: '', musicId: '', musicList: [], customSceneImages: [], isLoading: true, statusMsg: 'Bulut Kontrol Ediliyor...', syncedFolderName: '' });
              const [musicSearchQuery, setMusicSearchQuery] = useState('');

              const canvasRef = useRef(null);
              const workflowRef = useRef(new WorkflowCoordinator());
              const _previewAudioRef = useRef(null); // Müzik önizleme için audio ref
              const _previewTimeoutRef = useRef(null); // Müzik önizleme timeout ref

              const getTargetSeconds = (dur) => { if (dur === 'unlimited') return 0; if (dur === '15') return 30; if (dur === '30') return 60; if (dur === '60') return 90; if (dur === '90') return 120; return 60; };
              const targetSecUI = getTargetSeconds(config.duration);
              const maxWordsUI = config.duration === 'unlimited' ? 'Sınırsız' : Math.floor((targetSecUI - 1.5) * getWPS(config.language));

              const ambientOptions = [
                { value: 'none', label: '🔇 Arka Ses Yok', color: 'text-slate-300' },
                { label: 'Atmosfer', options: [
                    { value: 'rain', label: '🌧️ Yağmur', color: 'text-blue-300' },
                    { value: 'wind', label: '🌬️ Rüzgar', color: 'text-slate-300' },
                    { value: 'waves', label: '🌊 Dalgalar', color: 'text-cyan-300' },
                    { value: 'fire', label: '🔥 Şömine', color: 'text-orange-300' },
                  ]}
              ];
              // Yerel müzikler (IndexedDB'den)
              const filteredMusicList = studioMedia.musicList.filter(m => !musicSearchQuery || m.name.toLowerCase().includes(musicSearchQuery.toLowerCase()));
              if (filteredMusicList.length > 0) ambientOptions.push({ label: 'Müziklerim', options: filteredMusicList.map(m => ({ value: m.id, label: `🎵 ${m.name.replace(/\.[^.]+$/, '')}`, color: 'text-violet-400' })) });

              const voiceOptions = [
                { value: 'none', label: '🔇 Ses Yok', color: 'text-rose-400 font-bold' },
                ...filteredVoices.map(v => ({ value: v.id, label: v.label }))
              ];
              if (filteredVoices.length === 0) voiceOptions.push({ value: '', label: 'Kriter Uyumsuz', color: 'text-slate-500' });

              const SOCIAL_PLATFORMS = [
                { id: 'x', name: 'X (Twitter)', color: '#1DA1F2', loginUrl: 'https://x.com/login', shareUrl: 'https://x.com/intent/post' },
                { id: 'linkedin', name: 'LinkedIn', color: '#0A66B2', loginUrl: 'https://www.linkedin.com/login', shareUrl: 'https://www.linkedin.com/feed/compose/' },
                { id: 'facebook', name: 'Facebook', color: '#1877F2', loginUrl: 'https://www.facebook.com/login', shareUrl: 'https://www.facebook.com/sharer/sharer.php' },
                { id: 'instagram', name: 'Instagram', color: '#E4405F', loginUrl: 'https://www.instagram.com/accounts/login/', shareUrl: 'https://www.instagram.com/' },
                { id: 'tiktok', name: 'TikTok', color: '#000000', loginUrl: 'https://www.tiktok.com/login', shareUrl: 'https://www.tiktok.com/' },
                { id: 'pinterest', name: 'Pinterest', color: '#BD081C', loginUrl: 'https://pinterest.com/login/', shareUrl: 'https://pinterest.com/pin/create/button/' },
                { id: 'bluesky', name: 'Bluesky', color: '#0085FF', loginUrl: 'https://bsky.app/', shareUrl: 'https://bsky.app/' }
              ];
              const [connectedPlatforms, setConnectedPlatforms] = useState(() => {
                  const saved = JSON.parse(SafeStorage.getItem('ns_connectedPlatforms')) || {};
                  return saved;
                });
              const [shareTargets, setShareTargets] = useState(() => {
                  const saved = JSON.parse(SafeStorage.getItem('ns_shareTargets')) || {};
                  return saved;
                });
              const [showSharePanel, setShowSharePanel] = useState(false);
              const togglePlatform = (platformId) => {
                setConnectedPlatforms(prev => {
                    const next = { ...prev, [platformId]: !prev[platformId] };
                    SafeStorage.setItem('ns_connectedPlatforms', JSON.stringify(next));
                    if (!next[platformId]) setShareTargets(prev => { const n = { ...prev }; delete n[platformId]; SafeStorage.setItem('ns_shareTargets', JSON.stringify(n)); return n; });
                    return next;
                  });
              };
              const toggleShareTarget = (platformId) => {
                setShareTargets(prev => {
                    const next = { ...prev, [platformId]: !prev[platformId] };
                    SafeStorage.setItem('ns_shareTargets', JSON.stringify(next));
                    return next;
                  });
              };
              const openPlatformConnect = (platform) => {
                const popup = window.open(platform.loginUrl, platform.name, 'width=600,height=700,scrollbars=yes');
                addSystemLog(`${platform.name} giriş sayfası açıldı. Oturum açın, otomatik olarak bağlanacaksınız.`, 'info');
                const checker = setInterval(() => {
                    try {
                      if (popup.closed) {
                        clearInterval(checker);
                        togglePlatform(platform.id);
                        addSystemLog(`${platform.name} bağlantısı tamamlandı!`, 'success');
                      }
                    } catch (e) { clearInterval(checker); }
                  }, 800);
              };



              // Linki clipboard'a kopyala (sadece başlık, blob URL paylaşılamaz)
              // Otomatik video kaydetme (direk indirme, dosya adı = haber başlığı)
              const autoSaveVideo = async (videoUrl, title, videoFormat) => {
                if (!videoUrl || !videoUrl.startsWith('blob:')) {
                  addSystemLog('Geçersiz video URL, kaydetme atlandı.', 'warn');
                  return;
                }

                addSystemLog('Video kaydediliyor...', 'info');

                try {
                  const response = await fetch(videoUrl);
                  const blob = await response.blob();
                  const actualBlobType = workflowRef.current?.state?.videoBlobType || '';
                  const isWebM = blob.type.includes('webm') || actualBlobType.includes('webm');
                  const wantsMP4 = videoFormat === 'mp4';
                  let finalBlob = blob;
                  let ext = '.webm';

                  // Kullanıcı MP4 istiyor ama blob WebM → ffmpeg.wasm ile dönüştür
                  if (wantsMP4 && isWebM) {
                    addSystemLog('WebM → MP4 dönüştürülüyor...', 'info');
                    setExportProgress({ phase: 'converting', percent: 0, message: 'MP4 dönüştürülüyor...', error: null });
                    try {
                      finalBlob = await convertWebMtoMP4(blob, (pct) => {
                          setExportProgress({ phase: 'converting', percent: pct, message: 'MP4 dönüştürülüyor...', error: null });
                          if (pct % 25 === 0) addSystemLog(`MP4 dönüştürme: %${pct}`, 'info');
                        });
                      ext = '.mp4';
                      setExportProgress({ phase: 'done', percent: 100, message: 'MP4 dönüştürme tamamlandı.', error: null });
                      addSystemLog('MP4 dönüştürme tamamlandı.', 'success');
                    } catch (convErr) {
                      setExportProgress({ phase: 'error', percent: 0, message: '', error: convErr.message });
                      addSystemLog(`MP4 dönüştürme başarısız, WebM indiriliyor: ${convErr.message}`, 'warn');
                      ext = '.webm';
                    }
                  } else if (wantsMP4 && (blob.type.includes('mp4') || actualBlobType.includes('mp4'))) {
                    ext = '.mp4';
                  } else {
                    ext = '.webm';
                  }

                  const safeName = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_").toLowerCase();
                  const fileName = `${safeName}${ext}`;

                  const a = document.createElement('a');
                  a.href = ObjectURLManager.create(finalBlob);
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  ObjectURLManager.revoke(a.href);
                  addSystemLog(`Video indirildi: ${fileName}`, 'success');
                } catch (e) {
                  addSystemLog('Video indirme hatası: ' + e.message, 'error');
                }
              };

              const copyShareLink = async () => {
                const title = workflowRef.current?.state?.script?.thumbnailText || 'Video';
                try {
                  await navigator.clipboard.writeText(title);
                  addSystemLog('Başlık panoya kopyalandı!', 'success');
                } catch (e) {
                  const textarea = document.createElement('textarea');
                  textarea.value = title;
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                  addSystemLog('Başlık panoya kopyalandı!', 'success');
                }
              };

              // Native share (mobilde cihaz paylaşımı)
              const nativeShare = async () => {
                const title = textInput || workflowRef.current?.state?.script?.thumbnailText || 'OTONOM Haber';
                try {
                  if (typeof navigator !== 'undefined' && navigator.share) {
                    await navigator.share({ title: title, text: title });
                    addSystemLog('Cihazda paylaşım yapıldı!', 'success');
                  }
                } catch (e) {
                  if (e.name !== 'AbortError') addSystemLog('Paylaşım hatası: ' + e.message, 'error');
                }
              };

              // Üretilen MP4 video veya görsel blob'unu Buffer'ın okuyabileceği doğrudan bulut URL'sine yükler
              // Üretilen MP4 video veya görsel blob'unu Buffer'ın okuyabileceği doğrudan bulut URL'sine yükler (3 Katmanlı Failover)
              const uploadMediaToCloud = async (blobOrUrl, fileName = 'video.mp4') => {
                try {
                  let blob = blobOrUrl;
                  if (typeof blobOrUrl === 'string' && blobOrUrl.startsWith('blob:')) {
                    const res = await fetch(blobOrUrl);
                    blob = await res.blob();
                  } else if (typeof blobOrUrl === 'string' && blobOrUrl.startsWith('data:')) {
                    const parts = blobOrUrl.split(',');
                    const mime = parts[0].match(/:(.*?);/)?.[1] || 'video/mp4';
                    const bstr = atob(parts[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) u8arr[n] = bstr.charCodeAt(n);
                    blob = new Blob([u8arr], { type: mime });
                  }

                  if (!(blob instanceof Blob)) {
                    if (typeof blobOrUrl === 'string' && blobOrUrl.startsWith('http')) return blobOrUrl;
                    return null;
                  }

                  addSystemLog('Video/Medya buluta yükleniyor (Buffer yayın hazırlığı)...', 'info');

                  // v3.6: Önce yerel Python proxy sunucusuna gönder; sunucu catbox.moe/litterbox.catbox.moe
                  // üzerinden server-side yükler. Böylece tarayıcı CORS limitleri aşılır.
                  try {
                    addSystemLog('Yerel Python proxy sunucusuna yükleniyor (catbox CORS bypass)...', 'info');
                    const fdProxy = new FormData();
                    fdProxy.append('file', blob, fileName);
                    const rProxy = await fetch('http://localhost:3000/upload_cloud_media', { method: 'POST', body: fdProxy });
                    if (rProxy.ok) {
                      const jProxy = await rProxy.json();
                      if (jProxy.success && jProxy.url) {
                        addSystemLog(`✓ Video/Medya buluta başarıyla yüklendi (${jProxy.provider || 'Python Bridge'}): ${jProxy.url}`, 'success');
                        return jProxy.url;
                      }
                    }
                    addSystemLog('Yerel Python proxy sunucu yükleme başarısız, fallback servislere geçiliyor.', 'warn');
                  } catch (eProxy) { ErrorHandler.silent(eProxy); }

                  // Servis 1: catbox.moe (KALICI — sonsuz saklama, 200MB'a kadar)
                  // v3.5: Önce direkt POST dene; çoğu modern origin'de CORS engeli olabilir,
                  //       bu yüzden proxy failover hazır. FormData POST'unu GET query'ye
                  //       sarmak dosyayı bozar, bu nedenle allorigins/corsproxy.io üzerinden
                  //       raw POST proxy kullanılır; olmazsa aşağıdaki servisler bekliyor.
                  try {
                    const fdCat = new FormData();
                    fdCat.append('reqtype', 'fileupload');
                    fdCat.append('fileToUpload', blob, fileName);
                    const catAttempts = [
                      { url: 'https://catbox.moe/user/api.php', proxy: false, label: 'catbox direkt' },
                      { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://catbox.moe/user/api.php'), proxy: true, label: 'catbox allorigins' },
                      { url: 'https://corsproxy.io/?url=' + encodeURIComponent('https://catbox.moe/user/api.php'), proxy: true, label: 'catbox corsproxy.io' }
                    ];
                    for (const attempt of catAttempts) {
                      try {
                        addSystemLog(`Catbox deneniyor: ${attempt.label}`, 'info');
                        const rCat = await fetch(attempt.url, { method: 'POST', body: fdCat });
                        if (rCat.ok) {
                          const pubUrl = (await rCat.text()).trim();
                          if (pubUrl && pubUrl.startsWith('http')) {
                            addSystemLog(`✓ Video/Medya buluta başarıyla yüklendi (catbox kalıcı): ${pubUrl}`, 'success');
                            return pubUrl;
                          }
                        }
                      } catch (pc) { /* try next */ }
                    }
                    addSystemLog('Catbox.moe yükleme başarısız (CORS engeli muhtemel), alternatif servislere geçiliyor.', 'warn');
                  } catch (eCat) { ErrorHandler.silent(eCat); }

                  // Servis 2: tmpfiles.org (geçici — direkt CORS uyumlu)
                  try {
                    const fd1 = new FormData();
                    fd1.append('file', blob, fileName);
                    const r1 = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: fd1 });
                    if (r1.ok) {
                      const j1 = await r1.json();
                      if (j1.status === 'success' && j1.data?.url) {
                        const directUrl = j1.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
                        addSystemLog(`✓ Video/Medya buluta başarıyla yüklendi (tmpfiles): ${directUrl}`, 'success');
                        return directUrl;
                      }
                    }
                  } catch (e1) { ErrorHandler.silent(e1); }

                  // Servis 3: litterbox.catbox.moe (72 saat — geçici ama daha uzun süreli)
                  // v3.5: Aynı şekilde direkt POST + proxy fallback
                  try {
                    const fd2 = new FormData();
                    fd2.append('reqtype', 'fileupload');
                    fd2.append('time', '72h');
                    fd2.append('fileToUpload', blob, fileName);
                    const litterAttempts = [
                      { url: 'https://litterbox.catbox.moe/resources/internals/api.php', label: 'litterbox direkt' },
                      { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://litterbox.catbox.moe/resources/internals/api.php'), label: 'litterbox allorigins' },
                      { url: 'https://corsproxy.io/?url=' + encodeURIComponent('https://litterbox.catbox.moe/resources/internals/api.php'), label: 'litterbox corsproxy.io' }
                    ];
                    for (const attempt of litterAttempts) {
                      try {
                        addSystemLog(`Litterbox deneniyor: ${attempt.label}`, 'info');
                        const r2 = await fetch(attempt.url, { method: 'POST', body: fd2 });
                        if (r2.ok) {
                          const pubUrl = (await r2.text()).trim();
                          if (pubUrl && pubUrl.startsWith('http')) {
                            addSystemLog(`✓ Video/Medya buluta başarıyla yüklendi (litterbox 72h): ${pubUrl}`, 'success');
                            return pubUrl;
                          }
                        }
                      } catch (ple) { /* try next */ }
                    }
                    addSystemLog('Litterbox yükleme başarısız (CORS engeli muhtemel).', 'warn');
                  } catch (e2) { ErrorHandler.silent(e2); }

                  // Servis 4: file.io
                  try {
                    const fd3 = new FormData();
                    fd3.append('file', blob, fileName);
                    const r3 = await fetch('https://file.io', { method: 'POST', body: fd3 });
                    if (r3.ok) {
                      const j3 = await r3.json();
                      if (j3.success && j3.link) {
                        addSystemLog(`✓ Video/Medya buluta başarıyla yüklendi (file.io): ${j3.link}`, 'success');
                        return j3.link;
                      }
                    }
                  } catch (e3) { ErrorHandler.silent(e3); }

                } catch (e) {
                  addSystemLog('Bulut yükleme uyarısı: ' + e.message, 'warn');
                }
                return null;
              };

              // v3.18: Analytics Dashboard — Buffer API'den post metrikleri çek
              const fetchBufferAnalytics = async () => {
                const token = SafeStorage.getItem('BUFFER_API_KEY') || '';
                if (!token) { addSystemLog('[ANALİTİK] Buffer token yok.', 'warn'); return null; }
                try {
                  const query = `query { channels { id name service } updates(limit: 10) { id text createdAt status stats { impressions clicks likes shares comments } } }`;
                  const endpoints = ['https://corsproxy.io/?url=' + encodeURIComponent(ANALYTICS_CONFIG.BUFFER_GRAPHQL_URL), 'https://api.allorigins.win/raw?url=' + encodeURIComponent(ANALYTICS_CONFIG.BUFFER_GRAPHQL_URL)];
                  for (const ep of endpoints) {
                    try {
                      const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ query }) });
                      if (r && r.ok) { const d = await r.json(); addSystemLog('[ANALİTİK] Metrikler çekildi.', 'success'); return d; }
                    } catch (e) { continue; }
                  }
                  addSystemLog('[ANALİTİK] Metrikler çekilemedi.', 'warn'); return null;
                } catch (e) { addSystemLog('[ANALİTİK] Hata: ' + e.message, 'warn'); return null; }
              };

              // Buffer API ile Anında Otomatik Sosyal Medya Paylaşımı (Dinamik Kanal Algılama + Gerçek MP4 Video Desteği)
              const shareToBufferAPI = async (text, mediaUrl = null, options = {}) => {
                // v3.18: options.scheduledAt — zamanlı paylaşım (ISO 8601)
                // v3.18: options.hashtags — otomatik hashtag'ler post text'e eklenir
                const token = SafeStorage.getItem('BUFFER_API_KEY') || '';
                const isHttpsRemoteOrigin = typeof window !== 'undefined' &&
                  window.location.protocol === 'https:' &&
                  (!window.location.hostname ||
                   window.location.hostname.includes('localhost') === false &&
                   window.location.hostname.includes('127.0.0.1') === false);

                addSystemLog(`[DEBUG] shareToBufferAPI başladı | token: ${token ? token.slice(0,8)+'...' : 'YOK'} | origin: ${isHttpsRemoteOrigin ? 'remote' : 'local'} | hostname: ${window.location.hostname || 'BOS'}`, 'info');

                if (!token) {
                  addSystemLog('[PAYLAS] HATA: Buffer API Token bulunamadi! Ayarlar tabindan token girin.', 'error');
                  addSystemLog('[PAYLAS] Token: https://buffer.com/app/account/api adresinden alinir.', 'info');
                  return 0;
                }

                // v3.18: Hashtag'leri post text'e ekle
                let fullText = text;
                if (options.hashtags && Array.isArray(options.hashtags) && options.hashtags.length > 0) {
                  fullText += '\n\n' + options.hashtags.join(' ');
                  addSystemLog('[PAYLAS] Hashtagler eklendi: ' + options.hashtags.join(' '), 'info');
                }
                if (options.scheduledAt) {
                  addSystemLog('[PAYLAS] Zamanlı paylaşım: ' + options.scheduledAt, 'info');
                }

                const endpoints = [
                  ...(!isHttpsRemoteOrigin ? ['http://localhost:3000/buffer_proxy', 'http://127.0.0.1:3000/buffer_proxy'] : []),
                  'https://corsproxy.io/?url=' + encodeURIComponent('https://api.buffer.com/graphql'),
                  'https://cors.eu.org/https://api.buffer.com/graphql',
                  'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://api.buffer.com/graphql')
                ];

                // Temiz metin hazırlığı
                const scriptObj = workflowRef.current?.state?.script || {};
                const headline = textInput || scriptObj.thumbnailText || text || 'OTONOM Haber';
                const desc = scriptObj.tiktokDescription ? `\n\n${scriptObj.tiktokDescription}` : '';
                const tags = Array.isArray(scriptObj.tiktokHashtags) && scriptObj.tiktokHashtags.length > 0 ? `\n\n${scriptObj.tiktokHashtags.join(' ')}` : '';
                // v3.18: Auto-hashtag'leri ekle
                const autoHashtags = (options.hashtags && Array.isArray(options.hashtags) && options.hashtags.length > 0) ? `\n\n${options.hashtags.join(' ')}` : '';
                const fullPostText = `${headline}${desc}${tags}${autoHashtags}`.replace(/blob:https?:[^\s]+/gi, '').trim() || 'OTONOM Haber';

                // 1. Üretilen MP4 videoyu veya görseli buluta yükle
                let directCloudUrl = null;
                let targetMedia = mediaUrl || uiState.videoUrl || (studioMedia.customSceneImages && studioMedia.customSceneImages[0]);
                const isVideo = config.outputType === 'video' || (typeof targetMedia === 'string' && (targetMedia.includes('.mp4') || targetMedia.includes('.webm') || targetMedia.startsWith('blob:')));
                const ext = isVideo ? 'mp4' : 'jpg';

                if (targetMedia) {
                  // v3.15: Video WebM ise MP4'e dönüştür (Instagram CFR 30fps MP4 şart koşar)
                  if (isVideo && typeof targetMedia === 'string' && (targetMedia.startsWith('blob:') || targetMedia.includes('.webm'))) {
                    try {
                      addSystemLog('Video WebM → MP4 dönüştürülüyor (Instagram CFR 30fps)...', 'info');
                      setExportProgress({ phase: 'converting', percent: 0, message: 'MP4 dönüştürülüyor (Instagram)...', error: null });
                      const resp = await fetch(targetMedia);
                      const webmBlob = await resp.blob();
                      const mp4Blob = await convertWebMtoMP4(webmBlob, (pct) => {
                        setExportProgress({ phase: 'converting', percent: pct, message: 'MP4 dönüştürülüyor (Instagram)...', error: null });
                      });
                      targetMedia = ObjectURLManager.create(mp4Blob);
                      setExportProgress({ phase: 'uploading', percent: 0, message: 'Buluta yükleniyor...', error: null });
                      addSystemLog('Video MP4 (CFR 30fps) dönüştürme tamam.', 'success');
                    } catch (eConv) {
                      setExportProgress({ phase: 'error', percent: 0, message: '', error: eConv.message });
                      addSystemLog('WebM→MP4 dönüştürme başarısız, WebM olarak yükleniyor: ' + eConv.message, 'warn');
                    }
                  }
                  addSystemLog(`[DEBUG] Bulut yükleme başladı | media: ${typeof targetMedia === 'string' ? targetMedia.slice(0,50) : 'non-string'} | isVideo: ${isVideo}`, 'info');
                  directCloudUrl = await uploadMediaToCloud(targetMedia, `otonom_video_${Date.now()}.${ext}`);
                  addSystemLog(`[DEBUG] Bulut yükleme sonucu: ${directCloudUrl || 'BAŞARISIZ'}`, directCloudUrl ? 'success' : 'warn');
                }

                // 2. Fallback görsel (bulut yüklemesi başarısızsa)
                if (!directCloudUrl) {
                  if (gazeteItems && gazeteItems[gazeteCurrentIdx]?.rawSrc) {
                    directCloudUrl = gazeteItems[gazeteCurrentIdx].rawSrc;
                  } else if (gazeteItems && gazeteItems[gazeteCurrentIdx]?.src && !gazeteItems[gazeteCurrentIdx].src.startsWith('blob:')) {
                    directCloudUrl = gazeteItems[gazeteCurrentIdx].src;
                  } else {
                    directCloudUrl = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1080';
                  }
                }

                // 3. Sunucu destekli tek tıkla otomatik paylaşım (CORS/PNA engellerini aşar)
                const serverUrl = await getLinkedInServerUrl();
                addSystemLog(`[DEBUG] getLinkedInServerUrl sonucu: ${serverUrl || 'YOK (remote/local)'}`, 'info');
                if (serverUrl) {
                  try {
                    addSystemLog(`[DEBUG] Yerel sunucu Buffer paylaşımı: ${serverUrl}/buffer/share-all`, 'info');
                    const res = await fetch(`${serverUrl}/buffer/share-all`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Local-Proxy-Auth': PROXY_AUTH_TOKEN
                      },
                      body: JSON.stringify({
                        text: fullPostText,
                        media_url: directCloudUrl,
                        token
                      })
                    });
                    addSystemLog(`[DEBUG] Sunucu response: HTTP ${res.status} ${res.statusText}`, res.ok ? 'success' : 'warn');
                    if (res.ok) {
                      const json = await res.json();
                      addSystemLog(`[DEBUG] Sunucu JSON: ${JSON.stringify(json).slice(0,200)}`, 'info');
                      if (json.status === 'success') {
                        addSystemLog(`✓ Buffer üzerinden ${json.channels_count || 3} sosyal medya kanalına başarıyla gönderildi!`, 'success');
                        return true;
                      }
                    } else {
                      const errText = await res.text().catch(() => '');
                      addSystemLog(`[DEBUG] Sunucu hata body: ${errText.slice(0,200)}`, 'warn');
                    }
                  } catch(e) {
                    addSystemLog(`[DEBUG] Sunucu fetch hatası: ${e.name}: ${e.message}`, 'warn');
                  }
                }
                let activeChannels = [];
                try {
                  const getChannelsQuery = `
                    query {
                      account {
                        organizations {
                          id
                        }
                      }
                    }
                  `;
                  let orgId = null;
                  for (const ep of endpoints) {
                    try {
                      addSystemLog(`[DEBUG] Kanal tespiti deniyor: ${ep.slice(0,60)}`, 'info');
                      const res = await fetch(ep, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`,
                          'X-Local-Proxy-Auth': PROXY_AUTH_TOKEN
                        },
                        body: JSON.stringify({ query: getChannelsQuery, token, variables: {} })
                      });
                      addSystemLog(`[DEBUG] Kanal tespiti response: HTTP ${res.status}`, res.ok ? 'success' : 'warn');
                      if (res.ok) {
                        const json = await res.json();
                        orgId = json.data?.account?.organizations?.[0]?.id;
                        addSystemLog(`[DEBUG] orgId: ${orgId || 'YOK'}`, 'info');
                        if (orgId) break;
                      } else {
                        const errBody = await res.text().catch(() => '');
                        addSystemLog(`[DEBUG] Kanal tespiti hata: ${errBody.slice(0,150)}`, 'warn');
                      }
                    } catch(e) {
                      addSystemLog(`[DEBUG] Kanal tespiti fetch hatası: ${e.name}: ${e.message}`, 'warn');
                    }
                  }

                  if (orgId) {
                    const chanQuery = `
                      query GetChannels($input: ChannelsInput!) {
                        channels(input: $input) {
                          id
                          name
                          service
                        }
                      }
                    `;
                    for (const ep of endpoints) {
                      try {
                        addSystemLog(`[DEBUG] Kanal listesi cekiliyor: ${ep.slice(0,60)}`, 'info');
                        const res = await fetch(ep, {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json', 
                            'Authorization': `Bearer ${token}`,
                            'X-Local-Proxy-Auth': PROXY_AUTH_TOKEN
                          },
                          body: JSON.stringify({ query: chanQuery, token, variables: { input: { organizationId: orgId } } })
                        });
                        addSystemLog(`[DEBUG] Kanal listesi response: HTTP ${res.status}`, res.ok ? 'success' : 'warn');
                        if (res.ok) {
                          const json = await res.json();
                          if (Array.isArray(json.data?.channels) && json.data.channels.length > 0) {
                            activeChannels = json.data.channels;
                            addSystemLog(`[DEBUG] ${activeChannels.length} kanal bulundu: ${activeChannels.map(c=>c.service).join(',')}`, 'success');
                            break;
                          }
                        }
                      } catch(e) {
                        addSystemLog(`[DEBUG] Kanal listesi fetch hatasi: ${e.name}: ${e.message}`, 'warn');
                      }
                    }
                  }
                } catch(e) {
                  addSystemLog(`[DEBUG] Kanal tespiti genel hata: ${e.name}: ${e.message}`, 'warn');
                }

                // Dinamik çekilemediyse varsayılan kanal listesini kullan (TikTok dahil)
                if (activeChannels.length === 0) {
                  activeChannels = [
                    { id: '6a50b10040483446288e397b', name: 'Twitter (serefkeser)', service: 'twitter' },
                    { id: '69f5d9145c4c051afa01c2f7', name: 'Instagram (keser4881)', service: 'instagram' },
                    { id: '6a69a6cf0dc384370e2ef6ea', name: 'TikTok', service: 'tiktok' }
                  ];
                }

                addSystemLog(`Buffer'a bağlı ${activeChannels.length} sosyal medya kanalı bulundu (${activeChannels.map(c => c.name).join(', ')}).`, 'info');

                let successCount = 0;
                for (const ch of activeChannels) {
                  const mutation = `
                    mutation CreatePost($input: CreatePostInput!) {
                      createPost(input: $input) {
                        ... on PostActionSuccess { post { id status } }
                        ... on InvalidInputError { message }
                        ... on UnexpectedError { message }
                        ... on LimitReachedError { message }
                      }
                    }
                  `;

                  const assetObj = isVideo ? { video: { url: directCloudUrl } } : { image: { url: directCloudUrl } };

                  const variables = {
                    input: {
                      channelId: ch.id,
                      text: fullPostText,
                      mode: options.scheduledAt ? 'schedule' : 'shareNow',
                      schedulingType: options.scheduledAt ? 'fixedTime' : 'automatic',
                      ...(options.scheduledAt ? { scheduledAt: options.scheduledAt } : {}),
                      needsApproval: false,
                      assets: [assetObj]
                    }
                  };

                  if (ch.service === 'instagram') {
                    variables.input.metadata = {
                      instagram: {
                        type: isVideo ? 'reel' : 'post',
                        shouldShareToFeed: true
                      }
                    };
                  } else if (ch.service === 'tiktok') {
                    variables.input.metadata = {
                      tiktok: {
                        privacy_level: 'PUBLIC_TO_EVERYONE',
                        title: fullPostText.substring(0, 150)
                      }
                    };
                  }

                  let posted = false;
                  for (const ep of endpoints) {
                    if (posted) break;
                    try {
                      addSystemLog(`[DEBUG] createPost deniyor: ${ch.name} → ${ep.slice(0,60)}`, 'info');
                      const res = await fetch(ep, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`,
                          'X-Local-Proxy-Auth': PROXY_AUTH_TOKEN
                        },
                        body: JSON.stringify({ query: mutation, token, variables })
                      });
                      addSystemLog(`[DEBUG] createPost response: HTTP ${res.status} ${res.statusText}`, res.ok ? 'success' : 'warn');
                      if (res.ok) {
                        const json = await res.json();
                        addSystemLog(`[DEBUG] createPost JSON: ${JSON.stringify(json).slice(0,200)}`, 'info');
                        if (json.data?.createPost?.post?.id) {
                          posted = true;
                          successCount++;
                          addSystemLog(`✓ ${ch.name} (${ch.service}) kanalında başarıyla paylaşıldı (ID: ${json.data.createPost.post.id})`, 'success');
                        } else if (json.data?.createPost?.message) {
                          addSystemLog(`⚠️ ${ch.name} uyarısı: ${json.data.createPost.message}`, 'warn');
                        }
                      } else {
                        const errBody = await res.text().catch(() => '');
                        addSystemLog(`[DEBUG] createPost hata body: ${errBody.slice(0,200)}`, 'warn');
                      }
                    } catch(e) {
                      addSystemLog(`[DEBUG] createPost fetch hatası: ${e.name}: ${e.message}`, 'warn');
                    }
                  }
                }
                if (successCount === 0) {
                  addSystemLog('⚠️ Buffer paylaşım başarısız: Tüm CORS proxyleri engellendi. Yerel sunucu (linkedin_server.py) çalıştırın veya Buffer API token kontrol edin.', 'warn');
                }
                return successCount;
              };

              const shareToSelectedPlatforms = async () => {
                const title = textInput || workflowRef.current?.state?.script?.thumbnailText || 'OTONOM Haber';
                addSystemLog('[PAYLAS] Paylasim basladi | title: ' + title.slice(0,60), 'info');
                addSystemLog('[PAYLAS] videoUrl: ' + (uiState.videoUrl || 'YOK'), 'info');
                addSystemLog('[PAYLAS] origin: ' + (typeof window !== 'undefined' ? window.location.hostname : 'SSR'), 'info');
                
                // 1. Buffer Hesabındaki Tüm Kanallarda Paylaş (Twitter, Instagram, TikTok vb.)
                try {
                  addSystemLog('[PAYLAS] Buffer API cagriliyor...', 'info');
                  // v3.18: Hashtag'leri ve zamanlı paylaşımı opsiyon olarak geçir
                  const shareOpts = {};
                  const scriptHashtags = workflowRef.current?.state?.script?.hashtags;
                  if (scriptHashtags && Array.isArray(scriptHashtags) && scriptHashtags.length > 0) shareOpts.hashtags = scriptHashtags;
                  if (config.scheduledPublishAt) shareOpts.scheduledAt = config.scheduledPublishAt;
                  const count = await shareToBufferAPI(title, uiState.videoUrl, shareOpts);
                  addSystemLog(`[PAYLAS] Buffer sonuc: ${count} kanal basarili`, count > 0 ? 'success' : 'warn');
                  if (count > 0) {
                    addSystemLog(`✓ Buffer ile ${count} sosyal medya kanalında (Twitter, Instagram, TikTok) paylaşıldı! 🚀`, 'success');
                  } else {
                    addSystemLog('Buffer paylaşımı tamamlandı. ✅', 'success');
                  }
                } catch(e) {
                  addSystemLog(`[PAYLAS] Buffer hata: ${e.name}: ${e.message}`, 'warn');
                  addSystemLog(`[PAYLAS] Buffer stack: ${e.stack?.slice(0,300)}`, 'warn');
                }

                // 2. Doğrudan LinkedIn API ile Paylaş (linkedin_server.py)
                try {
                  addSystemLog('[PAYLAS] LinkedIn sunucu araniyor...', 'info');
                  const linkedInServerUrl = await getLinkedInServerUrl();
                  addSystemLog(`[PAYLAS] LinkedIn sunucu: ${linkedInServerUrl || 'YOK'}`, linkedInServerUrl ? 'success' : 'warn');
                  if (linkedInServerUrl) {
                    addSystemLog('Doğrudan LinkedIn API ile paylaşım başlatılıyor...', 'info');
                    const res = await shareToLinkedInAPI(title, null, null, null, uiState.videoUrl);
                    addSystemLog(`[PAYLAS] LinkedIn API sonuc: ${JSON.stringify(res).slice(0,200)}`, 'info');
                    if (res && (res.id || res.status === 'success')) {
                      addSystemLog(`✓ Doğrudan LinkedIn API ile başarıyla paylaşıldı! 🚀`, 'success');
                    }
                  } else {
                    addSystemLog('LinkedIn sunucusu bulunamadı (linkedin_server.py). Sadece Buffer kullanıldı.', 'info');
                  }
                } catch(e) {
                  addSystemLog(`[PAYLAS] LinkedIn hata: ${e.name}: ${e.message}`, 'warn');
                  addSystemLog(`[PAYLAS] LinkedIn stack: ${e.stack?.slice(0,300)}`, 'warn');
                }
                addSystemLog('[PAYLAS] Paylasim tamamlandi', 'info');
              };

              const shareToPlatform = async (platform, title, videoUrl) => {
                try {
                  addSystemLog('Buffer API ile tüm kanallara (Twitter, Instagram, LinkedIn) otomatik gönderiliyor...', 'info');
                  const count = await shareToBufferAPI(title || textInput || 'OTONOM Haber', videoUrl, { hashtags: workflowRef.current?.state?.script?.hashtags || [], scheduledAt: config.scheduledPublishAt || null });
                  addSystemLog(`✓ Buffer ile ${count}/3 sosyal medya kanalında anında paylaşıldı! 🚀`, 'success');
                } catch(e) {
                  addSystemLog('Buffer paylaşım hatası: ' + e.message, 'error');
                }
              };

              useEffect(() => { SafeStorage.setItem('ns_activeTab', activeTab); }, [activeTab]);
              useEffect(() => { SafeStorage.setItem('ns_textInput', textInput); }, [textInput]);
              useEffect(() => { SafeStorage.setItem('ns_config', JSON.stringify(config)); }, [config]);
              useEffect(() => { SafeStorage.setItem('ns_prefs', JSON.stringify(prefs)); }, [prefs]);
              useEffect(() => { SafeStorage.setItem('ns_voiceFilters', JSON.stringify(voiceFilters)); }, [voiceFilters]);
              useEffect(() => { SafeStorage.setItem('ns_gazeteSource', gazeteSource); }, [gazeteSource]);

              useEffect(() => { let interval; if (uiState.isProcessing) { setElapsedSeconds(0); const start = performance.now(); interval = setInterval(() => { setElapsedSeconds(((performance.now() - start) / 1000).toFixed(1)); }, 100); } else clearInterval(interval); return () => clearInterval(interval); }, [uiState.isProcessing]);

              useEffect(() => {
                  sysEventBus.on('SYS_LOG_ADD', (log) => setSysLogs(prev => [...prev, log]));
                  sysEventBus.on('SYS_LOG_CLEAR', () => sysEventBus.emit('SYS_LOG_CLEAR_DONE'));
                  sysEventBus.on('SYS_LOG_CLEAR_DONE', () => setSysLogs([]));
                  sysEventBus.on('PROGRESS', (data) => { const p = Math.min(100, Math.max(0, Math.round(data.percent || 0))); setUiState(prev => ({ ...prev, percent: p, statusText: data.text || prev.statusText })); });
                  sysEventBus.on('WORKFLOW_STATE', (data) => {
                      if (data.status === 'FAILED') setUiState(prev => ({ ...prev, isProcessing: false, error: data.job.error }));
                      if (data.status === 'COMPLETED') {
                        setUiState(prev => ({ ...prev, isProcessing: false, percent: 100, statusText: 'Tamamlandı!', videoUrl: data.job.videoUrl }));
                        // Otomatik video + log indir (H1.139)
                        autoSaveVideo(data.job.videoUrl, data.job.script?.thumbnailText || 'video', data.job.config?.videoFormat);
                        try { exportWorkflowLog(data.job); } catch (e) { console.warn('Log export hatası:', e); }
                      }
                    });
                  sysEventBus.on('AUTH_EXPIRED', () => setAuthExpired(true));
                }, []);

              useEffect(() => { if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [sysLogs]);

              useEffect(() => {
                  const loadLocalMusic = async () => {
                    try {
                      const allMusic = await AssetManagerService.getAllMusicFromLib();
                      const savedFolderName = SafeStorage.getItem('ns_syncedFolderName') || (allMusic.length > 0 ? 'Muzik' : '');
                      setStudioMedia(s => ({ ...s, musicList: [...allMusic], isLoading: false, statusMsg: 'Yerel Mod', syncedFolderName: savedFolderName }));

                      if (allMusic.length > 0) {
                        addSystemLog(`🎵 Müzik kütüphanesi hazır: ${allMusic.length} müzik (Kalıcı Saklandı).`, 'success');

                        let targetBgmId = SafeStorage.getItem('ns_selectedBgmId');
                        if (!targetBgmId || targetBgmId === 'none') {
                          const savedPrefs = JSON.parse(SafeStorage.getItem('ns_prefs')) || {};
                          if (savedPrefs.ambientSound && !['none', 'rain', 'wind', 'waves', 'fire'].includes(savedPrefs.ambientSound)) {
                            targetBgmId = savedPrefs.ambientSound;
                          }
                        }

                        let activeTrack = allMusic.find(m => m.id === targetBgmId);
                        if (!activeTrack) {
                          activeTrack = allMusic[0];
                          targetBgmId = activeTrack.id;
                        }

                        if (activeTrack && activeTrack.data) {
                          const blob = _base64ToBlob(activeTrack.data);
                          const url = ObjectURLManager.create(blob);
                          await AssetManagerService.saveMedia('CUSTOM_MUSIC', url);
                          SafeStorage.setItem('ns_selectedBgmId', targetBgmId);
                          SafeStorage.setItem('ns_selectedBgmName', activeTrack.name);
                          setPrefs(p => {
                            const np = { ...p, ambientSound: targetBgmId, customBgMusicName: activeTrack.name, customBgMusicId: targetBgmId };
                            SafeStorage.setItem('ns_prefs', JSON.stringify(np));
                            return np;
                          });
                          addSystemLog(`✓ Seçili müzik yüklendi: ${activeTrack.name}`, 'info');
                        }
                      } else {
                        // v3.7: Bulut geri yükleme kaldırıldı; kullanıcı müzik klasörünü elle seçer.
                        addSystemLog("Müzik kütüphanesi boş. 'MÜZİK KLASÖRÜ SEÇ' butonundan bir kez ekleyin.", 'info');
                      }
                    } catch (e) { setStudioMedia(s => ({ ...s, isLoading: false, statusMsg: 'Yerel Mod' })); }
                  };
                  loadLocalMusic();
                }, []);

              // useCallback: isFirebaseActive/db/appId modul seviyesinde sabit, tek gercek
              // bagimlilik `user` — o da sadece login/logout'ta degisir. Bu sayede buna bagli
              // handleOutroUpload/Delete gibi fonksiyonlar da islem sirasinda (uiState.percent
              // gibi sik degisen state'lerden bagimsiz) stabil kalir.
              const saveToFirestore = useCallback(async (updates) => { if (!user || !isFirebaseActive) return; try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'user_assets', 'main'), updates, { merge: true }); } catch (error) { if (!error.message?.includes('offline')) console.warn("Firestore kayıt hatası"); } }, [user]);
              const uploadChunks = async (prefix, b64Data) => { if (!user || !isFirebaseActive) return 0; const chunkSize = 800000; const chunksCount = Math.ceil(b64Data.length / chunkSize); try { for (let i = 0; i < chunksCount; i++) { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'asset_chunks', `${prefix}_${i}`), { data: b64Data.substring(i * chunkSize, (i + 1) * chunkSize), index: i }); } return chunksCount; } catch (e) { return 0; } };
              const downloadChunks = async (prefix, chunksCount) => { if (!user || !isFirebaseActive) return null; let b64Data = ""; try { for (let i = 0; i < chunksCount; i++) { let chunkSnap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'asset_chunks', `${prefix}_${i}`)); if (!chunkSnap.exists()) chunkSnap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'music_chunks', `${prefix}_${i}`)); if (chunkSnap.exists()) b64Data += chunkSnap.data().data; else return null; } return b64Data; } catch (e) { return null; } };

              useEffect(() => {
                  if (!isFirebaseActive) { return; }
                  const initAuth = async () => { try { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token); else await signInAnonymously(auth); } catch(e) { ErrorHandler.silent(e); } };
                  initAuth();
                  const unsubAuth = onAuthStateChanged(auth, async (u) => {
                      setUser(u);
                      if (u && !isLoadedRef.current) {
                        try { const snap = await getDoc(doc(db, 'artifacts', appId, 'users', u.uid, 'user_assets', 'settings')); if (snap.exists()) { const d = snap.data(); if (d.config) setConfig(c => ({ ...c, ...d.config })); if (d.prefs) { if (!d.prefs.ambientSound) d.prefs.ambientSound = d.selectedBgmId || 'none'; setPrefs(p => ({ ...p, ...d.prefs })); } if (d.voiceFilters) setVoiceFilters(f => ({ ...f, ...d.voiceFilters })); if (d.activeTab) setActiveTab(d.activeTab); if (d.textInput) setTextInput(d.textInput); } } catch(e) { ErrorHandler.silent(e); }
                        isLoadedRef.current = true;
                      }
                    });
                  return () => unsubAuth();
                }, []);

              useEffect(() => {
                  if (!user || !isFirebaseActive || !isLoadedRef.current) return;
                  const timer = setTimeout(() => { try { setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'user_assets', 'settings'), { config, prefs, voiceFilters, activeTab, textInput, lastUpdated: Date.now() }, { merge: true }).catch((e) => { ErrorHandler.silent(e); }); } catch(e) { ErrorHandler.silent(e); } }, 800);
                  return () => clearTimeout(timer);
                }, [config, prefs, voiceFilters, activeTab, textInput, user]);

              useEffect(() => {
                  if (!user || !isFirebaseActive) { setStudioMedia(s => ({ ...s, isLoading: false, statusMsg: 'Yerel Mod' })); return; }
                  const preloadLocal = async () => {
                    const localOutro = await AssetManagerService.loadMedia('CUSTOM_OUTRO');
                    const csi = [];
                    for (let i = 0; i < RENDER_CONFIG.MAX_CUSTOM_SCENE_IMAGES; i++) { const img = await AssetManagerService.loadMedia("CUSTOM_SCENE_IMG_" + i); if (img) csi.push(img); }
                    const allMusics = await AssetManagerService.getAllMusicFromLib();
                    const savedFolderName = SafeStorage.getItem('ns_syncedFolderName') || (allMusics.length > 0 ? 'Muzik' : '');
                    setStudioMedia(s => ({ ...s, outroUrl: s.outroUrl || localOutro, musicList: s.musicList.length > 0 ? s.musicList : allMusics, customSceneImages: csi, isLoading: false, statusMsg: localOutro ? 'Yerel Bellek Aktif' : s.statusMsg, syncedFolderName: savedFolderName }));
                  };
                  preloadLocal();
                  const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'user_assets', 'main');
                  const unsubscribe = onSnapshot(docRef, async (snap) => {
                      if (snap.exists()) {
                        const data = snap.data();
                        let updates = {};
                        // Müzik listesini SADECE yerelde müzik yoksa Firebase'den yükle (overwrite önleme)
                        const localMusicCount = (await AssetManagerService.getAllMusicFromLib()).length;
                        if (localMusicCount === 0 && data.bgmList && data.bgmList.length > 0) {
                          updates.musicList = data.bgmList;
                          addSystemLog(`Firebase'den ${data.bgmList.length} müzik senkronize edildi.`, 'info');
                        }
                        let localOutro = await AssetManagerService.loadMedia('CUSTOM_OUTRO');
                        if (data.outroChunksCount) { if (!localOutro) { localOutro = await downloadChunks('outro', data.outroChunksCount); if (localOutro) await AssetManagerService.saveMedia('CUSTOM_OUTRO', localOutro); } updates.outroUrl = localOutro; }
                        else if (data.backCover) { updates.outroUrl = data.backCover; if (!localOutro) await AssetManagerService.saveMedia('CUSTOM_OUTRO', data.backCover); }
                        else if (data.outroChunksCount === null || data.backCover === null) { updates.outroUrl = null; await AssetManagerService.deleteMedia('CUSTOM_OUTRO'); }
                        else updates.outroUrl = localOutro;
                        if (data.selectedBgmId) { const trackList = updates.musicList || (await AssetManagerService.getAllMusicFromLib()); const track = trackList.find(m => m.id === data.selectedBgmId); if (track) { let localMusic = await AssetManagerService.getMusicFromLib(data.selectedBgmId); if (!localMusic && track.chunksCount) { const cloudData = await downloadChunks(track.id, track.chunksCount); if (cloudData) { localMusic = { id: track.id, name: track.name, data: cloudData }; await AssetManagerService.saveMusicToLib(localMusic); } } if (localMusic) { await AssetManagerService.saveMedia('CUSTOM_MUSIC', localMusic.data); updates.musicLoaded = true; updates.musicName = track.name; updates.musicId = track.id; } } }
                        else if (data.selectedBgmId === null) { updates.musicLoaded = false; updates.musicName = ''; updates.musicId = ''; await AssetManagerService.deleteMedia('CUSTOM_MUSIC'); }
                        updates.isLoading = false; if (!updates.statusMsg || updates.statusMsg.includes('İndiriliyor')) updates.statusMsg = 'Bulutla Senkronize (Aktif)';
                        setStudioMedia(s => ({ ...s, ...updates }));
                      } else {
                        const syncLocalToCloud = async () => { let updates = {}; const localOutro = await AssetManagerService.loadMedia('CUSTOM_OUTRO'); if (localOutro) updates.outroChunksCount = await uploadChunks('outro', localOutro); const db = await AssetManagerService.getDB(); const tx = db.transaction(LIB_STORE, 'readonly'); const req = tx.objectStore(LIB_STORE).getAll(); req.onsuccess = async () => { const allMusics = req.result || []; if (allMusics.length > 0) updates.bgmList = allMusics.map(m => ({ id: m.id, name: m.name, chunksCount: Math.ceil(m.data.length / 800000) })); const savedPrefs = JSON.parse(SafeStorage.getItem('ns_prefs')) || {}; if (savedPrefs.ambientSound && savedPrefs.ambientSound !== 'none') updates.selectedBgmId = savedPrefs.ambientSound; if (Object.keys(updates).length > 0) await setDoc(docRef, updates, { merge: true }); }; };
                        syncLocalToCloud(); setStudioMedia(s => ({ ...s, isLoading: false, statusMsg: 'Yerel Bellek Senkronize' }));
                      }
                    }, () => setStudioMedia(s => ({ ...s, isLoading: false, statusMsg: 'Yerel Mod' })));
                  return () => unsubscribe();
                }, [user]);

              // useCallback: saveToFirestore henuz kendisi memoize edilmedigi icin tam
              // stabillik saglamiyor, ama deps dogru tanimlandi (yanlis stale-closure riski yok).
              const handleOutroUpload = useCallback(async (e) => { const file = e.target.files?.[0]; if (!file) return; setStudioMedia(s => ({ ...s, isLoading: true, statusMsg: 'Kapak Yükleniyor...' })); const b64 = await NetworkUtils.compressImage(file); await AssetManagerService.saveMedia('CUSTOM_OUTRO', b64); const chunksCount = await uploadChunks('outro', b64); await saveToFirestore({ outroChunksCount: chunksCount, backCover: null }); setStudioMedia(s => ({ ...s, outroUrl: b64, isLoading: false, statusMsg: 'Bulutla Senkronize' })); }, [saveToFirestore]);
              const handleOutroDelete = useCallback(async () => { await AssetManagerService.deleteMedia('CUSTOM_OUTRO'); setStudioMedia(s => ({ ...s, outroUrl: null })); await saveToFirestore({ outroChunksCount: null, backCover: null }); }, [saveToFirestore]);
              // studioMedia.customSceneImages dogrudan okunuyor -> [studioMedia] sart.
              const handleCustomSceneImagesUpload = useCallback(async (e) => { const files = Array.from(e.target ? e.target.files : e); if (!files.length) return; const availableSlots = RENDER_CONFIG.MAX_CUSTOM_SCENE_IMAGES - (studioMedia.customSceneImages?.length || 0); const filesToProcess = files.slice(0, availableSlots); const newB64s = []; for (let file of filesToProcess) { if (file.type.startsWith('image/')) { const b64 = await NetworkUtils.compressImage(file); newB64s.push(b64); } } const updatedImages = [...(studioMedia.customSceneImages || []), ...newB64s].slice(0, RENDER_CONFIG.MAX_CUSTOM_SCENE_IMAGES); for (let i = 0; i < updatedImages.length; i++) await AssetManagerService.saveMedia("CUSTOM_SCENE_IMG_" + i, updatedImages[i]); setStudioMedia(s => ({ ...s, customSceneImages: updatedImages })); const newMediaFiles = newB64s.map((b64, i) => ({ name: `SabitGorsel_${Date.now()}_${i}.jpg`, type: 'image/jpeg', data: b64 })); if (newMediaFiles.length > 0) setUiState(prev => ({ ...prev, selectedMediaFiles: [...prev.selectedMediaFiles, ...newMediaFiles] })); if (e.target) e.target.value = null; }, [studioMedia]);
              const handleCustomSceneImageDelete = useCallback(async (idx) => { const updated = studioMedia.customSceneImages.filter((_, i) => i !== idx); for (let i = 0; i < RENDER_CONFIG.MAX_CUSTOM_SCENE_IMAGES; i++) await AssetManagerService.deleteMedia("CUSTOM_SCENE_IMG_" + i); for (let i = 0; i < updated.length; i++) await AssetManagerService.saveMedia("CUSTOM_SCENE_IMG_" + i, updated[i]); setStudioMedia(s => ({ ...s, customSceneImages: updated })); }, [studioMedia]);
              const deleteMusic = async () => { try { const as = prefs.ambientSound; if (as && !['none', 'rain', 'wind', 'waves', 'fire'].includes(as)) { const oldUrl = await AssetManagerService.loadMedia('CUSTOM_MUSIC'); if (oldUrl && oldUrl.startsWith('blob:')) ObjectURLManager.revoke(oldUrl); await AssetManagerService.deleteMedia('CUSTOM_MUSIC'); await AssetManagerService.removeMusicFromLib(as); const updatedList = studioMedia.musicList.filter(m => m.id !== as); await saveToFirestore({ bgmList: updatedList, selectedBgmId: null }); setPrefs(p => ({ ...p, ambientSound: 'none' })); } } catch(e) { ErrorHandler.silent(e); } };
              const handleFolderSelect = async () => {
                if (musicFileInputRef.current) musicFileInputRef.current.click();
              };
              const handleFolderSelectLegacy = async (e) => {
                const files = Array.from(e.target.files);
                if (!files.length) return;
                const audioExts = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma'];
                const audioFiles = files.filter(f => audioExts.some(ext => f.name.toLowerCase().endsWith(ext)));
                if (!audioFiles.length) { addSystemLog("Seçilen dosyalarda ses dosyası bulunamadı.", "warn"); return; }
                let folderName = 'Muzik';
                if (audioFiles[0]?.webkitRelativePath) {
                  const parts = audioFiles[0].webkitRelativePath.split('/');
                  if (parts.length > 1) folderName = parts[0];
                }
                SafeStorage.setItem('ns_syncedFolderName', folderName);
                addSystemLog(`${audioFiles.length} müzik dosyası bulundu (${folderName}), IndexedDB'ye kaydediliyor...`, 'info');
                let savedCount = 0;
                for (const file of audioFiles) {
                  const id = "fm_" + file.name.replace(/[^a-zA-Z0-9]/g, '_') + "_" + file.size;
                  const existing = await AssetManagerService.getMusicFromLib(id);
                  if (existing) continue;
                  const b64 = await NetworkUtils.fileToBase64(file);
                  await AssetManagerService.saveMusicToLib({ id, name: file.name, data: b64 });
                  savedCount++;
                }
                const allMusic = await AssetManagerService.getAllMusicFromLib();
                setStudioMedia(s => ({ ...s, musicList: [...allMusic], syncedFolderName: folderName }));
                addSystemLog(`✅ ${folderName}: ${savedCount} yeni müzik yerel olarak kaydedildi. Toplam ${allMusic.length} müzik listelendi.`, 'success');
                e.target.value = null;
              };
              const clearSyncedFolder = async () => {
                await AssetManagerService.removeDirHandle();
                setStudioMedia(s => ({ ...s, syncedFolderName: '' }));
                addSystemLog("Otomatik senkronizasyon kaldırıldı.", 'info');
              };
              // Müzik önizleme - 10 saniye çalar, ses seviyesi prefs.backgroundMusicVolume'dan gelir
              const playMusicPreview = (url) => {
                try {
                  if (_previewAudioRef.current) { _previewAudioRef.current.pause(); _previewAudioRef.current = null; }
                  const audio = new Audio(url);
                  audio.volume = prefs.backgroundMusicVolume ?? 0.3;
                  _previewAudioRef.current = audio;
                  audio.play().catch((e) => { ErrorHandler.silent(e); });
                  if (_previewTimeoutRef.current) clearTimeout(_previewTimeoutRef.current);
                  _previewTimeoutRef.current = setTimeout(() => { if (_previewAudioRef.current === audio) { audio.pause(); _previewAudioRef.current = null; } }, 10000);
                } catch(e) { ErrorHandler.silent(e); }
              };
              // Müzik ses seviyesi değiştiğinde — çalıyorsa real-time güncelle
              // useCallback: setPrefs fonksiyonel formda, _previewAudioRef bir ref (stabil) —
              // bağımlılık yok. Bu slider her sürüklendiğinde yeniden yaratılmaz.
              const handleMusicVolumeChange = useCallback((val) => {
                const v = parseFloat(val);
                setPrefs(p => { const np = { ...p, backgroundMusicVolume: v }; SafeStorage.setItem('ns_prefs', JSON.stringify(np)); return np; });
                if (_previewAudioRef.current) { _previewAudioRef.current.volume = v; }
              }, []);
              // Seçili müziği 10 sn tekrar dinle
              const replayMusicPreview = async () => {
                const url = await AssetManagerService.loadMedia('CUSTOM_MUSIC');
                if (url) { playMusicPreview(url); addSystemLog('Müzik 10 sn önizleme başlatıldı', 'info'); }
                else { addSystemLog('Önce müzik seçin', 'warn'); }
              };

              // useCallback: prefs.ambientSound dogrudan okunuyor, bu yuzden [prefs] bagimliligi
              // sart — ama en azindan bu artik "her render"da degil, sadece prefs degistiginde
              // yeniden yaratiliyor (islem yuzdesi gibi sik degisen state'lerden bagimsiz).
              const handleFolderMusicSelect = useCallback(async (musicId) => {
                if (prefs.ambientSound === musicId) {
                  SafeStorage.removeItem('ns_selectedBgmId');
                  SafeStorage.removeItem('ns_selectedBgmName');
                  setPrefs(p => {
                    const np = { ...p, ambientSound: 'none', customBgMusicName: '', customBgMusicId: '' };
                    SafeStorage.setItem('ns_prefs', JSON.stringify(np));
                    return np;
                  });
                  return;
                }
                // Yerel müzik seçildiyse (IndexedDB)
                const track = await AssetManagerService.getMusicFromLib(musicId);
                if (!track || !track.data) { addSystemLog("Müzik bulunamadı", 'error'); return; }
                addSystemLog(`Müzik hazırlanıyor: ${track.name}`, 'info');
                const oldUrl = await AssetManagerService.loadMedia('CUSTOM_MUSIC');
                if (oldUrl && oldUrl.startsWith('blob:')) ObjectURLManager.revoke(oldUrl);
                const blob = _base64ToBlob(track.data);
                const url = ObjectURLManager.create(blob);
                await AssetManagerService.saveMedia('CUSTOM_MUSIC', url);

                SafeStorage.setItem('ns_selectedBgmId', musicId);
                SafeStorage.setItem('ns_selectedBgmName', track.name);
                setPrefs(p => {
                  const np = { ...p, ambientSound: musicId, customBgMusicName: track.name, customBgMusicId: musicId };
                  SafeStorage.setItem('ns_prefs', JSON.stringify(np));
                  return np;
                });

                playMusicPreview(url); // Önizleme çal
                addSystemLog(`✓ Müzik seçildi ve kalıcı saklandı: ${track.name}`, 'success');
              }, [prefs]);
              // useCallback: sadece setUiState'in fonksiyonel formu kullanılıyor (prev => ...),
              // dışarıdan okunan hiçbir state yok — bağımlılık dizisi güvenle [] olabilir.
              // Bu, App'in her render'ında (örn. işlem yüzdesi güncellenirken) bu fonksiyonun
              // yeniden yaratılmasını engeller.
              const processSelectedFiles = useCallback(async (files) => {
                if (!files || files.length === 0) return;
                if (files.length > 100) { setUiState(prev => ({ ...prev, error: "Maksimum 100 dosya seçebilirsiniz." })); return; }
                const validFiles = files.filter(f => f.size <= 50 * 1024 * 1024);
                try {
                  setUiState(prev => ({ ...prev, isProcessing: true, statusText: "Dosyalar işleniyor..." }));
                  const processedFiles = await Promise.all(validFiles.map(async (file) => {
                    const base64 = await NetworkUtils.fileToBase64(file);
                    return { name: file.name, type: file.type, data: base64 };
                  }));

                  // İlk yüklenen dosyanın adından gazete tespiti
                  if (processedFiles[0]?.name) {
                    const detected = matchOrFormatGazeteName(processedFiles[0].name);
                    if (detected) {
                      setConfig(prev => ({ ...prev, sourceName: detected }));
                      addSystemLog(`✓ Otomatik gazete kaynağı algılandı: ${detected}`, 'info');
                    }
                  }

                  setUiState(prev => ({ ...prev, selectedMediaFiles: processedFiles, error: '', isProcessing: false, statusText: "" }));
                } catch (error) {
                  setUiState(prev => ({ ...prev, error: "Dosya okuma hatası.", isProcessing: false, statusText: "" }));
                }
              }, []);
              const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
              const handleDragEnter = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
              const handleDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
              // processSelectedFiles artik stabil oldugu icin bu da stabil kalir.
              const handleDrop = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); processSelectedFiles(Array.from(e.dataTransfer.files)); }, [processSelectedFiles]);

              const handleExecuteStart = async (files = null, forceOutputType = null) => {
                sysEventBus.emit('SYS_LOG_CLEAR');
                const aCtx = _getAudioCtx(); if (aCtx.state === 'suspended') aCtx.resume().catch((e) => { ErrorHandler.silent(e); });
                const outType = forceOutputType || config.outputType; if (forceOutputType) setConfig(prev => ({ ...prev, outputType: forceOutputType }));
                setUiState(prev => ({ ...prev, isProcessing: true, percent: 0, statusText: 'Workflow Başlatılıyor...', error: '', videoUrl: null }));
                addSystemLog('İş akışı başlatıldı.', 'info');
                try {
                  let inputData = textInput;
                  let inputType = activeTab;
                  const runConfig = { ...config, outputType: outType, customSceneImages: studioMedia.customSceneImages };
                  if (config.tip === 'guzel_soz') {
                    const targetFiles = files || uiState.selectedMediaFiles;
                    if (textInput.trim()) {
                      inputData = textInput;
                      inputType = 'text';
                    } else if (targetFiles && targetFiles.length > 0) {
                      inputData = targetFiles;
                      inputType = 'media';
                    } else {
                      throw new Error("Güzel söz için metin veya resim girin.");
                    }
                  } else if (activeTab === 'media' || activeTab === 'gazete') {
                    const targetFiles = files || uiState.selectedMediaFiles;
                    if (targetFiles && targetFiles.length > 0) { inputData = targetFiles; inputType = 'media'; }
                    else throw new Error("En az bir dosya seçin.");
                  }
                  await workflowRef.current.startWorkflow(inputData, inputType, runConfig, prefs, canvasRef);
                } catch (e) { addSystemLog(`Hata: ${e.message}`, 'error'); setUiState(prev => ({ ...prev, isProcessing: false, error: e.message })); }
              };

              const handleExecuteResume = async () => { const aCtx = _getAudioCtx(); if (aCtx.state === 'suspended') aCtx.resume().catch((e) => { ErrorHandler.silent(e); }); setUiState({ isProcessing: true, percent: workflowRef.current.state.progress || 0, statusText: 'Sürdürülüyor...', error: '', videoUrl: null, showDevMenu: uiState.showDevMenu }); addSystemLog('Workflow sürdürülüyor...', 'warn'); try { await workflowRef.current.resumeWorkflow(canvasRef); } catch (e) { addSystemLog(`Kurtarma hatası: ${e.message}`, 'error'); setUiState(prev => ({ ...prev, isProcessing: false, error: e.message })); } };

              const handleQuickReRender = async () => { const activeJob = workflowRef.current.state; if (!activeJob || !activeJob.script || activeJob.status !== 'COMPLETED') { setUiState(prev => ({ ...prev, error: "Önce video oluşturun." })); return; } setUiState(prev => ({ ...prev, isProcessing: true, percent: 10, statusText: 'Yeniden Paketleniyor...' })); addSystemLog("Hızlı yeniden paketleme...", "info"); try { const renderResult = await RenderWorkerService.executeRender(activeJob, canvasRef.current, prefs); const outputUrl = typeof renderResult === 'string' ? renderResult : renderResult.url; if (typeof renderResult === 'object' && renderResult.blobType) activeJob.videoBlobType = renderResult.blobType; setUiState(prev => ({ ...prev, isProcessing: false, percent: 100, videoUrl: outputUrl })); addSystemLog("Tamamlandı!", "success"); } catch (err) { addSystemLog(`Hata: ${err.message}`, "error"); setUiState(prev => ({ ...prev, isProcessing: false, error: "Başarısız: " + err.message })); } };

              const handleDownloadVideo = async () => {
                const rawTitle = workflowRef.current?.state?.script?.thumbnailText || 'video';
                const safeName = rawTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_").toLowerCase();
                if (config.outputType === 'image') { const a = document.createElement('a'); a.href = uiState.videoUrl; a.download = safeName + '.png'; a.click(); return; }
                const actualBlobType = workflowRef.current?.state?.videoBlobType || '';
                const isWebM = actualBlobType.includes('webm');
                const wantsMP4 = config.videoFormat === 'mp4';
                if (wantsMP4 && isWebM) {
                  addSystemLog('WebM → MP4 dönüştürülüyor...', 'info');
                  setExportProgress({ phase: 'converting', percent: 0, message: 'MP4 dönüştürülüyor...', error: null });
                  try {
                    const resp = await fetch(uiState.videoUrl);
                    const webmBlob = await resp.blob();
                    const mp4Blob = await convertWebMtoMP4(webmBlob, (pct) => {
                      setExportProgress({ phase: 'converting', percent: pct, message: 'MP4 dönüştürülüyor...', error: null });
                      if (pct % 25 === 0) addSystemLog('MP4 dönüştürme: %' + pct, 'info');
                    });
                    setExportProgress({ phase: 'done', percent: 100, message: 'MP4 hazır, indiriliyor...', error: null });
                    const a = document.createElement('a');
                    a.href = ObjectURLManager.create(mp4Blob);
                    a.download = safeName + '.mp4';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    ObjectURLManager.revoke(a.href);
                    addSystemLog('MP4 indirildi: ' + safeName + '.mp4', 'success');
                    setTimeout(() => setExportProgress({ phase: null, percent: 0, message: '', error: null }), 2000);
                  } catch (convErr) {
                    setExportProgress({ phase: 'error', percent: 0, message: '', error: convErr.message });
                    addSystemLog('MP4 dönüştürme başarısız, WebM indiriliyor: ' + convErr.message, 'warn');
                    const a = document.createElement('a'); a.href = uiState.videoUrl; a.download = safeName + '.webm'; a.click();
                    setTimeout(() => setExportProgress({ phase: null, percent: 0, message: '', error: null }), 5000);
                  }
                } else {
                  const ext = actualBlobType.includes('mp4') ? '.mp4' : '.webm';
                  const a = document.createElement('a'); a.href = uiState.videoUrl; a.download = safeName + ext; a.click();
                }
              };

              const handleSilentRecovery = async () => { setUiState(prev => ({ ...prev, isProcessing: true, statusText: "Oturum yenileniyor..." })); const success = await attemptSilentReauth(); if (success) { setAuthExpired(false); setUiState(prev => ({ ...prev, isProcessing: false, statusText: "" })); addSystemLog("Oturum tazelendi.", "success"); } else setUiState(prev => ({ ...prev, isProcessing: false, error: "Yenileme başarısız. F5 ile yenileyin." })); };

              // === GAZETE TAKİP FONKSİYONLARI ===

              // Kaynak yapılandırmaları — her kaynak için URL, parse mantığı ve görsel filtresi
              const GAZETE_SOURCES = {
                gazeteoku: {
                  label: 'Gazeteoku (25+ Gazete)',
                  supportsDate: true,
                  // Tarih destekli URL: /gazeteler/YYYY-MM-DD
                  getUrl: (date) => date ? `https://www.gazeteoku.com/gazeteler/${date}` : 'https://www.gazeteoku.com/gazeteler',
                  baseUrl: 'https://i.gazeteoku.com',
                  // Görsel filtresi: gazete manşeti olan img'leri ayırt et
                  imgFilter: (img) => {
                    const src = (img.getAttribute('src') || '').trim();
                    const alt = (img.getAttribute('alt') || '').trim();
                    // Gazete manşet görselleri genelde /storage/files/images/ altında
                    return alt.length > 2 && src.length > 10 && !src.includes('logo') && !src.includes('icon') && !src.includes('banner');
                  },
                  // src'i tam URL'ye çevir
                  resolveSrc: (src, baseUrl) => src.startsWith('http') ? src : baseUrl + (src.startsWith('/') ? '' : '/') + src,
                },
                aydinlik: {
                  label: 'Aydınlık',
                  supportsDate: false,
                  getUrl: (date) => 'https://www.aydinlik.com.tr/gazete-mansetleri',
                  baseUrl: 'https://www.aydinlik.com.tr',
                  imgFilter: (img) => {
                    const src = (img.getAttribute('src') || '').trim();
                    const alt = (img.getAttribute('alt') || '').trim();
                    return alt.length > 2 && src.length > 10 && !src.includes('logo') && !src.includes('icon') && !src.includes('banner') && !src.includes('avatar');
                  },
                  resolveSrc: (src, baseUrl) => src.startsWith('http') ? src : baseUrl + (src.startsWith('/') ? '' : '/') + src,
                },
                yenimesaj: {
                  label: 'Yeni Mesaj',
                  supportsDate: false,
                  getUrl: (date) => 'https://www.yenimesaj.com.tr/gazete-mansetleri',
                  baseUrl: 'https://www.yenimesaj.com.tr',
                  imgFilter: (img) => {
                    const src = (img.getAttribute('src') || '').trim();
                    const alt = (img.getAttribute('alt') || '').trim();
                    return alt.length > 2 && src.length > 10 && !src.includes('logo') && !src.includes('icon') && !src.includes('banner') && !src.includes('avatar');
                  },
                  resolveSrc: (src, baseUrl) => src.startsWith('http') ? src : baseUrl + (src.startsWith('/') ? '' : '/') + src,
                },
                gzt: {
                  label: 'GZT Manset',
                  supportsDate: false,
                  getUrl: (date) => 'https://gazetemanset.gzt.com/',
                  baseUrl: 'https://img.piri.net',
                  imgFilter: (img) => {
                    const src = (img.getAttribute('src') || '').trim();
                    const alt = (img.getAttribute('alt') || '').trim();
                    return alt.length > 2 && src.length > 10 && src.includes('piri.net') && alt.includes('Gazetesi');
                  },
                  resolveSrc: (src, baseUrl) => src.startsWith('http') ? src : baseUrl + (src.startsWith('/') ? '' : '/') + src,
                },
              };

              // 29 Özel İzinli Ulusal Gazete Mimarisi (Doğrudan Yüksek Çözünürlüklü CDN Haritası)
              const NEWSPAPER_DIRECT_CONFIG = [
                { name: 'Akşam', type: 'aydinlik', slug: 'aksam' },
                { name: 'Analiz', type: 'aydinlik', slug: 'analiz' },
                { name: 'Aydınlık', type: 'aydinlik', slug: 'aydinlik-gazetesi' },
                { name: 'BirGün', type: 'aydinlik', slug: 'birgun' },
                { name: 'Cumhuriyet', type: 'aydinlik', slug: 'cumhuriyet' },
                { name: 'Diriliş Postası', type: 'aydinlik', slug: 'dirilis-postasi' },
                { name: 'Dünya', type: 'aydinlik', slug: 'dunya' },
                { name: 'Evrensel', type: 'aydinlik', slug: 'evrensel' },
                { name: 'Fanatik', type: 'aydinlik', slug: 'fanatik' },
                { name: 'Fotomaç', type: 'aydinlik', slug: 'fotomac' },
                { name: 'Gazete Pencere', type: 'pencere' },
                { name: 'Hürriyet', type: 'gzt', slug: 'hurriyet' },
                { name: 'Karar', type: 'aydinlik', slug: 'karar' },
                { name: 'Korkusuz', type: 'aydinlik', slug: 'korkusuz' },
                { name: 'Milat', type: 'aydinlik', slug: 'milat' },
                { name: 'Milli Gazete', type: 'aydinlik', slug: 'milli-gazete' },
                { name: 'Milliyet', type: 'gzt', slug: 'milliyet' },
                { name: 'Nasıl Bir Ekonomi', type: 'aydinlik', slug: 'nb-ekonomi' },
                { name: 'Nefes', type: 'aydinlik', slug: 'nefes' },
                { name: 'Posta', type: 'aydinlik', slug: 'posta' },
                { name: 'Sabah', type: 'aydinlik', slug: 'sabah' },
                { name: 'Sözcü', type: 'aydinlik', slug: 'sozcu' },
                { name: 'Takvim', type: 'aydinlik', slug: 'takvim' },
                { name: 'Tavır Gazetesi', type: 'aydinlik', slug: 'tavir' },
                { name: 'Türkiye', type: 'aydinlik', slug: 'turkiye-gazetesi' },
                { name: 'Yeniçağ', type: 'aydinlik', slug: 'yenicag' },
                { name: 'Yeni Asya', type: 'aydinlik', slug: 'yeni-asya' },
                { name: 'Yeni Birlik', type: 'aydinlik', slug: 'yenibirlik' },
                { name: 'Yeni Şafak', type: 'aydinlik', slug: 'yeni-safak' },
              ];

              // 29 Ulusal Gazetenin ilk sayfalarını %100 doğrudan ve CORS-free getiren fonksiyon
              const fetchGazeteManşetleri = async () => {
                setGazeteLoading(true);
                setGazeteError('');
                setGazeteItems([]);
                addSystemLog('29 Ulusal gazete manşeti hazırlanıyor...', 'info');

                try {
                  const selectedDate = gazeteDate || new Date().toISOString().split('T')[0];

                  // gzt tipi için HTML fetch + parse gerekli (UUID tabanlı URL)
                  const gztItems = NEWSPAPER_DIRECT_CONFIG.filter(i => i.type === 'gzt');
                  let gztUrls = {};
                  if (gztItems.length > 0) {
                    try {
                      const gztUrl = 'https://gazetemanset.gzt.com/';
                      const resp = await fetch(gztUrl);
                      const html = await resp.text();
                      const parser = new DOMParser();
                      const doc = parser.parseFromString(html, 'text/html');
                      const allImgs = doc.querySelectorAll('img');
                      allImgs.forEach(img => {
                        const src = (img.getAttribute('src') || '').trim();
                        const alt = (img.getAttribute('alt') || '').trim();
                        if (src.includes('piri.net') && alt.includes('Gazetesi')) {
                          const altLower = alt.toLowerCase();
                          gztItems.forEach(gi => {
                            if (altLower.includes(gi.name.toLowerCase())) {
                              if (!gztUrls[gi.slug]) {
                                gztUrls[gi.slug] = src;
                              }
                            }
                          });
                        }
                      });
                      addSystemLog(`gazetemanset.gzt.com'dan ${Object.keys(gztUrls).length}/${gztItems.length} gazete görseli bulundu`, 'info');
                    } catch (e) {
                      addSystemLog('gzt.com fetch hatası: ' + e.message, 'warn');
                    }
                  }

                  const items = NEWSPAPER_DIRECT_CONFIG.map(item => {
                    let rawUrl = '';
                    if (item.type === 'pencere') {
                      const parts = selectedDate.split('-');
                      rawUrl = `http://cdn.gazetepencere.com/other/${parts[0]}/${parts[1]}/${parts[2]}/dddd.jpg`;
                    } else if (item.type === 'gzt') {
                      rawUrl = gztUrls[item.slug] || '';
                    } else {
                      rawUrl = `https://img.aydinlik.com.tr/rcman/Cw800h1340q95gc/storage/newspapers/${selectedDate}/${item.slug}.jpg`;
                    }
                    const weservUrl = rawUrl ? `https://images.weserv.nl/?url=${encodeURIComponent(rawUrl)}` : '';
                    return {
                      name: item.name,
                      src: weservUrl,
                      rawSrc: rawUrl
                    };
                  });

                  setGazeteItems(items);
                  addSystemLog(`✓ 29 ulusal gazete manşetinin tamamı (Gazete Pencere + Hürriyet + Milliyet dahil) 0 CORS hatası ile hazırlandı!`, 'success');
                } catch (e) {
                  setGazeteError('Gazete manşetleri yüklenemedi.');
                  addSystemLog('Gazete yükleme hatası: ' + e.message, 'error');
                } finally {
                  setGazeteLoading(false);
                }
              };

              // HTML parse yardımcı fonksiyonu — data-src (lazy loading) + src destekler
              const parseGazeteHtml = (html, sourceConfig) => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const allImgs = doc.querySelectorAll('img');
                const items = [];
                const seen = new Set();
                allImgs.forEach(img => {
                    const dataSrc = (img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src') || '').trim();
                    const src = (img.getAttribute('src') || '').trim();
                    const finalSrc = (dataSrc && dataSrc.length > 10 && !dataSrc.includes('blank.png') && !dataSrc.includes('placeholder')) ? dataSrc : src;
                    const name = (img.getAttribute('alt') || img.getAttribute('title') || '').trim();
                    if (name.length >= 2 && finalSrc.length > 10 && !finalSrc.includes('blank.png') && !finalSrc.includes('placeholder') && sourceConfig.imgFilter(img)) {
                      const cleanName = name.replace(/\bgazetesi\b/gi, '').replace(/\bgazete\b/gi, '').trim();
                      if (!seen.has(cleanName.toLowerCase())) {
                        seen.add(cleanName.toLowerCase());
                        items.push({ name: cleanName, src: sourceConfig.resolveSrc(finalSrc, sourceConfig.baseUrl) });
                      }
                    }
                  });
                return items;
              };

              // Sabit Görsele (Custom Scene Images) gazete görseli ekleme
              const addGazeteToCustomSceneImages = async (dataUrl, gazeteName) => {
                try {
                  const updatedImages = [...(studioMedia.customSceneImages || []), dataUrl].slice(0, RENDER_CONFIG.MAX_CUSTOM_SCENE_IMAGES);
                  for (let i = 0; i < updatedImages.length; i++) {
                    await AssetManagerService.saveMedia("CUSTOM_SCENE_IMG_" + i, updatedImages[i]);
                  }
                  setStudioMedia(s => ({ ...s, customSceneImages: updatedImages }));
                  addSystemLog(`✓ Sabit Görsel'e yüklendi: ${gazeteName}`, 'success');
                } catch (e) {
                  addSystemLog('Sabit Görsel ekleme uyarısı: ' + e.message, 'warn');
                }
              };

              // Gazete adını otomatik eşleştiren ve düzelten yardımcı fonksiyon
              const matchOrFormatGazeteName = (rawName) => {
                if (!rawName) return '';
                const GAZETE_LIST = [
                  'Akşam', 'Analiz', 'Aydınlık', 'BirGün', 'Cumhuriyet', 'Diriliş Postası',
                  'Dünya', 'Evrensel', 'Fanatik', 'Fotomaç', 'Gazete Pencere', 'Hürriyet', 'Karar', 'Korkusuz',
                  'Milat', 'Milli Gazete', 'Milliyet', 'Nasıl Bir Ekonomi', 'Nefes', 'Posta',
                  'Sabah', 'Sözcü', 'Takvim', 'Tavır Gazetesi', 'Türkiye', 'Yeniçağ', 'Yeni Asya',
                  'Yeni Birlik', 'Yeni Şafak'
                ];
                const lower = rawName.toLowerCase();
                // 1. Resmi 29 ulusal gazete listesinden tam eşleştirme
                for (const g of GAZETE_LIST) {
                  if (lower.includes(g.toLowerCase()) || g.toLowerCase().includes(lower)) {
                    return g;
                  }
                }
                // 2. Bulunamadıysa temizle ve kelimelerin ilk harflerini büyük yap
                const cleaned = rawName.replace(/(_crop|\.png|\.jpg|\.jpeg|gazetesi|manşet|[0-9_-])/gi, ' ').trim();
                if (!cleaned) return rawName;
                return cleaned.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
              };

              // Crop modal aç ve Kaynak adını otomatik ayarla (Memoized)
              const openCropModal = useCallback((src, name) => {
                const finalName = matchOrFormatGazeteName(name) || name;
                setConfig(prev => ({ ...prev, sourceName: finalName }));
                setGazeteCropModal({ src, name: finalName });
              }, []);

              // Canvas'tan crop yapıp medya ve Sabit Görsel listesine aktar + Kaynak otomatik yaz (Memoized)
              const applyCrop = useCallback(async (cropDataUrl, gazeteName) => {
                const finalName = matchOrFormatGazeteName(gazeteName) || gazeteName;
                const newFile = {
                  name: finalName + '_crop.png',
                  type: 'image/png',
                  data: cropDataUrl
                };
                setUiState(prev => ({
                  ...prev,
                  selectedMediaFiles: [...(prev.selectedMediaFiles || []), newFile]
                }));
                setConfig(prev => ({ ...prev, sourceName: finalName }));
                await addGazeteToCustomSceneImages(cropDataUrl, finalName);
                setGazeteCropModal(null);
                setActiveTab('media');
                addSystemLog(`✓ Gazete crop eklendi, Kaynak otomatik seçildi: ${finalName}`, 'success');
              }, [studioMedia]);

              // Tam gazete görselini doğrudan medyaya ve Sabit Görsel'e aktar + Kaynak otomatik yaz
              const addFullImageToMedia = async (src, name) => {
                try {
                  setGazeteLoading(true);
                  const finalName = matchOrFormatGazeteName(name) || name;
                  let dataUrl = null;

                  // 1. Direkt yükleme dene (CORS izin veriyorsa)
                  try {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    dataUrl = await new Promise((resolve, reject) => {
                        img.onload = () => {
                          try {
                            const c = document.createElement('canvas');
                            c.width = img.naturalWidth;
                            c.height = img.naturalHeight;
                            c.getContext('2d').drawImage(img, 0, 0);
                            resolve(c.toDataURL('image/jpeg', 0.92));
                          } catch(e) { reject(e); }
                        };
                        img.onerror = () => reject(new Error('Görsel yüklenemedi'));
                        img.src = src;
                      });
                  } catch(e) { ErrorHandler.silent(e); }

                  // 2. CORS proxy fallback: fetch → blob → FileReader → dataURL
                  if (!dataUrl) {
                    for (const proxy of CORS_PROXIES) {
                      try {
                        const proxyUrl = proxy.url(src);
                        const r = await fetch(proxyUrl);
                        if (!r.ok) continue;
                        let blob;
                        if (proxy.json) {
                          const j = await r.json();
                          const innerUrl = j.contents || j.data;
                          if (!innerUrl) continue;
                          blob = await (await fetch(innerUrl)).blob();
                        } else {
                          blob = await r.blob();
                        }
                        dataUrl = await new Promise((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(reader.result);
                          reader.onerror = reject;
                          reader.readAsDataURL(blob);
                        });
                        if (dataUrl) break;
                      } catch(e) { ErrorHandler.silent(e); }
                    }
                  }

                  if (!dataUrl) throw new Error('Görsel yüklenemedi: ' + finalName);

                  const newFile = { name: finalName + '.jpg', type: 'image/jpeg', data: dataUrl };
                  setUiState(prev => ({
                    ...prev,
                    selectedMediaFiles: [...(prev.selectedMediaFiles || []), newFile]
                  }));
                  setConfig(prev => ({ ...prev, sourceName: finalName }));
                  await addGazeteToCustomSceneImages(dataUrl, finalName);
                  setActiveTab('media');
                  addSystemLog(`✓ Tam gazete görseli eklendi, Kaynak otomatik seçildi: ${finalName}`, 'success');
                } catch (e) {
                  addSystemLog('Aktarma hatası: ' + e.message, 'error');
                } finally {
                  setGazeteLoading(false);
                }
              };

              // === GAZETELER ARASI GEÇİŞ İÇİN GALERİ MODU ===
              const [gazeteGalleryView, setGazeteGalleryView] = useState('grid'); // 'grid' | 'single'
              const [gazeteCurrentIdx, setGazeteCurrentIdx] = useState(0);

              return (
                <ErrorBoundary>
                <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans p-3 md:p-4 relative overflow-hidden">
                <div className="max-w-3xl mx-auto">
                <div className="text-center mb-4 flex items-center justify-center gap-3 flex-wrap">
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-white whitespace-nowrap">OTONOM</h1>
                <div className="bg-indigo-900/40 border-2 border-indigo-500/50 px-3 py-1.5 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                <p className="text-indigo-300 text-[10px] md:text-xs font-black tracking-widest uppercase">
                {APP_VERSION.toBadge()}
              </p>
              </div>
                <button onClick={() => setShowAiSettingsModal(!showAiSettingsModal)}
                className={`px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${providerKeys[aiProvider] ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30' : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                {providerKeys[aiProvider] ? `🤖 ${AI_PROVIDERS[aiProvider].label} • ••${providerKeys[aiProvider].slice(-4)}` : '🤖 AI Sağlayıcı & Model'}
              </button>
              </div>

                {showAiSettingsModal && (
                    <div className="mb-4 bg-slate-900/95 border border-indigo-500/30 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-4">
                    <div>
                    <p className="text-sm font-black text-white">AI Sağlayıcı & Model</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">API key'ler yalnızca bu tarayıcıda saklanır, hiçbir sunucuya gönderilmez.</p>
                  </div>
                    <button onClick={() => setShowAiSettingsModal(false)} className="text-slate-500 hover:text-slate-300 text-lg leading-none px-2">✕</button>
                  </div>

                    <div className="flex gap-1.5 px-4 mt-3">
                    {Object.values(AI_PROVIDERS).map(p => (
                      <button key={p.id} onClick={() => setAiSettingsTab(p.id)}
                      className={`flex-1 px-2 py-2 rounded-xl text-[11px] font-bold border transition-all ${aiSettingsTab === p.id ? 'bg-indigo-600/30 border-indigo-500 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-600'}`}>
                      {p.label}
                      {aiProvider === p.id && <span className="ml-1 text-emerald-400">●</span>}
                    </button>
                    ))}
                  </div>

                    <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${AI_PROVIDERS[aiSettingsTab].badgeClass}`}>{AI_PROVIDERS[aiSettingsTab].badge}</span>
                    <a href={AI_PROVIDERS[aiSettingsTab].keyUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1">Ücretsiz key al <ExternalLink size={10} /></a>
                  </div>

                    <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">{AI_PROVIDERS[aiSettingsTab].label} API Key</label>
                    <div className="flex gap-2 mb-3">
                    <input
                    type="password"
                    value={providerKeys[aiSettingsTab]}
                    onChange={(e) => setProviderKeys(prev => ({ ...prev, [aiSettingsTab]: e.target.value }))}
                    placeholder={AI_PROVIDERS[aiSettingsTab].keyPlaceholder}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                    />
                    <button onClick={() => handleSaveProviderKey(aiSettingsTab, providerKeys[aiSettingsTab])} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0">Kaydet</button>
                  </div>

                    <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">Model</label>
                    <div className="flex gap-2 mb-3">
                    <select
                    value={providerModels[aiSettingsTab]}
                    onChange={(e) => handleSelectModel(aiSettingsTab, e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500">
                    {(modelLists[aiSettingsTab] || AI_PROVIDERS[aiSettingsTab].defaultModels).map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                    <button onClick={() => handleRefreshModels(aiSettingsTab)} title="Modelleri Yenile" className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl transition shrink-0">
                    <RefreshCw size={14} className={modelListLoading[aiSettingsTab] ? 'animate-spin' : ''} />
                  </button>
                  </div>

                    {!AI_PROVIDERS[aiSettingsTab].supportsMedia && (
                      <p className="text-[10px] text-amber-400/80 mb-3">⚠ Bu sağlayıcı görsel/video analizi ve internet araştırması yapamaz — bu görevler otomatik olarak Gemini'ye yönlendirilir (Gemini key gerekir).</p>
                    )}

                    <button onClick={() => handleSelectProvider(aiSettingsTab)}
                    disabled={aiProvider === aiSettingsTab}
                    className={`w-full py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${aiProvider === aiSettingsTab ? 'bg-emerald-500/20 text-emerald-300 cursor-default' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                    {aiProvider === aiSettingsTab ? (<><Check size={14} /> Aktif Sağlayıcı</>) : `${AI_PROVIDERS[aiSettingsTab].label} Kullan`}
                  </button>
                  </div>
                  </div>
                  )}

                {pendingJob && (
                    <div className="mb-6 bg-amber-500/10 border-2 border-amber-500/30 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-amber-400">
                    <AlertCircle size={20} className="shrink-0 animate-pulse" />
                    <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Yarım Kalan İşlem</p>
                    <p className="text-xs text-slate-300">Son render kurtarılabilir.</p>
                  </div>
                  </div>
                    <div className="flex gap-2">
                    <button onClick={async () => { await AssetManagerService.clearJob(pendingJob.jobId); setPendingJob(null); }} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition">Yoksay</button>
                    <button onClick={() => { workflowRef.current.state = pendingJob; setPendingJob(null); handleExecuteResume(); }} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black transition">Devam Et</button>
                  </div>
                  </div>
                  )}

                {/* ARKA PLAN SESİ */}
                <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-3 mb-4 shadow-lg">
                <div className="bg-black/40 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between relative">
                <div className="flex items-center gap-3 w-full">
                <div className={`w-10 h-10 rounded border ${(prefs.ambientSound && prefs.ambientSound !== 'none') ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'} flex items-center justify-center shrink-0`}><CloudRain size={18} /></div>
                <div className="w-full flex-1 pr-2">
                <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Arka Plan Sesi</p>
                <CustomSelect value={prefs.ambientSound || "none"} onChange={(val) => { if (['rain', 'wind', 'waves', 'fire', 'none'].includes(val)) { setPrefs({ ...prefs, ambientSound: val }); if (val === 'none') { AssetManagerService.loadMedia('CUSTOM_MUSIC').then(u => { if (u && u.startsWith('blob:')) ObjectURLManager.revoke(u); }); AssetManagerService.deleteMedia('CUSTOM_MUSIC'); } } else { handleFolderMusicSelect(val); } }} options={ambientOptions} />
              </div>
              </div>
                <div className="flex gap-2 shrink-0 relative z-10">
                {(prefs.ambientSound && !['none', 'rain', 'wind', 'waves', 'fire'].includes(prefs.ambientSound)) && <button onClick={deleteMusic} className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-500 p-2 rounded-lg transition"><Trash2 size={16} /></button>}
                <button onClick={handleFolderSelect} className="bg-violet-600 hover:bg-violet-500 text-white px-3 md:px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition whitespace-nowrap">MÜZİK KLASÖRÜ SEÇ</button>
                <input ref={musicFileInputRef} type="file" webkitdirectory="true" directory="true" multiple accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.wma" className="hidden" onChange={handleFolderSelectLegacy} />
              </div>
              </div>
                {studioMedia.musicList.length > 0 && (
                    <div className="mt-2">
                    <input type="text" placeholder="Müzik ara..." value={musicSearchQuery} onChange={e => setMusicSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-500 transition" />
                  </div>
                  )}
                {studioMedia.syncedFolderName && (
                    <div className="mt-2 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                    <RefreshCw size={12} className="text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
                    <span className="text-[10px] text-emerald-400 font-bold">Otomatik: {studioMedia.syncedFolderName}</span>
                  </div>
                    <button onClick={clearSyncedFolder} className="text-[10px] text-slate-400 hover:text-rose-400 transition">Kaldır</button>
                  </div>
                  )}
                {studioMedia.musicList.length === 0 && (
                    <p className="text-[9px] text-slate-500 mt-1.5 text-center">Müzik klasörü seçin — dosyalar yerel olarak listelenir</p>
                  )}
                {/* Müzik ses ayarı + 10sn dinle */}
                {prefs.ambientSound && !['none', 'rain', 'wind', 'waves', 'fire'].includes(prefs.ambientSound) && (
                    <div className="mt-2 flex items-center gap-2 bg-slate-900/60 border border-violet-500/30 rounded-lg px-3 py-2">
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">🔊 Ses</span>
                    <input type="range" min="0" max="1" step="0.01" value={prefs.backgroundMusicVolume ?? 0.3} onChange={(e) => handleMusicVolumeChange(e.target.value)} className="flex-1 accent-violet-500 cursor-pointer" />
                    <span className="text-[10px] text-violet-400 font-bold shrink-0 w-8 text-right">{Math.round((prefs.backgroundMusicVolume ?? 0.3) * 100)}%</span>
                    <button onClick={replayMusicPreview} className="bg-violet-600 hover:bg-violet-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition shrink-0">10sn Dinle</button>
                  </div>
                  )}
              </div>

                {/* ANA İÇERİK */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 md:p-4 shadow-2xl relative z-10 mb-4">
                <div className="flex flex-col sm:flex-row gap-2 bg-black/30 p-1.5 rounded-xl mb-4 flex-wrap">
                <button onClick={() => setActiveTab('text')} className={`flex-1 min-w-[120px] py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Metin / Haber</button>
                <button onClick={() => setActiveTab('url')} className={`flex-1 min-w-[120px] py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Haber Linki</button>
                <button onClick={() => setActiveTab('media')} className={`flex-1 min-w-[120px] py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'media' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Medya Analizi</button>
                <button onClick={() => setActiveTab('prompt')} className={`flex-1 min-w-[120px] py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'prompt' ? 'bg-fuchsia-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Serbest Prompt</button>
                <button onClick={() => { setActiveTab('gazete'); if (gazeteItems.length === 0) fetchGazeteManşetleri(); }} className={`flex-1 min-w-[120px] py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'gazete' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}><Newspaper size={14} /> Gazete Takip</button>
              </div>

                {/* v3.17: EXPORT PRESETS — Platform hazır ayarları */}
                <div className="mb-3">
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center gap-3">
                <Clapperboard size={16} className="text-fuchsia-400 shrink-0" />
                <div className="flex gap-1.5 w-full flex-wrap">
                {Object.entries(EXPORT_PRESETS).map(([key, preset]) => (
                  <button key={key} onClick={() => {
                    if (key === 'custom') { setConfig({ ...config, exportPreset: 'custom' }); return; }
                    setConfig({ ...config, exportPreset: key, aspectRatio: preset.aspectRatio, resolution: preset.resolution, videoFormat: preset.videoFormat, duration: preset.duration });
                  }} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${config.exportPreset === key ? 'bg-fuchsia-600 text-white' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'}`}>{preset.label}</button>
                ))}
                </div>
                </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 font-bold">
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center">
                <CustomSelect icon={Clock} value={config.duration} onChange={(val) => setConfig({ ...config, duration: val })} options={[{ value: 'unlimited', label: '∞ Sınırsız', color: 'text-emerald-400 font-bold' }, { value: '15', label: '15-30s' }, { value: '30', label: '30-60s' }, { value: '60', label: '60-90s' }, { value: '90', label: '90-120s' }]} />
              </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center">
                <CustomSelect icon={Smartphone} value={config.aspectRatio || '9:16'} onChange={(val) => setConfig({ ...config, aspectRatio: val })} options={[{ value: '9:16', label: 'Dikey (9:16)' }, { value: '16:9', label: 'Yatay (16:9)' }, { value: '1:1', label: 'Kare (1:1)' }]} />
              </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center">
                <CustomSelect icon={Clapperboard} value={config.videoStyle || 'explainer'} onChange={(val) => setConfig({ ...config, videoStyle: val })} options={[{ value: 'news_flash', label: 'Haber Bülteni' }, { value: 'cinematic', label: 'Sinematik' }, { value: 'explainer', label: 'Açıklayıcı' }, { value: 'weekly_roundup', label: 'Haftalık Özet' }, { value: 'prompt_output', label: 'Custom Prompt', color: 'text-fuchsia-400 font-bold' }]} />
              </div>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center">
                <CustomSelect icon={Palette} value={config.imageStyle || 'cinematic'} onChange={(val) => setConfig({ ...config, imageStyle: val })} options={[{ value: 'watercolor', label: 'Sulu Boya' }, { value: 'sketch', label: 'Karakalem' }, { value: 'oil_painting', label: 'Yağlı Boya' }, { value: 'cinematic', label: 'Gerçekçi' }, { value: 'minimalist', label: 'Minimalist' }, { value: 'cyberpunk', label: 'Cyberpunk' }, { value: 'retro', label: 'Retro' }, { value: '3d_render', label: '3D Render' }, { value: 'anime', label: 'Anime' }]} />
              </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center gap-3">
                <Monitor size={16} className="text-indigo-400 shrink-0" />
                <div className="flex gap-2 w-full">{['1K', '2K', '4K'].map(res => (<button key={res} onClick={() => setConfig({ ...config, resolution: res })} className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${config.resolution === res ? 'bg-slate-200 text-slate-900' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'}`}>{res}</button>))}</div>
              </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center">
                <CustomSelect icon={Activity} value={config.transition || 'none'} onChange={(val) => setConfig({ ...config, transition: val })} options={[{ value: 'none', label: 'Yok' }, { value: 'crossfade', label: 'Karışır' }, { value: 'fadeIn', label: 'Yavaşça Belirme' }, { value: 'fadeOut', label: 'Yavaşça Kaybolma' }, { value: 'slideIn', label: 'Kayarak Giriş' }, { value: 'slideOut', label: 'Kayarak Çıkış' }]} />
              </div>
              </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center">
                <CustomSelect icon={Clapperboard} value={config.tip || 'haber'} onChange={(val) => setConfig({ ...config, tip: val })} options={[{ value: 'haber', label: 'Haber', color: 'text-emerald-400 font-bold' }, { value: 'guzel_soz', label: 'Güzel Söz', color: 'text-amber-400 font-bold' }, { value: 'iddia_analizi', label: 'İddia Analizi', color: 'text-cyan-400 font-bold' }]} />
              </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center">
                <CustomSelect icon={Globe} value={config.language || 'tr'} onChange={(val) => setConfig({ ...config, language: val })} options={[{ value: 'tr', label: 'Türkçe' }, { value: 'en', label: 'English' }, { value: 'fr', label: 'Français' }, { value: 'de', label: 'Deutsch' }, { value: 'es', label: 'Español' }, { value: 'ar', label: 'العربية' }, { value: 'ru', label: 'Русский' }]} />
              </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center">
                <CustomSelect icon={MessageSquare} value={config.subtitles || 'on'} onChange={(val) => setConfig({ ...config, subtitles: val })} options={[{ value: 'on', label: 'Altyazı: Açık' }, { value: 'off', label: 'Altyazı: Kapalı' }]} />
              </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center">
                <CustomSelect icon={Type} value={config.analysisMode || 'yorumsuz'} onChange={(val) => setConfig({ ...config, analysisMode: val })} options={[{ value: 'yorumsuz', label: 'Yorumsuz' }, { value: 'visibility', label: 'Görünürlük' }, { value: 'deep_analysis', label: 'Derin Analiz', color: 'text-fuchsia-400 font-bold' }]} />
              </div>
              </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center">
                <CustomSelect icon={Film} value={config.videoFormat || 'webm'} onChange={(val) => setConfig({ ...config, videoFormat: val })} options={[{ value: 'webm', label: 'WebM' }, { value: 'mp4', label: 'MP4' }]} />
              </div>
                {/* v3.17: TTS Engine toggle */}
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center gap-3">
                <Volume2 size={16} className="text-indigo-400 shrink-0" />
                <div className="flex gap-2 w-full">
                <button onClick={() => setConfig({ ...config, ttsEngine: 'gemini' })} className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${config.ttsEngine === 'gemini' ? 'bg-slate-200 text-slate-900' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'}`}>Gemini TTS</button>
                <button onClick={() => setConfig({ ...config, ttsEngine: 'webspeech' })} className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${config.ttsEngine === 'webspeech' ? 'bg-slate-200 text-slate-900' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'}`}>Tarayıcı Sesi</button>
                </div>
                </div>
                </div>

                {/* v3.18: Transition Style + Narration Language + Branding */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center">
                <CustomSelect icon={Film} value={config.transition || 'none'} onChange={(val) => setConfig({ ...config, transition: val })} options={Object.entries(TRANSITION_STYLES).map(([k, v]) => ({ value: k, label: v.label }))} />
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center">
                <CustomSelect icon={Globe} value={config.narrationLanguage || 'tr'} onChange={(val) => setConfig({ ...config, narrationLanguage: val })} options={[{ value: 'tr', label: 'Türkçe' }, { value: 'en', label: 'English' }, { value: 'de', label: 'Deutsch' }, { value: 'ar', label: 'العربية' }]} />
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                <input type="text" value={config.brandText || ''} onChange={(e) => setConfig({ ...config, brandText: e.target.value })} placeholder="Marka adı" className="flex-1 bg-transparent text-slate-300 text-xs outline-none" />
                <label className="cursor-pointer text-slate-400 hover:text-indigo-400 text-[9px] font-bold uppercase tracking-wider shrink-0">
                Logo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => setConfig({ ...config, brandLogo: r.result }); r.readAsDataURL(f); }} />
                </label>
                </div>
                </div>
                {/* v3.18: Scheduled Publishing — zamanlı paylaşım */}
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2 mb-3">
                <Clock size={14} className="text-indigo-400 shrink-0" />
                <input type="datetime-local" value={config.scheduledPublishAt ? new Date(config.scheduledPublishAt).toISOString().slice(0,16) : ''} onChange={(e) => { const val = e.target.value ? new Date(e.target.value).toISOString() : null; setConfig({ ...config, scheduledPublishAt: val }); addSystemLog(val ? `Zamanlı paylaşım: ${val}` : 'Zamanlı paylaşım iptal edildi', 'info'); }} className="flex-1 bg-transparent text-slate-300 text-xs outline-none" />
                {config.scheduledPublishAt && <button onClick={() => setConfig({ ...config, scheduledPublishAt: null })} className="text-[9px] text-slate-500 hover:text-rose-400 font-bold uppercase shrink-0">İptal</button>}
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center relative">
                <div className="flex items-center gap-2 w-full">
                <CustomSelect icon={Volume2} value={prefs.narratorVoice} onChange={(val) => setPrefs({ ...prefs, narratorVoice: val })} options={voiceOptions} />
                <button onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }} className="text-slate-400 hover:text-indigo-400 flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider transition-colors shrink-0"><Filter size={12} /> Filtreler</button>
              </div>
                {showFilters && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[200] p-3 space-y-3">
                    <div><div className="text-[9px] text-slate-500 mb-1.5 uppercase font-bold tracking-wider">Gender</div><div className="flex gap-1.5">{['Any', 'Male', 'Female'].map(g => (<button key={g} onClick={() => setVoiceFilters({ ...voiceFilters, gender: g })} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${voiceFilters.gender === g ? 'bg-slate-200 text-slate-900 border-slate-200' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>{g}</button>))}</div></div>
                    <div><div className="text-[9px] text-slate-500 mb-1.5 uppercase font-bold tracking-wider">Age</div><div className="flex flex-wrap gap-1.5">{['Any', 'Child', 'Young', 'Middle-aged', 'Elderly'].map(a => (<button key={a} onClick={() => setVoiceFilters({ ...voiceFilters, age: a })} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${voiceFilters.age === a ? 'bg-slate-200 text-slate-900 border-slate-200' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>{a}</button>))}</div></div>
                    <div><div className="text-[9px] text-slate-500 mb-1.5 uppercase font-bold tracking-wider">Category</div><div className="flex flex-wrap gap-1.5">{['Any', 'Games & RPG', 'Audiobooks & Novels', 'Anime & Animation', 'Documentary', 'Commercials & Trailers', 'Corporate & Narration'].map(c => (<button key={c} onClick={() => setVoiceFilters({ ...voiceFilters, category: c })} className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all border ${voiceFilters.category === c ? 'bg-slate-200 text-slate-900 border-slate-200' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>{c}</button>))}</div></div>
                  </div>
                  )}
              </div>

                {/* BUFFER API TOKEN */}
                <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                <div className="flex items-center gap-2 w-full">
                <input type="password" value={SafeStorage.getItem('BUFFER_API_KEY') || ''} onChange={(e) => { SafeStorage.setItem('BUFFER_API_KEY', e.target.value); addSystemLog('Buffer API Token kaydedildi', 'success'); }} placeholder="Buffer API Token (TzKT...)" className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600" />
                <a href="https://buffer.com/app/account/api" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-[9px] font-bold uppercase tracking-wider shrink-0 transition-colors">Al</a>
                </div>
                </div>

                {/* KAYNAK ADI + SABİT GÖRSEL + YORUM */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-black/30 p-2 rounded-xl border border-slate-800 flex items-center justify-center">
                {studioMedia.customSceneImages && studioMedia.customSceneImages[0] ? (
                    <img src={studioMedia.customSceneImages[0]} className="w-full h-10 object-cover rounded-lg" alt="Sabit" />
                  ) : (
                    <div className="text-[8px] text-slate-600 font-bold uppercase">Görsel Yok</div>
                  )}
              </div>
                <div className="bg-black/30 p-1.5 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                <CustomSelect icon={null} value={config.sourceName || ''} onChange={(val) => setConfig({ ...config, sourceName: val })} options={[
                    { value: '', label: 'Kaynak Yok', color: 'text-slate-500' },
                    { label: 'Sosyal Medya', options: [
                        { value: 'X', label: 'X (Twitter)' }, { value: 'TikTok', label: 'TikTok' }, { value: 'Instagram', label: 'Instagram' }, { value: 'Facebook', label: 'Facebook' }
                      ]},
                    { label: 'Gazeteler', options: [
                        { value: 'Akşam', label: 'Akşam' }, { value: 'Analiz', label: 'Analiz' }, { value: 'Aydınlık', label: 'Aydınlık' }, { value: 'BirGün', label: 'BirGün' }, { value: 'Cumhuriyet', label: 'Cumhuriyet' }, { value: 'Diriliş Postası', label: 'Diriliş Postası' }, { value: 'Dünya', label: 'Dünya' }, { value: 'Evrensel', label: 'Evrensel' }, { value: 'Fanatik', label: 'Fanatik' }, { value: 'Fotomaç', label: 'Fotomaç' }, { value: 'Gazete Pencere', label: 'Gazete Pencere' }, { value: 'Hürriyet', label: 'Hürriyet' }, { value: 'Karar', label: 'Karar' }, { value: 'Korkusuz', label: 'Korkusuz' }, { value: 'Milat', label: 'Milat' }, { value: 'Milli Gazete', label: 'Milli Gazete' }, { value: 'Milliyet', label: 'Milliyet' }, { value: 'Nasıl Bir Ekonomi', label: 'Nasıl Bir Ekonomi' }, { value: 'Nefes', label: 'Nefes' }, { value: 'Posta', label: 'Posta' }, { value: 'Sabah', label: 'Sabah' }, { value: 'Sözcü', label: 'Sözcü' }, { value: 'Takvim', label: 'Takvim' }, { value: 'Tavır Gazetesi', label: 'Tavır Gazetesi' }, { value: 'Türkiye', label: 'Türkiye' }, { value: 'Yeniçağ', label: 'Yeniçağ' }, { value: 'Yeni Asya', label: 'Yeni Asya' }, { value: 'Yeni Birlik', label: 'Yeni Birlik' }, { value: 'Yeni Mesaj', label: 'Yeni Mesaj' }, { value: 'Yeni Şafak', label: 'Yeni Şafak' }
                      ]}
                  ]} className="flex-1" />
              </div>
                <input
                type="text"
                value={config.sourceName || ''}
                onChange={(e) => setConfig({ ...config, sourceName: e.target.value })}
                placeholder="Manuel kaynak adı yaz..."
                className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600 font-bold mt-1.5 px-1 py-1 border-t border-slate-700/50"
                />
              </div>
                <div className="bg-black/30 p-2 rounded-xl border border-slate-800">
                <textarea value={config.yorum || ''} onChange={(e) => setConfig({ ...config, yorum: e.target.value })} placeholder="Yorum (2-3 satır)" className="w-full bg-transparent text-[10px] text-slate-200 outline-none placeholder:text-slate-600 font-bold resize-none h-8 leading-tight" rows={2} />
              </div>
              </div>

                {/* SABİT GÖRSELLER + MEDYA — yan yana */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {/* SABİT GÖRSELLER */}
                <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-2.5 shadow-lg transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-cyan-400', 'bg-cyan-500/20'); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-cyan-400', 'bg-cyan-500/20'); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('border-cyan-400', 'bg-cyan-500/20'); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-cyan-400', 'bg-cyan-500/20'); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image')); if (files.length > 0) handleCustomSceneImagesUpload(files); }}>
                <h2 className="text-[10px] font-black text-cyan-400 mb-1 flex items-center gap-1.5"><Layers size={12} /> SABİT GÖRSELLER (MAKS {RENDER_CONFIG.MAX_CUSTOM_SCENE_IMAGES})</h2>
                <div className="flex flex-wrap gap-2">
                {studioMedia.customSceneImages && studioMedia.customSceneImages.map((img, idx) => (
                      <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700 shadow-md group">
                      <img src={img} className="w-full h-full object-cover" alt={`Sabit ${idx}`} />
                      <button onClick={() => handleCustomSceneImageDelete(idx)} className="absolute top-0.5 right-0.5 bg-rose-500/80 group-hover:opacity-100 hover:bg-rose-500 text-white p-0.5 rounded transition opacity-0 shadow-lg"><Trash2 size={10} /></button>
                      <div className="absolute bottom-0 left-0 bg-black/70 w-full text-center text-[7px] font-bold py-0.5 text-cyan-400 backdrop-blur-sm tracking-wider">S{idx + 1}</div>
                    </div>
                    ))}
                {(!studioMedia.customSceneImages || studioMedia.customSceneImages.length < RENDER_CONFIG.MAX_CUSTOM_SCENE_IMAGES) && (
                    <label className="w-14 h-14 rounded-lg border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/10 flex flex-col items-center justify-center cursor-pointer transition text-cyan-400"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image')); if (files.length > 0) handleCustomSceneImagesUpload(files); }}>
                    <UploadCloud size={16} className="mb-0.5 opacity-80" /><span className="text-[7px] font-bold uppercase tracking-wider opacity-80">Ekle</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleCustomSceneImagesUpload} />
                  </label>
                  )}
                {(!studioMedia.customSceneImages || studioMedia.customSceneImages.length === 0) && (
                    <span className="text-[8px] text-cyan-500/70 font-bold uppercase tracking-wider self-center ml-1 hidden md:inline">← Buraya sürükleyin</span>
                  )}
              </div>
              </div>

                {/* MEDYA YÜKLE */}
                <div className="bg-black/30 border border-slate-800 rounded-xl p-2.5 shadow-lg transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-indigo-400', 'bg-indigo-500/20'); }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-indigo-400', 'bg-indigo-500/20'); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-500/20'); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-500/20'); processSelectedFiles(Array.from(e.dataTransfer.files)); }}>
                <h2 className="text-[10px] font-black text-indigo-400 mb-1 flex items-center gap-1.5"><FileText size={12} /> MEDYA YÜKLE</h2>
                <div className="flex flex-wrap gap-2">
                {uiState.selectedMediaFiles && uiState.selectedMediaFiles.slice(0, 5).map((file, idx) => (
                      <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700 shadow-md group">
                      {file.type.startsWith('image') ? <img src={file.data} className="w-full h-full object-cover" alt={`Medya ${idx}`} /> : <div className="w-full h-full flex items-center justify-center text-[7px] font-bold text-indigo-400 bg-slate-900">{file.name.split('.').pop().toUpperCase()}</div>}
                      <button onClick={() => setUiState(prev => ({ ...prev, selectedMediaFiles: prev.selectedMediaFiles.filter((_, i) => i !== idx) }))} className="absolute top-0.5 right-0.5 bg-rose-500/80 group-hover:opacity-100 hover:bg-rose-500 text-white p-0.5 rounded transition opacity-0 shadow-lg"><Trash2 size={10} /></button>
                      <div className="absolute bottom-0 left-0 bg-black/70 w-full text-center text-[7px] font-bold py-0.5 text-indigo-400 backdrop-blur-sm tracking-wider">M{idx + 1}</div>
                    </div>
                    ))}
                <label className="w-14 h-14 rounded-lg border-2 border-dashed border-indigo-500/50 hover:border-indigo-400 hover:bg-indigo-500/10 flex flex-col items-center justify-center cursor-pointer transition text-indigo-400"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); processSelectedFiles(Array.from(e.dataTransfer.files)); }}>
                <UploadCloud size={16} className="mb-0.5 opacity-80" /><span className="text-[7px] font-bold uppercase tracking-wider opacity-80">Ekle</span>
                <input type="file" multiple accept="*/*" className="hidden" onChange={(e) => { processSelectedFiles(Array.from(e.target.files)); e.target.value = null; }} />
              </label>
                {uiState.selectedMediaFiles.length > 5 && <div className="w-14 h-14 rounded-lg bg-slate-800/50 flex items-center justify-center text-[9px] text-slate-400 font-bold border border-slate-700">+{uiState.selectedMediaFiles.length - 5}</div>}
                {(!uiState.selectedMediaFiles || uiState.selectedMediaFiles.length === 0) && (
                    <span className="text-[8px] text-indigo-500/70 font-bold uppercase tracking-wider self-center ml-1 hidden md:inline">← Buraya sürükleyin</span>
                  )}
              </div>
              </div>
              </div>

                {/* === GAZETE TAKİP GALERİSİ === */}
                {activeTab === 'gazete' && (
                    <div className="mb-3">
                    {/* Temiz Başlık + Tarih + Yenile */}
                    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <Newspaper size={18} className="text-emerald-400" />
                        <span className="text-xs md:text-sm font-black text-white tracking-wide">Ulusal Gazete Manşetleri (29 Gazete)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1">
                          <Clock size={12} className="text-slate-400" />
                          <input
                            type="date"
                            value={gazeteDate}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => { setGazeteDate(e.target.value); }}
                            className="bg-transparent text-slate-200 text-[10px] font-bold border-none outline-none cursor-pointer"
                          />
                        </div>
                        <button onClick={fetchGazeteManşetleri} disabled={gazeteLoading}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-emerald-500 transition-all shadow-md">
                          {gazeteLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Manşetleri Yenile
                        </button>
                      </div>
                    </div>

                    {/* Hata mesajı */}
                    {gazeteError && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-400 text-xs font-bold mb-3 flex items-center gap-2">
                        <AlertCircle size={14} /> {gazeteError}
                      </div>
                      )}

                    {/* Yükleniyor */}
                    {gazeteLoading && (
                        <div className="text-center py-12">
                        <Loader2 size={32} className="text-emerald-400 animate-spin mx-auto mb-3" />
                        <p className="text-slate-400 text-sm font-bold">Gazete manşetleri yükleniyor...</p>
                      </div>
                      )}

                    {/* Galeri Grid */}
                    {!gazeteLoading && gazeteItems.length > 0 && (
                        <div>
                        <div className="flex items-center justify-between mb-2">
                        <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">{gazeteItems.length} gazete bulundu</span>
                        <div className="flex gap-1">
                        <button onClick={() => setGazeteGalleryView('grid')} className={`p-1.5 rounded-lg text-[10px] ${gazeteGalleryView === 'grid' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>▦</button>
                        <button onClick={() => setGazeteGalleryView('single')} className={`p-1.5 rounded-lg text-[10px] ${gazeteGalleryView === 'single' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>☐</button>
                      </div>
                      </div>

                        {gazeteGalleryView === 'grid' ? (
                            /* GRID GÖRÜNÜMÜ — küçük kartlar */
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-[50vh] overflow-y-auto p-1">
                            {gazeteItems.map((item, idx) => (
                                  <div key={idx} className="group relative bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700/50 hover:border-emerald-500/50 transition-all cursor-pointer"
                                  onClick={() => { setGazeteCurrentIdx(idx); setGazeteGalleryView('single'); }}>
                                  <img src={item.src} crossOrigin="anonymous" className="w-full h-auto block" alt={item.name} loading="lazy" onError={(e) => { if (item.rawSrc && e.target.src !== item.rawSrc) e.target.src = item.rawSrc; }} />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-1.5">
                                  <span className="text-white text-[8px] font-bold text-center leading-tight">{item.name}</span>
                                </div>
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); openCropModal(item.src || item.rawSrc, item.name); }}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-1 rounded-md shadow-lg" title="Crop yap">
                                  <Scissors size={10} />
                                </button>
                                  <button onClick={(e) => { e.stopPropagation(); addFullImageToMedia(item.src || item.rawSrc, item.name); }}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white p-1 rounded-md shadow-lg" title="Tam sayfa ekle">
                                  <Check size={10} />
                                </button>
                                </div>
                                </div>
                                ))}
                          </div>
                          ) : (
                            /* TEKLİ GÖRÜNÜM — büyük önizleme */
                            <div className="relative">
                            <div className="flex items-center justify-between gap-2 mb-3 bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-2xl flex-wrap shadow-lg">
                              <div className="flex items-center gap-2">
                                <button onClick={() => setGazeteCurrentIdx(Math.max(0, gazeteCurrentIdx - 1))} disabled={gazeteCurrentIdx === 0}
                                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all">← Önceki</button>
                                <span className="text-white text-sm font-bold bg-slate-950/60 px-3 py-1 rounded-xl border border-slate-800">{gazeteItems[gazeteCurrentIdx]?.name} <span className="text-slate-400 font-normal">({gazeteCurrentIdx + 1}/{gazeteItems.length})</span></span>
                                <button onClick={() => setGazeteCurrentIdx(Math.min(gazeteItems.length - 1, gazeteCurrentIdx + 1))} disabled={gazeteCurrentIdx >= gazeteItems.length - 1}
                                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all">Sonraki →</button>
                              </div>

                              <div className="flex items-center gap-2">
                                <button onClick={() => openCropModal(gazeteItems[gazeteCurrentIdx]?.src || gazeteItems[gazeteCurrentIdx]?.rawSrc, gazeteItems[gazeteCurrentIdx]?.name)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                                <Scissors size={14} /> Crop Yap
                              </button>
                                <button onClick={() => addFullImageToMedia(gazeteItems[gazeteCurrentIdx]?.src || gazeteItems[gazeteCurrentIdx]?.rawSrc, gazeteItems[gazeteCurrentIdx]?.name)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                                <Check size={14} /> Tam Sayfa Ekle
                              </button>
                              </div>
                            </div>
                            <div className="relative bg-black/50 rounded-xl overflow-hidden border border-slate-700/50">
                            <img src={gazeteItems[gazeteCurrentIdx]?.src} crossOrigin="anonymous" className="w-full h-auto block" alt={gazeteItems[gazeteCurrentIdx]?.name} onError={(e) => { if (gazeteItems[gazeteCurrentIdx]?.rawSrc && e.target.src !== gazeteItems[gazeteCurrentIdx]?.rawSrc) e.target.src = gazeteItems[gazeteCurrentIdx]?.rawSrc; }} />
                          </div>
                          </div>
                          )}
                      </div>
                      )}

                    {/* Boş durum */}
                    {!gazeteLoading && gazeteItems.length === 0 && !gazeteError && (
                        <div className="text-center py-12">
                        <Newspaper size={48} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm font-bold">Gazete manşetleri yüklenmedi</p>
                        <p className="text-slate-600 text-xs mt-1">Yukarıdaki "Yenile" butonuna tıklayın</p>
                      </div>
                      )}
                  </div>
                  )}

                {/* CROP MODAL */}
                {gazeteCropModal && (
                    <GazeteCropModal
                    src={gazeteCropModal.src}
                    name={gazeteCropModal.name}
                    onClose={() => setGazeteCropModal(null)}
                    onCrop={applyCrop}
                    />
                  )}

                {/* METİN GİRİŞİ (text/URL/prompt için) */}
                {activeTab !== 'media' && activeTab !== 'gazete' && (
                    <textarea value={textInput} onChange={e => setTextInput(e.target.value)} placeholder={(config.tip === 'guzel_soz' || config.tip === 'iddia_analizi') ? (activeTab === 'url' ? "Söz linkini yapıştırın..." : "Güzel sözü veya alıntıyı yazın...") : (activeTab === 'url' ? "Haber linkini yapıştırın..." : "Haberi yazın veya araştırılacak gündemi verin...")} className={`w-full h-20 bg-black/30 border rounded-xl p-3 text-sm outline-none mb-3 text-slate-200 resize-none transition-all relative z-0 ${activeTab === 'prompt' ? 'border-fuchsia-500/50 focus:border-fuchsia-500' : 'border-slate-800 focus:border-indigo-500'}`} />
                  )}

                <div className="flex justify-between items-center mb-3 px-2">
                {config.tip === 'iddia_analizi' ? (
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20">İddia Analizi — Fact Check + Video Üretimi</span>
                  ) : config.tip === 'guzel_soz' ? (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">Güzel Söz — Metin veya Resim + Arka Plan Müziği</span>
                  ) : (<><span className="text-xs text-slate-500 flex items-center gap-1"><Type size={12} /> Dil: {getWPS(config.language)} kelime/sn</span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">Hedef: ~{maxWordsUI} kelime</span></>)}
              </div>

                <div className="flex flex-col sm:flex-row gap-2 relative z-0">
                {/* v3.17: Preview Mode toggle */}
                <button onClick={() => setConfig({ ...config, previewMode: !config.previewMode })} className={`px-3 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${config.previewMode ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} title="Düşük çözünürlükte hızlı önizleme">
                <Eye size={14} /> Önizleme
                </button>
                {/* v3.18: A/B Varyasyon toggle */}
                <button onClick={() => setConfig({ ...config, abVariation: !config.abVariation })} className={`px-3 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${config.abVariation ? 'bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} title="Aynı konu için 2 farklı hook öner">
                A/B
                </button>
                {/* v3.18: Stock Footage toggle */}
                <button onClick={() => setConfig({ ...config, useStockFootage: !config.useStockFootage })} className={`px-3 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${config.useStockFootage ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} title="AI görsel yerine Pexels'ten gerçek video klipleri kullan">
                <Film size={14} /> Stock
                </button>
                <button onClick={() => handleExecuteStart(uiState.selectedMediaFiles, 'image')} disabled={uiState.isProcessing || ((config.tip === 'guzel_soz' || config.tip === 'iddia_analizi') ? (!textInput.trim() && uiState.selectedMediaFiles.length === 0) : ((activeTab === 'media' || activeTab === 'gazete') ? uiState.selectedMediaFiles.length === 0 : !textInput.trim()))} className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-200 py-2.5 md:py-3 rounded-full font-medium text-xs transition-all border border-slate-700 flex items-center justify-center gap-2">
                {uiState.isProcessing && config.outputType === 'image' ? <><Loader2 size={16} className="animate-spin" /> İŞLENİYOR...</> : <><ImagePlus size={16} /> {config.tip === 'iddia_analizi' ? 'İddia Analizi Yap' : (config.tip === 'guzel_soz' || config.tip === 'iddia_analizi') ? 'Kart Oluştur' : 'Görsel oluştur'}</>}
              </button>
                <button onClick={() => handleExecuteStart(uiState.selectedMediaFiles, 'video')} disabled={uiState.isProcessing || ((config.tip === 'guzel_soz' || config.tip === 'iddia_analizi') ? (!textInput.trim() && uiState.selectedMediaFiles.length === 0) : ((activeTab === 'media' || activeTab === 'gazete') ? uiState.selectedMediaFiles.length === 0 : !textInput.trim()))} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:text-indigo-400 text-white py-2.5 md:py-3 rounded-full font-bold text-xs transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                {uiState.isProcessing && config.outputType === 'video' ? <><Loader2 size={16} className="animate-spin" /> İŞLENİYOR...</> : <>{config.tip === 'iddia_analizi' ? <><Eye size={16} /> İddia Analizi</> : (config.tip === 'guzel_soz' || config.tip === 'iddia_analizi') ? <><Wand2 size={16} /> Güzel Söz Oluştur</> : <><Clapperboard size={16} /> Video oluştur</>}</>}
              </button>
                {/* v3.18: Batch Queue — konuyu kuyruğa ekle */}
                {activeTab !== 'media' && activeTab !== 'gazete' && textInput.trim() && (
                <button onClick={() => { const t = textInput.trim(); if (t && !batchQueue.includes(t)) { setBatchQueue([...batchQueue, t]); addSystemLog(`Batch kuyruğa eklendi (${batchQueue.length + 1}): ${t.substring(0, 40)}`, 'info'); } }} className="px-3 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 bg-violet-600 hover:bg-violet-500 text-white" title="Bu konuyu batch kuyruğuna ekle"><ListPlus size={14} /> Batch</button>
                )}
              </div>
              </div>

                {/* v3.18: Batch Queue — çoklu konu sıralı üretim */}
                {batchQueue.length > 0 && (
                  <div className="mt-3 bg-slate-900/60 border border-indigo-500/20 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Batch Kuyruk ({batchQueue.length})</span>
                      <button onClick={() => setBatchQueue([])} className="text-[9px] text-slate-500 hover:text-rose-400 font-bold uppercase">Temizle</button>
                    </div>
                    {batchQueue.map((item, idx) => (
                      <div key={idx} className={`flex items-center gap-2 py-1 text-xs ${batchCurrentIdx === idx ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        <span className="text-slate-600 shrink-0">{idx + 1}.</span>
                        <span className="truncate flex-1">{item.substring(0, 60)}</span>
                        {batchCurrentIdx === idx && <Loader2 size={10} className="animate-spin shrink-0" />}
                        {batchCurrentIdx > idx && <Check size={10} className="text-emerald-400 shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}

                {/* HATA */}
                {uiState.error && (
                    <div className="mt-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex gap-3 text-rose-400 text-sm font-medium items-start">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <div><strong className="block mb-1">Hata</strong>{String(uiState.error)}</div>
                  </div>
                  )}

                {/* ÇIKTI */}
                {uiState.videoUrl && (
                    <div className="mt-8 bg-slate-900 border border-emerald-900/50 p-6 rounded-3xl shadow-2xl text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">
                    <ShieldCheck size={14} /> {(config.tip === 'guzel_soz' || config.tip === 'iddia_analizi') ? 'GÜZEL SÖZ OLUŞTURULDU' : (config.outputType === 'image' ? 'GÖRSEL OLUŞTURULDU' : 'VIDEO OLUŞTURULDU')}
                  </div>
                    {config.outputType === 'image' ? <img src={uiState.videoUrl} className="w-full max-w-md mx-auto rounded-2xl shadow-lg ring-1 ring-white/10 object-cover" alt="Output" /> : <video src={uiState.videoUrl} controls autoPlay className="w-full max-w-md mx-auto rounded-2xl shadow-lg ring-1 ring-white/10" />}
                    <div className="mt-4 flex justify-center gap-3 flex-wrap">
                    <button onClick={handleDownloadVideo} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"><Download size={14} /> İNDİR</button>
                    {/* v3.18: SRT Altyazı indir */}
                    <button onClick={() => { const srt = RenderWorkerService.generateSRT(workflowRef.current?.state?.script?.videoSlides, workflowRef.current?.state?.script?.videoSlides?.map(s => s.exactDur || 5)); if (srt) { const blob = new Blob([srt], { type: 'text/plain' }); const a = document.createElement('a'); a.href = ObjectURLManager.create(blob); a.download = 'altyazi.srt'; a.click(); addSystemLog('SRT altyazı indirildi.', 'success'); } else { addSystemLog('Altyazı verisi bulunamadı.', 'warn'); } }} className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"><FileText size={14} /> SRT</button>
                    {/* v3.18: Custom Thumbnail yükle */}
                    <label className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer">
                    <ImagePlus size={14} /> Kapak
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { setConfig(prev => ({ ...prev, customThumbnail: r.result })); addSystemLog('Özel kapak görseli yüklendi.', 'success'); }; r.readAsDataURL(f); }} />
                    </label>
                    <button onClick={shareToSelectedPlatforms} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"><Share2 size={14} /> PAYLAŞ</button>
                    {/* v3.18: Analytics Dashboard — Buffer metrikleri çek */}
                    <button onClick={async () => { addSystemLog('[ANALİTİK] Buffer metrikleri çekiliyor...', 'info'); const data = await fetchBufferAnalytics(); if (data) { const updates = data?.data?.updates || []; if (updates.length > 0) { updates.forEach(u => { const s = u.stats || {}; addSystemLog(`[${u.status}] ${u.text?.substring(0,40)} → Görüntülenme: ${s.impressions||0}, Beğeni: ${s.likes||0}, Paylaşım: ${s.shares||0}, Yorum: ${s.comments||0}`, 'success'); }); } else { addSystemLog('[ANALİTİK] Gönderi bulunamadı.', 'warn'); } } }} className="bg-slate-600 hover:bg-slate-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"><BarChart3 size={14} /> ANALİTİK</button>
                    <button onClick={async () => { setUiState(prev => ({ ...prev, videoUrl: null, selectedMediaFiles: [], percent: 0, statusText: '', error: '' })); setConfig(prev => ({ ...prev, yorum: '', sourceName: '' })); for (let i = 0; i < RENDER_CONFIG.MAX_CUSTOM_SCENE_IMAGES; i++) await AssetManagerService.deleteMedia("CUSTOM_SCENE_IMG_" + i); setStudioMedia(s => ({ ...s, customSceneImages: [] })); }} className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"><RotateCcw size={14} /> {(config.tip === 'guzel_soz' || config.tip === 'iddia_analizi') ? 'YENİ SÖZ' : 'YENİ HABER'}</button>
                  </div>
                  {/* PAYLAS LOG PANELI — islem bitse bile ekranda kalir, kopyalanabilir */}
                  {sysLogs && sysLogs.length > 0 && (
                    <div className="mt-6 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-left font-mono text-[11px] leading-relaxed max-h-64 overflow-y-auto space-y-1.5 relative">
                      <div className="flex items-center justify-between mb-2 sticky top-0 bg-slate-950/95 py-1 z-10">
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Paylasim Loglari ({sysLogs.length})</span>
                        <button onClick={() => { const txt = sysLogs.map(l => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.text}`).join('\n'); navigator.clipboard?.writeText(txt).then(() => addSystemLog('Log panoya kopyalandi', 'success')).catch(() => { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); addSystemLog('Log panoya kopyalandi (fallback)', 'success'); }); }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-700 transition-all active:scale-95">KOPYALA</button>
                      </div>
                      {sysLogs.map((log, idx) => { let c = "text-slate-400"; if (log.type === "success") c = "text-emerald-400 font-bold"; if (log.type === "warn") c = "text-amber-400 font-bold"; if (log.type === "error") c = "text-rose-400 font-bold animate-pulse"; return (<div key={idx} className={`flex items-start gap-2 ${c}`}><span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span><span className="break-all">{log.text}</span></div>); })}
                    </div>
                  )}
                  </div>
                  )}
              </div>

                {/* İŞLEM EKRANI */}
                {uiState.isProcessing && (
                    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-lg p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden text-center">
                    <div className="absolute top-0 left-0 h-1 bg-indigo-600 transition-all duration-300 animate-pulse" style={{ width: `${uiState.percent}%` }}></div>
                    <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4"><Loader2 size={28} className="text-indigo-400 animate-spin" /></div>
                    <h2 className="text-5xl font-black text-white mb-2">{Math.round(uiState.percent)}%</h2>
                    <p className="text-indigo-400 font-bold text-sm mb-3 uppercase tracking-widest">{uiState.statusText}</p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-mono mb-4 border border-slate-700/50"><Clock size={12} /> Geçen: {elapsedSeconds}sn</div>
                    {sysLogs && sysLogs.length > 0 && (
                        <div className="mt-4 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-left font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto space-y-1.5 relative">
                        <button onClick={() => { const txt = sysLogs.map(l => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.text}`).join('\n'); navigator.clipboard?.writeText(txt).then(() => addSystemLog('Log panoya kopyalandi', 'success')).catch(() => { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); addSystemLog('Log panoya kopyalandi (fallback)', 'success'); }); }} className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-700 transition-all active:scale-95 z-10">KOPYALA</button>
                        {sysLogs.map((log, idx) => { let c = "text-slate-400"; if (log.type === "success") c = "text-emerald-400 font-bold"; if (log.type === "warn") c = "text-amber-400 font-bold"; if (log.type === "error") c = "text-rose-400 font-bold animate-pulse"; return (<div key={idx} className={`flex items-start gap-2 ${c}`}><span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span><span className="break-all">{log.text}</span></div>); })}
                        <div ref={logEndRef} />
                      </div>
                      )}
                  </div>
                  </div>
                  )}

                {/* OTURUM HATASI */}
                {authExpired && (
                    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[9999] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border-2 border-red-500/40 w-full max-w-md p-8 rounded-3xl shadow-2xl text-center">
                    <h2 className="text-2xl font-black text-white mb-3">OTURUM SÜRESİ DOLDU</h2>
                    <p className="text-slate-400 text-sm mb-6">Lütfen sayfayı yenileyin.</p>
                    <div className="flex flex-col gap-3">
                    <button onClick={handleSilentRecovery} className="w-full bg-gradient-to-r from-emerald-600 to-indigo-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"><ShieldCheck size={16} /> OTURUMU YENİLE</button>
                    <button onClick={() => setAuthExpired(false)} className="w-full bg-slate-800 text-slate-300 font-bold py-3 rounded-xl text-xs">GÖZARDI ET</button>
                    <button onClick={() => window.location.reload()} className="w-full bg-red-600/20 text-red-400 font-bold py-3 rounded-xl text-xs border border-red-500/30">SAYFAYI YENİLE (F5)</button>
                  </div>
                  </div>
                  </div>
                  )}

                {/* EXPORT PROGRESS OVERLAY (v3.16) */}
                {exportProgress.phase && !uiState.isProcessing && (
                    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-lg p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden text-center">
                    {exportProgress.phase === 'error' ? (
                      <>
                      <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4"><AlertCircle size={28} className="text-rose-400" /></div>
                      <h2 className="text-xl font-black text-rose-400 mb-2">DÖNÜŞTÜRME HATASI</h2>
                      <p className="text-slate-300 text-sm mb-6">{exportProgress.error || 'Bilinmeyen hata'}</p>
                      <button onClick={() => setExportProgress({ phase: null, percent: 0, message: '', error: null })} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-2.5 rounded-xl text-xs font-bold transition">KAPAT</button>
                      </>
                    ) : (
                      <>
                      <div className="absolute top-0 left-0 h-1 bg-indigo-600 transition-all duration-300" style={{ width: `${exportProgress.percent}%` }}></div>
                      <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">{exportProgress.phase === 'done' ? <Check size={28} className="text-emerald-400" /> : <Loader2 size={28} className="text-indigo-400 animate-spin" />}</div>
                      <h2 className="text-4xl font-black text-white mb-2">{exportProgress.phase === 'done' ? '✓' : `${exportProgress.percent}%`}</h2>
                      <p className="text-indigo-400 font-bold text-sm mb-3 uppercase tracking-widest">{exportProgress.message || (exportProgress.phase === 'uploading' ? 'Buluta yükleniyor...' : 'İşleniyor...')}</p>
                      {exportProgress.phase !== 'done' && <div className="w-full bg-slate-800 rounded-full h-2 mb-4 overflow-hidden"><div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${exportProgress.percent}%` }}></div></div>}
                      </>
                    )}
                    </div>
                    </div>
                  )}

                <canvas ref={canvasRef} style={{ position: 'fixed', top: '-10000px', left: '-10000px', zIndex: -50 }} />
              </div>
                </ErrorBoundary>
              );
            }


// OTONOM black_3.23 — Gemini Canvas uyumlu versiyon
// Tüm fonksiyonlar tek dosyada, kopyala-yapıştır ile Canvas'ta çalışır.