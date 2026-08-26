import type { RenderConfig } from '@otonom/shared-types';
import type { HermesScript, HermesVideoSlide } from './aiClient';

export type RenderSceneKind = 'cover' | 'content' | 'final' | 'question' | 'outro';

export interface HermesRenderScene extends HermesVideoSlide {
  kind: RenderSceneKind;
}

const LOCALES: Record<string, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  ar: 'ar-SA',
  ru: 'ru-RU',
};

const FINAL_LABELS: Record<string, string> = {
  tr: 'SON SÖZ', en: 'FINAL WORDS', fr: 'MOT DE LA FIN', de: 'SCHLUSSWORT',
  es: 'ÚLTIMAS PALABRAS', ar: 'الكلمة الأخيرة', ru: 'ПОСЛЕСЛОВИЕ',
};

const QUESTION_LABELS: Record<string, string> = {
  tr: 'GÜNÜN SORUSU', en: 'QUESTION OF THE DAY', fr: 'QUESTION DU JOUR',
  de: 'FRAGE DES TAGES', es: 'PREGUNTA DEL DÍA', ar: 'سؤال اليوم', ru: 'ВОПРОС ДНЯ',
};

const DEFAULT_QUESTIONS: Record<string, string> = {
  tr: 'Siz bu gelişme hakkında ne düşünüyorsunuz?',
  en: 'What do you think about this development?',
  fr: 'Que pensez-vous de cette évolution ?',
  de: 'Was denken Sie über diese Entwicklung?',
  es: '¿Qué opina de este acontecimiento?',
  ar: 'ما رأيك في هذا التطور؟',
  ru: 'Что вы думаете об этом событии?',
};

interface FinalWordEntry {
  id: string;
  text: string;
  author: string;
}

// Gazete videolarında aynı sabit cümleyi tekrar etmek yerine güvenli ve kısa
// bir havuz döndürülür. Kaynağı tartışmalı internet alıntıları özellikle yoktur.
export const TURKISH_FINAL_WORDS: FinalWordEntry[] = [
  { id: 'ataturk-ilim', text: 'Hayatta en hakiki mürşit ilimdir, fendir.', author: 'Mustafa Kemal Atatürk' },
  { id: 'ataturk-egemenlik', text: 'Egemenlik kayıtsız şartsız milletindir.', author: 'Mustafa Kemal Atatürk' },
  { id: 'ataturk-sulh', text: 'Yurtta sulh, cihanda sulh.', author: 'Mustafa Kemal Atatürk' },
  { id: 'sokrates-hayat', text: 'Sorgulanmamış hayat yaşamaya değmez.', author: 'Sokrates' },
  { id: 'descartes-dusunuyorum', text: 'Düşünüyorum, öyleyse varım.', author: 'René Descartes' },
  { id: 'bacon-bilgi', text: 'Bilgi güçtür.', author: 'Francis Bacon' },
  { id: 'yunus-ilim', text: 'İlim ilim bilmektir, ilim kendin bilmektir.', author: 'Yunus Emre' },
  { id: 'epiktetos-yargi', text: 'Bizi üzen şeyler değil, onlar hakkındaki yargılarımızdır.', author: 'Epiktetos' },
  { id: 'atasozu-akil', text: 'Akıl akıldan üstündür.', author: 'Türk atasözü' },
  { id: 'atasozu-birlik', text: 'Birlikten kuvvet doğar.', author: 'Türk atasözü' },
  { id: 'atasozu-demir', text: 'İşleyen demir ışıldar.', author: 'Türk atasözü' },
  { id: 'atasozu-damlaya', text: 'Damlaya damlaya göl olur.', author: 'Türk atasözü' },
  { id: 'atasozu-neekersen', text: 'Ne ekersen onu biçersin.', author: 'Türk atasözü' },
  { id: 'atasozu-dost', text: 'Dost acı söyler.', author: 'Türk atasözü' },
  { id: 'atasozu-acele', text: 'Acele işe şeytan karışır.', author: 'Türk atasözü' },
  { id: 'atasozu-sakla', text: 'Sakla samanı, gelir zamanı.', author: 'Türk atasözü' },
];

const FINAL_WORD_HISTORY_KEY = 'otonom_final_word_history_v1';
const FINAL_WORD_HISTORY_LIMIT = 10;

export const OUTRO_TEXTS: Record<string, string[]> = {
  tr: ['Abone olmayı,', 'beğenmeyi ve', 'paylaşmayı', 'ihmal etmeyin.'],
  en: ["Don't forget to", 'subscribe, like', 'and share.'],
  fr: ["N'oubliez pas de", 'vous abonner,', 'aimer et partager.'],
  de: ['Vergessen Sie nicht', 'zu abonnieren, liken', 'und zu teilen.'],
  es: ['No olvides', 'suscribirte, dar', 'me gusta y compartir.'],
  ar: ['لا تنسَ', 'الاشتراك والإعجاب', 'والمشاركة.'],
  ru: ['Не забудьте', 'подписаться, лайкнуть', 'и поделиться.'],
};

export const CTA_LABELS: Record<string, { sub: string; like: string; share: string }> = {
  tr: { sub: 'Abone Ol', like: 'Beğen', share: 'Paylaş' },
  en: { sub: 'Subscribe', like: 'Like', share: 'Share' },
  fr: { sub: "S'abonner", like: 'Aimer', share: 'Partager' },
  de: { sub: 'Abonnieren', like: 'Liken', share: 'Teilen' },
  es: { sub: 'Suscribir', like: 'Me gusta', share: 'Compartir' },
  ar: { sub: 'اشتراك', like: 'إعجاب', share: 'مشاركة' },
  ru: { sub: 'Подписка', like: 'Лайк', share: 'Поделиться' },
};

