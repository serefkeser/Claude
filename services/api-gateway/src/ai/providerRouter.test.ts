import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateWithFallback, getConfiguredProviders, synthesizeSpeech } from './providerRouter';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AI provider fallback', () => {
  it('HTTP 200 ama bozuk JSON döndüren sağlayıcıdan sonraki ücretsiz sağlayıcıya geçer', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: 'JSON hazırlıyorum, birazdan...' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"videoSlides":[{"topText":"OK","spokenText":"Hazır.","imagePrompts":[]}]}' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithFallback({
      ENVIRONMENT: 'production',
      GROQ_API_KEY: 'groq-test',
      OPENCODE_API_KEY: 'opencode-test',
    }, {
      task: 'text',
      messages: [{ role: 'user', content: 'Haber oluştur.' }],
      responseFormat: 'json',
      validateResponse: text => {
        if (!text.includes('videoSlides')) throw new Error('geçersiz JSON');
      },
    });

    expect(result.provider).toBe('opencode');
    expect(result.attempts).toEqual([
      expect.objectContaining({ provider: 'groq', ok: false, reason: 'geçersiz JSON' }),
      expect.objectContaining({ provider: 'opencode', ok: true }),
    ]);
  });

  it('Groq hız sınırına takıldığında OpenCode yedeğine geçer', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"videoSlides":[]}' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithFallback({
      ENVIRONMENT: 'production',
      GROQ_API_KEY: 'groq-test',
      OPENCODE_API_KEY: 'opencode-test',
    }, {
      task: 'text',
      messages: [{ role: 'user', content: 'Bir haber senaryosu oluştur.' }],
      responseFormat: 'json',
    });

    expect(result.provider).toBe('opencode');
    expect(result.attempts).toEqual([
      expect.objectContaining({ provider: 'groq', ok: false, status: 429 }),
      expect.objectContaining({ provider: 'opencode', ok: true }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('Gemini 503 hatasını bir kez yeniden dener ve ikinci yanıtı kullanır', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('temporary unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"videoSlides":[]}' }] } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const pending = generateWithFallback({
      ENVIRONMENT: 'production',
      GEMINI_API_KEY: 'gemini-test',
      AI_TEXT_PROVIDER_ORDER: 'gemini',
    }, {
      task: 'text',
      messages: [{ role: 'user', content: 'Yanıt üret.' }],
      responseFormat: 'json',
    });

    await vi.advanceTimersByTimeAsync(751);
    const result = await pending;

    expect(result.provider).toBe('gemini');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.attempts).toEqual([
      expect.objectContaining({ provider: 'gemini', ok: false, status: 503 }),
      expect.objectContaining({ provider: 'gemini', ok: true }),
    ]);
  });

  it('Gemini vision yanıtını 20 saniyelik metin timeoutuyla kesmez', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation((_input: unknown, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => resolve(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"videoSlides":[]}' }] } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })), 25_000);
      const abort = () => {
        clearTimeout(timer);
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      };
      if (init?.signal?.aborted) abort();
      else init?.signal?.addEventListener('abort', abort, { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);

    const pending = generateWithFallback({
      ENVIRONMENT: 'production',
      GEMINI_API_KEY: 'gemini-test',
      AI_VISION_PROVIDER_ORDER: 'gemini',
    }, {
      task: 'vision',
      messages: [{
        role: 'user',
        content: [{ type: 'image', mimeType: 'image/jpeg', data: 'AA==' }],
      }],
      responseFormat: 'json',
    });

    await vi.advanceTimersByTimeAsync(25_001);
    const result = await pending;

    expect(result.provider).toBe('gemini');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gazete için Geminiye yalnız kompakt gazete şemasını gönderir', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"isContentUnreadable":false,"sourceName":"Cumhuriyet","thumbnailText":"GÜNDEM","gazeteBasliklari":[]}' }] } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await generateWithFallback({
      ENVIRONMENT: 'production',
      GEMINI_API_KEY: 'gemini-test',
      AI_VISION_PROVIDER_ORDER: 'gemini',
    }, {
      task: 'vision',
      messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/jpeg', data: 'AA==' }] }],
      responseFormat: 'json',
      responseSchema: 'newspaper',
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as {
      generationConfig: { responseSchema: { properties: Record<string, unknown> } };
    };
    expect(body.generationConfig.responseSchema.properties).toHaveProperty('gazeteBasliklari');
    expect(body.generationConfig.responseSchema.properties).not.toHaveProperty('videoSlides');
    expect(body.generationConfig.responseSchema.properties).not.toHaveProperty('sonSoz');
  });

  it('varsayılan production Vision zincirinde NVIDIA ve Groqyu çağırmaz', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"isContentUnreadable":false,"sourceName":"Gazete","thumbnailText":"GÜNDEM","gazeteBasliklari":[]}' }] } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithFallback({
      ENVIRONMENT: 'production',
      GEMINI_API_KEY: 'gemini-test',
      OPENROUTER_API_KEY: 'openrouter-test',
      NVIDIA_API_KEY: 'nvidia-test',
      GROQ_API_KEY: 'groq-test',
      ALLOW_NVIDIA_TRIAL: 'true',
    }, {
      task: 'vision',
      messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/jpeg', data: 'AA==' }] }],
      responseFormat: 'json',
      responseSchema: 'newspaper',
    });

    expect(result.provider).toBe('gemini');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('generativelanguage.googleapis.com');
  });

  it('görsel görevinde metin-only OpenCode sağlayıcısını çağırmaz', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"videoSlides":[]}' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithFallback({
      ENVIRONMENT: 'production',
      OPENCODE_API_KEY: 'opencode-test',
      GROQ_API_KEY: 'groq-test',
      AI_VISION_PROVIDER_ORDER: 'opencode,groq',
    }, {
      task: 'vision',
      messages: [{
        role: 'user',
        content: [{ type: 'image', mimeType: 'image/png', data: 'AA==' }],
      }],
    });

    expect(result.provider).toBe('groq');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('NVIDIA deneme uçlarını production ortamında varsayılan olarak kapatır', () => {
    expect(getConfiguredProviders({
      ENVIRONMENT: 'production',
      NVIDIA_API_KEY: 'nvidia-test',
    })).toEqual(expect.objectContaining({
      nvidia: false,
      nvidiaTrialAllowed: false,
    }));
  });

  it('OpenRouter free router ile görsel fallback yapar', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"videoSlides":[]}' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithFallback({
      ENVIRONMENT: 'production',
      OPENROUTER_API_KEY: 'openrouter-test',
    }, {
      task: 'vision',
      messages: [{
        role: 'user',
        content: [{ type: 'image', mimeType: 'image/png', data: 'AA==' }],
      }],
      responseFormat: 'json',
    });

    expect(result.provider).toBe('openrouter');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('OpenRouter Vision yanıtını 20 saniyede kesmez', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation((_input: unknown, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => resolve(new Response(JSON.stringify({
        choices: [{ message: { content: '{"gazeteBasliklari":[]}' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })), 30_000);
      const abort = () => {
        clearTimeout(timer);
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      };
      if (init?.signal?.aborted) abort();
      else init?.signal?.addEventListener('abort', abort, { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);

    const pending = generateWithFallback({
      ENVIRONMENT: 'production',
      OPENROUTER_API_KEY: 'openrouter-test',
      AI_VISION_PROVIDER_ORDER: 'openrouter',
    }, {
      task: 'vision',
      messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/jpeg', data: 'AA==' }] }],
      responseFormat: 'json',
    });

    await vi.advanceTimersByTimeAsync(30_001);
    const result = await pending;
    expect(result.provider).toBe('openrouter');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sağlayıcı başlıkları dönüp JSON gövdesini bitirmezse 20 saniyede keser', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn().mockImplementation(async (_input: unknown, init?: RequestInit) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => new Promise((_resolve, reject) => {
        const abort = () => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        };
        if (init?.signal?.aborted) abort();
        else init?.signal?.addEventListener('abort', abort, { once: true });
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const pending = generateWithFallback({
      ENVIRONMENT: 'production',
      GROQ_API_KEY: 'groq-test',
      AI_TEXT_PROVIDER_ORDER: 'groq',
    }, {
      task: 'text',
      messages: [{ role: 'user', content: 'Yanıt üret.' }],
      responseFormat: 'json',
    });

    const assertion = expect(pending).rejects.toThrow('Tüm ücretsiz AI sağlayıcıları başarısız oldu');
    await vi.advanceTimersByTimeAsync(20_001);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ZenMux ücretli fallbackini açık izin olmadan etkinleştirmez', () => {
    expect(getConfiguredProviders({
      ENVIRONMENT: 'production',
      ZENMUX_API_KEY: 'zenmux-test',
    })).toEqual(expect.objectContaining({
      zenmux: false,
      zenmuxPaidAllowed: false,
    }));
  });
});

describe('Gemini TTS', () => {
  it('Aoede PCM ses verisini döndürür', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ inlineData: {
        data: 'UENN',
        mimeType: 'audio/L16;codec=pcm;rate=24000',
      } }] } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const result = await synthesizeSpeech({ GEMINI_API_KEY: 'gemini-test' }, 'Merhaba', 'Aoede');

    expect(result).toEqual(expect.objectContaining({
      provider: 'gemini',
      audioData: 'UENN',
      sampleRate: 24000,
    }));
  });
});
