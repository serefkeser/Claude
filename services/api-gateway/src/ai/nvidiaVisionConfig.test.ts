import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateWithFallback } from './providerRouter';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('NVIDIA newspaper Vision configuration', () => {
  it('uses Nemotron Nano 12B VL and does not send text-only reasoning_budget', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"gazeteBasliklari":[]}' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithFallback({
      ENVIRONMENT: 'production',
      NVIDIA_API_KEY: 'nvidia-test',
      ALLOW_NVIDIA_TRIAL: 'true',
      AI_VISION_PROVIDER_ORDER: 'nvidia',
    }, {
      task: 'vision',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Gazete sayfasını oku.' },
          { type: 'image', mimeType: 'image/jpeg', data: 'AA==' },
        ],
      }],
      responseFormat: 'json',
    });

    expect(result.provider).toBe('nvidia');
    expect(result.model).toBe('nvidia/nemotron-nano-12b-v2-vl');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const requestBody = JSON.parse(String(init.body || '{}')) as Record<string, unknown>;
    expect(requestBody.model).toBe('nvidia/nemotron-nano-12b-v2-vl');
    expect(requestBody.reasoning_budget).toBeUndefined();
  });
});
