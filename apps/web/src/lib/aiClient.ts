import type { MediaFile, RenderConfig } from '@otonom/shared-types';
import { writeSystemLog } from '@otonom/shared-utils';
import {
  buildLockedNewspaperScript,
  MAX_NEWSPAPER_STORIES,
  type VerifiedNewspaperCandidate,
} from './newspaperPipeline';
import { prepareNewspaperVisionViews } from './newspaperVisionViews';
import {
  prepareNewspaperEvidenceSheet,
  readLocalHeadlineOcrEvidence,
  reconcileVerifiedNewspaperText,
} from './newspaperEvidenceVerification';
import { fetchWithNetworkRetry } from './networkRetry';
import type { VisionNewspaperCandidate } from './newspaperVisionRecovery';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const MAX_ANALYSIS_IMAGES = 3;
const MAX_IMAGE_EDGE = 1600;
const MAX_NEWSPAPER_IMAGE_EDGE = 2600;
const ACCESS_TOKEN_STORAGE_KEY = 'hermes_ai_access_token';
const ANALYZE_REQUEST_TIMEOUT_MS = 120_000;
const TTS_REQUEST_TIMEOUT_MS = 70_000;

export interface HermesVideoSlide {
  sourceHeadlineId?: string;
  sourceHeadline?: string;
  topText: string;
  spokenText: string;
  imagePrompts: string[];
}

export interface HermesNewspaperHeadline {
  sourceHeadlineId?: string;
  baslik: string;
  aciklama: string;
  onem?: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HermesScript {
  isContentUnreadable?: boolean;
  videoSlides: HermesVideoSlide[];
  thumbnailText?: string;
  sonSoz?: string;
  gununSorusu?: string;
  lastQuote?: string;
  sourceName?: string;
  gazeteBasliklari?: HermesNewspaperHeadline[];
  visionGazeteBasliklari?: VisionNewspaperCandidate[];
}

export interface AnalyzeResult {
  provider: string;
  model: string;
  attempts: Array<{
    provider: string;
    model: string;
    ok: boolean;
    status?: number;
    reason?: string;
  }>;
  script: HermesScript;
  fallbackReason?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

interface AnalysisImage {
  name: string;
  mimeType: string;
  data: string;
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Görsel analiz için okunamadı.'));
    reader.readAsDataURL(blob);
  });
}

async function shrinkImage(blob: Blob, maxEdge = MAX_IMAGE_EDGE, quality = 0.82) {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Görsel küçültme alanı oluşturulamadı.');
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        result => result ? resolve(result) : reject(new Error('Görsel küçültülemedi.')),
        'image/jpeg',
        quality,
      );
    });
  } finally {
    bitmap.close();
  }
}

async function videoFrameToImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Videodan analiz karesi alınamadı.'));
      video.load();
    });
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Video analiz karesi hazırlanamadı.');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        result => result ? resolve(result) : reject(new Error('Video analiz karesi kaydedilemedi.')),
        'image/jpeg',
        0.9,
      );
    });
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

async function mediaToAnalysisImage(media: MediaFile, maxImageEdge = MAX_IMAGE_EDGE, quality = 0.82) {
  const url = media.url || media.thumbnailUrl;
  if (!url || (media.type !== 'image' && media.type !== 'video')) return null;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${media.name} analiz için açılamadı.`);
  const source = await response.blob();
  const optimized = media.type === 'video'
    ? await videoFrameToImage(source)
    : await shrinkImage(source, maxImageEdge, quality).catch(() => source);
  const dataUrl = await readBlobAsDataUrl(optimized);
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error(`${media.name} görsel verisine çevrilemedi.`);
  return {
    name: media.name,
    mimeType: optimized.type || media.mimeType || 'image/jpeg',
    data: dataUrl.slice(comma + 1),
  };
}

async function mediaToNewspaperVisionViews(media: MediaFile): Promise<AnalysisImage[]> {
  const url = media.url || media.thumbnailUrl;
  if (!url || media.type !== 'image') {
    throw new Error('Gazete çoklu Vision görünümü için geçerli bir gazete görseli gerekli.');
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${media.name} gazete Vision analizi için açılamadı.`);
  const source = await response.blob();
  return prepareNewspaperVisionViews(source, media.name || 'Gazete');
}

