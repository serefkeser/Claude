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
