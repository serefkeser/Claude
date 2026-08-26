import type { MediaFile } from '@otonom/shared-types';
import { writeSystemLog } from '@otonom/shared-utils';
import { fetchWithNetworkRetry } from './networkRetry';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export interface DriveMusicTrack {
  id: string;
  name: string;
  mimeType: string;
  url: string;
}

interface DriveMusicCatalogResponse {
  success: boolean;
  data?: {
    folderId: string;
    tracks: DriveMusicTrack[];
  };
  error?: { message?: string };
}

let activeDriveUrl: string | null = null;

function chooseTrack<T>(tracks: T[]) {
  if (!tracks.length) return null;
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return tracks[random[0] % tracks.length];
}

export async function loadDriveMusicCatalog(): Promise<DriveMusicTrack[]> {
  const response = await fetchWithNetworkRetry(`${API_BASE}/music/catalog`, { cache: 'no-store' }, {
    endpoint: '/music/catalog',
  });
  const catalog = await response.json().catch(() => null) as DriveMusicCatalogResponse | null;

  if (!response.ok || !catalog?.success || !catalog.data?.tracks.length) {
    throw new Error(catalog?.error?.message || `Google Drive müzik kataloğu alınamadı (HTTP ${response.status}).`);
  }

  return catalog.data.tracks;
}

export async function loadDriveMusicTrack(track: DriveMusicTrack): Promise<MediaFile> {
  writeSystemLog(`Google Drive müziği seçildi: ${track.name}`);

  const audioResponse = await fetchWithNetworkRetry(track.url, { cache: 'no-store' }, {
    endpoint: `/music/${track.id}`,
  });
  if (!audioResponse.ok) throw new Error(`Google Drive müziği indirilemedi (HTTP ${audioResponse.status}).`);

  const blob = await audioResponse.blob();
  if (!blob.size || !blob.type.startsWith('audio/')) {
    throw new Error('Google Drive yanıtı geçerli bir ses dosyası değil.');
  }

  if (activeDriveUrl) URL.revokeObjectURL(activeDriveUrl);
  activeDriveUrl = URL.createObjectURL(blob);

  writeSystemLog(`Google Drive müziği hazır: ${track.name} · ${(blob.size / 1024 / 1024).toFixed(1)} MB`, 'success');
  return {
    id: `drive-${track.id}`,
    name: track.name,
    type: 'audio',
    mimeType: blob.type || track.mimeType || 'audio/mpeg',
    size: blob.size,
    url: activeDriveUrl,
  };
}

export async function loadAutomaticDriveMusic(): Promise<MediaFile> {
  const tracks = await loadDriveMusicCatalog();
  const selected = chooseTrack(tracks);
  if (!selected) throw new Error('Google Drive klasöründe kullanılabilir haber müziği bulunamadı.');
  return loadDriveMusicTrack(selected);
}
