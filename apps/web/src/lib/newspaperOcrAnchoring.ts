import type { VerifiedNewspaperCandidate } from './newspaperPipeline';

export interface NewspaperOcrBBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface NewspaperOcrWord {
  text: string;
  bbox: NewspaperOcrBBox;
  confidence?: number;
}

export interface NewspaperOcrLine {
  text: string;
  bbox: NewspaperOcrBBox;
  words: NewspaperOcrWord[];
  paragraphKey: string;
}

export interface NewspaperOcrAnchorRejection {
  id: string;
  headline: string;
  reason: string;
  bestScore: number;
}

export interface NewspaperOcrAnchorResult {
  candidates: VerifiedNewspaperCandidate[];
  rejections: NewspaperOcrAnchorRejection[];
  lineCount: number;
}

type AnchoredCandidate = {
  candidate: VerifiedNewspaperCandidate;
  anchorScore: number;
};

const OCR_FOLD: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
};

const MAX_ANCHOR_LINES = 3;
const MIN_ANCHOR_SCORE = 0.60;
const OCR_TARGET_WIDTH = 2800;
const OCR_MIN_TARGET_WIDTH = 2200;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeOcr(value: string) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[’‘`´']/g, '')
    .replace(/[^\p{L}\p{N}%₺$€£]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[çğıöşü]/g, character => OCR_FOLD[character] || character);
}

function tokenize(value: string) {
  return normalizeOcr(value).split(/\s+/).filter(Boolean);
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

function tokenMatches(expected: string, observed: string) {
  if (expected === observed) return true;
  if (/\d/u.test(expected) || /\d/u.test(observed)) return false;
  if (expected.length < 5 || observed.length < 5) return false;
  const allowed = Math.max(1, Math.floor(Math.max(expected.length, observed.length) * 0.20));
  return editDistance(expected, observed) <= allowed;
}

type ObservedToken = {
  text: string;
  bbox: NewspaperOcrBBox;
};

function observedTokens(lines: NewspaperOcrLine[]) {
  const result: ObservedToken[] = [];
  for (const line of lines) {
    if (line.words.length) {
      for (const word of line.words) {
        for (const token of tokenize(word.text)) result.push({ text: token, bbox: word.bbox });
      }
      continue;
    }
    for (const token of tokenize(line.text)) result.push({ text: token, bbox: line.bbox });
  }
  return result;
}

function orderedMatches(expected: string[], observed: ObservedToken[]) {
  const rows = expected.length + 1;
  const columns = observed.length + 1;
  const table = Array.from({ length: rows }, () => new Uint16Array(columns));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < columns; j += 1) {
      table[i][j] = tokenMatches(expected[i - 1], observed[j - 1].text)
        ? table[i - 1][j - 1] + 1
        : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }

  const matchedObservedIndexes: number[] = [];
  let i = expected.length;
  let j = observed.length;
  while (i > 0 && j > 0) {
    if (
      tokenMatches(expected[i - 1], observed[j - 1].text)
      && table[i][j] === table[i - 1][j - 1] + 1
    ) {
      matchedObservedIndexes.push(j - 1);
      i -= 1;
      j -= 1;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  matchedObservedIndexes.reverse();
  return {
    matched: table[expected.length][observed.length],
    observedIndexes: matchedObservedIndexes,
  };
}

function unionBboxes(boxes: NewspaperOcrBBox[]): NewspaperOcrBBox | null {
  if (!boxes.length) return null;
  return boxes.reduce<NewspaperOcrBBox>((result, box) => ({
    x0: Math.min(result.x0, box.x0),
    y0: Math.min(result.y0, box.y0),
    x1: Math.max(result.x1, box.x1),
    y1: Math.max(result.y1, box.y1),
  }), { ...boxes[0] });
}

function bboxIoU(left: Pick<VerifiedNewspaperCandidate, 'x' | 'y' | 'w' | 'h'>, right: Pick<VerifiedNewspaperCandidate, 'x' | 'y' | 'w' | 'h'>) {
  const leftRight = left.x + left.w;
  const leftBottom = left.y + left.h;
  const rightRight = right.x + right.w;
  const rightBottom = right.y + right.h;
  const x0 = Math.max(left.x, right.x);
  const y0 = Math.max(left.y, right.y);
  const x1 = Math.min(leftRight, rightRight);
  const y1 = Math.min(leftBottom, rightBottom);
  const intersection = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  if (!intersection) return 0;
  const union = left.w * left.h + right.w * right.h - intersection;
  return union > 0 ? intersection / union : 0;
}

function requiredMatches(expectedTokenCount: number) {
  if (expectedTokenCount <= 3) return expectedTokenCount;
  return Math.max(3, Math.ceil(expectedTokenCount * 0.58));
}

function findBestAnchor(options: {
  candidate: VerifiedNewspaperCandidate;
  lines: NewspaperOcrLine[];
  imageWidth: number;
  imageHeight: number;
}) {
  const { candidate, lines, imageWidth, imageHeight } = options;
  const expected = tokenize(candidate.text);
  if (expected.length < 2) return null;

  let best: { score: number; bbox: NewspaperOcrBBox; matched: number; recall: number } | null = null;

  for (let start = 0; start < lines.length; start += 1) {
    for (let count = 1; count <= MAX_ANCHOR_LINES && start + count <= lines.length; count += 1) {
      const segment = lines.slice(start, start + count);
      if (segment.some(line => line.paragraphKey !== segment[0].paragraphKey)) break;

      const observed = observedTokens(segment);
      if (!observed.length) continue;
      const match = orderedMatches(expected, observed);
      if (match.matched < requiredMatches(expected.length)) continue;

      const recall = match.matched / expected.length;
      const precision = match.matched / observed.length;
      if (recall < 0.58 || precision < 0.20) continue;

      const matchedBoxes = match.observedIndexes.map(index => observed[index]?.bbox).filter(Boolean) as NewspaperOcrBBox[];
      const bbox = unionBboxes(matchedBoxes);
      if (!bbox) continue;

      const candidateCenterX = imageWidth * (candidate.x + candidate.w / 2) / 100;
      const candidateCenterY = imageHeight * (candidate.y + candidate.h / 2) / 100;
      const anchorCenterX = (bbox.x0 + bbox.x1) / 2;
      const anchorCenterY = (bbox.y0 + bbox.y1) / 2;
      const distance = Math.hypot(anchorCenterX - candidateCenterX, anchorCenterY - candidateCenterY);
      const proximity = 1 - clamp(distance / Math.hypot(imageWidth, imageHeight) / 0.45, 0, 1);
      const averageHeight = matchedBoxes.reduce((sum, box) => sum + Math.max(1, box.y1 - box.y0), 0) / matchedBoxes.length;
      const sizeScore = clamp((averageHeight / imageHeight - 0.003) / 0.018, 0, 1);
      const score = recall * 0.68 + precision * 0.18 + proximity * 0.08 + sizeScore * 0.06;

      if (!best || score > best.score) best = { score, bbox, matched: match.matched, recall };
    }
  }

  if (!best || best.score < MIN_ANCHOR_SCORE) return null;

  const width = Math.max(1, best.bbox.x1 - best.bbox.x0);
  const height = Math.max(1, best.bbox.y1 - best.bbox.y0);
  const padX = Math.max(imageWidth * 0.004, width * 0.08);
  const padY = Math.max(imageHeight * 0.002, height * 0.18);
  const left = clamp(best.bbox.x0 - padX, 0, imageWidth - 1);
  const top = clamp(best.bbox.y0 - padY, 0, imageHeight - 1);
  const right = clamp(best.bbox.x1 + padX, left + 1, imageWidth);
  const bottom = clamp(best.bbox.y1 + padY, top + 1, imageHeight);

  return {
    score: best.score,
    candidate: {
      ...candidate,
      confidence: 100,
      score: candidate.score + Math.round(best.score * 1000),
      x: left / imageWidth * 100,
      y: top / imageHeight * 100,
      w: (right - left) / imageWidth * 100,
      h: (bottom - top) / imageHeight * 100,
    } satisfies VerifiedNewspaperCandidate,
  };
}

export function anchorCandidatesToOcrLines(options: {
  candidates: VerifiedNewspaperCandidate[];
  lines: NewspaperOcrLine[];
  imageWidth: number;
  imageHeight: number;
  maxCandidates?: number;
}): NewspaperOcrAnchorResult {
  const maxCandidates = Math.max(5, Math.min(12, options.maxCandidates ?? 9));
  const anchored: AnchoredCandidate[] = [];
  const rejections: NewspaperOcrAnchorRejection[] = [];

  for (const candidate of options.candidates) {
    const result = findBestAnchor({
      candidate,
      lines: options.lines,
      imageWidth: options.imageWidth,
      imageHeight: options.imageHeight,
    });
    if (!result) {
      rejections.push({
        id: candidate.id,
        headline: candidate.text,
        reason: 'tam sayfa OCR kelime kutularında yeterli başlık ankrajı bulunamadı',
        bestScore: 0,
      });
      continue;
    }
    anchored.push({ candidate: result.candidate, anchorScore: result.score });
  }

  anchored.sort((left, right) => right.candidate.score - left.candidate.score || right.anchorScore - left.anchorScore);
  const unique: AnchoredCandidate[] = [];
  for (const item of anchored) {
    const duplicate = unique.some(existing => bboxIoU(existing.candidate, item.candidate) >= 0.55);
    if (duplicate) {
      rejections.push({
        id: item.candidate.id,
        headline: item.candidate.text,
        reason: 'OCR ankrajı daha güçlü başka haber adayıyla aynı fiziksel bölgeye düştü',
        bestScore: item.anchorScore,
      });
      continue;
    }
    unique.push(item);
  }

  const candidates = unique
    .slice(0, maxCandidates)
    .map((item, index) => ({ ...item.candidate, id: `H${index + 1}` }));

  return {
    candidates,
    rejections,
    lineCount: options.lines.length,
  };
}

function readBBox(value: unknown): NewspaperOcrBBox | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const x0 = finiteNumber(raw.x0);
  const y0 = finiteNumber(raw.y0);
  const x1 = finiteNumber(raw.x1);
  const y1 = finiteNumber(raw.y1);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x0, y0, x1, y1 };
}

export function extractOcrLinesFromTesseractBlocks(blocks: unknown): NewspaperOcrLine[] {
  if (!Array.isArray(blocks)) return [];
  const result: NewspaperOcrLine[] = [];

  blocks.forEach((block, blockIndex) => {
    if (!block || typeof block !== 'object') return;
    const paragraphs = (block as { paragraphs?: unknown }).paragraphs;
    if (!Array.isArray(paragraphs)) return;

    paragraphs.forEach((paragraph, paragraphIndex) => {
      if (!paragraph || typeof paragraph !== 'object') return;
      const lines = (paragraph as { lines?: unknown }).lines;
      if (!Array.isArray(lines)) return;

      lines.forEach(line => {
        if (!line || typeof line !== 'object') return;
        const lineValue = line as Record<string, unknown>;
        const bbox = readBBox(lineValue.bbox);
        if (!bbox) return;
        const rawWords = Array.isArray(lineValue.words) ? lineValue.words : [];
        const words: NewspaperOcrWord[] = rawWords.flatMap(word => {
          if (!word || typeof word !== 'object') return [];
          const wordValue = word as Record<string, unknown>;
          const wordBBox = readBBox(wordValue.bbox);
          const text = String(wordValue.text || '').trim();
          if (!wordBBox || !text) return [];
          return [{
            text,
            bbox: wordBBox,
            confidence: finiteNumber(wordValue.confidence),
          }];
        });
        const text = String(lineValue.text || words.map(word => word.text).join(' ')).replace(/\r/g, '').trim();
        if (!text && !words.length) return;
        result.push({
          text,
          bbox,
          words,
          paragraphKey: `${blockIndex}:${paragraphIndex}`,
        });
      });
    });
  });

  return result;
}

export async function anchorNewspaperCandidatesWithLocalOcr(
  blob: Blob,
  candidates: VerifiedNewspaperCandidate[],
  maxCandidates = 9,
): Promise<NewspaperOcrAnchorResult> {
  const { createWorker } = await import('tesseract.js');
  const bitmap = await createImageBitmap(blob);
  const worker = await createWorker('tur');

  try {
    const targetWidth = Math.min(OCR_TARGET_WIDTH, Math.max(OCR_MIN_TARGET_WIDTH, bitmap.width));
    const scale = targetWidth / bitmap.width;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Gazete OCR ankraj çizim alanı oluşturulamadı.');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.filter = 'grayscale(1) contrast(1.4)';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    context.filter = 'none';

    const result = await worker.recognize(canvas, {}, { text: true, blocks: true });
    const lines = extractOcrLinesFromTesseractBlocks((result.data as { blocks?: unknown }).blocks);
    if (!lines.length) {
      throw new Error('Tam sayfa OCR yerleşim çıktısında satır/kelime kutusu üretilemedi.');
    }

    return anchorCandidatesToOcrLines({
      candidates,
      lines,
      imageWidth: canvas.width,
      imageHeight: canvas.height,
      maxCandidates,
    });
  } finally {
    await worker.terminate();
    bitmap.close();
  }
}
