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
  if (expected.length < 2) return false;
  const facts = exactFacts(headline);
  const evidenceFacts = new Set(exactFacts(ocrEvidence));
  if (!facts.every(fact => evidenceFacts.has(fact))) return false;

  const rawLines = String(ocrEvidence || '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  if (!rawLines.length) return false;

  for (let start = 0; start < rawLines.length; start += 1) {
    for (let count = 1; count <= 3 && start + count <= rawLines.length; count += 1) {
      const windowTokens = ocrTokens(rawLines.slice(start, start + count).join(' '));
      if (!windowTokens.length) continue;
      const matched = orderedOcrCoverage(expected, windowTokens) * expected.length;
      const recall = matched / expected.length;
      const precision = matched / windowTokens.length;
      if (recall >= 0.82 && precision >= 0.82) return true;
    }
  }
  return false;
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

  const horizontalPad = Math.max(imageWidth * 0.012, imageWidth * w * 0.08);
  const verticalPad = Math.max(imageHeight * 0.006, imageHeight * h * 0.08);
  const requestedHeight = Math.max(
    imageHeight * 0.12,
    imageHeight * h * 1.9,
  );
  const maximumHeight = imageHeight * 0.30;

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

function computeNewspaperHeadlineOcrCrop(options: {
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
    });

    const rendered = await canvasToJpeg(canvas);
    return {
      name: `${sourceName} · H1-H${items.length} birebir haber doğrulama kırpımları`,
      mimeType: 'image/jpeg',
      data: await blobToBase64(rendered),
    };
  } finally {
    bitmap.close();
  }
}
