from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:160]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


def insert_before(path: str, anchor: str, addition: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one anchor, found {count}: {anchor[:160]!r}')
    p.write_text(text.replace(anchor, addition + anchor, 1), encoding='utf-8')


# ---------------------------------------------------------------------------
# 1) Newspaper verification: require Vision-1/Vision-2 agreement and use local
#    Tesseract only as a rejection guard. OCR NEVER supplies published text.
# ---------------------------------------------------------------------------
path = 'apps/web/src/lib/newspaperEvidenceVerification.ts'
anchor = "export function computeNewspaperVerificationCrop(options: {\n"
helpers = r'''export interface NewspaperVerificationRejection {
  id: string;
  reason: string;
  discoveredHeadline: string;
  verifiedHeadline: string;
}

export interface NewspaperVerificationConsensus {
  candidates: VerifiedNewspaperCandidate[];
  rejections: NewspaperVerificationRejection[];
}

function normalizeVisionHeadline(value: string) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[’‘`´']/g, '')
    .replace(/[^\p{L}\p{N}%₺$€£]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const OCR_FOLD: Record<string, string> = {
  'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
};

function normalizeOcrGuard(value: string) {
  return normalizeVisionHeadline(value)
    .replace(/[çğıöşü]/g, character => OCR_FOLD[character] || character);
}

function ocrTokens(value: string) {
  return normalizeOcrGuard(value).split(/\s+/).filter(Boolean);
}

function editDistance(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[right.length];
}

function ocrTokenMatches(left: string, right: string) {
  if (left === right) return true;
  if (/\d/u.test(left) || /\d/u.test(right) || left.length < 5 || right.length < 5) return false;
  return editDistance(left, right) <= Math.max(1, Math.floor(Math.max(left.length, right.length) * 0.18));
}

function orderedOcrCoverage(expected: string[], evidence: string[]) {
  const row = new Array(evidence.length + 1).fill(0) as number[];
  for (let expectedIndex = 1; expectedIndex <= expected.length; expectedIndex += 1) {
    let diagonal = 0;
    for (let evidenceIndex = 1; evidenceIndex <= evidence.length; evidenceIndex += 1) {
      const above = row[evidenceIndex];
      row[evidenceIndex] = ocrTokenMatches(expected[expectedIndex - 1], evidence[evidenceIndex - 1])
        ? diagonal + 1
        : Math.max(row[evidenceIndex], row[evidenceIndex - 1]);
      diagonal = above;
    }
  }
  return expected.length ? row[evidence.length] / expected.length : 0;
}

function exactFacts(value: string) {
  return normalizeOcrGuard(value).match(/(?:%\s*)?\d+(?:[.,]\d+)?|[₺$€£]/g) || [];
}

export function hasLocalOcrHeadlineSupport(headline: string, ocrEvidence: string) {
  const expected = ocrTokens(headline);
  const evidence = ocrTokens(ocrEvidence);
  if (expected.length < 2 || evidence.length < 2) return false;
  const facts = exactFacts(headline);
  const evidenceFacts = new Set(exactFacts(ocrEvidence));
  if (!facts.every(fact => evidenceFacts.has(fact))) return false;
  return orderedOcrCoverage(expected, evidence) >= 0.82;
}

function hasVisionHeadlineConsensus(discovered: string, verified: string) {
  const left = normalizeVisionHeadline(discovered);
  const right = normalizeVisionHeadline(verified);
  return Boolean(left) && left === right;
}

function detailTokens(value: string) {
  return new Set(normalizeVisionHeadline(value).split(/\s+/).filter(Boolean));
}

function hasVisionDetailConsensus(discovered: string, verified: string) {
  const left = detailTokens(discovered);
  const right = detailTokens(verified);
  if (left.size < 4 || right.size < 4) return false;
  const shared = [...left].filter(token => right.has(token)).length;
  const overlap = shared / Math.max(1, Math.min(left.size, right.size));
  const leftFacts = exactFacts(discovered).sort();
  const rightFacts = exactFacts(verified).sort();
  const factsMatch = leftFacts.length === rightFacts.length
    && leftFacts.every((fact, index) => fact === rightFacts[index]);
  return overlap >= 0.58 && factsMatch;
}

export function reconcileVerifiedNewspaperText(
  discovered: VerifiedNewspaperCandidate[],
  verified: NewspaperVerificationHeadline[],
  localOcrEvidence?: ReadonlyMap<string, string>,
): NewspaperVerificationConsensus {
  const byId = new Map(
    verified
      .map(item => ({
        id: String(item.sourceHeadlineId || '').trim().toUpperCase(),
        baslik: String(item.baslik || '').replace(/\s+/g, ' ').trim(),
        aciklama: String(item.aciklama || '').replace(/\s+/g, ' ').trim(),
      }))
      .filter(item => /^H\d+$/.test(item.id) && item.baslik && item.aciklama)
      .map(item => [item.id, item] as const),
  );

  const candidates: VerifiedNewspaperCandidate[] = [];
  const rejections: NewspaperVerificationRejection[] = [];
  for (const candidate of discovered) {
    const id = String(candidate.id || '').trim().toUpperCase();
    const exact = byId.get(id);
    const reject = (reason: string, verifiedHeadline = exact?.baslik || '') => rejections.push({
      id,
      reason,
      discoveredHeadline: candidate.text,
      verifiedHeadline,
    });

    if (!exact) {
      reject('ikinci Vision geçişinde aynı H kimliğiyle tam başlık+açıklama yok');
      continue;
    }
    if (!hasVisionHeadlineConsensus(candidate.text, exact.baslik)) {
      reject('Vision-1 ve Vision-2 başlıkları birebir uyuşmuyor');
      continue;
    }
    if (!hasVisionDetailConsensus(candidate.detail, exact.aciklama)) {
      reject('Vision-1 ve Vision-2 açıklamalarında yeterli metin/olgusal mutabakat yok');
      continue;
    }
    if (localOcrEvidence) {
      const evidence = localOcrEvidence.get(id) || '';
      if (!hasLocalOcrHeadlineSupport(exact.baslik, evidence)) {
        reject('yerel OCR aynı gazete kırpımında başlığı yeterince desteklemiyor');
        continue;
      }
    }

    candidates.push({
      ...candidate,
      text: exact.baslik,
      detail: exact.aciklama,
      confidence: 100,
    });
  }

  return { candidates, rejections };
}

'''
insert_before(path, anchor, helpers)

old_apply = r'''export function applyVerifiedNewspaperText(
  discovered: VerifiedNewspaperCandidate[],
  verified: NewspaperVerificationHeadline[],
) {
  const byId = new Map(
    verified
      .map(item => ({
        id: String(item.sourceHeadlineId || '').trim().toUpperCase(),
        baslik: String(item.baslik || '').replace(/\s+/g, ' ').trim(),
        aciklama: String(item.aciklama || '').replace(/\s+/g, ' ').trim(),
      }))
      .filter(item => /^H\d+$/.test(item.id) && item.baslik && item.aciklama)
      .map(item => [item.id, item] as const),
  );

  return discovered.flatMap(candidate => {
    const exact = byId.get(String(candidate.id || '').toUpperCase());
    if (!exact) return [];
    return [{
      ...candidate,
      text: exact.baslik,
      detail: exact.aciklama,
      confidence: 100,
    }];
  });
}
'''
new_apply = r'''export function applyVerifiedNewspaperText(
  discovered: VerifiedNewspaperCandidate[],
  verified: NewspaperVerificationHeadline[],
) {
  return reconcileVerifiedNewspaperText(discovered, verified).candidates;
}
'''
replace_once(path, old_apply, new_apply)

ocr_anchor = "function canvasToJpeg(canvas: HTMLCanvasElement) {\n"
ocr_code = r'''function computeNewspaperHeadlineOcrCrop(options: {
  imageWidth: number;
  imageHeight: number;
  candidate: Pick<VerifiedNewspaperCandidate, 'x' | 'y' | 'w' | 'h'>;
}) {
  const { imageWidth, imageHeight, candidate } = options;
  const x = clamp(Number(candidate.x || 0), 0, 100) / 100;
  const y = clamp(Number(candidate.y || 0), 0, 100) / 100;
  const w = clamp(Number(candidate.w || 1), 1, 100) / 100;
  const h = clamp(Number(candidate.h || 1), 1, 100) / 100;
  const horizontalPad = Math.max(imageWidth * 0.012, imageWidth * w * 0.05);
  const headlineHeight = Math.min(
    imageHeight * 0.18,
    Math.max(imageHeight * 0.055, imageHeight * h * 1.05),
  );
  const left = clamp(Math.floor(imageWidth * x - horizontalPad), 0, Math.max(0, imageWidth - 1));
  const top = clamp(Math.floor(imageHeight * y - imageHeight * 0.004), 0, Math.max(0, imageHeight - 1));
  const right = clamp(Math.ceil(imageWidth * (x + w) + horizontalPad), left + 1, imageWidth);
  const bottom = clamp(Math.ceil(top + headlineHeight), top + 1, imageHeight);
  return { left, top, width: right - left, height: bottom - top };
}

export async function readLocalHeadlineOcrEvidence(
  blob: Blob,
  candidates: VerifiedNewspaperCandidate[],
) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('tur');
  try {
    const bitmap = await createImageBitmap(blob);
    try {
      const evidence = new Map<string, string>();
      for (const candidate of candidates.slice(0, 9)) {
        const crop = computeNewspaperHeadlineOcrCrop({
          imageWidth: bitmap.width,
          imageHeight: bitmap.height,
          candidate,
        });
        const scale = Math.max(1, Math.min(3, 1500 / Math.max(1, crop.width)));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(crop.width * scale));
        canvas.height = Math.max(1, Math.round(crop.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Yerel OCR doğrulama çizim alanı oluşturulamadı.');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.filter = 'grayscale(1) contrast(1.35)';
        context.drawImage(
          bitmap,
          crop.left,
          crop.top,
          crop.width,
          crop.height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        context.filter = 'none';
        const result = await worker.recognize(canvas);
        evidence.set(candidate.id.toUpperCase(), String(result.data?.text || '').replace(/\s+/g, ' ').trim());
      }
      return evidence;
    } finally {
      bitmap.close();
    }
  } finally {
    await worker.terminate();
  }
}

'''
insert_before(path, ocr_anchor, ocr_code)


# ---------------------------------------------------------------------------
# 2) aiClient: execute the independent OCR rejection gate after two Vision
#    passes, log exact disagreements, and fail closed below five stories.
# ---------------------------------------------------------------------------
path = 'apps/web/src/lib/aiClient.ts'
replace_once(
    path,
    "import {\n  applyVerifiedNewspaperText,\n  prepareNewspaperEvidenceSheet,\n} from './newspaperEvidenceVerification';",
    "import {\n  prepareNewspaperEvidenceSheet,\n  readLocalHeadlineOcrEvidence,\n  reconcileVerifiedNewspaperText,\n} from './newspaperEvidenceVerification';",
)

helper_anchor = "async function request<T>(path: string, body: unknown, allowTokenPrompt = true): Promise<T> {\n"
helper_code = r'''async function mediaToNewspaperHeadlineOcrEvidence(
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

'''
insert_before(path, helper_anchor, helper_code)

old_verify = r'''  const verifiedCandidates = applyVerifiedNewspaperText(
    candidates,
    verificationResult.script.gazeteBasliklari || [],
  );
  writeSystemLog(
    `Gazete birebir doğrulama tamamlandı: ${verifiedCandidates.length}/${candidates.length} haber başlığı + açıklaması ikinci Vision okumasıyla H kimliğine kilitlendi.`,
    verifiedCandidates.length >= 5 ? 'success' : 'warn',
  );

  const orderedScript = buildLockedNewspaperScript({
'''
new_verify = r'''  writeSystemLog(
    'Gazete yerel OCR doğrulama kapısı: Tesseract yalnız aynı kırpımda Vision başlığını destekliyor mu kontrol edecek; OCR metni yazı veya TTS kaynağı olmayacak.',
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
    `Gazete metin mutabakatı reddedildi ${rejection.id}: ${rejection.reason} · Vision-1="${rejection.discoveredHeadline}" · Vision-2="${rejection.verifiedHeadline}"`,
    'warn',
  ));
  const verifiedCandidates = consensus.candidates;
  writeSystemLog(
    `Gazete üçlü doğrulama tamamlandı: ${verifiedCandidates.length}/${candidates.length} haber · Vision-1 + farklı Vision geçişi + yerel OCR kanıtı.`,
    verifiedCandidates.length >= 5 ? 'success' : 'warn',
  );
  if (verifiedCandidates.length < 5) {
    throw new Error(
      `En az 5 haber iki Vision geçişi ve aynı gazete kırpımındaki yerel OCR kanıtıyla birebir doğrulanamadı; yanlış video üretilmedi. Doğrulanan: ${verifiedCandidates.length}/${candidates.length}.`,
    );
  }

  const orderedScript = buildLockedNewspaperScript({
'''
replace_once(path, old_verify, new_verify)
replace_once(
    path,
    "    `Gazete sahneleri hazır: ${orderedScript.videoSlides.length} haber · yazı ve TTS yalnız ikinci birebir Vision okumasından üretildi · AI görsel yok.`,",
    "    `Gazete sahneleri hazır: ${orderedScript.videoSlides.length} haber · başlıklar iki Vision geçişi + yerel OCR kanıtıyla kilitlendi · OCR metni yayında kullanılmadı · AI görsel yok.`,",
)


# ---------------------------------------------------------------------------
# 3) Renderer: subtitle chunks are smaller, always wrap to <=2 lines and use
#    Canvas maxWidth as a final hard overflow guard.
# ---------------------------------------------------------------------------
path = 'apps/web/src/lib/localRenderer.ts'
old_chunk = r'''function subtitleChunk(text: string, progress: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += 5) chunks.push(words.slice(index, index + 5).join(' '));
  return chunks[Math.min(chunks.length - 1, Math.floor(progress * chunks.length))];
}
'''
new_chunk = r'''export function splitSubtitleChunks(text: string, wordsPerChunk = 4) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const size = Math.max(1, Math.floor(wordsPerChunk));
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += size) chunks.push(words.slice(index, index + size).join(' '));
  return chunks;
}

function subtitleChunk(text: string, progress: number) {
  const chunks = splitSubtitleChunks(text, 4);
  if (!chunks.length) return '';
  return chunks[Math.min(chunks.length - 1, Math.floor(progress * chunks.length))];
}
'''
replace_once(path, old_chunk, new_chunk)

old_subtitle = r'''  if (config.subtitles !== 'off') {
    const subtitle = subtitleChunk(scene.spokenText, progress);
    if (subtitle) {
      let fontSize = Math.round(width * 0.052);
      ctx.font = `900 ${fontSize}px ${getFontFamily(config.fontStyle)}`;
      while (ctx.measureText(subtitle).width > width * 0.91 && fontSize > width * 0.035) {
        fontSize -= 1;
        ctx.font = `900 ${fontSize}px ${getFontFamily(config.fontStyle)}`;
      }
      const boxWidth = Math.min(width * 0.96, ctx.measureText(subtitle).width + fontSize * 1.1);
      const boxHeight = fontSize * 1.5;
      const boxX = (width - boxWidth) / 2;
      const boxY = height * 0.71;
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, fontSize * 0.18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(subtitle, width / 2, boxY + boxHeight / 2);
    }
  }
'''
new_subtitle = r'''  if (config.subtitles !== 'off') {
    const subtitle = subtitleChunk(scene.spokenText, progress);
    if (subtitle) {
      const fontFamily = getFontFamily(config.fontStyle);
      const maxTextWidth = width * 0.88;
      const minimumFontSize = Math.max(18, Math.round(width * 0.026));
      let fontSize = Math.round(width * 0.052);
      let lines: string[] = [];
      while (fontSize >= minimumFontSize) {
        ctx.font = `900 ${fontSize}px ${fontFamily}`;
        lines = wrapText(ctx, subtitle, maxTextWidth);
        const widest = Math.max(...lines.map(line => ctx.measureText(line).width), 0);
        if (lines.length <= 2 && widest <= maxTextWidth) break;
        fontSize -= 1;
      }
      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      lines = wrapText(ctx, subtitle, maxTextWidth).slice(0, 2);
      const widest = Math.max(...lines.map(line => Math.min(maxTextWidth, ctx.measureText(line).width)), 1);
      const lineHeight = fontSize * 1.12;
      const boxWidth = Math.min(width * 0.96, widest + fontSize * 1.15);
      const boxHeight = lines.length * lineHeight + fontSize * 0.58;
      const boxX = (width - boxWidth) / 2;
      const boxY = height * 0.705;
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, fontSize * 0.18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((line, index) => {
        const y = boxY + fontSize * 0.29 + lineHeight * (index + 0.5);
        ctx.fillText(line, width / 2, y, maxTextWidth);
      });
    }
  }
'''
replace_once(path, old_subtitle, new_subtitle)


# ---------------------------------------------------------------------------
# 4) Regression tests grounded in the exact defects observed in the user's
#    3.14.53 output.
# ---------------------------------------------------------------------------
Path('apps/web/src/lib/newspaperEvidenceVerification.test.ts').write_text(r'''import { describe, expect, it } from 'vitest';
import {
  applyVerifiedNewspaperText,
  computeNewspaperVerificationCrop,
  hasLocalOcrHeadlineSupport,
  reconcileVerifiedNewspaperText,
} from './newspaperEvidenceVerification';

const discovered = [
  {
    id: 'H1',
    text: "AVRUPA'DA TUR GECESİ",
    detail: 'Fenerbahçe Avrupa kupalarında tur için sahaya çıkıyor. Temsilcimiz avantajlı skor arıyor.',
    confidence: 100,
    score: 100,
    x: 35,
    y: 8,
    w: 28,
    h: 10,
  },
  {
    id: 'H2',
    text: 'Banka takipte üretici dertli',
    detail: 'Üreticiler kredi faizlerini ödemekte zorlanıyor. Bankaların takibi artıyor.',
    confidence: 100,
    score: 90,
    x: 34,
    y: 60,
    w: 30,
    h: 14,
  },
];

describe('newspaper evidence verification', () => {
  it('Vision-2 başlığı Vision-1 ile birebir uyuşmuyorsa düzeltme diye yayınlamaz', () => {
    const verified = applyVerifiedNewspaperText(discovered, [
      {
        sourceHeadlineId: 'H1',
        baslik: "FİBA'DA TUR GECESİ",
        aciklama: 'Fenerbahçe Avrupa kupalarında tur için sahaya çıkıyor. Temsilcimiz avantajlı skor arıyor.',
      },
      {
        sourceHeadlineId: 'H2',
        baslik: 'Banka takipte üretici dertli',
        aciklama: 'Üreticiler kredi faizlerini ödemekte zorlanıyor. Bankaların takibi artıyor.',
      },
    ]);

    expect(verified).toHaveLength(1);
    expect(verified[0].id).toBe('H2');
    expect(JSON.stringify(verified)).not.toContain("FİBA'DA TUR GECESİ");
  });

  it('videoda görülen promosyon yeniden-yazımını mutabakat kapısında reddeder', () => {
    const result = reconcileVerifiedNewspaperText([
      {
        id: 'H1', text: 'EMEKLİLERE YÜKSEK PROMOSYON FORMÜLÜ',
        detail: 'Bankalar emekliler için yeni promosyon formüllerini değerlendiriyor.',
        confidence: 100, score: 100, x: 5, y: 5, w: 25, h: 10,
      },
    ], [{
      sourceHeadlineId: 'H1',
      baslik: 'EMEKLİLERE PROMOSYON FIRSATI',
      aciklama: 'Bankalar emekliler için yeni promosyon formüllerini değerlendiriyor.',
    }]);

    expect(result.candidates).toEqual([]);
    expect(result.rejections[0].reason).toContain('birebir uyuşmuyor');
  });

  it('yerel OCR başlığı destekliyorsa Vision metnini değiştirmeden geçirir', () => {
    expect(hasLocalOcrHeadlineSupport(
      "AVRUPA'DA TUR GECESİ",
      "Avrupa'da tur gecesi Fenerbahçe bu akşam sahaya çıkacak",
    )).toBe(true);
    expect(hasLocalOcrHeadlineSupport(
      "FİBA'DA TUR GECESİ",
      "Avrupa'da tur gecesi Fenerbahçe bu akşam sahaya çıkacak",
    )).toBe(false);
    expect(hasLocalOcrHeadlineSupport(
      "DENİZOĞLU'NUN ÖLÜMÜNDE CİNAYET",
      "Denizoğlu'nun ölümünde cinayet izi soruşturması sürüyor",
    )).toBe(false);
  });

  it('H kimliği olmayan veya açıklaması olmayan ikinci okuma sonucunu yayın adayı yapmaz', () => {
    const verified = applyVerifiedNewspaperText(discovered, [
      { sourceHeadlineId: 'H1', baslik: "AVRUPA'DA TUR GECESİ", aciklama: '' },
      { sourceHeadlineId: 'H9', baslik: 'Başka haber', aciklama: 'Başka açıklama.' },
    ]);
    expect(verified).toEqual([]);
  });

  it('kanıt kırpımını sayfa sınırları içinde ve açıklama bağlamını kapsayacak yükseklikte tutar', () => {
    const crop = computeNewspaperVerificationCrop({
      imageWidth: 1600,
      imageHeight: 2400,
      candidate: discovered[0],
    });
    expect(crop.left).toBeGreaterThanOrEqual(0);
    expect(crop.top).toBeGreaterThanOrEqual(0);
    expect(crop.left + crop.width).toBeLessThanOrEqual(1600);
    expect(crop.top + crop.height).toBeLessThanOrEqual(2400);
    expect(crop.height).toBeGreaterThan(2400 * 0.12 - 2);
  });
});
''', encoding='utf-8')

Path('apps/web/src/lib/localRenderer.subtitle.test.ts').write_text(r'''import { describe, expect, it } from 'vitest';
import { splitSubtitleChunks } from './localRenderer';

describe('subtitle safe layout input', () => {
  it('uzun haber cümlesini en fazla dört kelimelik parçalara böler', () => {
    const chunks = splitSubtitleChunks(
      "DENİZOĞLU'NUN ÖLÜMÜNDE CİNAYET İZİ soruşturmanın ayrıntıları açıklandı",
    );
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(chunk => expect(chunk.split(/\s+/)).toHaveLength(expect.any(Number)));
    expect(Math.max(...chunks.map(chunk => chunk.split(/\s+/).length))).toBeLessThanOrEqual(4);
  });
});
''', encoding='utf-8')


# ---------------------------------------------------------------------------
# 5) Production deploy marker. Version itself is bumped by the workflow's
#    existing deterministic bump script after this patch applies.
# ---------------------------------------------------------------------------
replace_once(
    'services/api-gateway/wrangler.toml',
    '# OTONOM 3.14.53 production deploy · newspaper provider handoff and compact verification',
    '# OTONOM 3.14.54 production deploy · strict headline grounding · local OCR rejection guard · subtitle safety',
)

print('OTONOM 3.14.54 final stability patch applied.')
