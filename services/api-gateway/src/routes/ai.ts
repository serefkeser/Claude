import { Hono } from 'hono';
import {
  generateWithFallback,
  getConfiguredProviders,
  synthesizeSpeech,
  type AiProviderAttempt,
  type AiProviderEnv,
} from '../ai/providerRouter';
import { buildAnalyzeMessages, type AnalyzeInput } from '../ai/promptBuilder';
import { parseAiJsonObject, validateHermesNewspaperResponse, validateHermesScriptResponse } from '../ai/jsonResponse';

interface AiRouteEnv extends AiProviderEnv {
  AI_ACCESS_TOKEN?: string;
}

const MAX_IMAGES = 3;
const MAX_BASE64_CHARS = 16_000_000;
const MAX_TEXT_CHARS = 40_000;
const MAX_TTS_CHARS = 5_000;

interface OcrHeadlineCandidate {
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

function parseOcrHeadlineCandidates(sourceText: string): OcrHeadlineCandidate[] {
  return sourceText
    .split(/\n+/)
    .map(line => line.match(/^(H\d+)\|score=(\d+)\|confidence=(\d+)\|x=(-?\d+)\|y=(-?\d+)\|w=(\d+)\|h=(\d+)\|text=(.*?)\|detail=(.*)$/i))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map(match => ({
      id: match[1].toUpperCase(), score: Number(match[2]), confidence: Number(match[3]),
      x: Number(match[4]), y: Number(match[5]), w: Number(match[6]), h: Number(match[7]),
      text: match[8].replace(/\s+/g, ' ').trim(), detail: match[9].replace(/\s+/g, ' ').trim(),
    }))
    .filter((candidate, index, all) => candidate.text && all.findIndex(item => item.id === candidate.id) === index)
    .sort((left, right) => Number(left.id.slice(1)) - Number(right.id.slice(1)))
    .slice(0, 9);
}

function buildEmergencyScript(body: AnalyzeInput) {
  const sourceName = body.config?.sourceName?.trim() || body.images?.[0]?.name?.trim() || 'OTONOM';
  const sourceText = body.text?.trim() || '';
  const sourceLines = sourceText
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => sentence.replace(/\s+/g, ' ').trim())
    .filter(sentence => sentence.split(/\s+/).length >= 3)
    .slice(0, 6);
  const fallbackLines = [
    'Kaynak görsel video akışına alındı. Otomatik içerik çözümleme hizmeti geçici olarak yanıt vermedi.',
    'Gazete sayfası ekranda korunuyor. Okunamayan ayrıntılar hakkında doğrulanmamış bilgi üretilmedi.',
    'Başlıklar özgün sayfa üzerinden incelenebilir. Video, kaynak görünümünü değiştirmeden sunuyor.',
    'Bu geçici akış yalnızca güvenle doğrulanabilen bilgileri kullanıyor. Varsayım veya uydurma ayrıntı eklenmedi.',
    'Ayrıntılı yapay zekâ çözümlemesi sonraki çalıştırmada yeniden denenecek.',
    'Kaynak sayfa kapanıştan önce yeniden gösteriliyor.',
  ];
  const lines = Array.from({ length: 6 }, (_, index) => sourceLines[index] || fallbackLines[index]);
  return {
    isContentUnreadable: sourceLines.length === 0,
    videoSlides: lines.map((spokenText, index) => ({
      sourceHeadlineId: '',
      sourceHeadline: sourceLines[index] || '',
      topText: sourceLines[index]
        ? sourceLines[index].split(/\s+/).slice(0, 3).join(' ').replace(/[^\p{L}\p{N}\s]/gu, '').toLocaleUpperCase('tr-TR')
        : ['KAYNAK GÖRSEL', 'SAYFA GÜNDEMİ', 'ÖNEMLİ BAŞLIKLAR', 'DOĞRULAMA NOTU', 'ANALİZ DURUMU', 'KAYNAK ÖZETİ'][index],
      spokenText: /[.!?]$/.test(spokenText) ? spokenText : `${spokenText}.`,
      imagePrompts: [],
    })),
    thumbnailText: `${Math.min(8, Math.max(1, sourceLines.length))} HABER ÖZETİ`,
    sonSoz: '',
    gununSorusu: '',
    lastQuote: '',
    sourceName,
    gazeteBasliklari: [],
  };
}

function normalizeHeadline(value: unknown) {
  return String(value || '').toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * Hermes 10 gazete davranışı:
 * - Tam gazete görselinden Vision tarafından çıkarılan gazeteBasliklari ana kaynaktır.
 * - Yerel OCR adayları bu metni ezemez veya yeniden yazamaz.
 * - Her başlık yalnız bir sahneye dönüşür: özgün başlık + görselden okunan açıklama.
 */
export function normalizeNewspaperScript(script: Record<string, unknown>, _ocrCandidates: OcrHeadlineCandidate[] = []) {
  const rawHeadlines = Array.isArray(script.gazeteBasliklari)
    ? script.gazeteBasliklari.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];
  const headlines = rawHeadlines
    .filter((headline, index, all) => {
      const key = normalizeHeadline(headline.baslik);
      return key && all.findIndex(candidate => normalizeHeadline(candidate.baslik) === key) === index;
    })
    .filter(headline => String(headline.aciklama || '').replace(/\s+/g, ' ').trim().length > 0)
    .sort((left, right) => {
      const importance = Number(right.onem || 0) - Number(left.onem || 0);
      if (importance) return importance;
      return Number(right.w || 0) * Number(right.h || 0) - Number(left.w || 0) * Number(left.h || 0);
    })
    .slice(0, 9);

  if (headlines.length < 5) {
    return {
      ...script,
      isContentUnreadable: true,
      visionGazeteBasliklari: headlines,
      gazeteBasliklari: headlines,
    };
  }

  const videoSlides = headlines.map((headline, index) => {
    const sourceHeadline = String(headline.baslik || '').replace(/\s+/g, ' ').trim();
    const description = String(headline.aciklama || '').replace(/\s+/g, ' ').trim();
    const spokenText = `${sourceHeadline}. ${description}`.replace(/\s+/g, ' ').trim();
    return {
      sourceHeadlineId: `H${index + 1}`,
      sourceHeadline,
      topText: sourceHeadline,
      spokenText: /[.!?]$/.test(spokenText) ? spokenText : `${spokenText}.`,
      imagePrompts: [],
    };
  });

  return {
    ...script,
    isContentUnreadable: false,
    videoSlides,
    visionGazeteBasliklari: headlines,
    gazeteBasliklari: headlines.map((headline, index) => ({
      ...headline,
      sourceHeadlineId: `H${index + 1}`,
    })),
  };
}

