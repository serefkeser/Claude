# OTONOM — Web Sürümü (BLACKBOX 3.24)

Bu sürüm, tek dosyalık Gemini Canvas kodunu (`black_3_23.jsx`) standart bir
**Vite + React** projesine dönüştürür ve **çoklu AI sağlayıcı** desteği ekler.
Artık uygulama Gemini Canvas'a bağlı değil — normal bir web sitesi olarak
herhangi bir yerde (GitHub Pages, Vercel, Netlify, kendi sunucunuz) barındırılabilir.

## Neler değişti?

### 1. Çoklu AI Sağlayıcı & Model Seçimi (yeni)
Eski tek "API Key (Opsiyonel)" rozeti yerine, sağ üstte **"🤖 AI Sağlayıcı & Model"**
paneli geldi. Üç sağlayıcı arasından seçim yapılabiliyor:

| Sağlayıcı | Not | Key nereden alınır |
|---|---|---|
| **Google Gemini** | Metin + görsel/video analizi + internet araştırması (google_search). Ücretsiz katmanı var. | https://aistudio.google.com/apikey |
| **Groq** | Sadece metin/analiz görevleri. Çok hızlı, ücretsiz. | https://console.groq.com/keys |
| **OpenRouter** | Sadece metin/analiz görevleri. `:free` uzantılı modeller tamamen ücretsiz. | https://openrouter.ai/keys |

Her sağlayıcının model listesi **canlı olarak** ilgili API'den çekilir (🔄 Yenile
butonu) — çünkü ücretsiz model isimleri sık değişiyor, sabit yazmak yerine
her zaman güncel liste gösterilir.

**Önemli kısıtlama:** Görsel/video analizi (medya sekmesi) ve "Haber Linki"
sekmesindeki internet araştırması, ücretsiz LLM sağlayıcılarında (Groq,
OpenRouter) yoktur. Bu görevler seçtiğiniz sağlayıcı ne olursa olsun otomatik
olarak Gemini'ye yönlendirilir (log ekranında bilgilendirme çıkar). Bu yüzden
Gemini key'ini boş bırakmamanızı öneririm — diğer sağlayıcılar sadece metin
tabanlı haber/iddia/güzel söz/çeviri/clickbait analizlerini hızlandırıp
ücretsizleştirmek için.

API key'ler **yalnızca tarayıcınızın localStorage'ında** tutulur, hiçbir
sunucuya gönderilmez.

### 2. Ücretsiz görsel üretim fallback'i (Pollinations.ai)
Gemini/Imagen görsel üretimi başarısız olursa (key yok / kota bitti / hata),
sistem artık **Pollinations.ai**'den (key gerektirmez, tamamen ücretsiz)
gerçek bir AI görseli çekmeyi dener. Bu da başarısız olursa eski prosedürel
(canvas ile çizilen) yedek görsele düşer. Sıralama: Imagen → Gemini 2.0 Flash
Image → Pollinations.ai → Prosedürel/Quote fallback.

### 3. Gerçek web projesi (Vite + React + Tailwind)
- `npm run dev` ile yerelde çalıştırılabilir
- `npm run build` ile `dist/` klasörüne statik site üretilir — bu klasör
  herhangi bir statik hosting'e (GitHub Pages, Vercel, Netlify, Cloudflare
  Pages, kendi sunucunuz) yüklenebilir.
- Firebase, ffmpeg.wasm gibi opsiyonel özellikler Canvas dışında da güvenli
  şekilde devre dışı kalıyor / CDN'den çalışıyor (kod zaten buna göre
  yazılmıştı, dokunulmadı).

## Kurulum ve çalıştırma

```bash
npm install
npm run dev        # http://localhost:5173 açılır
```

## Production build

```bash
npm run build       # dist/ klasörünü üretir
npm run preview     # build'i yerelde test etmek için
```

## GitHub'a yükleme ve deploy (GitHub Pages örneği)

```bash
git init
git remote add origin https://github.com/serefkeser/Claude.git
git add .
git commit -m "OTONOM web: cok saglayicili AI destegi + Vite web build"
git branch -M main
git push -u origin main
```

GitHub Pages ile otomatik deploy için `.github/workflows/deploy.yml` eklemek
istersen söyle, GitHub Actions ile her push'ta otomatik `npm run build` +
Pages'e yayın kurabilirim. Vercel/Netlify kullanmak istersen de repo'yu
bağlaman yeterli, build komutu `npm run build`, çıktı klasörü `dist`.

## Dosya yapısı

```
otonom-web/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx      # React giriş noktası
    ├── index.css     # Tailwind
    └── App.jsx       # Ana uygulama (eski black_3_23.jsx, güncellendi)
```
