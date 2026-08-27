from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f'{path}: expected {count}, found {actual}: {old[:180]!r}')
    p.write_text(text.replace(old, new, count), encoding='utf-8')


# 1) Analyze request contract: carry the first Vision provider into the verification pass.
path = 'services/api-gateway/src/ai/promptBuilder.ts'
replace(
    path,
    "  sourceName?: string;\n  yorum?: string;\n}",
    "  sourceName?: string;\n  yorum?: string;\n  deferVisionProvider?: string;\n}",
)
replace(
    path,
    "8. Bu ikinci geçişte koordinatlar kullanılmayacak; x=0, y=0, w=100, h=100 döndür.\n9. onem alanını H1 için 100, H2 için 90, H3 için 80 şeklinde azalan sırada ver.\n\nYalnız şu JSON yapısını döndür:\n{\n  \"isContentUnreadable\": boolean,\n  \"gazeteBasliklari\": [\n    {\"sourceHeadlineId\": \"H1\", \"baslik\": string, \"aciklama\": string, \"onem\": number, \"x\": 0, \"y\": 0, \"w\": 100, \"h\": 100}\n  ]\n}`;",
    "8. Bu ikinci geçişte yalnız sourceHeadlineId, baslik ve aciklama döndür. Koordinat, önem puanı veya başka alan üretme.\n\nYalnız şu JSON yapısını döndür:\n{\n  \"isContentUnreadable\": boolean,\n  \"gazeteBasliklari\": [\n    {\"sourceHeadlineId\": \"H1\", \"baslik\": string, \"aciklama\": string}\n  ]\n}`;",
)


# 2) Provider router: lightweight verification schema + deferred provider handoff/cooldown.
path = 'services/api-gateway/src/ai/providerRouter.ts'
replace(
    path,
    "  responseSchema?: 'hermes' | 'newspaper';\n  validateResponse?: (text: string) => void;\n  providerTimeoutMs?: number;\n  maxProviderCalls?: number;\n",
    "  responseSchema?: 'hermes' | 'newspaper' | 'newspaperVerification';\n  validateResponse?: (text: string) => void;\n  providerTimeoutMs?: number;\n  maxProviderCalls?: number;\n  deferProvider?: AiProviderName;\n  deferredProviderMinDelayMs?: number;\n",
)
replace(
    path,
    "const DEFAULT_VISION_ORDER: AiProviderName[] = ['groq', 'nvidia', 'gemini', 'openrouter'];",
    "const DEFAULT_VISION_ORDER: AiProviderName[] = ['groq', 'gemini', 'openrouter'];",
)
old_selected = '''function selectedResponseSchema(request: AiGenerationRequest) {
  return request.responseSchema === 'newspaper'
    ? NEWSPAPER_RESPONSE_SCHEMA
    : HERMES_RESPONSE_SCHEMA;
}
'''
new_selected = '''const NEWSPAPER_VERIFICATION_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isContentUnreadable: { type: 'BOOLEAN' },
    gazeteBasliklari: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          sourceHeadlineId: { type: 'STRING' },
          baslik: { type: 'STRING' },
          aciklama: { type: 'STRING' },
        },
        required: ['sourceHeadlineId', 'baslik', 'aciklama'],
      },
    },
  },
  required: ['isContentUnreadable', 'gazeteBasliklari'],
};

function selectedResponseSchema(request: AiGenerationRequest) {
  if (request.responseSchema === 'newspaperVerification') return NEWSPAPER_VERIFICATION_RESPONSE_SCHEMA;
  return request.responseSchema === 'newspaper'
    ? NEWSPAPER_RESPONSE_SCHEMA
    : HERMES_RESPONSE_SCHEMA;
}
'''
replace(path, old_selected, new_selected)
replace(
    path,
    "      const schemaName = request.responseSchema === 'newspaper'\n        ? 'otonom_newspaper'\n        : 'otonom_script';",
    "      const schemaName = request.responseSchema === 'newspaperVerification'\n        ? 'otonom_newspaper_verification'\n        : request.responseSchema === 'newspaper'\n          ? 'otonom_newspaper'\n          : 'otonom_script';",
)
old_start = '''  const providers = getProviderDefinitions(env, request.task);
  if (!providers.length) {
    throw new Error('Bu görev için yapılandırılmış ücretsiz AI sağlayıcısı yok.');
  }

  const attempts: AiProviderAttempt[] = [];
  for (const provider of providers) {
'''
new_start = '''  const baseProviders = getProviderDefinitions(env, request.task);
  const providers = request.deferProvider
    ? [
      ...baseProviders.filter(provider => provider.name !== request.deferProvider),
      ...baseProviders.filter(provider => provider.name === request.deferProvider),
    ]
    : baseProviders;
  if (!providers.length) {
    throw new Error('Bu görev için yapılandırılmış ücretsiz AI sağlayıcısı yok.');
  }

  const attempts: AiProviderAttempt[] = [];
  const generationStartedAt = Date.now();
  for (const provider of providers) {
    if (provider.name === request.deferProvider) {
      const minimumDelay = Number(request.deferredProviderMinDelayMs || 0);
      if (Number.isFinite(minimumDelay) && minimumDelay > 0) {
        const remainingDelay = Math.floor(minimumDelay) - (Date.now() - generationStartedAt);
        if (remainingDelay > 0) await sleep(remainingDelay);
      }
    }
'''
replace(path, old_start, new_start)