export const aiRoutes = new Hono<{ Bindings: AiRouteEnv }>();

function isAuthorized(authorization: string | undefined, accessHeader: string | undefined, env: AiRouteEnv) {
  if (!env.AI_ACCESS_TOKEN) return true;
  const bearer = authorization?.replace(/^Bearer\s+/i, '').trim();
  return bearer === env.AI_ACCESS_TOKEN || accessHeader === env.AI_ACCESS_TOKEN;
}

aiRoutes.use('*', async (c, next) => {
  if (!isAuthorized(c.req.header('Authorization'), c.req.header('X-Hermes-Access'), c.env)) {
    return c.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'AI servisi erişim anahtarı geçersiz.' },
    }, 401);
  }
  await next();
});

aiRoutes.get('/health', c => c.json({
  success: true,
  data: {
    configured: getConfiguredProviders(c.env),
    textOrder: c.env.AI_TEXT_PROVIDER_ORDER || 'gemini,openrouter,groq,opencode,nvidia',
    visionOrder: c.env.AI_VISION_PROVIDER_ORDER || 'gemini,openrouter,groq,nvidia',
    persistentMediaStorage: false,
  },
}));

aiRoutes.post('/analyze', async c => {
  let body: AnalyzeInput;
  try {
    body = await c.req.json<AnalyzeInput>();
  } catch {
    return c.json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'İstek gövdesi geçerli JSON değil.' },
    }, 400);
  }

  const allowedInputTypes = new Set(['text', 'url', 'prompt', 'media', 'gazete']);
  if (!body || !allowedInputTypes.has(body.inputType)) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Geçerli inputType gerekli.' },
    }, 400);
  }

  const images = Array.isArray(body.images) ? body.images : [];
  if (!body.text?.trim() && images.length === 0) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Metin veya en az bir görsel gerekli.' },
    }, 400);
  }
  if ((body.text?.length || 0) > MAX_TEXT_CHARS || images.length > MAX_IMAGES) {
    return c.json({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Metin veya görsel sayısı sınırı aşıldı.' },
    }, 413);
  }
  const totalBase64Chars = images.reduce((total, image) => total + (image.data?.length || 0), 0);
  const hasInvalidImage = images.some(image => !image.mimeType?.startsWith('image/') || !image.data);
  if (hasInvalidImage || totalBase64Chars > MAX_BASE64_CHARS) {
    return c.json({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Görsel verisi geçersiz veya fazla büyük.' },
    }, 413);
  }

  try {
    const ocrCandidates = parseOcrHeadlineCandidates(body.text || '');
    const generated = await generateWithFallback(c.env, {
      task: images.length ? 'vision' : 'text',
      messages: buildAnalyzeMessages({ ...body, images }),
      temperature: body.inputType === 'gazete' ? 0.1 : 0.2,
      maxTokens: 6144,
      responseFormat: 'json',
      validateResponse: body.inputType === 'gazete'
        ? text => validateHermesNewspaperResponse(text, [])
        : validateHermesScriptResponse,
    });
    const parsedScript = parseAiJsonObject(generated.text);
    const script = body.inputType === 'gazete'
      ? normalizeNewspaperScript(parsedScript, ocrCandidates)
      : parsedScript;

    return c.json({
      success: true,
      data: {
        provider: generated.provider,
        model: generated.model,
        attempts: generated.attempts,
        script,
      },
    });
  } catch (error) {
    const attempts = (error as { attempts?: AiProviderAttempt[] })?.attempts || [];
    return c.json({
      success: true,
      data: {
        provider: 'local-fallback',
        model: 'deterministic-safe-script',
        attempts,
        script: buildEmergencyScript(body),
        fallbackReason: error instanceof Error ? error.message : 'AI analizi başarısız.',
      },
    });
  }
});

aiRoutes.post('/tts', async c => {
  let body: { text?: string; voice?: string };
  try {
    body = await c.req.json<{ text?: string; voice?: string }>();
  } catch {
    return c.json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'İstek gövdesi geçerli JSON değil.' },
    }, 400);
  }

  const text = body.text?.trim() || '';
  if (!text || text.length > MAX_TTS_CHARS) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `TTS metni 1-${MAX_TTS_CHARS} karakter olmalı.` },
    }, 400);
  }

  try {
    const speech = await synthesizeSpeech(c.env, text, body.voice || 'Aoede');
    return c.json({ success: true, data: speech });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'TTS_FAILED',
        message: error instanceof Error ? error.message : 'TTS oluşturulamadı.',
      },
    }, 503);
  }
});
