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

export interface NewspaperVisionCompositePanel {
  x: number;
  y: number;
  width: number;
  height: number;
  topRatio: number;
  heightRatio: number;
}

export interface NewspaperVisionCompositeLayout {
  width: number;
  height: number;
  fullPage: NewspaperVisionCompositePanel;
  upperZoom: NewspaperVisionCompositePanel;
  lowerZoom: NewspaperVisionCompositePanel;
}

const NEWSPAPER_VISION_VIEW_SPECS: NewspaperVisionViewSpec[] = [
  { label: 'tam sayfa', topRatio: 0, heightRatio: 1, maxEdge: 2600, quality: 0.9 },
];

const COMPOSITE_WIDTH = 2200;
const COMPOSITE_HEIGHT = 1900;
const COMPOSITE_PADDING = 20;
const COMPOSITE_GAP = 20;
const DISCOVERY_MAX_EDGE = 2600;
const DISCOVERY_JPEG_QUALITY = 0.9;

export function getNewspaperVisionViewSpecs() {
  return NEWSPAPER_VISION_VIEW_SPECS.map(spec => ({ ...spec }));
}

export function getNewspaperVisionCompositeLayout(): NewspaperVisionCompositeLayout {
  const usableWidth = COMPOSITE_WIDTH - COMPOSITE_PADDING * 2 - COMPOSITE_GAP;
  const leftWidth = Math.round(usableWidth * 0.46);
  const rightWidth = usableWidth - leftWidth;
  const rightHeight = Math.floor((COMPOSITE_HEIGHT - COMPOSITE_PADDING * 2 - COMPOSITE_GAP) / 2);
  const rightX = COMPOSITE_PADDING + leftWidth + COMPOSITE_GAP;

  return {
    width: COMPOSITE_WIDTH,
    height: COMPOSITE_HEIGHT,
    fullPage: {
      x: COMPOSITE_PADDING,
      y: COMPOSITE_PADDING,
      width: leftWidth,
      height: COMPOSITE_HEIGHT - COMPOSITE_PADDING * 2,
      topRatio: 0,
      heightRatio: 1,
    },
    upperZoom: {
      x: rightX,
      y: COMPOSITE_PADDING,
      width: rightWidth,
      height: rightHeight,
      topRatio: 0,
      heightRatio: 0.62,
    },
    lowerZoom: {
      x: rightX,
      y: COMPOSITE_PADDING + rightHeight + COMPOSITE_GAP,
      width: rightWidth,
      height: rightHeight,
      topRatio: 0.38,
      heightRatio: 0.62,
    },
  };
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Gazete Vision görünümü oluşturulamadı.')),
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

function drawCompositePanel(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  panel: NewspaperVisionCompositePanel,
) {
  const sourceY = Math.max(0, Math.floor(bitmap.height * panel.topRatio));
  const requestedHeight = Math.max(1, Math.round(bitmap.height * panel.heightRatio));
  const sourceHeight = Math.min(bitmap.height - sourceY, requestedHeight);
  const sourceWidth = bitmap.width;
  const scale = Math.min(panel.width / sourceWidth, panel.height / sourceHeight);
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
  const targetX = panel.x + Math.floor((panel.width - targetWidth) / 2);
  const targetY = panel.y + Math.floor((panel.height - targetHeight) / 2);

  context.drawImage(
    bitmap,
    0,
    sourceY,
    sourceWidth,
    sourceHeight,
    targetX,
    targetY,
    targetWidth,
    targetHeight,
  );
}

export async function prepareNewspaperVisionComposite(blob: Blob, sourceName: string) {
  const bitmap = await createImageBitmap(blob);
  try {
    const layout = getNewspaperVisionCompositeLayout();
    const canvas = document.createElement('canvas');
    canvas.width = layout.width;
    canvas.height = layout.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Gazete Vision birleşik çizim alanı oluşturulamadı.');

    context.fillStyle = '#f5f5f5';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    for (const panel of [layout.fullPage, layout.upperZoom, layout.lowerZoom]) {
      context.fillRect(panel.x, panel.y, panel.width, panel.height);
      drawCompositePanel(context, bitmap, panel);
    }

    const rendered = await canvasToJpeg(canvas, 0.84);
    return {
      name: `${sourceName} · eski birleşik Vision kanıtı`,
      mimeType: 'image/jpeg',
      data: await blobToBase64(rendered),
    } satisfies PreparedNewspaperVisionImage;
  } finally {
    bitmap.close();
  }
}

export async function prepareNewspaperDiscoveryPage(blob: Blob, sourceName: string) {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, DISCOVERY_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Gazete keşif çizim alanı oluşturulamadı.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const rendered = await canvasToJpeg(canvas, DISCOVERY_JPEG_QUALITY);
    return {
      name: `${sourceName} · orijinal tam sayfa keşif görseli · koordinatlar doğrudan bu sayfaya aittir`,
      mimeType: 'image/jpeg',
      data: await blobToBase64(rendered),
    } satisfies PreparedNewspaperVisionImage;
  } finally {
    bitmap.close();
  }
}

/**
 * İlk geçiş artık kolaj kullanmaz. Model yalnız orijinal tam sayfayı görür;
 * dolayısıyla x/y/w/h koordinatları doğrudan orijinal gazete sayfasına aittir.
 * Yakın plan okuma ikinci, H-etiketli doğrulama geçişinde yapılır.
 */
export async function prepareNewspaperVisionViews(blob: Blob, sourceName: string) {
  return [await prepareNewspaperDiscoveryPage(blob, sourceName)];
}
