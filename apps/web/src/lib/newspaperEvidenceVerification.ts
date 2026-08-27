import type { VerifiedNewspaperCandidate } from './newspaperPipeline';

export interface NewspaperVerificationHeadline {
  sourceHeadlineId?: string;
  baslik: string;
  aciklama: string;
}

export interface NewspaperEvidenceCrop {
  left: number;
  top: number;
  width: number;
  height: number;
}

const SHEET_WIDTH = 2200;
const SHEET_PADDING = 24;
const SHEET_GAP = 18;
const CARD_HEADER = 52;
const CARD_HEIGHT = 560;
const SHEET_JPEG_QUALITY = 0.9;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export interface NewspaperVerificationRejection {
  id: string;
  reason: string;
  discoveredHeadline: string;
  verifiedHeadline: string;
}

export interface NewspaperVerificationConsensus {
  candidates: VerifiedNewspaperCandidate[];
  rejections: NewspaperVerificationRejection[];
}

function normalizeText(value: string) {
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
  return normalizeText(value)
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

function hasLocalOcrTextSupport(options: {
  expectedText: string;
  ocrEvidence: string;
  minTokens: number;
  maxLines: number;
  minRecall: number;
  minPrecision: number;
}) {
  const expected = ocrTokens(options.expectedText);
  if (expected.length < options.minTokens) return false;

  const facts = exactFacts(options.expectedText);
  const evidenceFacts = new Set(exactFacts(options.ocrEvidence));
  if (!facts.every(fact => evidenceFacts.has(fact))) return false;

  const rawLines = String(options.ocrEvidence || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  if (!rawLines.length) return false;

  for (let start = 0; start < rawLines.length; start += 1) {
    for (let count = 1; count <= options.maxLines && start + count <= rawLines.length; count += 1) {
      const windowTokens = ocrTokens(rawLines.slice(start, start + count).join(' '));
      if (!windowTokens.length) continue;
      const matched = orderedOcrCoverage(expected, windowTokens) * expected.length;
      const recall = matched / expected.length;
      const precision = matched / windowTokens.length;
      if (recall >= options.minRecall && precision >= options.minPrecision) return true;
    }
  }
  return false;
}

export function hasLocalOcrHeadlineSupport(headline: string, ocrEvidence: string) {
  return hasLocalOcrTextSupport({
    expectedText: headline,
    ocrEvidence,
    minTokens: 2,
    maxLines: 4,
    minRecall: 0.82,
    minPrecision: 0.62,
  });
}

export function hasLocalOcrDetailSupport(detail: string, ocrEvidence: string) {
  return hasLocalOcrTextSupport({
    expectedText: detail,
    ocrEvidence,
    minTokens: 4,
    maxLines: 8,
    minRecall: 0.62,
    minPrecision: 0.42,
  });
}

function hasVisionHeadlineConsensus(discovered: string, verified: string) {
  const left = normalizeText(discovered);
  const right = normalizeText(verified);
  return Boolean(left) && left === right;
}

function visionDetailTokens(value: string) {
  return new Set(normalizeText(value).split(/\s+/).filter(token => token.length >= 2));
}

function hasVisionDetailConsensus(discovered: string, verified: string) {
  const left = visionDetailTokens(discovered);
  const right = visionDetailTokens(verified);
  if (left.size < 4 || right.size < 4) return false;

  const shared = [...left].filter(token => right.has(token)).length;
  const recall = shared / Math.max(1, Math.min(left.size, right.size));
  const leftFacts = exactFacts(discovered).sort();
  const rightFacts = exactFacts(verified).sort();
  const factsMatch = leftFacts.length === rightFacts.length
    && leftFacts.every((fact, index) => fact === rightFacts[index]);
  return recall >= 0.66 && factsMatch;
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

    if (localOcrEvidence) {
      const evidence = localOcrEvidence.get(id) || '';
      const headlineByOcr = hasLocalOcrHeadlineSupport(exact.baslik, evidence);
      const headlineByIndependentVision = hasVisionHeadlineConsensus(candidate.text, exact.baslik);
      if (!headlineByOcr && !headlineByIndependentVision) {
        reject('başlık ne aynı kırpım OCR kanıtıyla ne de bağımsız Vision-1/Vision-2 birebir mutabakatıyla doğrulandı');
        continue;
      }

      const detailByOcr = hasLocalOcrDetailSupport(exact.aciklama, evidence);
      const detailByIndependentVision = hasVisionDetailConsensus(candidate.detail, exact.aciklama);
      if (!detailByOcr && !detailByIndependentVision) {
        reject('açıklama ne aynı kırpım OCR kanıtıyla ne de bağımsız Vision-1/Vision-2 olgusal mutabakatıyla doğrulandı');
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

export function computeNewspaperVerificationCrop(options: {
  imageWidth: number;
  imageHeight: number;
  candidate: Pick<VerifiedNewspaperCandidate, 'x' | 'y' | 'w' | 'h'>;
}): NewspaperEvidenceCrop {
  const { imageWidth, imageHeight, candidate } = options;
  const x = clamp(Number(candidate.x || 0), 0, 100) / 100;
  const y = clamp(Number(candidate.y || 0), 0, 100) / 100;
  const w = clamp(Number(candidate.w || 1), 1, 100) / 100;
  const h = clamp(Number(candidate.h || 1), 1, 100) / 100;

  const horizontalPad = Math.max(imageWidth * 0.018, imageWidth * w * 0.15);
  const verticalPad = Math.max(imageHeight * 0.01, imageHeight * h * 0.12);
  const requestedHeight = Math.max(
    imageHeight * 0.16,
    imageHeight * h * 2.4,
  );
  const maximumHeight = imageHeight * 0.34;

  const left = clamp(Math.floor(imageWidth * x - horizontalPad), 0, Math.max(0, imageWidth - 1));
  const top = clamp(Math.floor(imageHeight * y - verticalPad), 0, Math.max(0, imageHeight - 1));
  const right = clamp(
    Math.ceil(imageWidth * (x + w) + horizontalPad),
    left + 1,
    imageWidth,
  );
  const bottom = clamp(
    Math.ceil(top + Math.min(requestedHeight, maximumHeight)),
    top + 1,
    imageHeight,
  );

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

export function applyVerifiedNewspaperText(
  discovered: VerifiedNewspaperCandidate[],
  verified: NewspaperVerificationHeadline[],
) {
  return reconcileVerifiedNewspaperText(discovered, verified).candidates;
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
        const crop = computeNewspaperVerificationCrop({
          imageWidth: bitmap.width,
          imageHeight: bitmap.height,
          candidate,
        });
        const scale = Math.max(1, Math.min(3, 1800 / Math.max(1, crop.width)));
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
        evidence.set(candidate.id.toUpperCase(), String(result.data?.text || '').replace(/\r/g, '').trim());
      }
      return evidence;
    } finally {
      bitmap.close();
    }
  } finally {
    await worker.terminate();
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Gazete doğrulama kanıtı oluşturulamadı.')),
      'image/jpeg',
      SHEET_JPEG_QUALITY,
    );
  });
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      const comma = value.indexOf(',');
      if (comma < 0) {
        reject(new Error('Gazete doğrulama kanıtı base64 verisine çevrilemedi.'));
        return;
      }
      resolve(value.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error('Gazete doğrulama kanıtı okunamadı.'));
    reader.readAsDataURL(blob);
  });
}

