from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f'{path}: expected {count}, found {actual}: {old[:180]!r}')
    p.write_text(text.replace(old, new, count), encoding='utf-8')


# services/api-gateway/src/ai/providerRouter.ts
path = 'services/api-gateway/src/ai/providerRouter.ts'
replace(
    path,
    "  responseSchema?: 'hermes' | 'newspaper';\n  validateResponse?: (text: string) => void;\n",
    "  responseSchema?: 'hermes' | 'newspaper';\n  validateResponse?: (text: string) => void;\n  providerTimeoutMs?: number;\n  maxProviderCalls?: number;\n",
)

old_timeout = '''function providerTimeoutMs(provider: ProviderDefinition, request: AiGenerationRequest) {
  if (request.task === 'vision' && provider.name === 'groq') return GROQ_VISION_TIMEOUT_MS;
  if (request.task === 'vision' && provider.name === 'nvidia') return NVIDIA_VISION_TIMEOUT_MS;
  if (request.task === 'vision' && provider.name === 'openrouter') return OPENROUTER_VISION_TIMEOUT_MS;
  return PROVIDER_TIMEOUT_MS;
}
'''
new_timeout = '''function providerTimeoutMs(provider: ProviderDefinition, request: AiGenerationRequest) {
  const defaultTimeout = request.task === 'vision' && provider.name === 'groq'
    ? GROQ_VISION_TIMEOUT_MS
    : request.task === 'vision' && provider.name === 'nvidia'
      ? NVIDIA_VISION_TIMEOUT_MS
      : request.task === 'vision' && provider.name === 'openrouter'
        ? OPENROUTER_VISION_TIMEOUT_MS
        : request.task === 'vision' && provider.name === 'gemini'
          ? GEMINI_VISION_TIMEOUT_MS
          : PROVIDER_TIMEOUT_MS;
  const requestedTimeout = Number(request.providerTimeoutMs || 0);
  if (!Number.isFinite(requestedTimeout) || requestedTimeout <= 0) return defaultTimeout;
  return Math.min(defaultTimeout, Math.max(1_000, Math.floor(requestedTimeout)));
}
'''
replace(path, old_timeout, new_timeout)

replace(
    path,
    "  }, request.task === 'vision' ? GEMINI_VISION_TIMEOUT_MS : PROVIDER_TIMEOUT_MS, 'Sağlayıcı gemini');\n",
    "  }, providerTimeoutMs(provider, request), 'Sağlayıcı gemini');\n",
)

old_calls = '''  for (const provider of providers) {
    const providerCalls = provider.name === 'gemini'
      || ((provider.name === 'openrouter' || provider.name === 'groq') && request.responseFormat === 'json')
      ? 2
      : 1;

    for (let callIndex = 0; callIndex < providerCalls; callIndex += 1) {
'''
new_calls = '''  for (const provider of providers) {
    const defaultProviderCalls = provider.name === 'gemini'
      || ((provider.name === 'openrouter' || provider.name === 'groq') && request.responseFormat === 'json')
      ? 2
      : 1;
    const requestedProviderCalls = Number(request.maxProviderCalls || defaultProviderCalls);
    const providerCalls = Math.max(1, Math.min(
      defaultProviderCalls,
      Number.isFinite(requestedProviderCalls) ? Math.floor(requestedProviderCalls) : defaultProviderCalls,
    ));

    for (let callIndex = 0; callIndex < providerCalls; callIndex += 1) {
'''
replace(path, old_calls, new_calls)

old_retry = '''        const retryGemini = provider.name === 'gemini'
          && callIndex === 0
          && request.responseFormat === 'json'
          && (
            (typeof status === 'number' && GEMINI_TRANSIENT_STATUSES.has(status))
            || status === undefined
          );
        const retryGroq = provider.name === 'groq'
          && callIndex === 0
          && request.responseFormat === 'json'
          && status === 400
          && /json_validate_failed|failed to validate json/i.test(reason);
        const retryOpenRouter = provider.name === 'openrouter'
          && callIndex === 0
          && request.responseFormat === 'json'
          && (status === 400 || status === undefined);
'''
new_retry = '''        const hasRetrySlot = callIndex + 1 < providerCalls;
        const retryGemini = hasRetrySlot
          && provider.name === 'gemini'
          && callIndex === 0
          && request.responseFormat === 'json'
          && (
            (typeof status === 'number' && GEMINI_TRANSIENT_STATUSES.has(status))
            || status === undefined
          );
        const retryGroq = hasRetrySlot
          && provider.name === 'groq'
          && callIndex === 0
          && request.responseFormat === 'json'
          && status === 400
          && /json_validate_failed|failed to validate json/i.test(reason);
        const retryOpenRouter = hasRetrySlot
          && provider.name === 'openrouter'
          && callIndex === 0
          && request.responseFormat === 'json'
          && (status === 400 || status === undefined);
'''
replace(path, old_retry, new_retry)


