import { buildNewspaperNarration } from './newspaperCopy';
import {
  buildVerifiedCoverHook,
  groundedNewspaperHook,
  isLikelyCompleteNewspaperHeadline,
  isReliableNewspaperDetail,
} from './newspaperVerification';

export const MIN_NEWSPAPER_STORIES = 5;
export const MAX_NEWSPAPER_STORIES = 9;

export interface VerifiedNewspaperCandidate {
  id: string;
  text: string;
  detail: string;
  confidence: number;
  score: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NewspaperVideoSlide {
  sourceHeadlineId?: string;
  sourceHeadline?: string;
  topText: string;
  spokenText: string;
  imagePrompts: string[];
}

export interface NewspaperScriptContract {
  isContentUnreadable?: boolean;
  videoSlides: NewspaperVideoSlide[];
  thumbnailText?: string;
  sonSoz?: string;
  gununSorusu?: string;
  lastQuote?: string;
  sourceName?: string;
  gazeteBasliklari?: Array<{
    sourceHeadlineId?: string;
    baslik: string;
    aciklama: string;
    onem?: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}

function normalize(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function basicVisionHeadlineCheck(value: string) {
  const text = normalize(value);
  const words = text.split(/\s+/).filter(Boolean);
  const letters = text.match(/\p{L}/gu) || [];
  if (words.length < 2 || words.length > 20 || letters.length < 5) return false;
  if (/[₺$€£]/u.test(text) && !/\d/u.test(text)) return false;
  return letters.length / Math.max(1, text.length) >= 0.5;
}

function basicVisionDetailCheck(value: string) {
  const text = normalize(value);
  const words = text.split(/\s+/).filter(Boolean);
  const letters = text.match(/\p{L}/gu) || [];
  if (words.length < 4 || words.length > 70 || letters.length < 12) return false;
  if (/[:;\-–—]$/.test(text)) return false;
  if (letters.length / Math.max(1, text.length) < 0.58) return false;
  return /[.!?…]["'”’)]?$/.test(text)
    || /(?:dı|di|du|dü|tı|ti|tu|tü|yor|acak|ecek|mış|miş|muş|müş|oldu|öldü|kaldı|başladı|bitti|açıkladı|söyledi|belirtti|dedi|yayımladı|yayınladı)$/iu.test(words.at(-1) || '');
}

function selectPublishableCandidates(candidates: VerifiedNewspaperCandidate[]) {
  return candidates
    .filter((candidate, index, all) => {
      const id = normalize(candidate.id).toUpperCase();
      const isVisionDirect = candidate.confidence >= 99;
      const headlineOk = isVisionDirect
        ? basicVisionHeadlineCheck(candidate.text)
        : isLikelyCompleteNewspaperHeadline(candidate.text);
      const detailOk = isVisionDirect
        ? basicVisionDetailCheck(candidate.detail)
        : isReliableNewspaperDetail(candidate.detail);
      return /^H\d+$/.test(id)
        && headlineOk
        && detailOk
        && all.findIndex(item => normalize(item.id).toUpperCase() === id) === index;
    })
    .slice(0, MAX_NEWSPAPER_STORIES);
}

function buildEditorialEvidence(candidates: VerifiedNewspaperCandidate[]) {
  return candidates
    .map(candidate => candidate.text)
    .map(normalize)
    .filter(Boolean)
    .join(' ');
}

export function assertLockedNewspaperScript(
  script: NewspaperScriptContract,
  candidates: VerifiedNewspaperCandidate[],
  sourceName: string,
) {
  const selected = selectPublishableCandidates(candidates);
  if (selected.length < MIN_NEWSPAPER_STORIES) {
    throw new Error(
      `En az ${MIN_NEWSPAPER_STORIES} bağımsız haberin başlığı ve açıklaması doğrulanamadı; eksik veya yanlış video üretilmedi.`,
    );
  }
  if (script.videoSlides.length !== selected.length) {
    throw new Error('Gazete sahne sözleşmesi bozuldu: her doğrulanmış haber için tam bir sahne gerekir.');
  }

  script.videoSlides.forEach((slide, index) => {
    const candidate = selected[index];
    const expectedNarration = buildNewspaperNarration({
      sourceName,
      headline: candidate.text,
      detail: candidate.detail,
    });
    if (slide.sourceHeadlineId !== candidate.id
      || slide.sourceHeadline !== candidate.text
      || slide.spokenText !== expectedNarration) {
      throw new Error(`Gazete sahne sözleşmesi bozuldu: ${candidate.id} başlığı veya açıklaması değiştirildi.`);
    }
    if (slide.topText !== candidate.text) {
      throw new Error(`Gazete sahne sözleşmesi bozuldu: ${candidate.id} içerik üst yazısı özgün başlık olmalı.`);
    }
  });
}

export function buildLockedNewspaperScript<T extends NewspaperScriptContract>(options: {
  script: T;
  candidates: VerifiedNewspaperCandidate[];
  configuredSourceName?: string;
}): T {
  const selected = selectPublishableCandidates(options.candidates);
  if (selected.length < MIN_NEWSPAPER_STORIES) {
    throw new Error(
      `En az ${MIN_NEWSPAPER_STORIES} bağımsız haberin başlığı ve açıklaması doğrulanamadı; eksik veya yanlış video üretilmedi.`,
    );
  }

  const sourceName = normalize(options.configuredSourceName || options.script.sourceName || 'Gazete');
  const firstCandidate = selected[0];
  const firstAiSlide = options.script.videoSlides.find(
    slide => normalize(slide.sourceHeadlineId || '').toUpperCase() === firstCandidate?.id,
  );
  const editorialEvidence = buildEditorialEvidence(selected);
  const requestedHook = options.script.thumbnailText || firstAiSlide?.topText || '';
  const coverHook = groundedNewspaperHook(
    requestedHook,
    editorialEvidence || firstCandidate?.text || 'GÜNDEM',
  );
  const fallbackHook = groundedNewspaperHook('', firstCandidate?.text || 'GÜNDEM');
  const videoSlides = selected.map(candidate => ({
    sourceHeadlineId: candidate.id,
    sourceHeadline: candidate.text,
    topText: candidate.text,
    spokenText: buildNewspaperNarration({
      sourceName,
      headline: candidate.text,
      detail: candidate.detail,
    }),
    imagePrompts: [],
  }));

  const locked = {
    ...options.script,
    isContentUnreadable: false,
    videoSlides,
    thumbnailText: buildVerifiedCoverHook(coverHook || fallbackHook),
    sonSoz: '',
    gununSorusu: '',
    lastQuote: '',
    sourceName,
    gazeteBasliklari: selected.map((candidate, index) => ({
      sourceHeadlineId: candidate.id,
      baslik: candidate.text,
      aciklama: candidate.detail,
      onem: Math.max(1, 100 - index * 10),
      x: candidate.x,
      y: candidate.y,
      w: candidate.w,
      h: candidate.h,
    })),
  } as T;

  assertLockedNewspaperScript(locked, selected, sourceName);
  return locked;
}