async function mediaToNewspaperEvidenceImage(
  media: MediaFile,
  candidates: VerifiedNewspaperCandidate[],
): Promise<AnalysisImage> {
  const url = media.url || media.thumbnailUrl;
  if (!url || media.type !== 'image') {
    throw new Error('Gazete birebir doğrulaması için geçerli bir gazete görseli gerekli.');
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${media.name} birebir doğrulama için açılamadı.`);
  const source = await response.blob();
  return prepareNewspaperEvidenceSheet(source, candidates, media.name || 'Gazete');
}

async function mediaToNewspaperHeadlineOcrEvidence(
  media: MediaFile,
  candidates: VerifiedNewspaperCandidate[],
) {
  const url = media.url || media.thumbnailUrl;
  if (!url || media.type !== 'image') {
    throw new Error('Gazete yerel OCR doğrulaması için geçerli bir gazete görseli gerekli.');
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${media.name} yerel OCR doğrulaması için açılamadı.`);
  const source = await response.blob();
  return readLocalHeadlineOcrEvidence(source, candidates);
}

async function request<T>(path: string, body: unknown, allowTokenPrompt = true): Promise<T> {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)?.trim();
  const startedAt = performance.now();
  const timeoutMs = path === '/analyze' ? ANALYZE_REQUEST_TIMEOUT_MS : TTS_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutHandle = window.setTimeout(() => controller.abort(), timeoutMs);
  const progressHandles: number[] = [];

  if (path === '/analyze') {
    progressHandles.push(window.setTimeout(() => writeSystemLog(
      'AI analizi sürüyor; Vision sağlayıcısı yanıtı bekleniyor.',
      'info',
    ), 10_000));
    progressHandles.push(window.setTimeout(() => writeSystemLog(
      'AI analizi devam ediyor; Worker gerekirse yapılandırılmış yedek Vision sağlayıcısına geçecek.',
      'warn',
    ), 25_000));
    progressHandles.push(window.setTimeout(() => writeSystemLog(
      'AI analizi halen sürüyor; gazete Vision için 120 saniyelik güvenlik zaman aşımı aktif.',
      'warn',
    ), 60_000));
    progressHandles.push(window.setTimeout(() => writeSystemLog(
      'AI analizi uzun sürüyor; son Vision fallback yanıtı bekleniyor.',
      'warn',
    ), 90_000));
  }

  writeSystemLog(`AI API isteği gönderiliyor: ${path}`);
  const endpoint = `${API_BASE}/ai${path}`;

  try {
    const response = await fetchWithNetworkRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { 'X-Hermes-Access': accessToken } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }, {
      endpoint: `/ai${path}`,
      onRetry: (attempt, delayMs, reason) => writeSystemLog(
        `AI API geçici bağlantı hatası: /ai${path} · ${reason} · ${attempt}. yeniden deneme ${delayMs} ms sonra.`,
        'warn',
      ),
    });

    let payload: ApiEnvelope<T> | null = null;
    try {
      payload = await response.json() as ApiEnvelope<T>;
    } catch (error) {
      if (controller.signal.aborted) throw error;
    }

    const elapsedMs = Math.round(performance.now() - startedAt);
    writeSystemLog(
      `AI API yanıtı: ${path} · HTTP ${response.status} · ${elapsedMs} ms`,
      response.ok ? 'info' : 'warn',
    );

    if (response.status === 401 && allowTokenPrompt) {
      writeSystemLog('Hermes AI erişim anahtarı gerekli; kullanıcıdan güvenli giriş bekleniyor.', 'warn');
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      const supplied = window.prompt('Hermes AI erişim anahtarını girin. Bu değer yalnızca bu tarayıcıda saklanır.');
      if (supplied?.trim()) {
        localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, supplied.trim());
        return request<T>(path, body, false);
      }
    }

    if (!response.ok || !payload?.success || !payload.data) {
      writeSystemLog(`AI API başarısız: ${path} · ${payload?.error?.message || `HTTP ${response.status}`}`, 'error');
      throw new Error(payload?.error?.message || `AI servisi yanıt vermedi (HTTP ${response.status}).`);
    }
    return payload.data;
  } catch (error) {
    if (controller.signal.aborted) {
      const seconds = Math.round(timeoutMs / 1000);
      writeSystemLog(`AI API zaman aşımı: ${path} · ${seconds} saniye. İşlem kontrollü olarak durduruldu.`, 'error');
      throw new Error(
        path === '/analyze'
          ? `AI analizi ${seconds} saniyede tamamlanmadı. Worker/AI sağlayıcı zinciri yanıt vermedi; tanı logu kaydedildi.`
          : `TTS isteği ${seconds} saniyede tamamlanmadı; tanı logu kaydedildi.`,
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutHandle);
    progressHandles.forEach(handle => window.clearTimeout(handle));
  }
}