# services/api-gateway/src/routes/ai.ts
path = 'services/api-gateway/src/routes/ai.ts'
replace(
    path,
    "const MAX_TTS_CHARS = 5_000;\n",
    "const MAX_TTS_CHARS = 5_000;\nconst NEWSPAPER_VERIFICATION_PROVIDER_TIMEOUT_MS = 18_000;\nconst NEWSPAPER_VERIFICATION_MAX_PROVIDER_CALLS = 1;\nconst NEWSPAPER_VERIFICATION_MAX_TOKENS = 3_072;\n",
)
replace(
    path,
    "      maxTokens: isNewspaper ? 4096 : 6144,\n",
    "      maxTokens: isNewspaperVerification ? NEWSPAPER_VERIFICATION_MAX_TOKENS : isNewspaper ? 4096 : 6144,\n      providerTimeoutMs: isNewspaperVerification ? NEWSPAPER_VERIFICATION_PROVIDER_TIMEOUT_MS : undefined,\n      maxProviderCalls: isNewspaperVerification ? NEWSPAPER_VERIFICATION_MAX_PROVIDER_CALLS : undefined,\n",
)


# services/api-gateway/src/ai/providerRouter.test.ts
path = 'services/api-gateway/src/ai/providerRouter.test.ts'
anchor = '''  it('ZenMux ücretli fallbackini açık izin olmadan etkinleştirmez', () => {
'''
addition = '''  it('gazete birebir doğrulamasında istek bazlı Vision timeoutu sağlayıcıyı 18 saniyede kesip sonraki sağlayıcıya geçer', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation((input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('api.groq.com')) {
        return new Promise<Response>((_resolve, reject) => {
          const abort = () => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          };
          if (init?.signal?.aborted) abort();
          else init?.signal?.addEventListener('abort', abort, { once: true });
        });
      }
      return Promise.resolve(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"isContentUnreadable":false,"gazeteBasliklari":[]}' }] } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const pending = generateWithFallback({
      ENVIRONMENT: 'production',
      GROQ_API_KEY: 'groq-test',
      GEMINI_API_KEY: 'gemini-test',
      AI_VISION_PROVIDER_ORDER: 'groq,gemini',
    }, {
      task: 'vision',
      messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/jpeg', data: 'AA==' }] }],
      responseFormat: 'json',
      responseSchema: 'newspaper',
      providerTimeoutMs: 18_000,
      maxProviderCalls: 1,
    });

    await vi.advanceTimersByTimeAsync(18_001);
    const result = await pending;

    expect(result.provider).toBe('gemini');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.attempts[0]).toEqual(expect.objectContaining({
      provider: 'groq',
      ok: false,
      reason: expect.stringContaining('18 saniyede yanıtını tamamlamadı'),
    }));
  });

  it('gazete birebir doğrulamasında aynı JSON sağlayıcısını ikinci kez denemeden sıradaki sağlayıcıya geçer', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          message: 'Failed to validate JSON. Please adjust your prompt.',
          code: 'json_validate_failed',
        },
      }), { status: 400, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"isContentUnreadable":false,"gazeteBasliklari":[]}' }] } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithFallback({
      ENVIRONMENT: 'production',
      GROQ_API_KEY: 'groq-test',
      GEMINI_API_KEY: 'gemini-test',
      AI_VISION_PROVIDER_ORDER: 'groq,gemini',
    }, {
      task: 'vision',
      messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/jpeg', data: 'AA==' }] }],
      responseFormat: 'json',
      responseSchema: 'newspaper',
      providerTimeoutMs: 18_000,
      maxProviderCalls: 1,
    });

    expect(result.provider).toBe('gemini');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.attempts[0]).toEqual(expect.objectContaining({
      provider: 'groq',
      status: 400,
      ok: false,
    }));
    expect(result.attempts[0].reason).not.toContain('yeniden deneniyor');
  });

'''
replace(path, anchor, addition + anchor)

print('OTONOM 3.14.52 newspaper verification timeout patch applied')
