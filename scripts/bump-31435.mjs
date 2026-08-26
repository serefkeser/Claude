import fs from 'node:fs';

const files = [
  'package.json',
  'package-lock.json',
  'apps/web/package.json',
  'apps/web/src/version.ts',
  'packages/shared-config/package.json',
  'packages/shared-types/package.json',
  'packages/shared-utils/package.json',
  'services/api-gateway/package.json',
  'services/api-gateway/src/index.ts',
  'services/api-gateway/src/routes/health.ts',
  'services/media-storage/package.json',
  'services/video-renderer/package.json',
  'services/video-renderer/src/index.ts',
];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const updated = source.replaceAll('3.14.34', '3.14.35');
  if (source === updated) throw new Error(`${file}: 3.14.34 bulunamadı; sürüm tahminle değiştirilmedi.`);
  fs.writeFileSync(file, updated);
}

console.log('OTONOM 3.14.35 version references updated.');