# 3) AI route: verification uses compact output and defers the discovery provider.
path = 'services/api-gateway/src/routes/ai.ts'
replace(
    path,
    "  type AiProviderAttempt,\n  type AiProviderEnv,\n",
    "  type AiProviderAttempt,\n  type AiProviderEnv,\n  type AiProviderName,\n",
)
replace(
    path,
    "const NEWSPAPER_VERIFICATION_MAX_TOKENS = 3_072;",
    "const NEWSPAPER_VERIFICATION_MAX_TOKENS = 1_536;\nconst NEWSPAPER_VERIFICATION_GROQ_COOLDOWN_MS = 45_000;",
)
replace(
    path,
    "function verificationHeadlineId(value: unknown) {\n",
    "function asAiProviderName(value: unknown): AiProviderName | undefined {\n  const name = String(value || '').trim().toLowerCase();\n  return ['groq', 'nvidia', 'opencode', 'openrouter', 'zenmux', 'gemini'].includes(name)\n    ? name as AiProviderName\n    : undefined;\n}\n\nfunction verificationHeadlineId(value: unknown) {\n",
)
old_validator = '''function validateNewspaperVerificationResponse(text: string) {
  validateHermesNewspaperResponse(text, []);
  const parsed = parseAiJsonObject(text);
  const headlines = Array.isArray(parsed.gazeteBasliklari)
    ? parsed.gazeteBasliklari.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];
  const ids = new Set(
    headlines
      .map(item => verificationHeadlineId(item.sourceHeadlineId))
      .filter(Boolean),
  );
  if (ids.size < 5) {
    throw new Error('Gazete birebir doğrulamasında en az 5 farklı H kimliği korunamadı; diğer sağlayıcı deneniyor.');
  }
}
'''
new_validator = '''function validateNewspaperVerificationResponse(text: string) {
  const parsed = parseAiJsonObject(text);
  const headlines = Array.isArray(parsed.gazeteBasliklari)
    ? parsed.gazeteBasliklari.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];
  const verified = headlines
    .map(item => ({
      id: verificationHeadlineId(item.sourceHeadlineId),
      baslik: String(item.baslik || '').replace(/\\s+/g, ' ').trim(),
      aciklama: String(item.aciklama || '').replace(/\\s+/g, ' ').trim(),
    }))
    .filter(item => item.id && item.baslik && item.aciklama);
  const ids = new Set(verified.map(item => item.id));
  if (parsed.isContentUnreadable === true || ids.size < 5) {
    throw new Error('Gazete birebir doğrulamasında en az 5 farklı H kimliği başlık+açıklama ile doğrulanamadı; diğer sağlayıcı deneniyor.');
  }
}
'''
replace(path, old_validator, new_validator)
old_normalize_end = '''    .filter(headline => headline.sourceHeadlineId && headline.baslik && headline.aciklama)
    .filter((headline, index, all) => all.findIndex(item => item.sourceHeadlineId === headline.sourceHeadlineId) === index)
    .sort((left, right) => Number(left.sourceHeadlineId.slice(1)) - Number(right.sourceHeadlineId.slice(1)))
    .slice(0, 9);
'''
new_normalize_end = '''    .filter(headline => headline.sourceHeadlineId && headline.baslik && headline.aciklama)
    .filter((headline, index, all) => all.findIndex(item => item.sourceHeadlineId === headline.sourceHeadlineId) === index)
    .sort((left, right) => Number(left.sourceHeadlineId.slice(1)) - Number(right.sourceHeadlineId.slice(1)))
    .slice(0, 9)
    .map((headline, index) => ({
      ...headline,
      onem: Math.max(10, 100 - index * 10),
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    }));
'''
replace(path, old_normalize_end, new_normalize_end)
replace(
    path,
    "    const isNewspaperVerification = isNewspaper && body.config?.analysisMode === 'newspaper_verify';\n    const generated = await generateWithFallback(c.env, {",
    "    const isNewspaperVerification = isNewspaper && body.config?.analysisMode === 'newspaper_verify';\n    const deferredProvider = isNewspaperVerification\n      ? asAiProviderName(body.config?.deferVisionProvider)\n      : undefined;\n    const generated = await generateWithFallback(c.env, {",
)
replace(
    path,
    "      maxProviderCalls: isNewspaperVerification ? NEWSPAPER_VERIFICATION_MAX_PROVIDER_CALLS : undefined,\n      responseFormat: 'json',\n      responseSchema: isNewspaper ? 'newspaper' : 'hermes',",
    "      maxProviderCalls: isNewspaperVerification ? NEWSPAPER_VERIFICATION_MAX_PROVIDER_CALLS : undefined,\n      deferProvider: deferredProvider,\n      deferredProviderMinDelayMs: deferredProvider === 'groq'\n        ? NEWSPAPER_VERIFICATION_GROQ_COOLDOWN_MS\n        : undefined,\n      responseFormat: 'json',\n      responseSchema: isNewspaperVerification\n        ? 'newspaperVerification'\n        : isNewspaper\n          ? 'newspaper'\n          : 'hermes',",
)
replace(
    path,
    "    visionOrder: c.env.AI_VISION_PROVIDER_ORDER || 'groq,nvidia,gemini,openrouter',",
    "    visionOrder: c.env.AI_VISION_PROVIDER_ORDER || 'groq,gemini,openrouter',",
)


