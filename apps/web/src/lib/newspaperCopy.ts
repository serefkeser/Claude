function clean(value?: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function ensureSentence(value: string) {
  const text = clean(value);
  if (!text || /[.!?…:]$/.test(text)) return text;
  return `${text}.`;
}

function normalizeForComparison(value: string) {
  return clean(value).toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]+/gi, ' ').trim();
}

const TURKISH_SPEECH_EXPANSIONS: Array<[RegExp, string]> = [
  [/\bABD\b/g, 'Amerika Birleşik Devletleri'],
  [/\bAİHM\b/g, 'Avrupa İnsan Hakları Mahkemesi'],
  [/\bHSK\b/g, 'Hakimler ve Savcılar Kurulu'],
  [/\bADD\b/g, 'Atatürkçü Düşünce Derneği'],
  [/\bCHP\b/g, 'Cumhuriyet Halk Partisi'],
  [/\bİBB\b/g, 'İstanbul Büyükşehir Belediyesi'],
  [/\bTBMM\b/g, 'Türkiye Büyük Millet Meclisi'],
  [/\bTSK\b/g, 'Türk Silahlı Kuvvetleri'],
  [/\bSGK\b/g, 'Sosyal Güvenlik Kurumu'],
  [/\bMEB\b/g, 'Millî Eğitim Bakanlığı'],
  [/\bYÖK\b/g, 'Yükseköğretim Kurulu'],
];

export function normalizeTurkishSpeech(value: string) {
  let text = clean(value)
    .replace(/\b[yY]üzde\s*%\s*(\d+(?:[.,]\d+)?)/g, 'yüzde $1')
    .replace(/%\s*(\d+(?:[.,]\d+)?)/g, 'yüzde $1')
    .replace(/\s*&\s*/g, ' ve ');
  for (const [pattern, replacement] of TURKISH_SPEECH_EXPANSIONS) {
    text = text.replace(pattern, replacement);
  }
  return clean(text);
}

export function limitNewspaperHook(value: string, fallback: string) {
  const selected = clean(value) || clean(fallback);
  return selected
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(' ')
    .replace(/[,:;.!?]+$/, '')
    .trim();
}

export function buildNewspaperNarration(options: {
  sourceName?: string;
  headline: string;
  detail?: string;
  fallbackDetail?: string;
  maxWords?: number;
}) {
  const headline = clean(options.headline);
  let detail = clean(options.detail) || clean(options.fallbackDetail);
  const normalizedHeadline = normalizeForComparison(headline);
  const normalizedDetail = normalizeForComparison(detail);
  if (normalizedHeadline && normalizedDetail.startsWith(normalizedHeadline)) {
    detail = clean(detail.slice(headline.length).replace(/^[\s.,:;!?–—-]+/, ''));
  }

  const narration = [headline, detail]
    .filter(Boolean)
    .map(ensureSentence)
    .join(' ');
  const words = narration.split(/\s+/).filter(Boolean);
  if (options.maxWords && words.length > options.maxWords) {
    throw new Error('Gazete anlatımı kelime sınırına sığmadı; cümle yarıda kesilmedi.');
  }
  const result = words.join(' ').trim();
  return ensureSentence(normalizeTurkishSpeech(result));
}