function clean(value?: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function ensureSentence(value: string) {
  const text = clean(value);
  if (!text || /[.!?…]$/.test(text)) return text;
  return `${text}.`;
}

function normalizeForComparison(value: string) {
  return clean(value)
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9çğıöşü\s]/gi, '')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

function isNearDuplicate(left: string, right: string) {
  const a = new Set(normalizeForComparison(left));
  const b = new Set(normalizeForComparison(right));
  if (!a.size || !b.size) return false;
  let shared = 0;
  a.forEach(word => { if (b.has(word)) shared += 1; });
  return shared / Math.min(a.size, b.size) >= 0.75;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function readFinalWordHistory() {
  if (typeof window === 'undefined') return [] as string[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FINAL_WORD_HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch {
    return [] as string[];
  }
}

function writeFinalWordHistory(history: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FINAL_WORD_HISTORY_KEY, JSON.stringify(history.slice(-FINAL_WORD_HISTORY_LIMIT)));
  } catch {
    // localStorage kapalıysa üretim engellenmez; zaman tabanlı deterministik seçim kullanılır.
  }
}

export function selectRotatingFinalWord(seed: string) {
  const history = readFinalWordHistory();
  const recent = new Set(history);
  const start = stableHash(seed) % TURKISH_FINAL_WORDS.length;
  let selected = TURKISH_FINAL_WORDS[start];
  for (let offset = 0; offset < TURKISH_FINAL_WORDS.length; offset += 1) {
    const candidate = TURKISH_FINAL_WORDS[(start + offset) % TURKISH_FINAL_WORDS.length];
    if (!recent.has(candidate.id)) {
      selected = candidate;
      break;
    }
  }
  writeFinalWordHistory([...history.filter(id => id !== selected.id), selected.id]);
  return `${selected.text} — ${selected.author}`;
}

function buildCoverNarration(script: HermesScript, config: RenderConfig, now: Date) {
  if (script.gazeteBasliklari?.length) {
    return ensureSentence(clean(script.thumbnailText));
  }
  const locale = LOCALES[config.language] || LOCALES.tr;
  const date = now.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const day = now.toLocaleDateString(locale, { weekday: 'long' });
  return ensureSentence([
    `${date} ${day}`,
    clean(config.sourceName || script.sourceName),
    clean(script.thumbnailText),
  ].filter(Boolean).join('. '));
}

export function buildRenderStoryboard(script: HermesScript, config: RenderConfig, now = new Date()): HermesRenderScene[] {
  const language = config.language || 'tr';
  const contentScenes: HermesRenderScene[] = script.videoSlides.map(slide => ({
    ...slide,
    topText: clean(slide.topText),
    spokenText: ensureSentence(slide.spokenText || slide.topText),
    imagePrompts: Array.isArray(slide.imagePrompts) ? slide.imagePrompts : [],
    kind: 'content',
  }));

  const coverTitle = clean(script.thumbnailText || contentScenes[0]?.topText || config.sourceName || 'GÜNDEM');
  const scenes: HermesRenderScene[] = [{
    kind: 'cover',
    topText: coverTitle,
    spokenText: buildCoverNarration(script, config, now) || ensureSentence(coverTitle),
    imagePrompts: [],
  }, ...contentScenes];

  const lastContent = contentScenes.at(-1)?.spokenText || '';
  const requestedFinal = clean(script.sonSoz);
  const isNewspaper = Boolean(script.gazeteBasliklari?.length);
  const newspaperSeed = [
    now.toISOString().slice(0, 16),
    clean(config.sourceName || script.sourceName),
    clean(script.gazeteBasliklari?.[0]?.baslik),
  ].join('|');
  const finalText = isNewspaper && language === 'tr'
    ? selectRotatingFinalWord(newspaperSeed)
    : requestedFinal && !isNearDuplicate(requestedFinal, lastContent)
      ? requestedFinal
      : language === 'tr'
        ? selectRotatingFinalWord(`${newspaperSeed}|fallback`)
        : 'The truth has a way of coming to light.';
  const userComment = clean(config.yorum);
  scenes.push({
    kind: 'final',
    topText: FINAL_LABELS[language] || FINAL_LABELS.tr,
    spokenText: ensureSentence([finalText, userComment].filter(Boolean).join(' ')),
    imagePrompts: [],
  });

  const question = clean(script.gununSorusu);
  if (question) {
    scenes.push({
      kind: 'question',
      topText: QUESTION_LABELS[language] || QUESTION_LABELS.tr,
      spokenText: ensureSentence(question || DEFAULT_QUESTIONS[language] || DEFAULT_QUESTIONS.tr),
      imagePrompts: [],
    });
  }

  const outroLines = OUTRO_TEXTS[language] || OUTRO_TEXTS.tr;
  const callToAction = ensureSentence(outroLines.join(' '));
  const lastQuote = clean(script.lastQuote);
  const outroNarration = lastQuote && !/abone|subscribe|abonn|suscri|اشتراك|подпис/i.test(lastQuote)
    ? `${ensureSentence(lastQuote)} ${callToAction}`
    : (lastQuote ? ensureSentence(lastQuote) : callToAction);
  scenes.push({ kind: 'outro', topText: '', spokenText: outroNarration, imagePrompts: [] });

  return scenes;
}

export function getStoryboardNarration(scenes: HermesRenderScene[]) {
  return scenes.map(scene => clean(scene.spokenText)).filter(Boolean).join(' ');
}