function normalizeScript(script: HermesScript): HermesScript {
  const videoSlides = Array.isArray(script.videoSlides)
    ? script.videoSlides
      .filter(slide => slide && (slide.spokenText || slide.topText))
      .map(slide => ({
        sourceHeadlineId: String(slide.sourceHeadlineId || '').trim() || undefined,
        sourceHeadline: String(slide.sourceHeadline || '').trim() || undefined,
        topText: String(slide.topText || '').trim(),
        spokenText: String(slide.spokenText || slide.topText || '').trim(),
        imagePrompts: Array.isArray(slide.imagePrompts) ? slide.imagePrompts.map(String) : [],
      }))
    : [];
  if (!videoSlides.length) throw new Error('AI kullanılabilir video sahnesi üretmedi.');
  return { ...script, videoSlides };
}

function asNewspaperHeadline(value: HermesNewspaperHeadline | VisionNewspaperCandidate): HermesNewspaperHeadline {
  return {
    sourceHeadlineId: String(value.sourceHeadlineId || '').trim() || undefined,
    baslik: String(value.baslik || '').replace(/\s+/g, ' ').trim(),
    aciklama: String(value.aciklama || '').replace(/\s+/g, ' ').trim(),
    onem: Number(value.onem || 0),
    x: Number(value.x || 0),
    y: Number(value.y || 0),
    w: Number(value.w || 1),
    h: Number(value.h || 1),
  };
}

function buildHermes10NewspaperCandidates(script: HermesScript): VerifiedNewspaperCandidate[] {
  const source = script.gazeteBasliklari?.length
    ? script.gazeteBasliklari
    : script.visionGazeteBasliklari || [];

  return source
    .map(asNewspaperHeadline)
    .filter(item => item.baslik && item.aciklama)
    .filter((item, index, all) => {
      const key = item.baslik.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      return Boolean(key) && all.findIndex(other => (
        other.baslik.toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, ' ').trim() === key
      )) === index;
    })
    .sort((left, right) => {
      const importance = Number(right.onem || 0) - Number(left.onem || 0);
      if (importance) return importance;
      return Number(right.w || 0) * Number(right.h || 0) - Number(left.w || 0) * Number(left.h || 0);
    })
    .slice(0, MAX_NEWSPAPER_STORIES)
    .map((item, index) => ({
      id: `H${index + 1}`,
      text: item.baslik,
      detail: item.aciklama,
      confidence: 100,
      score: Math.max(1, Number(item.onem || (100 - index * 10))) * 10_000
        + Math.max(1, item.w) * Math.max(1, item.h),
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }));
}

/**
 * Eski testlerin ve geometri yardımcılarının API yüzeyini korur.
 * Gazete okuma akışı artık bu crop'u kullanmaz; Hermes 10 gibi Vision-first çalışır.
 */
