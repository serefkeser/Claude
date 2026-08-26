import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateWithFallback } from './providerRouter';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('newspaper single-image Vision fallback', () => {
  it('Gemini iki kez doğrulamayı geçmezse doğrudan Groq Vision sağlayıcısına geçer', async () => {
    const valid = '{"isContentUnreadable":false,"gazeteBasliklari":[{"baslik":"Birinci gerçek haber","aciklama":"Gazetede basılı gerçek açıklama cümlesi.","onem":100,"x":1,"y":1,"w":40,"h":10}]}';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'geçersiz ilk yanıt' }] } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'geçersiz ikinci yanıt' }] } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: valid } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithFallback({
      ENVIRONMENT: 'production',
      GEMINI_API_KEY: 'gemini-test',
      GROQ_API_KEY: 'groq-test',
      NVIDIA_API_KEY: 'nvidia-test',
      OPENROUTER_API_KEY: 'openrouter-test',
      ALLOW_NVIDIA_TRIAL: 'true',
      AI_VISION_PROVIDER_ORDER: 'gemini,groq,nvidia,openrouter',
    }, {
      task: 'vision',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Gazeteyi oku.' },
          { type: 'image', mimeType: 'image/jpeg', data: 'AA==' },
        ],
      }],
      responseFormat: 'json',
      responseSchema: 'newspaper',
      validateResponse: text => {
        if (!text.trim().startsWith('{')) throw new Error('gazete JSON doğrulanamadı');
      },
    });

    expect(result.provider).toBe('groq');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2][0])).toContain('api.groq.com');

    const nvidiaBody = JSON.parse(String((fetchMock.mock.calls[2][1] as RequestInit).body)) as {
      messages: Array<{ content: Array<{ type: string }> }>;
    };
    const imageParts = nvidiaBody.messages
      .flatMap(message => Array.isArray(message.content) ? message.content : [])
      .filter(part => part.type === 'image_url');
    expect(imageParts).toHaveLength(1);
  });

  it('OpenRouter structured isteğinde sağlayıcı fallbackini açık tutar', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"isContentUnreadable":false,"gazeteBasliklari":[]}' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await generateWithFallback({
      ENVIRONMENT: 'production',
      OPENROUTER_API_KEY: 'openrouter-test',
      AI_VISION_PROVIDER_ORDER: 'openrouter',
    }, {
      task: 'vision',
      messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/jpeg', data: 'AA==' }] }],
      responseFormat: 'json',
      responseSchema: 'newspaper',
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)) as {
      provider?: { require_parameters?: boolean; allow_fallbacks?: boolean };
    };
    expect(body.provider).toEqual({ require_parameters: true, allow_fallbacks: true });
  });
});