function drawTargetBox(options: {
  context: CanvasRenderingContext2D;
  candidate: Pick<VerifiedNewspaperCandidate, 'x' | 'y' | 'w' | 'h'>;
  imageWidth: number;
  imageHeight: number;
  crop: NewspaperEvidenceCrop;
  targetX: number;
  targetY: number;
  scale: number;
}) {
  const { context, candidate, imageWidth, imageHeight, crop, targetX, targetY, scale } = options;
  const sourceLeft = imageWidth * clamp(Number(candidate.x || 0), 0, 100) / 100;
  const sourceTop = imageHeight * clamp(Number(candidate.y || 0), 0, 100) / 100;
  const sourceWidth = imageWidth * clamp(Number(candidate.w || 1), 1, 100) / 100;
  const sourceHeight = imageHeight * clamp(Number(candidate.h || 1), 1, 100) / 100;

  const boxX = targetX + (sourceLeft - crop.left) * scale;
  const boxY = targetY + (sourceTop - crop.top) * scale;
  const boxWidth = Math.max(8, sourceWidth * scale);
  const boxHeight = Math.max(8, sourceHeight * scale);

  context.save();
  context.strokeStyle = '#d00000';
  context.lineWidth = 6;
  context.strokeRect(boxX, boxY, boxWidth, boxHeight);
  context.restore();
}

