export interface NewspaperVisionViewSpec {
  label: string;
  topRatio: number;
  heightRatio: number;
  maxEdge: number;
  quality: number;
}

export interface PreparedNewspaperVisionImage {
  name: string;
  mimeType: string;
  data: string;
}

const NEWSPAPER_VISION_VIEW_SPECS: NewspaperVisionViewSpec[] = [
  { label: 'tam sayfa', topRatio: 0, heightRatio: 1, maxEdge: 2000, quality: 0.82 },
  { label: 'üst yakın plan', topRatio: 0, heightRatio: 0.62, maxEdge: 2200, quality: 0.86 },
  { label: 'alt yakın plan', topRatio: 0.38, heightRatio: 0.62, maxEdge: 2200, quality: 0.86 },
];

export function getNewspaperVisionViewSpecs() {
  return NEWSPAPER_VISION_VIEW_SPECS.map(spec => ({ ...spec }));
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Gazete Vision yakın planı oluşturulamadı.')),
      'image/jpeg',
      quality,
    );
  });
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const comma = dataUrl.indexOf(',');
      if (comma < 0) {
        reject(new Error('Gazete Vision görünümü base64 verisine çevrilemedi.'));
        return;
      }
      resolve(dataUrl.slice(comma + 1));
    };
    reader.onerror = () => reject(new Error('Gazete Vision görünümü okunamadı.'));
    reader.readAsDataURL(blob);
  });
}

async function renderView(bitmap: ImageBitmap, spec: NewspaperVisionViewSpec) {
  const sourceY = Math.max(0, Math.floor(bitmap.height * spec.topRatio));
  const requestedHeight = Math.max(1, Math.round(bitmap.height * spec.heightRatio));
  const sourceHeight = Math.min(bitmap.height - sourceY, requestedHeight);
  const sourceWidth = bitmap.width;
  const scale = Math.min(1, spec.maxEdge / Math.max(sourceWidth, sourceHeight));
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Gazete Vision çizim alanı oluşturulamadı.');

  context.drawImage(
    bitmap,
    0,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return canvasToJpeg(canvas, spec.quality);
}

export async function prepareNewspaperVisionViews(blob: Blob, sourceName: string) {
  const bitmap = await createImageBitmap(blob);
  try {
    return await Promise.all(NEWSPAPER_VISION_VIEW_SPECS.map(async spec => {
      const rendered = await renderView(bitmap, spec);
      return {
        name: `${sourceName} · ${spec.label}`,
        mimeType: 'image/jpeg',
        data: await blobToBase64(rendered),
      } satisfies PreparedNewspaperVisionImage;
    }));
  } finally {
    bitmap.close();
  }
}
