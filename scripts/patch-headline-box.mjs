import fs from 'node:fs';

const path = 'apps/web/src/lib/localRenderer.ts';
const source = fs.readFileSync(path, 'utf8');

const before = `  const title = (scene.topText || '').toLocaleUpperCase('tr-TR');
  const fitted = fitLines(ctx, title, width * 0.86, Math.round(width * 0.055), Math.round(width * 0.038), 2, getFontFamily(config.fontStyle));
  ctx.font = \`900 \${fitted.size}px \${getFontFamily(config.fontStyle)}\`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, fitted.size * 0.08);
  ctx.strokeStyle = 'rgba(0,0,0,.9)';
  ctx.fillStyle = '#facc15';
  fitted.lines.forEach((line, index) => {
    const y = height * 0.027 + index * fitted.size * 1.05;
    ctx.strokeText(line, width / 2, y);
    ctx.fillText(line, width / 2, y);
  });
  drawSourcePill(ctx, config.sourceName || 'Gazete', width * 0.97, height * 0.012, Math.round(width * 0.037), 'right');`;

const after = `  const title = (scene.topText || '').toLocaleUpperCase('tr-TR');
  const fitted = fitLines(ctx, title, width * 0.86, Math.round(width * 0.055), Math.round(width * 0.038), 2, getFontFamily(config.fontStyle));
  ctx.font = \`900 \${fitted.size}px \${getFontFamily(config.fontStyle)}\`;
  const titleLineHeight = fitted.size * 1.12;
  const titleTextWidth = Math.max(...fitted.lines.map(line => ctx.measureText(line).width), 1);
  const titleBoxWidth = Math.min(width * 0.96, titleTextWidth + fitted.size * 1.3);
  const titleBoxHeight = fitted.lines.length * titleLineHeight + fitted.size * 0.72;
  const titleBoxX = (width - titleBoxWidth) / 2;
  const titleBoxY = height * 0.022;

  ctx.save();
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.roundRect(titleBoxX, titleBoxY, titleBoxWidth, titleBoxHeight, fitted.size * 0.2);
  ctx.fill();
  ctx.lineWidth = Math.max(2, fitted.size * 0.045);
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitted.lines.forEach((line, index) => {
    const y = titleBoxY + fitted.size * 0.36 + titleLineHeight * (index + 0.5);
    ctx.fillText(line, width / 2, y);
  });
  ctx.restore();

  drawSourcePill(
    ctx,
    config.sourceName || 'Gazete',
    width * 0.97,
    titleBoxY + titleBoxHeight + height * 0.008,
    Math.round(width * 0.037),
    'right',
  );`;

if (!source.includes(before)) {
  throw new Error('Beklenen üst başlık çizim bloğu bulunamadı; renderer tahminle değiştirilmedi.');
}

fs.writeFileSync(path, source.replace(before, after));
console.log('Newspaper content headline box patch applied.');