export async function prepareNewspaperEvidenceSheet(
  blob: Blob,
  candidates: VerifiedNewspaperCandidate[],
  sourceName: string,
) {
  if (candidates.length < 5) {
    throw new Error('Gazete doğrulama sayfası için en az 5 keşfedilmiş haber gerekli.');
  }

  const bitmap = await createImageBitmap(blob);
  try {
    const items = candidates.slice(0, 9);
    const columns = 2;
    const rows = Math.ceil(items.length / columns);
    const cardWidth = Math.floor((SHEET_WIDTH - SHEET_PADDING * 2 - SHEET_GAP) / columns);
    const sheetHeight = SHEET_PADDING * 2 + rows * CARD_HEIGHT + Math.max(0, rows - 1) * SHEET_GAP;
    const canvas = document.createElement('canvas');
    canvas.width = SHEET_WIDTH;
    canvas.height = sheetHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Gazete doğrulama çizim alanı oluşturulamadı.');

    context.fillStyle = '#ececec';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 30px Arial, sans-serif';
    context.textBaseline = 'middle';

    items.forEach((candidate, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cardX = SHEET_PADDING + column * (cardWidth + SHEET_GAP);
      const cardY = SHEET_PADDING + row * (CARD_HEIGHT + SHEET_GAP);
      const imageY = cardY + CARD_HEADER;
      const imageHeight = CARD_HEIGHT - CARD_HEADER;
      const crop = computeNewspaperVerificationCrop({
        imageWidth: bitmap.width,
        imageHeight: bitmap.height,
        candidate,
      });

      context.fillStyle = '#ffffff';
      context.fillRect(cardX, cardY, cardWidth, CARD_HEIGHT);
      context.strokeStyle = '#111111';
      context.lineWidth = 4;
      context.strokeRect(cardX + 2, cardY + 2, cardWidth - 4, CARD_HEIGHT - 4);
      context.fillStyle = '#111111';
      context.fillRect(cardX, cardY, cardWidth, CARD_HEADER);
      context.fillStyle = '#ffffff';
      context.fillText(candidate.id, cardX + 18, cardY + CARD_HEADER / 2 + 1);

      const scale = Math.min(cardWidth / crop.width, imageHeight / crop.height);
      const targetWidth = Math.max(1, Math.round(crop.width * scale));
      const targetHeight = Math.max(1, Math.round(crop.height * scale));
      const targetX = cardX + Math.floor((cardWidth - targetWidth) / 2);
      const targetY = imageY + Math.floor((imageHeight - targetHeight) / 2);

      context.drawImage(
        bitmap,
        crop.left,
        crop.top,
        crop.width,
        crop.height,
        targetX,
        targetY,
        targetWidth,
        targetHeight,
      );

      drawTargetBox({
        context,
        candidate,
        imageWidth: bitmap.width,
        imageHeight: bitmap.height,
        crop,
        targetX,
        targetY,
        scale,
      });
    });

    const rendered = await canvasToJpeg(canvas);
    return {
      name: `${sourceName} · H1-H${items.length} birebir haber doğrulama kırpımları · kırmızı çerçeve hedef bölge`,
      mimeType: 'image/jpeg',
      data: await blobToBase64(rendered),
    };
  } finally {
    bitmap.close();
  }
}