# 4) Web client: tell second pass which provider did discovery so it can be handed off/deferred.
path = 'apps/web/src/lib/aiClient.ts'
replace(
    path,
    "  const verificationImage = await mediaToNewspaperEvidenceImage(imageCandidates[0], candidates);\n  writeSystemLog(\n    `Gazete birebir okuma doğrulaması: ${candidates.length} haber H1-H${candidates.length} olarak ayrı kırpımlarda büyütüldü; ikinci Vision geçişi başlatılıyor.`,\n  );",
    "  const verificationImage = await mediaToNewspaperEvidenceImage(imageCandidates[0], candidates);\n  writeSystemLog(\n    `Gazete birebir okuma doğrulaması: ${candidates.length} haber H1-H${candidates.length} olarak ayrı kırpımlarda büyütüldü; ikinci Vision geçişi başlatılıyor.`,\n  );\n  writeSystemLog(\n    `Gazete Vision sağlayıcı devri: ilk keşifte ${result.provider} kullanıldı; ikinci geçişte aynı sağlayıcı ücretsiz kota çakışmasını önlemek için sona ertelenecek.`,\n  );",
)
replace(
    path,
    "      ...requestConfig,\n      analysisMode: 'newspaper_verify',\n",
    "      ...requestConfig,\n      analysisMode: 'newspaper_verify',\n      deferVisionProvider: result.provider,\n",
)


# 5) Production config: persistent NVIDIA 403 must not consume the Vision fallback slot.
path = 'services/api-gateway/wrangler.toml'
p = Path(path)
text = p.read_text(encoding='utf-8')
text = text.replace('# OTONOM 3.14.50 production deploy · Groq JSON recovery · production verification', '# OTONOM 3.14.53 production deploy · newspaper provider handoff and compact verification')
text = text.replace('AI_VISION_PROVIDER_ORDER = "groq,nvidia,gemini,openrouter"', 'AI_VISION_PROVIDER_ORDER = "groq,gemini,openrouter"')
p.write_text(text, encoding='utf-8')


