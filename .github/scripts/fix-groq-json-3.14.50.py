from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f"{path}: expected {count}, found {actual}: {old[:140]!r}")
    p.write_text(text.replace(old, new), encoding="utf-8")


path = "services/api-gateway/src/ai/providerRouter.ts"

replace(
    path,
    "  options: { openRouterPlainJson?: boolean } = {},",
    "  options: { plainJsonTransport?: boolean } = {},",
)

old_json_block = """  if (request.responseFormat === 'json' && provider.jsonMode) {
    if (provider.name === 'openrouter') {
      if (!options.openRouterPlainJson) {
        const schemaName = request.responseSchema === 'newspaper'
          ? 'otonom_newspaper'
          : 'otonom_script';
        body.response_format = {
          type: 'json_schema',
          json_schema: {
            name: schemaName,
            strict: true,
            schema: toOpenRouterJsonSchema(selectedResponseSchema(request)),
          },
        };
        body.provider = { require_parameters: true, allow_fallbacks: true };
        body.plugins = [{ id: 'response-healing' }];
      }
    } else {
      body.response_format = { type: 'json_object' };
    }
  }
"""
new_json_block = """  if (provider.name === 'groq' && request.task === 'vision' && request.responseFormat === 'json') {
    body.reasoning_effort = 'none';
    body.include_reasoning = false;
  }

  if (request.responseFormat === 'json' && provider.jsonMode && !options.plainJsonTransport) {
    if (provider.name === 'openrouter') {
      const schemaName = request.responseSchema === 'newspaper'
        ? 'otonom_newspaper'
        : 'otonom_script';
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          strict: true,
          schema: toOpenRouterJsonSchema(selectedResponseSchema(request)),
        },
      };
      body.provider = { require_parameters: true, allow_fallbacks: true };
      body.plugins = [{ id: 'response-healing' }];
    } else {
      body.response_format = { type: 'json_object' };
    }
  }
"""
replace(path, old_json_block, new_json_block)

replace(
    path,
    "    const providerCalls = provider.name === 'gemini'\n      || (provider.name === 'openrouter' && request.responseFormat === 'json')\n      ? 2\n      : 1;",
    "    const providerCalls = provider.name === 'gemini'\n      || ((provider.name === 'openrouter' || provider.name === 'groq') && request.responseFormat === 'json')\n      ? 2\n      : 1;",
)

replace(
    path,
    "          : await callOpenAiCompatible(provider, request, {\n            openRouterPlainJson: provider.name === 'openrouter' && callIndex === 1,\n          });",
    "          : await callOpenAiCompatible(provider, request, {\n            plainJsonTransport: (provider.name === 'openrouter' || provider.name === 'groq') && callIndex === 1,\n          });",
)

old_retry_block = """        const status = errorStatus(error);
        const retryGemini = provider.name === 'gemini'
          && callIndex === 0
          && request.responseFormat === 'json'
          && (
            (typeof status === 'number' && GEMINI_TRANSIENT_STATUSES.has(status))
            || status === undefined
          );
        const retryOpenRouter = provider.name === 'openrouter'
          && callIndex === 0
          && request.responseFormat === 'json'
          && (status === 400 || status === undefined);
        const reason = errorReason(error);
"""
new_retry_block = """        const status = errorStatus(error);
        const reason = errorReason(error);
        const retryGemini = provider.name === 'gemini'
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
"""
replace(path, old_retry_block, new_retry_block)

old_reason = """          reason: retryGemini
            ? `${reason} · Gemini JSON yanıtı bir kez yeniden deneniyor.`
            : retryOpenRouter
              ? `${reason} · OpenRouter structured JSON reddedildi; taşıma şeması olmadan yeniden deneniyor, içerik doğrulaması korunuyor.`
              : reason,
"""
new_reason = """          reason: retryGemini
            ? `${reason} · Gemini JSON yanıtı bir kez yeniden deneniyor.`
            : retryGroq
              ? `${reason} · Groq JSON doğrulaması reddedildi; response_format olmadan bir kez yeniden deneniyor, içerik doğrulaması korunuyor.`
              : retryOpenRouter
                ? `${reason} · OpenRouter structured JSON reddedildi; taşıma şeması olmadan yeniden deneniyor, içerik doğrulaması korunuyor.`
                : reason,
"""
replace(path, old_reason, new_reason)

replace(
    path,
    "        if (retryGemini) {\n          await sleep(GEMINI_RETRY_DELAY_MS);\n          continue;\n        }\n        if (retryOpenRouter) continue;",
    "        if (retryGemini) {\n          await sleep(GEMINI_RETRY_DELAY_MS);\n          continue;\n        }\n        if (retryGroq) continue;\n        if (retryOpenRouter) continue;",
)

test_path = Path("services/api-gateway/src/ai/providerRouter.test.ts")
test_text = test_path.read_text(encoding="utf-8")
anchor = "  it('görsel görevinde metin-only OpenCode sağlayıcısını çağırmaz', async () => {"
if test_text.count(anchor) != 1:
    raise SystemExit(f"providerRouter.test.ts: anchor count={test_text.count(anchor)}")

regression = """  it('Groq Vision json_validate_failed 400 verirse reasoning kapalı biçimde response_format olmadan bir kez yeniden dener', async () => {
    const valid = '{\"isContentUnreadable\":false,\"gazeteBasliklari\":[{\"baslik\":\"Birinci gerçek haber\",\"aciklama\":\"Gazetede basılı gerçek açıklama cümlesi.\",\"onem\":100,\"x\":1,\"y\":1,\"w\":40,\"h\":10}]}';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          message: 'Failed to validate JSON. Please adjust your prompt.',
          type: 'invalid_request_error',
          code: 'json_validate_failed',
          failed_generation: '',
        },
      }), { status: 400, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: valid } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithFallback({
      ENVIRONMENT: 'production',
      GROQ_API_KEY: 'groq-test',
      AI_VISION_PROVIDER_ORDER: 'groq',
    }, {
      task: 'vision',
      messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/jpeg', data: 'AA==' }] }],
      responseFormat: 'json',
      responseSchema: 'newspaper',
      validateResponse: text => {
        const parsed = JSON.parse(text) as { gazeteBasliklari?: unknown[] };
        if (!Array.isArray(parsed.gazeteBasliklari)) throw new Error('gazete JSON doğrulanamadı');
      },
    });

    expect(result.provider).toBe('groq');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.attempts[0]).toEqual(expect.objectContaining({
      provider: 'groq',
      status: 400,
      reason: expect.stringContaining('response_format olmadan bir kez yeniden deneniyor'),
    }));

    const firstBody = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)) as Record<string, any>;
    expect(firstBody.response_format).toEqual({ type: 'json_object' });
    expect(firstBody.reasoning_effort).toBe('none');
    expect(firstBody.include_reasoning).toBe(false);

    const secondBody = JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body)) as Record<string, any>;
    expect(secondBody).not.toHaveProperty('response_format');
    expect(secondBody.reasoning_effort).toBe('none');
    expect(secondBody.include_reasoning).toBe(false);
  });

"""

test_path.write_text(test_text.replace(anchor, regression + anchor), encoding="utf-8")
