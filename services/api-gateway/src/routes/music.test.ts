import { afterEach, describe, expect, it, vi } from 'vitest';
import { DRIVE_FOLDER_ID, musicRoutes, NEWS_MUSIC } from './music';

afterEach(() => vi.restoreAllMocks());

describe('Google Drive automatic news music', () => {
  it('returns the verified Drive-folder music catalog', async () => {
    const response = await musicRoutes.request('/catalog');
    const payload = await response.json() as {
      data: {
        folderId: string;
        trackCount: number;
        tracks: Array<{ id: string; mimeType: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.data.folderId).toBe(DRIVE_FOLDER_ID);
    expect(payload.data.trackCount).toBe(NEWS_MUSIC.length);
    expect(payload.data.tracks).toHaveLength(NEWS_MUSIC.length);
    expect(payload.data.tracks.length).toBeGreaterThan(50);
    expect(payload.data.tracks.every(track => track.mimeType === 'audio/mpeg')).toBe(true);
  });

  it('proxies an allow-listed Drive track and rejects arbitrary ids', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
    }));
    const allowed = await musicRoutes.request(`/${NEWS_MUSIC[0][0]}`);
    const blocked = await musicRoutes.request('/not-allowed');
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(blocked.status).toBe(404);
  });
});