export function computeNewspaperEvidenceCrop(options: {
  imageWidth: number;
  imageHeight: number;
  boxLeft: number;
  boxTop: number;
  boxWidth: number;
  boxHeight: number;
}) {
  const { imageWidth, imageHeight, boxLeft, boxTop, boxWidth, boxHeight } = options;
  const padX = Math.max(4, boxWidth * 0.04);
  const padTop = Math.max(3, boxHeight * 0.05);
  const contextHeight = Math.max(boxHeight * 3.2, imageHeight * 0.075);
  const maximumContextHeight = Math.min(imageHeight * 0.30, Math.max(boxHeight * 4.5, imageHeight * 0.11));
  const evidenceHeight = Math.min(contextHeight, maximumContextHeight);
  const left = Math.max(0, Math.floor(boxLeft - padX));
  const top = Math.max(0, Math.floor(boxTop - padTop));
  const right = Math.min(imageWidth, Math.ceil(boxLeft + boxWidth + padX));
  const bottom = Math.min(imageHeight, Math.ceil(boxTop + evidenceHeight));
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

export async function analyzeForVideo(options: {
  inputType: 'text' | 'url' | 'media' | 'prompt' | 'gazete';
  text: string;
  media: MediaFile[];
  config: RenderConfig;
}): Promise<AnalyzeResult> {
  const imageCandidates = options.media
    .filter(item => item.type === 'image' || item.type === 'video')
    .slice(0, MAX_ANALYSIS_IMAGES);

  let images: AnalysisImage[] = [];
  if (options.inputType === 'gazete' && imageCandidates.length === 1 && imageCandidates[0].type === 'image') {
    images = await mediaToNewspaperVisionViews(imageCandidates[0]);
    writeSystemLog('Gazete Vision hazırlığı: orijinal tam sayfa tek JPEG olarak hazırlandı; keşif koordinatları doğrudan bu sayfaya ait olacak.');
  } else {
    const settled = await Promise.allSettled(imageCandidates.map(media => mediaToAnalysisImage(
      media,
      options.inputType === 'gazete' ? MAX_NEWSPAPER_IMAGE_EDGE : MAX_IMAGE_EDGE,
      options.inputType === 'gazete' ? 0.92 : 0.82,
    )));
    images = settled
      .filter((item): item is PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof mediaToAnalysisImage>>>> => item.status === 'fulfilled' && Boolean(item.value))
      .map(item => item.value);
  }

  if (options.inputType === 'gazete' && images.length === 0) {
    throw new Error('Gazete görseli Vision analizi için hazırlanamadı.');
  }

  const requestConfig = {
    duration: options.config.duration,
    language: options.config.language,
    analysisMode: options.config.analysisMode,
    videoStyle: options.config.videoStyle,
    imageStyle: options.config.imageStyle,
    tip: options.config.tip,
    sourceName: options.config.sourceName,
    yorum: options.config.yorum,
  };

  if (options.inputType === 'gazete') {
    writeSystemLog('Hermes 10 gazete keşif modu: yalnız orijinal tam sayfa Vision modeline gönderiliyor; ilk geçiş metni yayın kaynağı olmayacak.');
    writeSystemLog('Yerel Tesseract OCR gazete başlığını veya cümlesini değiştirmeyecek.');
  }

  const result = await request<AnalyzeResult>('/analyze', {
    inputType: options.inputType,
    text: [
      options.text.trim(),
      options.inputType === 'gazete'
        ? 'GAZETE KEŞFİ: Gönderilen TEK görsel doğrudan orijinal tam gazete sayfasıdır. Bu ilk geçişin görevi yayın metni yazmak değil, en az 5 gerçek haber bölgesini bulup x/y/w/h koordinatlarını bu tam sayfanın 0-100 sisteminde vermektir. baslik/aciklama yalnız bölgeyi tanımaya yarayan okuma ipucudur ve videoda kullanılmayacaktır. Okuyamadığın kelimeyi uydurma.'
        : '',
    ].filter(Boolean).join('\n\n'),
    images,
    config: requestConfig,
  });

  if (options.inputType !== 'gazete') {
    return { ...result, script: normalizeScript(result.script) };
  }

  if (result.provider === 'local-fallback') {
    throw new Error(
      `Gazete Vision analizi başarısız oldu; yanlış OCR ile video üretilmedi. ${result.fallbackReason || ''}`.trim(),
    );
  }

  const candidates = buildHermes10NewspaperCandidates(result.script);
  writeSystemLog(
    `Hermes 10 gazete keşfi: Vision modelinden ${candidates.length} haber bölgesi bulundu; bu metinler henüz yayına alınmayacak.`,
    candidates.length >= 5 ? 'success' : 'warn',
  );
  if (candidates.length < 5) {
    throw new Error('Gazete keşfinde en az 5 haber bölgesi bulunamadı; birebir okuma doğrulaması başlatılmadı.');
  }

  const verificationImage = await mediaToNewspaperEvidenceImage(imageCandidates[0], candidates);
  writeSystemLog(
    `Gazete birebir okuma doğrulaması: ${candidates.length} haber H1-H${candidates.length} olarak ayrı kırpımlarda büyütüldü; ikinci Vision geçişi başlatılıyor.`,
  );
  writeSystemLog(
    `Gazete Vision sağlayıcı devri: ilk keşifte ${result.provider} kullanıldı; ikinci geçişte aynı sağlayıcı ücretsiz kota çakışmasını önlemek için sona ertelenecek.`,
  );
  const verificationResult = await request<AnalyzeResult>('/analyze', {
    inputType: 'gazete',
    text: 'GAZETE BİREBİR DOĞRULAMA: Görsel H1-H9 etiketli bağımsız haber kırpımlarından oluşur. Her karttaki kırmızı çerçeve hedef haber bölgesidir. Yalnız o hedefteki basılı başlığı ve fiziksel olarak bağlı spot/açıklamasını birebir oku. İlk keşif metnini tahmin veya düzeltme kaynağı olarak kullanma. Kartlar arasında kelime veya cümle taşıma. sourceHeadlineId alanını kart etiketiyle aynen döndür.',
    images: [verificationImage],
    config: {
      ...requestConfig,
      analysisMode: 'newspaper_verify',
      deferVisionProvider: result.provider,
    },
  });

  if (verificationResult.provider === 'local-fallback') {
    throw new Error(
      `Gazete birebir okuma doğrulaması başarısız oldu; ilk geçişteki olası yanlış metin videoya alınmadı. ${verificationResult.fallbackReason || ''}`.trim(),
    );
  }

  writeSystemLog(
    'Gazete yerel OCR doğrulama kapısı: Tesseract ikinci Vision başlık + açıklamasını aynı geniş kırpımda bağımsız olarak destekliyor mu kontrol edecek; OCR metni yazı veya TTS kaynağı olmayacak.',
  );
  let localOcrEvidence: ReadonlyMap<string, string>;
  try {
    localOcrEvidence = await mediaToNewspaperHeadlineOcrEvidence(imageCandidates[0], candidates);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Gazete yerel OCR doğrulama kapısı çalışmadı; doğrulanmamış metin videoya alınmadı. ${reason}`);
  }

  const consensus = reconcileVerifiedNewspaperText(
    candidates,
    verificationResult.script.gazeteBasliklari || [],
    localOcrEvidence,
  );
  consensus.rejections.forEach(rejection => writeSystemLog(
    `Gazete yayın doğrulaması reddedildi ${rejection.id}: ${rejection.reason} · keşif-ipucu="${rejection.discoveredHeadline}" · Vision-2="${rejection.verifiedHeadline}"`,
    'warn',
  ));
  const verifiedCandidates = consensus.candidates;
  writeSystemLog(
    `Gazete yayın doğrulaması tamamlandı: ${verifiedCandidates.length}/${candidates.length} haber · Vision-2 birebir metin + aynı geniş kırpım yerel OCR kanıtı.`,
    verifiedCandidates.length >= 5 ? 'success' : 'warn',
  );
  if (verifiedCandidates.length < 5) {
    throw new Error(
      `En az 5 haber ikinci Vision geçişi ve aynı geniş gazete kırpımındaki yerel OCR başlık+açıklama kanıtıyla doğrulanamadı; yanlış video üretilmedi. Doğrulanan: ${verifiedCandidates.length}/${candidates.length}.`,
    );
  }

  const orderedScript = buildLockedNewspaperScript({
    script: verificationResult.script,
    candidates: verifiedCandidates,
    configuredSourceName: options.config.sourceName,
  });

  writeSystemLog(
    `Gazete sahneleri hazır: ${orderedScript.videoSlides.length} haber · yayın metni ikinci Vision + aynı kırpım OCR kanıtıyla kilitlendi · ilk keşif metni ve OCR metni yayında kullanılmadı · AI görsel yok.`,
    'success',
  );

  return {
    ...verificationResult,
    attempts: [...result.attempts, ...verificationResult.attempts],
    script: normalizeScript(orderedScript),
  };
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
}

function pcmToWav(pcm: Uint8Array, sampleRate: number) {
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + pcm.byteLength);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  new Uint8Array(buffer, headerSize).set(pcm);
  return new Blob([buffer], { type: 'audio/wav' });
}

export async function createNarration(text: string, voice = 'Aoede') {
  const speech = await request<{
    audioData: string;
    mimeType: string;
    sampleRate: number;
  }>('/tts', { text, voice });
  return pcmToWav(decodeBase64(speech.audioData), speech.sampleRate || 24000);
}