# 6) Regression tests: compact schema + provider handoff/cooldown.
path = 'services/api-gateway/src/ai/providerRouter.test.ts'
anchor = "  it('NVIDIA deneme uçlarını production ortamında varsayılan olarak kapatır', () => {\n"
addition = r'''  it('gazete birebir doğrulamasında ilk Vision sağlayıcısını sona erteler', async () => {
    const valid = JSON.stringify({
      isContentUnreadable: false,
      gazeteBasliklari: Array.from({ length: 5 }, (_, index) => ({
        sourceHeadlineId: `H${index + 1}`,
        baslik: `Başlık ${index + 1}`,
        aciklama: `Açıklama ${index + 1}.`,
      })),
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: valid }] } }],
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
      responseSchema: 'newspaperVerification',
      deferProvider: 'groq',
      maxProviderCalls: 1,
    });

    expect(result.provider).toBe('gemini');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('generativelanguage.googleapis.com');
  });

  it('ertelenen Groq Vision sağlayıcısını alternatifler bittikten sonra en az 45 saniye bekletir', async () => {
    vi.useFakeTimers();
    const valid = JSON.stringify({
      isContentUnreadable: false,
      gazeteBasliklari: Array.from({ length: 5 }, (_, index) => ({
        sourceHeadlineId: `H${index + 1}`,
        baslik: `Başlık ${index + 1}`,
        aciklama: `Açıklama ${index + 1}.`,
      })),
    });
    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve(new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"isContentUnreadable":true,"gazeteBasliklari":[]}' }] } }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: valid } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const validate = (text: string) => {
      const parsed = JSON.parse(text) as { gazeteBasliklari?: unknown[] };
      if (!Array.isArray(parsed.gazeteBasliklari) || parsed.gazeteBasliklari.length < 5) {
        throw new Error('en az 5 haber gerekli');
      }
    };
    const pending = generateWithFallback({
      ENVIRONMENT: 'production',
      GROQ_API_KEY: 'groq-test',
      GEMINI_API_KEY: 'gemini-test',
      AI_VISION_PROVIDER_ORDER: 'groq,gemini',
    }, {
      task: 'vision',
      messages: [{ role: 'user', content: [{ type: 'image', mimeType: 'image/jpeg', data: 'AA==' }] }],
      responseFormat: 'json',
      responseSchema: 'newspaperVerification',
      deferProvider: 'groq',
      deferredProviderMinDelayMs: 45_000,
      maxProviderCalls: 1,
      validateResponse: validate,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(44_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2);
    const result = await pending;
    expect(result.provider).toBe('groq');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gazete birebir doğrulamasında yalnız H kimliği, başlık ve açıklama şemasını Geminiye gönderir', async () => {
    const valid = JSON.stringify({
      isContentUnreadable: false,
      gazeteBasliklari: [{ sourceHeadlineId: 'H1', baslik: 'Başlık', aciklama: 'Açıklama.' }],
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: valid }] } }],
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
      responseSchema: 'newspaperVerification',
      maxProviderCalls: 1,
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)) as Record<string, any>;
    const itemProperties = body.generationConfig.responseSchema.properties.gazeteBasliklari.items.properties;
    expect(itemProperties).toHaveProperty('sourceHeadlineId');
    expect(itemProperties).toHaveProperty('baslik');
    expect(itemProperties).toHaveProperty('aciklama');
    expect(itemProperties).not.toHaveProperty('onem');
    expect(itemProperties).not.toHaveProperty('x');
    expect(itemProperties).not.toHaveProperty('y');
    expect(itemProperties).not.toHaveProperty('w');
    expect(itemProperties).not.toHaveProperty('h');
  });

'''
replace(path, anchor, addition + anchor)


# 7) Newspaper route normalization regression for compact verification output.
path = 'services/api-gateway/src/routes/ai-newspaper.test.ts'
replace(
    path,
    "import { normalizeNewspaperScript } from './ai';",
    "import { normalizeNewspaperScript, normalizeNewspaperVerificationScript } from './ai';",
)
anchor = "describe('AI newspaper normalization — Hermes 10 Vision-first', () => {\n"
addition = r'''describe('AI newspaper compact second-pass verification', () => {
  it('yalnız H kimliği + başlık + açıklama gelen sonucu sahne sözleşmesi için güvenli varsayımlarla tamamlar', () => {
    const normalized = normalizeNewspaperVerificationScript({
      gazeteBasliklari: Array.from({ length: 5 }, (_, index) => ({
        sourceHeadlineId: `H${index + 1}`,
        baslik: `Birebir başlık ${index + 1}`,
        aciklama: `Birebir açıklama ${index + 1}.`,
      })),
    });

    expect(normalized.isContentUnreadable).toBe(false);
    expect(normalized.gazeteBasliklari).toHaveLength(5);
    expect(normalized.gazeteBasliklari[0]).toEqual(expect.objectContaining({
      sourceHeadlineId: 'H1',
      baslik: 'Birebir başlık 1',
      aciklama: 'Birebir açıklama 1.',
      onem: 100,
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    }));
  });
});

'''
replace(path, anchor, addition + anchor)

print('OTONOM 3.14.53 newspaper provider handoff patch applied')
